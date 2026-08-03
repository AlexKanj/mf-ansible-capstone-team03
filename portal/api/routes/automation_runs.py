from __future__ import annotations

import asyncio
import base64
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

GITHUB_API_URL = os.getenv("GITHUB_API_URL", "https://api.github.com")
GITHUB_REPO = os.getenv("GITHUB_REPO", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
WORKFLOW_FILE = "run-ansible-mainframe.yml"
DEFAULT_BRANCH = os.getenv("GITHUB_REPO_REF", "main")

MANUAL_JCL_PLAYBOOK = "run_manual_jcl.yml"

# playbooks that are not intended for direct workflow dispatch.
PLAYBOOK_EXCLUSIONS = {
	"inventory.yml",
	"racf_vars.yml",
	"report.yml",
	"requirements.yml"
}

PLAYBOOK_PATH = "ansible"
JCL_PATH = "ansible/jcl"


# API requests and responses:
class RunAutomation(BaseModel):
	playbook: str
	jcl_file: str = ""
	student_id: str = ""
	run_mf_metrics: str = "true"
	rebuild_racf: str = "false"
	rebuild_datasets: str = "false"
	jcl_text: str = ""


class AutomationOption(BaseModel):
	value: str
	name: str
	description: str
	path: str
	code_preview: str
	is_manual_jcl: bool = False


class AutomationOptionsResponse(BaseModel):
	source: str
	generated_at: str
	playbooks: list[AutomationOption]
	jcl_files: list[AutomationOption]


# ---
# helper functions:
def github_headers() -> dict[str, str]:
	headers = {
		"Accept": "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	}

	if GITHUB_TOKEN:
		headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

	return headers


# parse text:
def option_name_from_filename(file_name: str) -> str:
	stem = file_name.removesuffix(".yml").removesuffix(".jcl")
	return stem.replace("_", " ").replace("-", " ").title()


def normalize_preview(content: str, max_lines: int = 16) -> str:
	preview_lines = content.splitlines()[:max_lines]
	if not preview_lines:
		return ""

	return "\n".join(preview_lines)


def preview_description(content: str, kind: str) -> str:
	"""Use the first non-empty line as a lightweight description."""

	for line in content.splitlines():
		candidate = line.strip()
		if candidate:
			return candidate[:160]

	return f"{kind} file"


def build_playbook_option(file_name: str, content: str) -> AutomationOption:
	return AutomationOption(
		value=file_name,
		name=option_name_from_filename(file_name),
		description=preview_description(content, "Playbook"),
		path=f"{PLAYBOOK_PATH}/{file_name}",
		code_preview=normalize_preview(content),
		is_manual_jcl=file_name == MANUAL_JCL_PLAYBOOK,
	)


def build_jcl_option(file_name: str, content: str) -> AutomationOption:
	return AutomationOption(
		value=file_name,
		name=option_name_from_filename(file_name),
		description=preview_description(content, "JCL"),
		path=f"{JCL_PATH}/{file_name}",
		code_preview=normalize_preview(content),
	)

# get files from github
async def list_github_directory_files(
	client: httpx.AsyncClient,
	directory_path: str,
	file_extension: str,
) -> list[dict[str, Any]]:
	url = (
		f"{GITHUB_API_URL}/repos/{GITHUB_REPO}/contents/{directory_path}"
	)
	response = await client.get(
		url,
		headers=github_headers(),
		params={"ref": DEFAULT_BRANCH},
	)

	if response.status_code >= 400:
		raise HTTPException(
			status_code=502,
			detail=f"Failed to read GitHub directory: {directory_path}",
		)

	entries = response.json()
	if not isinstance(entries, list):
		return []

	return [
		e for e in entries
		if e.get("type") == "file" and str(e.get("name", "")).endswith(file_extension)
	]


async def fetch_github_text_file(
	client: httpx.AsyncClient,
	path: str,
) -> str:
	url = f"{GITHUB_API_URL}/repos/{GITHUB_REPO}/contents/{path}"
	response = await client.get(
		url,
		headers=github_headers(),
		params={"ref": DEFAULT_BRANCH},
	)

	if response.status_code >= 400:
		raise HTTPException(
			status_code=502,
			detail=f"Failed to read GitHub file: {path}",
		)

	payload = response.json()
	content_encoded = payload.get("content", "")
	encoding = payload.get("encoding")

	if encoding != "base64" or not isinstance(content_encoded, str):
		return ""

	decoded_bytes = base64.b64decode(content_encoded)
	return decoded_bytes.decode("utf-8", errors="replace")


# parse the github repo to find what playbooks and jcl files are avaliable to run
async def load_options_from_github() -> tuple[list[AutomationOption], list[AutomationOption]]:
	if not GITHUB_REPO:
		raise HTTPException(status_code=500, detail="GITHUB_REPO is not set")

	async with httpx.AsyncClient(timeout=20.0) as client:
		all_playbook_entries, jcl_entries = await asyncio.gather(
			list_github_directory_files(client, PLAYBOOK_PATH, ".yml"),
			list_github_directory_files(client, JCL_PATH, ".jcl"),
		)

		playbook_entries = [e for e in all_playbook_entries if e.get("name") not in PLAYBOOK_EXCLUSIONS]

		playbook_contents, jcl_contents = await asyncio.gather(
			asyncio.gather(*[fetch_github_text_file(client, e["path"]) for e in playbook_entries]),
			asyncio.gather(*[fetch_github_text_file(client, e["path"]) for e in jcl_entries]),
		)

	playbooks = [
		build_playbook_option(e["name"], content)
		for e, content in sorted(zip(playbook_entries, playbook_contents), key=lambda p: p[0]["name"])
	]
	jcl_files = [
		build_jcl_option(e["name"], content)
		for e, content in sorted(zip(jcl_entries, jcl_contents), key=lambda p: p[0]["name"])
	]

	return playbooks, jcl_files


def require_github_config() -> None:
	if not GITHUB_REPO:
		raise HTTPException(status_code=500, detail="GITHUB_REPO is not set")
	if not GITHUB_TOKEN:
		raise HTTPException(status_code=500, detail="GITHUB_TOKEN is not set")


# endpoint to get ansible playbooks and jcl files that can run
@router.get("/api/automation-run/options", response_model=AutomationOptionsResponse)
async def get_automation_run_options() -> AutomationOptionsResponse:
	playbooks, jcl_files = await load_options_from_github()
	source = "github"

	return AutomationOptionsResponse(
		source=source,
		generated_at=datetime.now(timezone.utc).isoformat(),
		playbooks=playbooks,
		jcl_files=jcl_files,
	)


@router.post("/api/automation-run")
async def automation_run(payload: RunAutomation):
	require_github_config()

	playbook_name = payload.playbook.strip()
	jcl_file = payload.jcl_file.strip()
	student_id = payload.student_id.strip()
	jcl_text = payload.jcl_text.strip()

	if not playbook_name:
		raise HTTPException(status_code=400, detail="Playbook name is required")

	if playbook_name == "run_manual_jcl.yml" and not jcl_text:
		raise HTTPException(
			status_code=400,
			detail="jcl_text is required when playbook is run_manual_jcl.yml",
		)

	# This URL dispatches the selected GitHub Actions workflow.
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
			"PLAYBOOK_NAME": playbook_name,
			"JCL_FILE": jcl_file,
			"JCL_TEXT": jcl_text,
			"STUDENT_ID": student_id,
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

				created_dt = datetime.fromisoformat(
					created_at.replace("Z", "+00:00")
				)
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
