from __future__ import annotations

import json
import os
import re
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException


RACF_STATE_BUCKET = os.getenv("RACF_STATE_BUCKET", "").strip()
RACF_STATE_KEY = os.getenv("RACF_STATE_KEY", "racf/managed-state.json").strip()

USER_ID_PATTERN = re.compile(r"^[A-Z0-9]{1,8}$")
ACCESS_VALUES = {"ALTER", "UPDATE", "READ", "CONTROL"}


def default_state() -> dict[str, Any]:
    return {
        "users": {},
        "racf_groups": [],
        "dataset_profiles": [],
        "profile_uacc": "NONE",
        "meta": {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "bootstrap",
            "version": 1,
        },
    }


def require_bucket() -> str:
    if not RACF_STATE_BUCKET:
        raise HTTPException(
            status_code=500,
            detail="RACF_STATE_BUCKET is not configured",
        )

    return RACF_STATE_BUCKET


def get_s3_client():
    return boto3.client("s3")


def _as_upper_userid(value: str) -> str:
    return value.strip().upper()


def _validate_state_shape(state: dict[str, Any]) -> None:
    users = state.get("users")
    racf_groups = state.get("racf_groups")
    dataset_profiles = state.get("dataset_profiles")

    if not isinstance(users, dict):
        raise HTTPException(status_code=422, detail="users must be an object")

    if not isinstance(racf_groups, list):
        raise HTTPException(status_code=422, detail="racf_groups must be an array")

    if not isinstance(dataset_profiles, list):
        raise HTTPException(status_code=422, detail="dataset_profiles must be an array")

    group_names: list[str] = []
    gids: list[int] = []

    for group in racf_groups:
        if not isinstance(group, dict):
            raise HTTPException(status_code=422, detail="racf_groups entries must be objects")

        identity_name = (
            group.get("identity", {}).get("name")
            if isinstance(group.get("identity"), dict)
            else None
        )

        if not isinstance(identity_name, str) or not identity_name.strip():
            raise HTTPException(status_code=422, detail="every racf_group must include identity.name")

        group_names.append(identity_name)

        gid = (
            group.get("omvs", {}).get("gid")
            if isinstance(group.get("omvs"), dict)
            else None
        )
        if not isinstance(gid, int):
            raise HTTPException(status_code=422, detail=f"group {identity_name} is missing integer omvs.gid")
        gids.append(gid)

    if len(group_names) != len(set(group_names)):
        raise HTTPException(status_code=422, detail="racf_groups contains duplicate identity.name values")

    if len(gids) != len(set(gids)):
        raise HTTPException(status_code=422, detail="racf_groups contains duplicate omvs.gid values")

    for group_name, group_users in users.items():
        if group_name not in group_names:
            raise HTTPException(status_code=422, detail=f"users references unknown group {group_name}")

        if not isinstance(group_users, list):
            raise HTTPException(status_code=422, detail=f"users.{group_name} must be an array")

        for userid in group_users:
            if not isinstance(userid, str):
                raise HTTPException(status_code=422, detail=f"users.{group_name} contains a non-string userid")

            if not USER_ID_PATTERN.fullmatch(userid):
                raise HTTPException(status_code=422, detail=f"invalid userid format: {userid}")

    for profile in dataset_profiles:
        if not isinstance(profile, dict):
            raise HTTPException(status_code=422, detail="dataset_profiles entries must be objects")

        userid = profile.get("userid")
        access = profile.get("access")

        if not isinstance(userid, str) or not USER_ID_PATTERN.fullmatch(userid):
            raise HTTPException(status_code=422, detail="dataset_profiles contains invalid userid")

        if not isinstance(access, str) or access.upper() not in ACCESS_VALUES:
            raise HTTPException(status_code=422, detail=f"dataset_profiles contains invalid access value for {userid}")


def read_state() -> tuple[dict[str, Any], str | None, str | None]:
    bucket = require_bucket()
    client = get_s3_client()

    try:
        response = client.get_object(Bucket=bucket, Key=RACF_STATE_KEY)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"NoSuchKey", "404", "NotFound"}:
            state = default_state()
            return state, None, None

        raise HTTPException(status_code=502, detail=f"Unable to read RACF managed state from S3: {code}") from exc

    try:
        raw_body = response["Body"].read().decode("utf-8")
        state = json.loads(raw_body)
    except (KeyError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="RACF managed state object is not valid JSON") from exc

    if not isinstance(state, dict):
        raise HTTPException(status_code=502, detail="RACF managed state must be a JSON object")

    _validate_state_shape(state)
    etag = str(response.get("ETag", "")).strip('"') or None
    version_id = response.get("VersionId")
    return state, etag, version_id


def write_state(
    state: dict[str, Any],
    *,
    updated_by: str,
    expected_etag: str | None,
) -> tuple[str | None, str | None]:
    bucket = require_bucket()
    client = get_s3_client()

    _validate_state_shape(state)

    next_state = deepcopy(state)
    meta = next_state.get("meta")
    if not isinstance(meta, dict):
        meta = {}
        next_state["meta"] = meta

    previous_version = int(meta.get("version", 0)) if str(meta.get("version", "0")).isdigit() else 0
    meta["version"] = previous_version + 1
    meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    meta["updated_by"] = updated_by

    if expected_etag:
        current_state, current_etag, _ = read_state()
        del current_state
        if current_etag != expected_etag:
            raise HTTPException(status_code=409, detail="Managed state has changed. Refresh and retry.")

    payload = json.dumps(next_state, indent=2, sort_keys=True)

    try:
        response = client.put_object(
            Bucket=bucket,
            Key=RACF_STATE_KEY,
            Body=payload.encode("utf-8"),
            ContentType="application/json",
        )
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        raise HTTPException(status_code=502, detail=f"Unable to write RACF managed state to S3: {code}") from exc

    etag = str(response.get("ETag", "")).strip('"') or None
    version_id = response.get("VersionId")
    return etag, version_id


def ensure_group_exists(state: dict[str, Any], group_name: str) -> None:
    groups = state.get("racf_groups", [])
    for group in groups:
        if group.get("identity", {}).get("name") == group_name:
            return
    raise HTTPException(status_code=422, detail=f"Group {group_name} is not managed")


def all_managed_users(state: dict[str, Any]) -> set[str]:
    users_map = state.get("users", {})
    managed: set[str] = set()
    for group_users in users_map.values():
        if isinstance(group_users, list):
            for user in group_users:
                if isinstance(user, str):
                    managed.add(user)
    return managed


def validate_userid(userid: str) -> str:
    normalized = _as_upper_userid(userid)
    if not USER_ID_PATTERN.fullmatch(normalized):
        raise HTTPException(status_code=422, detail="userid must be 1-8 uppercase alphanumeric characters")
    return normalized
