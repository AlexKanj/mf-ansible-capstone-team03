from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import HTTPException


PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "").rstrip("/")


def require_prometheus_url() -> str:
    """Return the configured Prometheus URL."""

    if not PROMETHEUS_URL:
        raise HTTPException(
            status_code=500,
            detail="PROMETHEUS_URL is not configured",
        )

    return PROMETHEUS_URL


async def prometheus_query(
    client: httpx.AsyncClient,
    query: str,
) -> list[dict[str, Any]]:
    """Run an instant Prometheus query."""

    prometheus_url = require_prometheus_url()

    try:
        response = await client.get(
            f"{prometheus_url}/api/v1/query",
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

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="Prometheus returned invalid JSON",
        ) from exc

    if payload.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail=payload.get(
                "error",
                "Prometheus query failed",
            ),
        )

    return payload.get("data", {}).get("result", [])


async def prometheus_range_query(
    client: httpx.AsyncClient,
    query: str,
    start: float,
    end: float,
    step: str = "30s",
) -> list[dict[str, Any]]:
    """Run a Prometheus range query."""

    prometheus_url = require_prometheus_url()

    try:
        response = await client.get(
            f"{prometheus_url}/api/v1/query_range",
            params={
                "query": query,
                "start": start,
                "end": end,
                "step": step,
            },
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

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="Prometheus returned invalid JSON",
        ) from exc

    if payload.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail=payload.get(
                "error",
                "Prometheus range query failed",
            ),
        )

    return payload.get("data", {}).get("result", [])


def get_numeric_value(
    result: list[dict[str, Any]],
    default: float | None = None,
) -> float | None:
    """Extract the first numeric value from a Prometheus result."""

    if not result:
        return default

    try:
        return float(result[0]["value"][1])
    except (KeyError, IndexError, TypeError, ValueError):
        return default