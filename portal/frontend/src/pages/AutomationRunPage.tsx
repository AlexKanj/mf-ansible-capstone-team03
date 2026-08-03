import { useState } from "react";
import type { FormEvent } from "react";

import {
  getAutomationRunStatus,
  submitAutomationRun,
} from "../services/api";
import type {
  AutomationRunDispatchResponse,
  AutomationRunStatusResponse,
  RunAutomationPayload,
} from "../types/api";

const INITIAL_FORM: RunAutomationPayload = {
  playbook: "",
  jcl_file: "",
  student_id: "",
  run_mf_metrics: "true",
  rebuild_racf: "false",
  rebuild_datasets: "false",
};

const MANUAL_JCL_PLAYBOOK = "run_manual_jcl.yml";

const PLAYBOOK_OPTIONS = [
  "gather_mf_metrics.yml",
  "hello_world.yml",
  "run_jcl_nonfatal.yml",
  "run_jcl.yml",
  "run_manual_jcl.yml",
] as const;

const JCL_OPTIONS = [
  "create_customer_file.jcl",
  "delete_customer_file.jcl",
  "hello_world_fail.jcl",
  "hello_world.jcl",
  "list_datasets.jcl",
  "report_customers.jcl",
  "sort_customers.jcl",
] as const;

function formatDate(value: string | null): string {
  if (!value) {
    return "Unavailable";
  }

  return new Date(value).toLocaleString();
}

export function AutomationRunPage() {
  const [formData, setFormData] =
    useState<RunAutomationPayload>(INITIAL_FORM);

  const [dispatchResult, setDispatchResult] =
    useState<AutomationRunDispatchResponse | null>(null);

  const [runStatus, setRunStatus] =
    useState<AutomationRunStatusResponse | null>(null);

  const [runIdInput, setRunIdInput] = useState("");

  const [manualJclText, setManualJclText] =
    useState("");

  const [submitLoading, setSubmitLoading] =
    useState(false);

  const [statusLoading, setStatusLoading] =
    useState(false);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [statusError, setStatusError] =
    useState<string | null>(null);

  const isManualJclPlaybook =
    formData.playbook.trim() === MANUAL_JCL_PLAYBOOK;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedPlaybook = formData.playbook.trim();

    if (!selectedPlaybook) {
      setSubmitError("Playbook name is required");
      return;
    }

    if (isManualJclPlaybook && !manualJclText.trim()) {
      setSubmitError("JCL text is required in manual mode");
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    setRunStatus(null);

    try {
      const submitPayload: RunAutomationPayload & {
        jcl_text?: string;
      } = {
        ...formData,
        playbook: selectedPlaybook,
        jcl_file: isManualJclPlaybook
          ? ""
          : formData.jcl_file.trim(),
        student_id: formData.student_id.trim(),
      };

      if (isManualJclPlaybook) {
        submitPayload.jcl_text = manualJclText.trim();
      }

      const result = await submitAutomationRun(
        submitPayload as RunAutomationPayload,
      );

      setDispatchResult(result);

      if (typeof result.run_id === "number") {
        setRunIdInput(String(result.run_id));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit automation run";

      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function onCheckStatus() {
    const parsedRunId = Number.parseInt(runIdInput, 10);

    if (!Number.isInteger(parsedRunId) || parsedRunId <= 0) {
      setStatusError("Enter a valid numeric run ID");
      return;
    }

    setStatusLoading(true);
    setStatusError(null);

    try {
      const status = await getAutomationRunStatus(parsedRunId);
      setRunStatus(status);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to fetch run status";

      setStatusError(message);
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Team 03 Operations Portal</p>
          <h1>Automation Runs</h1>
          <p className="page-description">
            Trigger the automation GitHub workflow and manually
            check execution status.
          </p>
        </div>
      </header>

      <section className="automation-grid">
        <form className="automation-form" onSubmit={onSubmit}>
          <h2>Submit Automation Run</h2>

          <label htmlFor="playbook">Playbook</label>
          <select
            id="playbook"
            value={formData.playbook}
            onChange={(event) => {
              setFormData((previous) => ({
                ...previous,
                playbook: event.target.value,
              }));
              setSubmitError(null);
            }}
            required
          >
            <option value="">Select a playbook</option>
            {PLAYBOOK_OPTIONS.map((playbook) => (
              <option key={playbook} value={playbook}>
                {playbook}
              </option>
            ))}
          </select>

          {isManualJclPlaybook ? (
            <>
              <label htmlFor="manual-jcl-text">
                Manual JCL text
              </label>
              <textarea
                id="manual-jcl-text"
                placeholder="//JOBNAME JOB ..."
                value={manualJclText}
                onChange={(event) => {
                  setManualJclText(event.target.value);
                }}
                rows={12}
                required
              />
            </>
          ) : (
            <>
              <label htmlFor="jcl-file">JCL file</label>
              <select
                id="jcl-file"
                value={formData.jcl_file}
                onChange={(event) => {
                  setFormData((previous) => ({
                    ...previous,
                    jcl_file: event.target.value,
                  }));
                }}
              >
                <option value="">Select a JCL file</option>
                {JCL_OPTIONS.map((jclFile) => (
                  <option key={jclFile} value={jclFile}>
                    {jclFile}
                  </option>
                ))}
              </select>
            </>
          )}

          <label htmlFor="student-id">Student ID</label>
          <input
            id="student-id"
            type="text"
            placeholder="U03D01"
            value={formData.student_id}
            onChange={(event) => {
              setFormData((previous) => ({
                ...previous,
                student_id: event.target.value,
              }));
            }}
          />

          <label htmlFor="run-metrics">Run MF metrics</label>
          <select
            id="run-metrics"
            value={formData.run_mf_metrics}
            onChange={(event) => {
              setFormData((previous) => ({
                ...previous,
                run_mf_metrics: event.target.value as "true" | "false",
              }));
            }}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>

          <label htmlFor="rebuild-racf">Rebuild RACF</label>
          <select
            id="rebuild-racf"
            value={formData.rebuild_racf}
            onChange={(event) => {
              setFormData((previous) => ({
                ...previous,
                rebuild_racf: event.target.value as "true" | "false",
              }));
            }}
          >
            <option value="false">false</option>
            <option value="true">true</option>
          </select>

          <label htmlFor="rebuild-datasets">Rebuild datasets</label>
          <select
            id="rebuild-datasets"
            value={formData.rebuild_datasets}
            onChange={(event) => {
              setFormData((previous) => ({
                ...previous,
                rebuild_datasets: event.target.value as "true" | "false",
              }));
            }}
          >
            <option value="false">false</option>
            <option value="true">true</option>
          </select>

          <button type="submit" disabled={submitLoading}>
            {submitLoading ? "Submitting..." : "Submit run"}
          </button>

          {submitError && (
            <p className="automation-error">{submitError}</p>
          )}
        </form>

        <section className="automation-panel">
          <h2>Run Details</h2>

          <div className="automation-status-check">
            <label htmlFor="run-id">Run ID</label>
            <div className="automation-status-check__row">
              <input
                id="run-id"
                type="text"
                inputMode="numeric"
                placeholder="123456789"
                value={runIdInput}
                onChange={(event) => {
                  setRunIdInput(event.target.value);
                }}
              />

              <button
                type="button"
                disabled={statusLoading}
                onClick={() => void onCheckStatus()}
              >
                {statusLoading
                  ? "Checking..."
                  : "Check status"}
              </button>
            </div>
          </div>

          {statusError && (
            <p className="automation-error">{statusError}</p>
          )}

          {dispatchResult && (
            <div className="automation-result">
              <h3>Dispatch Result</h3>
              <p>
                Status: <strong>{dispatchResult.status}</strong>
              </p>
              <p>
                Run ID: {dispatchResult.run_id ?? "Not available yet"}
              </p>
              <p>
                Run Number: {dispatchResult.run_number ?? "Not available yet"}
              </p>
              {dispatchResult.html_url && (
                <a
                  href={dispatchResult.html_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in GitHub Actions
                </a>
              )}
            </div>
          )}

          {runStatus && (
            <div className="automation-result">
              <h3>Latest Status</h3>
              <p>
                Name: {runStatus.name ?? "Unavailable"}
              </p>
              <p>
                Status: <strong>{runStatus.status ?? "unknown"}</strong>
              </p>
              <p>
                Conclusion: {runStatus.conclusion ?? "pending"}
              </p>
              <p>
                Event: {runStatus.event ?? "Unavailable"}
              </p>
              <p>
                Run Number: {runStatus.run_number ?? "Unavailable"}
              </p>
              <p>
                Created: {formatDate(runStatus.created_at)}
              </p>
              <p>
                Updated: {formatDate(runStatus.updated_at)}
              </p>
              {runStatus.html_url && (
                <a
                  href={runStatus.html_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View workflow run
                </a>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
