import type {
  AutomationRunDispatchResponse,
  AutomationRunStatusResponse,
  BatchOperationsResponse,
  ManagedUser,
  OverviewResponse,
  RunAutomationPayload,
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
