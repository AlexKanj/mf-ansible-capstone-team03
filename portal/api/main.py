from __future__ import annotations

import asyncio
import os
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "").rstrip("/")

ManagedUser = Literal[
    "U03D01",
    "U03D02",
    "U03T01",
    "P03PTU",
]

app = FastAPI(
    title="Team 03 Cross-Platform Operations API",
    version="0.1.0",
)

# Allows the local React development server to call FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


async def prometheus_query(
    client: httpx.AsyncClient,
    query: str,
) -> list[dict[str, Any]]:
    """Run an instant Prometheus query."""

    if not PROMETHEUS_URL:
        raise HTTPException(
            status_code=500,
            detail="PROMETHEUS_URL is not configured",
        )

    try:
        response = await client.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={"query": query},
        )
        response.raise_for_status()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to reach Prometheus: {exc}",
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Prometheus returned HTTP "
                f"{exc.response.status_code}"
            ),
        ) from exc

    payload = response.json()

    if payload.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail=payload.get("error", "Prometheus query failed"),
        )

    return payload.get("data", {}).get("result", [])


def get_numeric_value(
    result: list[dict[str, Any]],
    default: float | None = None,
) -> float | None:
    """Extract a numeric value from a Prometheus result."""

    if not result:
        return default

    try:
        return float(result[0]["value"][1])
    except (KeyError, IndexError, TypeError, ValueError):
        return default


def status_from_value(value: float | None) -> str:
    if value is None:
        return "unknown"

    return "successful" if value == 1 else "failed"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/overview")
async def get_overview(
    userid: ManagedUser = Query(default="P03PTU"),
) -> dict[str, Any]:
    """Return the current platform state for one managed RACF user."""

    queries = {
        "jcl_automation": (
            'max(github_ansible_playbook_latest_success'
            '{playbook="run_jcl.yml"})'
        ),
        "racf_automation": (
            'max(github_ansible_playbook_latest_success'
            '{playbook="racf_verify.yml"})'
        ),
        "provisioning_automation": (
            'max(github_ansible_playbook_latest_success'
            '{playbook="provision_new_dataset.yml"})'
        ),
        "jcl_success": (
            'max(zos_job_success{'
            'playbook="run_jcl.yml",'
            'repo="mf-ansible-capstone-team03",'
            'build=""'
            '})'
        ),
        "jcl_return_code": (
            'max(zos_job_return_code{'
            'playbook="run_jcl.yml",'
            'repo="mf-ansible-capstone-team03",'
            'build=""'
            '})'
        ),
        "racf_users": "max(zos_racf_users_total)",
        "racf_groups": "max(zos_racf_groups_total)",
        "datasets_ready": (
            f'sum(zos_user_dataset_ready{{userid="{userid}"}})'
        ),
        "datasets_expected": (
            f'max(zos_provision_datasets_expected'
            f'{{userid="{userid}"}})'
        ),
        "active_jobs": "max(zos_active_job_count)",
        "active_stcs": "max(zos_active_stc_count)",
        "active_batch_jobs": "max(zos_active_batch_job_count)",
        "last_run_timestamp": (
            "max("
            "github_ansible_playbook_last_run_timestamp_seconds"
            ")"
        ),
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        query_names = list(queries)

        query_results = await asyncio.gather(
            *[
                prometheus_query(client, queries[name])
                for name in query_names
            ]
        )

    values = {
        name: get_numeric_value(result)
        for name, result in zip(
            query_names,
            query_results,
            strict=True,
        )
    }

    datasets_ready = values["datasets_ready"] or 0
    datasets_expected = values["datasets_expected"] or 0

    readiness_percentage = (
        round(
            datasets_ready / datasets_expected * 100,
            1,
        )
        if datasets_expected > 0
        else None
    )

    critical_values = [
        values["jcl_automation"],
        values["racf_automation"],
        values["provisioning_automation"],
        values["jcl_success"],
    ]

    if any(value == 0 for value in critical_values):
        overall_status = "degraded"
    elif (
        all(value == 1 for value in critical_values)
        and readiness_percentage == 100
    ):
        overall_status = "healthy"
    else:
        overall_status = "unknown"

    return {
        "status": overall_status,
        "selected_user": userid,
        "last_updated_timestamp": values["last_run_timestamp"],
        "automation": {
            "jcl": {
                "status": status_from_value(
                    values["jcl_automation"]
                ),
                "value": values["jcl_automation"],
            },
            "racf": {
                "status": status_from_value(
                    values["racf_automation"]
                ),
                "value": values["racf_automation"],
            },
            "provisioning": {
                "status": status_from_value(
                    values["provisioning_automation"]
                ),
                "value": values["provisioning_automation"],
            },
        },
        "latest_jcl_job": {
            "status": status_from_value(
                values["jcl_success"]
            ),
            "return_code": values["jcl_return_code"],
        },
        "racf": {
            "managed_users": values["racf_users"],
            "managed_groups": values["racf_groups"],
        },
        "datasets": {
            "ready": datasets_ready,
            "expected": datasets_expected,
            "readiness_percentage": readiness_percentage,
        },
        "mainframe_activity": {
            "active_jobs": values["active_jobs"],
            "active_started_tasks": values["active_stcs"],
            "active_batch_jobs": values[
                "active_batch_jobs"
            ],
        },
    }