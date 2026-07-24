import type {
  ManagedUser,
  OverviewResponse,
} from "../types/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000"
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