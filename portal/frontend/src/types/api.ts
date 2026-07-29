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

export type BooleanString = "true" | "false";

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

export interface RunAutomationPayload {
  playbook: string;
  jcl_file: string;
  student_id: string;
  run_mf_metrics: BooleanString;
  rebuild_racf: BooleanString;
  rebuild_datasets: BooleanString;
}

export interface AutomationRunDispatchResponse {
  status: string;
  run_id?: number;
  run_number?: number;
  html_url?: string;
}

export interface AutomationRunStatusResponse {
  run_id: number | null;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  event: string | null;
  run_number: number | null;
  html_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type JobStatus =
  | "successful"
  | "warning"
  | "failed"
  | "abend"
  | "unknown";

export interface JesResult {
  return_code: number | null;
  return_code_display: string | null;
  status: JobStatus;
}

export interface AnsibleResult {
  exit_code: number | null;
  status: JobStatus;
}

export interface RecordCounts {
  input: number | null;
  output: number | null;
}

export interface BatchJob {
  job_name: string;
  job_id: string;
  jcl_file: string;
  student_id: string | null;
  submitted_at: string | null;
  automation_duration_seconds: number | null;
  jes_duration_seconds: number | null;
  jes: JesResult;
  ansible: AnsibleResult;
  records: RecordCounts;
  spool_preview: string | null;
  full_output_url: string | null;
}

export interface BatchOperationsResponse {
  latest_job: BatchJob | null;
  recent_jobs: BatchJob[];
}
