import os
import asyncio
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

GITHUB_API_URL = os.getenv("GITHUB_API_URL", "https://api.github.com")
GITHUB_REPO = os.getenv("GITHUB_REPO", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
WORKFLOW_FILE = "run-ansible-mainframe.yml"


class RunAutomation(BaseModel):
	playbook: str
	jcl_file: str = ""
	student_id: str = ""
	run_mf_metrics: str = "true"
	rebuild_racf: str = "false"
	rebuild_datasets: str = "false"


def github_headers() -> dict[str, str]:
	return {
		"Authorization": f"Bearer {GITHUB_TOKEN}",
		"Accept": "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	}


def require_github_config() -> None:
	if not GITHUB_REPO:
		raise HTTPException(status_code=500, detail="GITHUB_REPO is not set")
	if not GITHUB_TOKEN:
		raise HTTPException(status_code=500, detail="GITHUB_TOKEN is not set")

@router.post("/api/automation-run")
async def automation_run(payload: RunAutomation):
	require_github_config()

    # this url will be used to actually run the github action
	dispatch_url = (
		f"{GITHUB_API_URL}/repos/{GITHUB_REPO}/actions/workflows/"
		f"{WORKFLOW_FILE}/dispatches"
	)
	# this will be used to get data about the job we submitted
	# unfortunently, the dispatch_url endpoint does not give a response back with details about the job that we just submitted, so we have to manually search for it
	runs_url = (
		f"{GITHUB_API_URL}/repos/{GITHUB_REPO}/actions/workflows/"
		f"{WORKFLOW_FILE}/runs"
	)

	dispatch_payload = {
		"ref": "main",
		"inputs": {
			"PLAYBOOK_NAME": payload.playbook,
			"JCL_FILE": payload.jcl_file,
			"STUDENT_ID": payload.student_id,
			"RUN_MF_METRICS": payload.run_mf_metrics,
			"REBUILD_RACF": payload.rebuild_racf,
			"REBUILD_DATASETS": payload.rebuild_datasets,
		},
	}

	runs_query_params = {
		"event": "workflow_dispatch",
		"branch": "main",
		"per_page": 10,
	}
	dispatch_started_at = datetime.now(timezone.utc)

    # send some api calls to github
	async with httpx.AsyncClient(timeout=20.0) as client:

        # get the most recent job before the one we will submit
		before_response = await client.get(
			runs_url,
			headers=github_headers(),
			params={**runs_query_params, "per_page": 1},
		)
		before_run_id = None
		if before_response.status_code < 400:
			before_runs = before_response.json().get("workflow_runs", [])
			if before_runs:
				before_run_id = before_runs[0].get("id")

        # fire off the workflow
		dispatch_response = await client.post(
			dispatch_url,
			headers=github_headers(),
			json=dispatch_payload,
		)

		if dispatch_response.status_code >= 400:
			raise HTTPException(
				status_code=502,
				detail="Failed to dispatch GitHub workflow",
			)

        # loop through until we get data about the github aciton we just submitted
		selected_run = None
		for _ in range(8):
			runs_response = await client.get(
				runs_url,
				headers=github_headers(),
				params=runs_query_params,
			)

			if runs_response.status_code >= 400:
				break

			workflow_runs = runs_response.json().get("workflow_runs", [])
			if not workflow_runs:
				await asyncio.sleep(1)
				continue

			for run in workflow_runs:
				if before_run_id is not None and run.get("id") == before_run_id:
					continue

				created_at = run.get("created_at")
				if not created_at:
					continue

				created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
				if created_dt >= dispatch_started_at:
					selected_run = run
					break

			if selected_run:
				break

			await asyncio.sleep(1)

	if not selected_run:
		return {"status": "queued"}

	return {
		"status": "queued",
		"run_id": selected_run.get("id"),
		"run_number": selected_run.get("run_number"),
		"html_url": selected_run.get("html_url"),
	}

@router.get("/api/automation-run/{run_id}")
async def get_automation_run(run_id: int):
	require_github_config()

	run_url = f"{GITHUB_API_URL}/repos/{GITHUB_REPO}/actions/runs/{run_id}"

	async with httpx.AsyncClient(timeout=20.0) as client:
		response = await client.get(run_url, headers=github_headers())

	if response.status_code >= 400:
		raise HTTPException(status_code=502, detail="Failed to fetch run status")

	run = response.json()

	return {
		"run_id": run.get("id"),
		"name": run.get("name"),
		"status": run.get("status"),
		"conclusion": run.get("conclusion"),
		"event": run.get("event"),
		"run_number": run.get("run_number"),
		"html_url": run.get("html_url"),
		"created_at": run.get("created_at"),
		"updated_at": run.get("updated_at"),
	}
