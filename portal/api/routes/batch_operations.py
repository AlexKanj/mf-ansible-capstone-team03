from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Literal, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from services.prometheus import prometheus_query


router = APIRouter(
    prefix="/api/batch-operations",
    tags=["Batch operations"],
)


JobStatus = Literal[
    "successful",
    "warning",
    "failed",
    "abend",
    "unknown",
]

class JesResult(BaseModel):
    return_code: Optional[int]
    return_code_display: Optional[str]
    status: JobStatus


class AnsibleResult(BaseModel):
    exit_code: Optional[int]
    status: JobStatus


class RecordCounts(BaseModel):
    input: Optional[int]
    output: Optional[int]


class BatchJob(BaseModel):
    job_name: str
    job_id: str
    jcl_file: str
    student_id: Optional[str]
    submitted_at: Optional[datetime]

    automation_duration_seconds: Optional[float]
    jes_duration_seconds: Optional[float]

    jes: JesResult
    ansible: AnsibleResult
    records: RecordCounts

    spool_preview: Optional[str]
    full_output_url: Optional[str]


class BatchOperationsResponse(BaseModel):
    latest_job: Optional[BatchJob]
    recent_jobs: list[BatchJob]


def metric_value(
    series: Optional[dict[str, Any]],
) -> Optional[float]:
    """Extract the numeric value from one Prometheus series."""

    if not series:
        return None

    try:
        return float(series["value"][1])
    except (KeyError, IndexError, TypeError, ValueError):
        return None


def newest_series(
    result: list[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Return the series with the highest build or newest sample."""

    if not result:
        return None

    def series_order(
        series: dict[str, Any],
    ) -> tuple[int, float]:
        labels = series.get("metric", {})

        try:
            build = int(labels.get("build", -1))
        except (TypeError, ValueError):
            build = -1

        try:
            timestamp = float(series["value"][0])
        except (KeyError, IndexError, TypeError, ValueError):
            timestamp = 0.0

        return build, timestamp

    return max(result, key=series_order)


def matching_job_series(
    result: list[dict[str, Any]],
    job_labels: dict[str, str],
) -> Optional[dict[str, Any]]:
    """Find a metric series belonging to the selected JCL job."""

    label_names = (
        "build",
        "job_id",
        "job_name",
        "student",
        "jcl",
    )

    for series in result:
        metric_labels = series.get("metric", {})

        if all(
            metric_labels.get(name) == job_labels.get(name)
            for name in label_names
        ):
            return series

    return None


def optional_int(value: Optional[float]) -> Optional[int]:
    """Convert an optional numeric metric value to an integer."""

    return int(value) if value is not None else None


def jes_status(return_code: Optional[int]) -> JobStatus:
    """Convert a JES return code into a display status."""

    if return_code is None:
        return "unknown"

    if return_code < 0:
        return "abend"

    if return_code <= 4:
        return "successful"

    if return_code <= 8:
        return "warning"

    return "failed"


def ansible_status(exit_code: Optional[int]) -> JobStatus:
    """Convert an Ansible exit code into a display status."""

    if exit_code is None:
        return "unknown"

    return "successful" if exit_code == 0 else "failed"


@router.get(
    "",
    response_model=BatchOperationsResponse,
)
async def get_batch_operations() -> BatchOperationsResponse:
    """Return the latest and recent JCL batch jobs."""

    queries = {
        "return_code": "zos_job_return_code",
        "records_in": "zos_job_records_in",
        "records_out": "zos_job_records_out",
        "ansible_exit_code": (
            "github_ansible_playbook_latest_exit_code"
            '{playbook="run_jcl.yml"}'
        ),
        "automation_duration": (
            "github_ansible_playbook_latest_duration_seconds"
            '{playbook="run_jcl.yml"}'
        ),
        "run_timestamp": (
            "github_ansible_playbook_last_run_timestamp_seconds"
            '{playbook="run_jcl.yml"}'
        ),
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        names = list(queries)
        results = await asyncio.gather(
            *[
                prometheus_query(client, queries[name])
                for name in names
            ]
        )

    query_results = dict(zip(names, results))

    return_code_series = newest_series(
        query_results["return_code"]
    )

    if return_code_series is None:
        return BatchOperationsResponse(
            latest_job=None,
            recent_jobs=[],
        )

    labels = return_code_series.get("metric", {})

    records_in_series = matching_job_series(
        query_results["records_in"],
        labels,
    )
    records_out_series = matching_job_series(
        query_results["records_out"],
        labels,
    )

    return_code = optional_int(
        metric_value(return_code_series)
    )
    records_in = optional_int(
        metric_value(records_in_series)
    )
    records_out = optional_int(
        metric_value(records_out_series)
    )

    ansible_exit_code = optional_int(
        metric_value(
            newest_series(query_results["ansible_exit_code"])
        )
    )

    automation_duration = metric_value(
        newest_series(query_results["automation_duration"])
    )

    timestamp_value = metric_value(
        newest_series(query_results["run_timestamp"])
    )
    submitted_at = (
        datetime.fromtimestamp(
            timestamp_value,
            tz=timezone.utc,
        )
        if timestamp_value is not None
        else None
    )

    latest_job = BatchJob(
        job_name=labels.get("job_name", "unknown"),
        job_id=labels.get("job_id", "unknown"),
        jcl_file=labels.get("jcl", "unknown"),
        student_id=labels.get("student") or None,
        submitted_at=submitted_at,
        automation_duration_seconds=automation_duration,
        jes_duration_seconds=None,
        jes=JesResult(
            return_code=return_code,
            return_code_display=(
                f"{return_code:04d}"
                if return_code is not None
                and return_code >= 0
                else None
            ),
            status=jes_status(return_code),
        ),
        ansible=AnsibleResult(
            exit_code=ansible_exit_code,
            status=ansible_status(ansible_exit_code),
        ),
        records=RecordCounts(
            input=records_in,
            output=records_out,
        ),
        spool_preview=None,
        full_output_url=None,
    )

    return BatchOperationsResponse(
        latest_job=latest_job,
        recent_jobs=[latest_job],
    )
