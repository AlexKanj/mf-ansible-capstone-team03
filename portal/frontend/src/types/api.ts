export type ComponentStatus =
  | "successful"
  | "failed"
  | "unknown";

export type PlatformStatus =
  | "healthy"
  | "degraded"
  | "unknown";

export type ManagedUser = string;

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
  jcl_text?: string;
}

export interface AutomationOption {
  value: string;
  name: string;
  description: string;
  path: string;
  code_preview: string;
  is_manual_jcl: boolean;
}

export interface AutomationRunOptionsResponse {
  source: "local" | "github";
  generated_at: string;
  playbooks: AutomationOption[];
  jcl_files: AutomationOption[];
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

export interface RacfGroup {
  identity: {
    name: string;
  };
  hierarchy: {
    owner: string;
    superior_group: string;
  };
  omvs: {
    gid: number;
  };
  installation_data: string;
  model_data_set: string;
  metadata: {
    created: string;
  };
  subgroups: string[];
  connected_users: string[];
}

export interface DatasetProfile {
  userid: string;
  access: string;
}

export interface RacfManagedState {
  users: Record<string, string[]>;
  racf_groups: RacfGroup[];
  dataset_profiles: DatasetProfile[];
  profile_uacc: string;
  meta?: {
    updated_at?: string;
    updated_by?: string;
    version?: number;
  };
}

export interface RacfManagedStateResponse {
  etag: string | null;
  version_id: string | null;
  managed_users: string[];
  state: RacfManagedState;
  rebuild?: AutomationRunDispatchResponse;
}

export interface AddManagedUserPayload {
  userid: string;
  group: string;
  access: string;
}

export interface AddManagedGroupPayload {
  name: string;
  owner: string;
  superior_group: string;
  gid: number;
}

export interface UpdateMembershipPayload {
  userid: string;
  group: string;
}
