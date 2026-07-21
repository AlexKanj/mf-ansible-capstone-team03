# Mainframe Customer Processing Platform

Ansible-based automation for running JCL jobs and collecting operational metrics from a z/OS mainframe, integrated with Bitbucket Pipelines and Prometheus/Grafana for observability.

---

## Prerequisites

- Bitbucket repository with Pipelines enabled
- SSH key pair with access to the z/OS system (`id_rsa` / `id_rsa.pub` in `ansible/`)
- A running Prometheus Pushgateway (e.g. `http://YOUR_IP:9091`) INSTALL GUIDE -> https://github.com/d-blanco/prometheus-push-gateway
- The following Bitbucket Pipeline **repository variable** (set in repo Settings → Pipelines → Repository variables):
  | Variable | Description |
  |---|---|
  | `PUSHGATEWAY_URL` | Pushgateway base URL, e.g. `http://1.2.3.4:9091` |

---

## Repository Structure

```
ansible/
  inventory.yml          # Mainframe host definition
  group_vars/all.yml     # z/OS environment variables (ZOAU, Python paths)
  ansible.cfg            # Pipelining enabled (required for z/OS EBCDIC handling)
  id_rsa                 # SSH private key (chmod 600)

  # Playbooks
  ping.yml               # Connectivity check
  gather_facts.yml        # Collect z/OS system facts (CPU, IPL info)
  gather_mf_metrics.yml  # Push dataset count + job counts to Prometheus
  run_jcl.yml            # Generic JCL runner — submit any file from jcl/
  list_active_started_tasks.yml
  list_sys1_proclib_members.yml

  jcl/                   # JCL job library — add new .jcl files here
    hello_world.jcl
    list_datasets.jcl
    create_customer_file.jcl
    sort_customers.jcl
    report_customers.jcl
    delete_customer_file.jcl
```

---

## Running the Pipeline

Trigger **run-ansible-mainframe** from Bitbucket Pipelines → Run pipeline → Custom.

### Pipeline Variables

| Variable | Default | Description |
|---|---|---|
| `PLAYBOOK_NAME` | `run_jcl.yml` | Ansible playbook to run |
| `JCL_FILE` | `hello_world.jcl` | JCL file from `jcl/` (used when `PLAYBOOK_NAME=run_jcl.yml`) |
| `STUDENT_ID` | *(empty)* | Student identifier for dataset/job isolation (see below) |
| `RUN_MF_METRICS` | `false` | Set to `true` to also run `gather_mf_metrics.yml` and push system metrics |

### Common Runs

| Goal | PLAYBOOK_NAME | JCL_FILE | STUDENT_ID |
|---|---|---|---|
| Connectivity check | `ping.yml` | — | — |
| Hello World job | `run_jcl.yml` | `hello_world.jcl` | `STU01` |
| Create customer file | `run_jcl.yml` | `create_customer_file.jcl` | `STU01` |
| Sort customer records | `run_jcl.yml` | `sort_customers.jcl` | `STU01` |
| Print customer report | `run_jcl.yml` | `report_customers.jcl` | `STU01` |
| Delete customer file | `run_jcl.yml` | `delete_customer_file.jcl` | `STU01` |
| List student's datasets | `run_jcl.yml` | `list_datasets.jcl` | `STU01` |
| Push system metrics | `ping.yml` | — | — (set `RUN_MF_METRICS=true`) |

### Running Locally

```bash
cd ansible
chmod 600 id_rsa
export ANSIBLE_HOST_KEY_CHECKING=False

# Connectivity check
ansible-playbook -u ibmuser -i inventory.yml --private-key id_rsa ping.yml

# Submit a JCL job (student-scoped)
ansible-playbook -u ibmuser -i inventory.yml --private-key id_rsa \
  -e "jcl_file=create_customer_file.jcl student_id=STU01" \
  run_jcl.yml

# Collect system metrics
ansible-playbook -u ibmuser -i inventory.yml --private-key id_rsa \
  gather_mf_metrics.yml
```

---

## Multi-Student Support

Multiple students share the same z/OS system. Setting `STUDENT_ID` isolates each student's datasets and job names so they don't collide.

**With `STUDENT_ID=STU01`:**
- Datasets: `IBMUSER.STU01.CUSTOMER.DATA`, `IBMUSER.STU01.CUSTOMER.SORTED`
- Job names: `STU01CRT`, `STU01SRT`, `STU01RPT`, `STU01DEL`, `STU01HW`

**With no `STUDENT_ID`** (blank/default):
- Datasets: `IBMUSER.CUSTOMER.DATA` (backward compatible)
- Job names: `CRT`, `SRT`, `RPT`, `DEL`, `HW`

`STUDENT_ID` must be **6 characters or fewer**, alphanumeric, uppercase recommended (e.g. `STU01`, `ALICE`, `TEAM3`).

---

## Adding New JCL Jobs

1. Create a `.jcl` file in `ansible/jcl/`
2. Use `{{ job_prefix }}XXX` for the job name (first line)
3. Use `{{ ds_hlq }}.YOUR.DATASET` for any dataset names
4. Run it via the pipeline with `PLAYBOOK_NAME=run_jcl.yml` and `JCL_FILE=your_job.jcl`

The JCL files are Jinja2 templates. Available variables:

| Variable | Example (STUDENT_ID=STU01) | Description |
|---|---|---|
| `job_prefix` | `STU01` | First 5 chars of STUDENT_ID, uppercase |
| `ds_hlq` | `IBMUSER.STU01` | Dataset high-level qualifier |
| `student_id_upper` | `STU01` | Full STUDENT_ID uppercased |

---

## JCL Job Runbook

Run these in order for the full customer processing demo:

1. **`create_customer_file.jcl`** — Creates `CUSTOMER.DATA` with 5 sample records. Re-runnable (deletes and recreates).
2. **`sort_customers.jcl`** — Sorts `CUSTOMER.DATA` by ID into `CUSTOMER.SORTED`. Re-runnable.
3. **`report_customers.jcl`** — Prints all customer records to the JES spool. Run any time after step 1.
4. **`list_datasets.jcl`** — Lists all datasets under your HLQ. Run any time.
5. **`delete_customer_file.jcl`** — Cleans up `CUSTOMER.DATA`. Run to reset.

---

## Metrics and Observability

Every pipeline run pushes metrics to the Prometheus Pushgateway. Two categories:

### Pipeline Metrics (always pushed)
Standard CI/CD execution metrics: success, failure, duration, exit code, timestamp.
Labels: `playbook`, `repo`, `branch`, `build`.

### Job Metrics (pushed when `PLAYBOOK_NAME=run_jcl.yml`)
Per-JCL-job metrics from the z/OS spool output:

| Metric | Description |
|---|---|
| `zos_job_return_code` | Actual z/OS job RC (−1 = ABEND or unknown) |
| `zos_job_success` | 1 if RC ≤ 4 (z/OS convention for success/warning) |
| `zos_job_records_in` | Input records processed (from SYSPRINT) |
| `zos_job_records_out` | Output records written (from SYSPRINT) |

Labels: `job_id`, `job_name`, `student`, `jcl`.

### System Metrics (pushed when `RUN_MF_METRICS=true`)

| Metric | Description |
|---|---|
| `zos_ibmuser_dataset_count` | Total cataloged datasets under IBMUSER |
| `zos_dataset_exists` | One time series per dataset (labels: `dataset`, `type`) |
| `zos_active_stc_count` | Active started tasks (system daemons) |
| `zos_active_batch_job_count` | Active batch jobs |
| `zos_active_job_count` | Total active jobs (all classes) |

Labels: `host`.

See `Grafana-Example-Queries.md` for ready-to-use PromQL queries and recommended dashboard layouts.
