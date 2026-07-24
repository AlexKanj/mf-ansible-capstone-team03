from __future__ import annotations

import asyncio
import os
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "").rstrip("/")

ManagedUser = Literal["U03D01", "U03D02", "U03T01", "P03PTU"]

app = FastAPI(
    title="Team 03 Cross-Platform Operations API",
    version="0.1.0",
)

# Development-only CORS configuration.
# Restrict this to the production portal origin when deployed.
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


async def prometheus_query(query: str) -> list[dict[str, Any]]:
    """Execute an instant Prometheus query and return its result series."""

    if not PROMETHEUS_URL:
        raise HTTPException(
            status_code=500,
            detail="PROMETHEUS_URL is not configured",
        )

    url = f"{PROMETHEUS_URL}/api/v1/query"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params={"query": query})
            response.raise_for_status()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to reach Prometheus: {exc}",
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Prometheus returned HTTP {exc.response.status_code}",
        ) from exc

    payload = response.json()

    if payload.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail="Prometheus query failed",
        )

    return payload.get("data", {}).get("result", [])


def scalar_value(
    result: list[dict[str, Any]],
    default: float | None = None,
) -> float | None:
    """Extract the first numeric value from a Prometheus vector."""

    if not result:
        return default

    try:
        return float(result[0]["value"][1])
    except (KeyError, IndexError, TypeError, ValueError):
        return default


def success_label(value: float | None) -> str:
    if value is None:
        return "unknown"
    return "successful" if value == 1 else "failed"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/overview")
async def overview(
    userid: ManagedUser = Query(default="P03PTU"),
) -> dict[str, Any]:
    """
    Return the current cross-platform operational state for one managed user.
    """

    queries = {
        "jcl_automation": (
            'github_ansible_playbook_latest_success'
            '{playbook="run_jcl.yml"}'
        ),
        "racf_automation": (
            'github_ansible_playbook_latest_success'
            '{playbook=~"racf_build.yml|racf_verify.yml"}'
        ),
        "provisioning_automation": (
            'github_ansible_playbook_latest_success'
            '{playbook="provision_new_dataset.yml"}'
        ),
        "jcl_success": "zos_job_success",
        "jcl_return_code": "zos_job_return_code",
        "racf_users": "zos_racf_users_total",
        "racf_groups": "zos_racf_groups_total",
        "datasets_ready": (
            f'sum(zos_user_dataset_ready{{userid="{userid}"}})'
        ),
        "datasets_expected": (
            f'max(zos_provision_datasets_expected{{userid="{userid}"}})'
        ),
        "active_jobs": "zos_active_job_count",
        "active_stcs": "zos_active_stc_count",
        "active_batch_jobs": "zos_active_batch_job_count",
    }

    names = list(queries)
    results = await asyncio.gather(
        *(prometheus_query(queries[name]) for name in names)
    )

    values = {
        name: scalar_value(result)
        for name, result in zip(names, results, strict=True)
    }

    ready = values["datasets_ready"] or 0
    expected = values["datasets_expected"] or 0

    readiness_percentage = (
        round((ready / expected) * 100, 1)
        if expected > 0
        else None
    )

    component_failures = [
        values["jcl_automation"] == 0,
        values["racf_automation"] == 0,
        values["provisioning_automation"] == 0,
        values["jcl_success"] == 0,
    ]

    overall_status = (
        "degraded"
        if any(component_failures)
        else "healthy"
    )

    return {
        "status": overall_status,
        "selected_user": userid,
        "automation": {
            "jcl": {
                "status": success_label(values["jcl_automation"]),
                "value": values["jcl_automation"],
            },
            "racf": {
                "status": success_label(values["racf_automation"]),
                "value": values["racf_automation"],
            },
            "provisioning": {
                "status": success_label(
                    values["provisioning_automation"]
                ),
                "value": values["provisioning_automation"],
            },
        },
        "latest_jcl_job": {
            "status": success_label(values["jcl_success"]),
            "return_code": values["jcl_return_code"],
        },
        "racf": {
            "managed_users": values["racf_users"],
            "managed_groups": values["racf_groups"],
        },
        "datasets": {
            "ready": ready,
            "expected": expected,
            "readiness_percentage": readiness_percentage,
        },
        "mainframe_activity": {
            "active_jobs": values["active_jobs"],
            "active_started_tasks": values["active_stcs"],
            "active_batch_jobs": values["active_batch_jobs"],
        },
    }