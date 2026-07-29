import { useCallback, useEffect, useState } from "react";

import { StatusCard } from "../components/StatusCard";
import { getBatchOperations } from "../services/api";
import type {
  BatchJob,
  BatchOperationsResponse,
  JobStatus,
} from "../types/api";

type CardTone = "healthy" | "warning" | "error" | "neutral";

function statusTone(status: JobStatus): CardTone {
  if (status === "successful") return "healthy";
  if (status === "warning") return "warning";
  if (status === "failed" || status === "abend") return "error";
  return "neutral";
}

function formatStatus(status: JobStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatNumber(value: number | null): string {
  return value === null ? "Not available" : String(value);
}

function formatDuration(value: number | null): string {
  return value === null ? "Not reported" : `${value} seconds`;
}

function formatTimestamp(value: string | null): string {
  return value === null
    ? "Not available"
    : new Date(value).toLocaleString();
}

function RecentJobRow({ job }: { job: BatchJob }) {
  return (
    <tr>
      <td>{job.job_id}</td>
      <td>{job.job_name}</td>
      <td>{job.jcl_file}</td>
      <td>{job.student_id ?? "Not provided"}</td>
      <td>{formatTimestamp(job.submitted_at)}</td>
      <td>
        <span
          className={`return-code-badge return-code-badge--${statusTone(
            job.jes.status,
          )}`}
        >
          {job.jes.return_code_display ?? "Unknown"}
        </span>
      </td>
      <td>{formatStatus(job.jes.status)}</td>
      <td>
        {formatNumber(job.records.input)} /{" "}
        {formatNumber(job.records.output)}
      </td>
    </tr>
  );
}

export function BatchOperationsPage() {
  const [batchData, setBatchData] =
    useState<BatchOperationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBatchOperations = useCallback(
    async (initialLoad = false) => {
      if (initialLoad) setLoading(true);
      else setRefreshing(true);

      try {
        const result = await getBatchOperations();
        setBatchData(result);
        setError(null);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load JCL batch operations",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadBatchOperations(true);

    const intervalId = window.setInterval(() => {
      void loadBatchOperations();
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [loadBatchOperations]);

  if (loading && batchData === null) {
    return (
      <main className="page">
        <p className="state-message">
          Loading JCL batch operations…
        </p>
      </main>
    );
  }

  if (error && batchData === null) {
    return (
      <main className="page">
        <section className="error-panel">
          <h1>Unable to load JCL batch operations</h1>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadBatchOperations(true)}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (batchData === null) return null;

  const latestJob = batchData.latest_job;

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Team 03 Operations Portal</p>
          <h1>JCL &amp; Batch Operations</h1>
          <p className="page-description">
            Latest JES job results, automation status, record
            counts, and recent batch activity.
          </p>
        </div>

        <div className="page-actions batch-page-actions">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadBatchOperations()}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="warning-banner">
          Latest refresh failed: {error}. Displaying the last
          available values.
        </div>
      )}

      {latestJob === null ? (
        <section className="batch-empty-state">
          <h2>No JCL jobs recorded</h2>
          <p>Run the JCL automation workflow to populate this page.</p>
        </section>
      ) : (
        <>
          <section className="batch-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Latest submitted job</p>
                <h2>{latestJob.job_name}</h2>
              </div>
              <span
                className={`return-code-badge return-code-badge--${statusTone(
                  latestJob.jes.status,
                )}`}
              >
                RC {latestJob.jes.return_code_display ?? "Unknown"}
              </span>
            </div>

            <div className="job-detail-grid">
              <div><span>Job ID</span><strong>{latestJob.job_id}</strong></div>
              <div><span>JCL file</span><strong>{latestJob.jcl_file}</strong></div>
              <div>
                <span>Student / application</span>
                <strong>{latestJob.student_id ?? "Not provided"}</strong>
              </div>
              <div>
                <span>Submission time</span>
                <strong>{formatTimestamp(latestJob.submitted_at)}</strong>
              </div>
              <div>
                <span>Automation duration</span>
                <strong>
                  {formatDuration(latestJob.automation_duration_seconds)}
                </strong>
              </div>
              <div>
                <span>JES duration</span>
                <strong>{formatDuration(latestJob.jes_duration_seconds)}</strong>
              </div>
              <div>
                <span>Records in</span>
                <strong>{formatNumber(latestJob.records.input)}</strong>
              </div>
              <div>
                <span>Records out</span>
                <strong>{formatNumber(latestJob.records.output)}</strong>
              </div>
            </div>
          </section>

          <section className="status-grid execution-status-grid">
            <StatusCard
              title="Ansible Automation"
              value={formatStatus(latestJob.ansible.status)}
              detail={`Ansible exit code: ${formatNumber(
                latestJob.ansible.exit_code,
              )}`}
              status={statusTone(latestJob.ansible.status)}
            />
            <StatusCard
              title="JES/JCL Result"
              value={formatStatus(latestJob.jes.status)}
              detail={`JES/JCL return code: ${
                latestJob.jes.return_code_display ?? "Unknown"
              }`}
              status={statusTone(latestJob.jes.status)}
            />
          </section>

          <section className="batch-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Output</p>
                <h2>Spool preview</h2>
              </div>
            </div>
            <pre className="spool-preview">
              {latestJob.spool_preview ??
                "Spool preview is not available for this job."}
            </pre>
            {latestJob.full_output_url ? (
              <a
                className="output-link"
                href={latestJob.full_output_url}
                target="_blank"
                rel="noreferrer"
              >
                View full output
              </a>
            ) : (
              <span className="output-link output-link--disabled">
                Full output unavailable
              </span>
            )}
          </section>
        </>
      )}

      <section className="batch-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">History</p>
            <h2>Recent JCL jobs</h2>
          </div>
        </div>

        {batchData.recent_jobs.length === 0 ? (
          <p className="batch-empty-message">
            No recent JCL jobs are available.
          </p>
        ) : (
          <div className="jobs-table-wrapper">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Job name</th>
                  <th>JCL file</th>
                  <th>Student / app</th>
                  <th>Submitted</th>
                  <th>JES RC</th>
                  <th>JES status</th>
                  <th>Records in / out</th>
                </tr>
              </thead>
              <tbody>
                {batchData.recent_jobs.map((job) => (
                  <RecentJobRow
                    key={`${job.job_id}-${job.submitted_at ?? "unknown"}`}
                    job={job}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
