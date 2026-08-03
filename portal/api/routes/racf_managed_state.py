from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from routes.automation_runs import (
    DEFAULT_BRANCH,
    GITHUB_API_URL,
    GITHUB_REPO,
    WORKFLOW_FILE,
    github_headers,
    require_github_config,
)
from services.racf_state_store import (
    all_managed_users,
    ensure_group_exists,
    read_state,
    validate_userid,
    write_state,
)


router = APIRouter(
    prefix="/api/racf-managed-state",
    tags=["RACF managed state"],
)


class AddUserRequest(BaseModel):
    userid: str = Field(min_length=1, max_length=8)
    group: str = Field(min_length=1)
    access: str = Field(default="ALTER")


class AddGroupRequest(BaseModel):
    name: str = Field(min_length=1)
    owner: str = Field(default="IBMUSER")
    superior_group: str = Field(default="SYS1")
    gid: int = Field(gt=0)


class UpdateMembershipRequest(BaseModel):
    userid: str = Field(min_length=1, max_length=8)
    group: str = Field(min_length=1)


def _dispatch_payload_for_rebuild() -> dict[str, Any]:
    return {
        "ref": DEFAULT_BRANCH,
        "inputs": {
            "PLAYBOOK_NAME": "racf_rebuild.yml",
            "JCL_FILE": "",
            "JCL_TEXT": "",
            "STUDENT_ID": "",
            "RUN_MF_METRICS": "true",
            "REBUILD_RACF": "true",
            "REBUILD_DATASETS": "false",
        },
    }


async def dispatch_racf_rebuild() -> dict[str, Any]:
    require_github_config()

    dispatch_url = (
        f"{GITHUB_API_URL}/repos/{GITHUB_REPO}/actions/workflows/"
        f"{WORKFLOW_FILE}/dispatches"
    )
    runs_url = (
        f"{GITHUB_API_URL}/repos/{GITHUB_REPO}/actions/workflows/"
        f"{WORKFLOW_FILE}/runs"
    )

    runs_query_params = {
        "event": "workflow_dispatch",
        "branch": DEFAULT_BRANCH,
        "per_page": 10,
    }
    dispatch_started_at = datetime.now(timezone.utc)

    async with httpx.AsyncClient(timeout=20.0) as client:
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

        dispatch_response = await client.post(
            dispatch_url,
            headers=github_headers(),
            json=_dispatch_payload_for_rebuild(),
        )

        if dispatch_response.status_code >= 400:
            raise HTTPException(status_code=502, detail="Failed to dispatch RACF rebuild workflow")

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


def _state_response(state: dict[str, Any], etag: str | None, version_id: str | None) -> dict[str, Any]:
    return {
        "etag": etag,
        "version_id": version_id,
        "state": state,
        "managed_users": sorted(all_managed_users(state)),
    }


@router.get("")
async def get_managed_state() -> dict[str, Any]:
    state, etag, version_id = read_state()
    return _state_response(state, etag, version_id)


@router.post("/users")
async def add_managed_user(
    payload: AddUserRequest,
    if_match: str | None = Header(default=None, alias="If-Match"),
) -> dict[str, Any]:
    state, _, _ = read_state()
    userid = validate_userid(payload.userid)
    group_name = payload.group.strip().upper()
    ensure_group_exists(state, group_name)

    users = state.setdefault("users", {})
    group_users = users.setdefault(group_name, [])
    if userid not in group_users:
        group_users.append(userid)
        group_users.sort()

    dataset_profiles = state.setdefault("dataset_profiles", [])
    if not any(profile.get("userid") == userid for profile in dataset_profiles):
        dataset_profiles.append({"userid": userid, "access": payload.access.strip().upper() or "ALTER"})

    etag, version_id = write_state(state, updated_by="portal:add_user", expected_etag=if_match)
    dispatch = await dispatch_racf_rebuild()
    return {
        **_state_response(state, etag, version_id),
        "rebuild": dispatch,
    }


@router.delete("/users/{userid}")
async def remove_managed_user(
    userid: str,
    if_match: str | None = Header(default=None, alias="If-Match"),
) -> dict[str, Any]:
    state, _, _ = read_state()
    normalized_userid = validate_userid(userid)

    users = state.setdefault("users", {})
    for group_name, group_users in users.items():
        if isinstance(group_users, list) and normalized_userid in group_users:
            users[group_name] = [u for u in group_users if u != normalized_userid]

    dataset_profiles = state.setdefault("dataset_profiles", [])
    state["dataset_profiles"] = [
        profile for profile in dataset_profiles if profile.get("userid") != normalized_userid
    ]

    etag, version_id = write_state(state, updated_by="portal:remove_user", expected_etag=if_match)
    dispatch = await dispatch_racf_rebuild()
    return {
        **_state_response(state, etag, version_id),
        "rebuild": dispatch,
    }


@router.post("/groups")
async def add_managed_group(
    payload: AddGroupRequest,
    if_match: str | None = Header(default=None, alias="If-Match"),
) -> dict[str, Any]:
    state, _, _ = read_state()
    group_name = payload.name.strip().upper()

    groups = state.setdefault("racf_groups", [])
    if any(group.get("identity", {}).get("name") == group_name for group in groups):
        raise HTTPException(status_code=409, detail=f"Group {group_name} already exists")

    groups.append(
        {
            "identity": {"name": group_name},
            "hierarchy": {
                "owner": payload.owner.strip().upper() or "IBMUSER",
                "superior_group": payload.superior_group.strip().upper() or "SYS1",
            },
            "omvs": {"gid": payload.gid},
            "installation_data": "",
            "model_data_set": "",
            "metadata": {"created": ""},
            "subgroups": [],
            "connected_users": [],
        }
    )
    state.setdefault("users", {}).setdefault(group_name, [])

    etag, version_id = write_state(state, updated_by="portal:add_group", expected_etag=if_match)
    dispatch = await dispatch_racf_rebuild()
    return {
        **_state_response(state, etag, version_id),
        "rebuild": dispatch,
    }


@router.delete("/groups/{group_name}")
async def remove_managed_group(
    group_name: str,
    if_match: str | None = Header(default=None, alias="If-Match"),
) -> dict[str, Any]:
    state, _, _ = read_state()
    target_group = group_name.strip().upper()

    users = state.setdefault("users", {})
    existing_group_users = users.get(target_group, [])
    if existing_group_users:
        raise HTTPException(
            status_code=409,
            detail=f"Group {target_group} still has mapped users; move or remove users first",
        )

    groups = state.setdefault("racf_groups", [])
    next_groups = [group for group in groups if group.get("identity", {}).get("name") != target_group]
    if len(next_groups) == len(groups):
        raise HTTPException(status_code=404, detail=f"Group {target_group} is not managed")

    state["racf_groups"] = next_groups
    users.pop(target_group, None)

    etag, version_id = write_state(state, updated_by="portal:remove_group", expected_etag=if_match)
    dispatch = await dispatch_racf_rebuild()
    return {
        **_state_response(state, etag, version_id),
        "rebuild": dispatch,
    }


@router.put("/memberships")
async def update_user_membership(
    payload: UpdateMembershipRequest,
    if_match: str | None = Header(default=None, alias="If-Match"),
) -> dict[str, Any]:
    state, _, _ = read_state()
    userid = validate_userid(payload.userid)
    target_group = payload.group.strip().upper()
    ensure_group_exists(state, target_group)

    users = state.setdefault("users", {})
    for group_name, group_users in users.items():
        if not isinstance(group_users, list):
            continue
        users[group_name] = [u for u in group_users if u != userid]

    users.setdefault(target_group, []).append(userid)
    users[target_group] = sorted(set(users[target_group]))

    etag, version_id = write_state(state, updated_by="portal:update_membership", expected_etag=if_match)
    dispatch = await dispatch_racf_rebuild()
    return {
        **_state_response(state, etag, version_id),
        "rebuild": dispatch,
    }


@router.post("/rebuild")
async def trigger_racf_rebuild() -> dict[str, Any]:
    return await dispatch_racf_rebuild()
