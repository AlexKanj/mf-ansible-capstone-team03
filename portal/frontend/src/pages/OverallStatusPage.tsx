import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { StatusCard } from "../components/StatusCard";
import {
  getOverview,
  getRacfManagedState,
} from "../services/api";
import type {
  ComponentStatus,
  ManagedUser,
  OverviewResponse,
  PlatformStatus,
} from "../types/api";

function componentCardStatus(
  status: ComponentStatus,
): "healthy" | "error" | "neutral" {
  if (status === "successful") {
    return "healthy";
  }

  if (status === "failed") {
    return "error";
  }

  return "neutral";
}

function platformCardStatus(
  status: PlatformStatus,
): "healthy" | "warning" | "neutral" {
  if (status === "healthy") {
    return "healthy";
  }

  if (status === "degraded") {
    return "warning";
  }

  return "neutral";
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatNumber(value: number | null): string {
  return value === null ? "Unavailable" : String(value);
}

function formatTimestamp(
  timestamp: number | null,
): string {
  if (timestamp === null) {
    return "No timestamp available";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

export function OverallStatusPage() {
  const [managedUsers, setManagedUsers] =
    useState<ManagedUser[]>([
      "P03PTU",
    ]);

  const [userid, setUserid] =
    useState<ManagedUser>("P03PTU");

  const [overview, setOverview] =
    useState<OverviewResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadOverview = useCallback(
    async (
      selectedUser: ManagedUser,
      initialLoad = false,
    ) => {
      const controller = new AbortController();

      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await getOverview(
          selectedUser,
          controller.signal,
        );

        setOverview(result);
        setError(null);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load platform status";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    void getRacfManagedState(controller.signal)
      .then((state) => {
        const users = state.managed_users;
        if (!users.length) {
          return;
        }

        setManagedUsers(users);
        setUserid((current) =>
          users.includes(current) ? current : users[0],
        );
      })
      .catch(() => {
        // Keep fallback managed users when RACF state cannot be read.
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    void loadOverview(userid, true);

    const intervalId = window.setInterval(() => {
      void loadOverview(userid);
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [userid, loadOverview]);

  if (loading && overview === null) {
    return (
      <main className="page">
        <p className="state-message">
          Loading current platform state…
        </p>
      </main>
    );
  }

  if (error && overview === null) {
    return (
      <main className="page">
        <section className="error-panel">
          <h1>Unable to load platform status</h1>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => void loadOverview(userid, true)}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (overview === null) {
    return null;
  }

  const grafanaUrl =
    import.meta.env.VITE_GRAFANA_URL?.trim() ||
    `${window.location.protocol}//${window.location.hostname}:3000`;

  const githubActionsUrl =
    import.meta.env.VITE_GITHUB_ACTIONS_URL?.trim() ||
    "https://github.com/AlexKanj/mf-ansible-capstone-team03/actions";

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Team 03 Operations Portal
          </p>

          <h1>Overall Platform Status</h1>

          <p className="page-description">
            Current Linux, automation, RACF, dataset,
            and z/OS workload state.
          </p>
        </div>

        <div className="page-actions">
          <label htmlFor="userid">
            Managed user
          </label>

          <select
            id="userid"
            value={userid}
            onChange={(event) => {
              setUserid(
                event.target.value as ManagedUser,
              );
            }}
          >
            {managedUsers.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadOverview(userid)}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="warning-banner">
          Latest refresh failed: {error}. Displaying
          the last available values.
        </div>
      )}

      <section className="status-grid">
        <StatusCard
          title="Overall Platform"
          value={formatStatus(overview.status)}
          detail={`Selected user: ${overview.selected_user}`}
          status={platformCardStatus(overview.status)}
        />

        <StatusCard
          title="JCL Automation"
          value={formatStatus(
            overview.automation.jcl.status,
          )}
          detail="Ansible run_jcl.yml"
          status={componentCardStatus(
            overview.automation.jcl.status,
          )}
        />

        <StatusCard
          title="RACF Automation"
          value={formatStatus(
            overview.automation.racf.status,
          )}
          detail="Security reconciliation"
          status={componentCardStatus(
            overview.automation.racf.status,
          )}
        />

        <StatusCard
          title="Dataset Provisioning"
          value={formatStatus(
            overview.automation.provisioning.status,
          )}
          detail="DEV and TST libraries"
          status={componentCardStatus(
            overview.automation.provisioning.status,
          )}
        />

        <StatusCard
          title="Latest JES Job"
          value={
            overview.latest_jcl_job.return_code === null
              ? "Unavailable"
              : `RC ${overview.latest_jcl_job.return_code}`
          }
          detail={formatStatus(
            overview.latest_jcl_job.status,
          )}
          status={componentCardStatus(
            overview.latest_jcl_job.status,
          )}
        />

        <StatusCard
          title={`${userid} Dataset Readiness`}
          value={
            overview.datasets.readiness_percentage === null
              ? "Unavailable"
              : `${overview.datasets.readiness_percentage}%`
          }
          detail={
            `${overview.datasets.ready} of ` +
            `${overview.datasets.expected} libraries ready`
          }
          status={
            overview.datasets.readiness_percentage === 100
              ? "healthy"
              : "warning"
          }
        />

        <StatusCard
          title="Managed RACF Identities"
          value={
            `${formatNumber(
              overview.racf.managed_users,
            )} users`
          }
          detail={
            `${formatNumber(
              overview.racf.managed_groups,
            )} managed groups`
          }
          status="healthy"
        />

        <StatusCard
          title="Active z/OS Address Spaces"
          value={formatNumber(
            overview.mainframe_activity.active_jobs,
          )}
          detail="STCs, TSO sessions, and batch jobs"
        />

        <StatusCard
          title="Active Started Tasks"
          value={formatNumber(
            overview.mainframe_activity
              .active_started_tasks,
          )}
          detail="Current STCs"
        />

        <StatusCard
          title="Batch Jobs Running Now"
          value={formatNumber(
            overview.mainframe_activity.active_batch_jobs,
          )}
          detail="Current active JCL workloads"
        />
      </section>

      <section className="racf-hierarchy">
        <h2>RACF Group &amp; User Hierarchy</h2>

        <p className="page-description">
          Expected structure provisioned by the RACF
          automation for this application.
        </p>

        <img
          src="/RACF-Hierarchy.png"
          alt="RACF group and user hierarchy diagram"
          className="racf-hierarchy__image"
        />
      </section>

      <section className="portal-links">
        <a
          href={grafanaUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open Grafana Dashboard
        </a>

        <a
          href={githubActionsUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open GitHub Actions
        </a>
      </section>

      <footer className="page-footer">
        Last metric update:{" "}
        {formatTimestamp(
          overview.last_updated_timestamp,
        )}
        <span> · Auto-refresh every 15 seconds</span>
      </footer>
    </main>
  );
}