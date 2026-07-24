import type {
  ManagedUser,
  OverviewResponse,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";

export async function getOverview(
  userid: ManagedUser,
  signal?: AbortSignal,
): Promise<OverviewResponse> {
  const url = new URL(`${API_BASE_URL}/api/overview`);
  url.searchParams.set("userid", userid);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    const message =
      `Overview request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  return response.json() as Promise<OverviewResponse>;
}