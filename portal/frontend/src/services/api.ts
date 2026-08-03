import type {
  AddManagedGroupPayload,
  AddManagedUserPayload,
  AutomationRunOptionsResponse,
  AutomationRunDispatchResponse,
  AutomationRunStatusResponse,
  BatchOperationsResponse,
  ManagedUser,
  OverviewResponse,
  RacfManagedStateResponse,
  RunAutomationPayload,
  UpdateMembershipPayload,
} from "../types/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  window.location.origin
).replace(/\/$/, "");

export async function getOverview(
  userid: ManagedUser,
  signal?: AbortSignal,
): Promise<OverviewResponse> {
  const query = new URLSearchParams({ userid });

  const response = await fetch(
    `${API_BASE_URL}/api/overview?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Overview request failed with HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<OverviewResponse>;
}

export async function submitAutomationRun(
  payload: RunAutomationPayload,
): Promise<AutomationRunDispatchResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/automation-run`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const message =
      "Automation run request failed with HTTP " +
      `${response.status}`;

    throw new Error(message);
  }

  return response.json() as Promise<AutomationRunDispatchResponse>;
}

export async function getAutomationRunStatus(
  runId: number,
  signal?: AbortSignal,
): Promise<AutomationRunStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/automation-run/${runId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    const message =
      "Automation status request failed with HTTP " +
      `${response.status}`;

    throw new Error(message);
  }

  return response.json() as Promise<AutomationRunStatusResponse>;
}

export async function getAutomationRunOptions(
  signal?: AbortSignal,
): Promise<AutomationRunOptionsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/automation-run/options`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    const message =
      "Automation options request failed with HTTP " +
      `${response.status}`;

    throw new Error(message);
  }

  return response.json() as Promise<AutomationRunOptionsResponse>;
}

export async function getBatchOperations(
  signal?: AbortSignal,
): Promise<BatchOperationsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/batch-operations`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Batch operations request failed with HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<BatchOperationsResponse>;
}

function withIfMatchHeader(etag?: string): Record<string, string> {
  if (!etag) {
    return {};
  }

  return {
    "If-Match": etag,
  };
}

export async function getRacfManagedState(
  signal?: AbortSignal,
): Promise<RacfManagedStateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/racf-managed-state`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Managed RACF state request failed with HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<RacfManagedStateResponse>;
}

export async function addManagedUser(
  payload: AddManagedUserPayload,
  etag?: string,
): Promise<RacfManagedStateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/racf-managed-state/users`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...withIfMatchHeader(etag),
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Add user failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<RacfManagedStateResponse>;
}

export async function removeManagedUser(
  userid: string,
  etag?: string,
): Promise<RacfManagedStateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/racf-managed-state/users/${encodeURIComponent(userid)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...withIfMatchHeader(etag),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Remove user failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<RacfManagedStateResponse>;
}

export async function addManagedGroup(
  payload: AddManagedGroupPayload,
  etag?: string,
): Promise<RacfManagedStateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/racf-managed-state/groups`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...withIfMatchHeader(etag),
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Add group failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<RacfManagedStateResponse>;
}

export async function removeManagedGroup(
  groupName: string,
  etag?: string,
): Promise<RacfManagedStateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/racf-managed-state/groups/${encodeURIComponent(groupName)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...withIfMatchHeader(etag),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Remove group failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<RacfManagedStateResponse>;
}

export async function updateMembership(
  payload: UpdateMembershipPayload,
  etag?: string,
): Promise<RacfManagedStateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/racf-managed-state/memberships`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...withIfMatchHeader(etag),
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Update membership failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<RacfManagedStateResponse>;
}

export async function triggerRacfRebuild(): Promise<AutomationRunDispatchResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/racf-managed-state/rebuild`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`RACF rebuild trigger failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<AutomationRunDispatchResponse>;
}
