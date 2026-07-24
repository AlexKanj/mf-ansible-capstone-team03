export type ComponentStatus =
  | "successful"
  | "failed"
  | "unknown";

export type PlatformStatus =
  | "healthy"
  | "degraded"
  | "unknown";

export type ManagedUser =
  | "U03D01"
  | "U03D02"
  | "U03T01"
  | "P03PTU";

export interface StatusValue {
  status: ComponentStatus;
  value: number | null;
}

export interface OverviewResponse {
  status: PlatformStatus;
  selected_user: ManagedUser;
  last_updated_timestamp: number | null;

  automation: {
    jcl: StatusValue;
    racf: StatusValue;
    provisioning: StatusValue;
  };

  latest_jcl_job: {
    status: ComponentStatus;
    return_code: number | null;
  };

  racf: {
    managed_users: number | null;
    managed_groups: number | null;
  };

  datasets: {
    ready: number;
    expected: number;
    readiness_percentage: number | null;
  };

  mainframe_activity: {
    active_jobs: number | null;
    active_started_tasks: number | null;
    active_batch_jobs: number | null;
  };
}