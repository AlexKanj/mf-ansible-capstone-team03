# Grafana Queries — Mainframe Customer Processing Platform

PromQL queries for monitoring Bitbucket Pipelines, z/OS job execution, and mainframe system health.

---

## Recommended Dashboard Layout

| Row | Panel | Type |
|---|---|---|
| 1 | Latest pipeline status | Stat |
| 1 | Last z/OS job RC | Stat |
| 1 | Total datasets on mainframe | Stat |
| 1 | Active started tasks | Stat |
| 2 | Pipeline success rate (%) | Gauge |
| 2 | Job success rate by student | Bar chart |
| 3 | Pipeline duration trend | Time series |
| 3 | Records processed per job | Time series |
| 4 | Dataset inventory table | Table |
| 4 | Active jobs breakdown | Bar chart |

---

## Pipeline Health

### Latest run status
```promql
bitbucket_ansible_playbook_latest_success{repo="mf"}
```
*Stat panel — green=1, red=0*

### Overall pipeline success rate (%)
```promql
100 *
  sum(bitbucket_ansible_playbook_run_success)
/
  (sum(bitbucket_ansible_playbook_run_success) + sum(bitbucket_ansible_playbook_run_failure))
```

### Time since last run
```promql
time() - bitbucket_ansible_playbook_last_run_timestamp_seconds{repo="mf"}
```
*Alert if this exceeds your expected pipeline cadence.*

### Latest pipeline duration
```promql
bitbucket_ansible_playbook_latest_duration_seconds{repo="mf"}
```

### Average duration by playbook
```promql
avg by (playbook) (bitbucket_ansible_playbook_run_duration_seconds)
```

### Pipeline runs by playbook (bar chart)
```promql
sum by (playbook) (bitbucket_ansible_playbook_run_success)
```

---

## z/OS Job Execution

### Last job return code
```promql
zos_job_return_code
```
*Stat panel — value 0 = perfect, up to 4 = warning (acceptable), negative = ABEND*

| RC | Meaning |
|---|---|
| 0 | Success |
| 4 | Warning (acceptable) |
| 8 | Error |
| 12+ | Severe error |
| −1 | ABEND or unknown |

### Job success rate by student (%)
```promql
100 *
  sum by (student) (zos_job_success)
/
  count by (student) (zos_job_success)
```

### Most recent job result per student
```promql
zos_job_success
```
*Table panel with `student`, `job_name`, `jcl` columns — shows who ran what and whether it passed.*

### Records processed per job run (time series)
```promql
zos_job_records_out
```
*Use `job_name` or `jcl` as the legend to see each job's output volume over time.*

### Jobs with non-zero return code (alerting)
```promql
zos_job_return_code > 4
```
*Alert rule: fire when any job RC exceeds 4.*

### Total records written by student
```promql
sum by (student) (zos_job_records_out)
```

### Jobs run per JCL file
```promql
count by (jcl) (zos_job_return_code)
```

---

## Mainframe System Health

### Total datasets on the mainframe
```promql
zos_ibmuser_dataset_count{host="mainframe"}
```
*Stat panel — shows how many files are cataloged under IBMUSER.*

### Active started tasks (system daemons)
```promql
zos_active_stc_count{host="mainframe"}
```
*Alert if this drops significantly — indicates system services have stopped.*

### Active batch jobs
```promql
zos_active_batch_job_count{host="mainframe"}
```

### Total active jobs
```promql
zos_active_job_count{host="mainframe"}
```

### Dataset inventory table
```promql
zos_dataset_exists
```
*Table panel — set columns to `dataset`, `type`. Each row is one cataloged dataset.*
*Filter by student: `zos_dataset_exists{dataset=~"IBMUSER\\.STU01\\..*"}`*

### Datasets by type breakdown
```promql
count by (type) (zos_dataset_exists)
```
*Pie chart — shows split between NONVSAM (sequential/PDS), CLUSTER (VSAM), etc.*

---

## Multi-Student Filtering

All job metrics include a `student` label. Use Grafana dashboard variables to make panels filterable.

**Create a dashboard variable:**
- Name: `student`
- Type: Query
- Query: `label_values(zos_job_return_code, student)`

Then use `{student="$student"}` in any panel query.

### Jobs run by a specific student
```promql
zos_job_return_code{student="STU01"}
```

### Records processed by a specific student
```promql
sum(zos_job_records_out{student="$student"})
```

### Compare record output across all students
```promql
sum by (student) (zos_job_records_out)
```

### Student's datasets on the mainframe
```promql
zos_dataset_exists{dataset=~"IBMUSER\\.STU01\\..*"}
```
*Replace STU01 with `$student` when using a dashboard variable.*

---

## Alerting Rules (Prometheus)

Add to your Prometheus `rules.yml`:

```yaml
groups:
  - name: mainframe
    rules:
      - alert: ZosJobFailed
        expr: zos_job_return_code > 4
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "z/OS job {{ $labels.job_name }} failed (RC={{ $value }})"
          description: "Student {{ $labels.student }} ran {{ $labels.jcl }}"

      - alert: PipelineNotRunning
        expr: time() - bitbucket_ansible_playbook_last_run_timestamp_seconds > 86400
        for: 0m
        labels:
          severity: info
        annotations:
          summary: "No pipeline run in the last 24 hours"

      - alert: ZosSystemJobsDraining
        expr: zos_active_stc_count < 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Active STC count dropped below 10 — system may be degraded"
```

---

## Label Reference

| Label | Appears on | Description |
|---|---|---|
| `playbook` | `bitbucket_ansible_*` | Ansible playbook filename |
| `repo` | `bitbucket_ansible_*` | Bitbucket repo slug |
| `branch` | `bitbucket_ansible_*` | Git branch |
| `build` | `bitbucket_ansible_run_*` | Bitbucket build number |
| `student` | `zos_job_*` | STUDENT_ID from pipeline variable |
| `jcl` | `zos_job_*` | JCL filename that was submitted |
| `job_id` | `zos_job_*` | z/OS job ID (e.g. JOB00123) |
| `job_name` | `zos_job_*` | z/OS job name from JCL card |
| `host` | `zos_ibmuser_*`, `zos_active_*`, `zos_dataset_*` | Mainframe hostname |
| `dataset` | `zos_dataset_exists` | Full dataset name |
| `type` | `zos_dataset_exists` | Dataset type (NONVSAM, CLUSTER, etc.) |
