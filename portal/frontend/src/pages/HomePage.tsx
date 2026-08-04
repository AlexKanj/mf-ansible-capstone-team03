import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import { getOverview } from "../services/api";
import type { OverviewResponse } from "../types/api";

import "./HomePage.css";

const TECHNOLOGIES = [
  "Terraform",
  "Ansible",
  "IBM z/OS",
  "AWS",
  "GitHub Actions",
  "Prometheus",
  "Grafana",
  "React",
  "FastAPI",
];

const PROJECT_GOALS = [
  {
    number: "01",
    title: "Infrastructure as Code",
    description:
      "Provision repeatable AWS networking, compute, security groups, and remote Terraform state.",
  },
  {
    number: "02",
    title: "Linux Automation",
    description:
      "Configure Docker hosts and deploy the monitoring and portal services through Ansible.",
  },
  {
    number: "03",
    title: "Mainframe Automation",
    description:
      "Manage RACF resources, data sets, JCL execution, and JES2 output using the IBM z/OS Core Collection.",
  },
  {
    number: "04",
    title: "CI/CD Integration",
    description:
      "Execute controlled automation from version-controlled GitHub Actions workflows.",
  },
  {
    number: "05",
    title: "Observability",
    description:
      "Show whether automation ran, whether workloads succeeded, and the current state of the platform.",
  },
];

const BUILD_AREAS = [
  {
    title: "AWS Platform",
    description:
      "Terraform-managed cloud infrastructure supporting the Linux application and monitoring tiers.",
    items: [
      "VPC, subnets, and routing",
      "Frontend and backend EC2 instances",
      "Security groups",
      "S3 remote Terraform state",
      "SSM-managed SSH access",
    ],
  },
  {
    title: "z/OS Automation",
    description:
      "Repeatable mainframe operations expressed as Ansible playbooks and reusable task definitions.",
    items: [
      "RACF groups and users",
      "TSO and OMVS user segments",
      "DEV and TST data sets",
      "JCL submission and JES2 output",
      "Data set security profiles",
    ],
  },
  {
    title: "Monitoring Stack",
    description:
      "Centralized metrics and operational visibility across Linux, CI/CD, and z/OS.",
    items: [
      "Prometheus",
      "Pushgateway",
      "Grafana",
      "Custom automation metrics",
    ],
  },
  {
    title: "Operations Portal",
    description:
      "A presentation-ready interface that summarizes platform health and automation outcomes.",
    items: [
      "React frontend",
      "FastAPI backend",
      "Live Prometheus queries",
      "Automation workflow controls",
      "JCL and batch reporting",
      "RACF Management",
    ],
  },
];

const DEMO_STEPS = [
  {
    number: "01",
    title: "Trigger workflows through GitHub",
    description:
      "We will start by showing an example of a simple Ansible playbook that will do something magical (say hi) in z/OS. We will also show off a playbook that can submit JCL to z/OS",
  },
  {
    number: "02",
    title: "See resutls in Grafana",
    description:
      "After we have shown a few playbooks, we will then demonstrate how we can view that status of z/OS through a Grafana dashboard",
  },
  {
    number: "03",
    title: "Show Admin portal",
    description:
      "Next, we will view the admin portal in more detail. We will see how a user could submit z/OS playbooks, run JCL, view the status of z/OS and even create new users and groups",
  },
  {
    number: "04",
    title: "Failure",
    description:
      "Things don't go right all the time. After we have shown how a user could submit JCL, we will next show off how our system handles a failure.",
  },
  {
    number: "05",
    title: "Create a user",
    description:
      "Finally, we will show how a user could manage RACF groups and z/OS users through our portal",
  },
];

function formatStatus(status: OverviewResponse["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatNumber(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function HomePage() {
  const [overview, setOverview] =
    useState<OverviewResponse | null>(null);

  const [statusUnavailable, setStatusUnavailable] =
    useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void getOverview("P03PTU", controller.signal)
      .then((result) => {
        setOverview(result);
        setStatusUnavailable(false);
      })
      .catch(() => {
        setStatusUnavailable(true);
      });

    return () => controller.abort();
  }, []);

  const grafanaUrl =
    import.meta.env.VITE_GRAFANA_URL?.trim() ||
    `${window.location.protocol}//${window.location.hostname}:3000`;

  const githubActionsUrl =
    import.meta.env.VITE_GITHUB_ACTIONS_URL?.trim() ||
    "https://github.com/AlexKanj/mf-ansible-capstone-team03/actions";

  const architectureDiagramUrl =
    "/Team3%20Capstone.jpg";

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero__glow" aria-hidden="true" />

        <div className="home-hero__content">
          <p className="home-eyebrow">
            Team 03 Platform Engineering Capstone
          </p>

          <h1>
            Unifying Linux and z/OS Operations Through
            Cross-Platform Automation
          </h1>

          <p className="home-hero__description">
            We built a Git-driven platform that provisions
            AWS infrastructure, configures Linux services,
            automates IBM z/OS operations, and presents the
            entire environment through centralized
            observability.
          </p>

          <div className="home-hero__actions">
            <Link
              className="home-button home-button--primary"
              to="/overview"
            >
              View Live Platform Status
            </Link>

            <Link
              className="home-button home-button--secondary"
              to="/automation-run"
            >
              Explore Automation Runs
            </Link>

            <Link
              className="home-button home-button--secondary"
              to="/racf-management"
            >
              Manage RACF Users & Groups
            </Link>

            <a
              className="home-button home-button--secondary"
              href={grafanaUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Grafana
            </a>
          </div>

          <div
            className="home-tech-list"
            aria-label="Project technologies"
          >
            {TECHNOLOGIES.map((technology) => (
              <span key={technology}>{technology}</span>
            ))}
          </div>
        </div>

        <aside className="home-hero__summary">
          <p className="home-summary-label">
            Solution at a glance
          </p>

          <div className="home-summary-stat">
            <strong>2</strong>
            <span>Operating environments</span>
          </div>

          <div className="home-summary-stat">
            <strong>1</strong>
            <span>Code-driven operating model</span>
          </div>

          <div className="home-summary-stat">
            <strong>3</strong>
            <span>Questions answered by observability</span>
          </div>

          <div className="home-summary-questions">
            <span>Did the automation run?</span>
            <span>Did the workload succeed?</span>
            <span>What is the current platform state?</span>
          </div>
        </aside>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <div>
            <p className="home-eyebrow">
              Project overview
            </p>
            <h2>From separated operations to one platform</h2>
          </div>

          <p>
            This project combines Linux and z/OS platforms into 
            a singular platform
          </p>
        </div>

        <div className="home-story-grid">
          <article className="home-story-card">
            <span className="home-story-card__label">
              The challenge
            </span>
            <h3>Disconnected operating models</h3>
            <p>
              In this project's hypothetical starting point, Linux and
              z/OS were being managed seperately. This 
              limited consistency and visibility. It also created a lot of 
              manual and time-cosuming work.
            </p>
          </article>

          <article className="home-story-card">
            <span className="home-story-card__label">
              Our solution
            </span>
            <h3>Automation across both platforms</h3>
            <p>
              Terraform, Ansible, GitHub Actions, and the IBM
              z/OS Core Collection provide a shared workflow
              for infrastructure and operations.
            </p>
          </article>

          <article className="home-story-card">
            <span className="home-story-card__label">
              The result
            </span>
            <h3>Repeatable and visible change</h3>
            <p>
              Infrastructure changes, security operations,
              JCL execution, and health reporting are now
              driven from version-controlled Infrastructure as code.
            </p>
          </article>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <div>
            <p className="home-eyebrow">Architecture</p>
            <h2>How a change moves through the platform</h2>
          </div>

          <p>
            The same workflow connects source control,
            automation, Linux infrastructure, IBM z/OS, and
            observability.
          </p>
        </div>

        <figure className="home-architecture-figure">
          <img
            src={architectureDiagramUrl}
            alt="Architecture diagram showing the Terraform, Ansible, GitHub Actions, monitoring, admin portal, and z/OS components for the project"
            loading="lazy"
          />
          <figcaption>
            Team 03 capstone architecture across AWS, the
            monitoring stack, the admin portal, and z/OS.
          </figcaption>
        </figure>

        <div className="home-flow" aria-label="Architecture flow">
          {[
            ["01", "Git Commit", "Reviewed source change"],
            ["02", "GitHub Actions", "Pipeline orchestration"],
            ["03", "Terraform + Ansible", "Provision and configure"],
            ["04", "AWS + IBM z/OS", "Execute platform work"],
            ["05", "Prometheus + Grafana", "Observe and validate"],
          ].map(([number, title, description], index) => (
            <div className="home-flow__item" key={title}>
              <span className="home-flow__number">
                {number}
              </span>
              <strong>{title}</strong>
              <p>{description}</p>
              {index < 4 && (
                <span
                  className="home-flow__arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <div>
            <p className="home-eyebrow">
              Project structure
            </p>
            <h2>Two repositories, one integrated solution</h2>
          </div>

          <p>
            The mf-ansible-capstone-team03 directory contains the ansible playbooks
            for monitoring and configuring the z/OS platform. These playbooks are store 
            in the ansible/ directory. The .github/workflows/run-ansible-mainframe.yml is
            responsible for running the ansible playbooks. This repo also contains the code 
            and Docker containers for the frontend admin app. This app uses the ansible playbooks
            and github acitons to first off commands to z/OS without needing the GitHub Actions UI.
          </p>
        </div>

        <div className="home-repo-grid">
          <article className="home-repo-card">
            <div className="home-repo-card__header">
              <span>Repository 01</span>
              <a
                href="https://github.com/AlexKanj/mf-ansible-capstone-team03"
                target="_blank"
                rel="noreferrer"
              >
                Open repository ↗
              </a>
            </div>

            <h3>mf-ansible-capstone-team03</h3>
            <p>
              Mainframe automation, JCL, RACF, operational
              metrics, FastAPI, and the React portal.
            </p>

            <pre>
{`ansible/
  jcl/
  roles/
  tasks/
portal/
  api/
  frontend/
.github/workflows/`}
            </pre>
          </article>

          <article className="home-repo-card">
            <div className="home-repo-card__header">
              <span>Repository 02</span>
              <a
                href="https://github.com/AlexKanj/terraform-grafana-stack-captsone-team03"
                target="_blank"
                rel="noreferrer"
              >
                Open repository ↗
              </a>
            </div>

            <h3>terraform-grafana-stack-captsone-team03</h3>
            <p>
              This repo conatins Terraform which provisions
              AWS with the resources that will be needed for Grafana and Prometheus
              It allows Ansible to discover the hosts created by Terraform using AWS EC2
              dynamic inventory. Once Ansible knows what it needs to configure, it sets up
              the required infrastructure and containers for Grafana and Prometheus.
            </p>

            <pre>
{`terraform/
  networking
  compute
  security
ansible/
  playbooks/
  templates/
.github/workflows/`}
            </pre>
          </article>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <div>
            <p className="home-eyebrow">Project goals</p>
            <h2>What the platform was designed to prove</h2>
          </div>
        </div>

        <div className="home-goals-grid">
          {PROJECT_GOALS.map((goal) => (
            <article className="home-goal-card" key={goal.title}>
              <span>{goal.number}</span>
              <h3>{goal.title}</h3>
              <p>{goal.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <div>
            <p className="home-eyebrow">What we built</p>
            <h2>A complete cross-platform automation stack</h2>
          </div>
        </div>

        <div className="home-build-grid">
          {BUILD_AREAS.map((area) => (
            <article className="home-build-card" key={area.title}>
              <h3>{area.title}</h3>
              <p>{area.description}</p>

              <ul>
                {area.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <div>
            <p className="home-eyebrow">Demo journey</p>
            <h2>What we will see next</h2>
          </div>

          <p>
            The demonstration follows a change from commit,
            through execution, into observability and
            recovery.
          </p>
        </div>

        <div className="home-demo-grid">
          {DEMO_STEPS.map((step) => (
            <article className="home-demo-card" key={step.title}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-live">
        <div className="home-live__heading">
          <div>
            <p className="home-eyebrow">
              Live platform snapshot
            </p>
            <h2>Current operational state</h2>
          </div>

          <Link
            className="home-button home-button--primary"
            to="/overview"
          >
            Open Full Status
          </Link>
        </div>

        {overview ? (
          <div className="home-live__grid">
            <div>
              <span>Platform</span>
              <strong>{formatStatus(overview.status)}</strong>
            </div>

            <div>
              <span>Latest JES return code</span>
              <strong>
                {overview.latest_jcl_job.return_code === null
                  ? "—"
                  : overview.latest_jcl_job.return_code}
              </strong>
            </div>

            <div>
              <span>Dataset readiness</span>
              <strong>
                {overview.datasets.readiness_percentage === null
                  ? "—"
                  : `${overview.datasets.readiness_percentage}%`}
              </strong>
            </div>

            <div>
              <span>Managed RACF identities</span>
              <strong>
                {formatNumber(overview.racf.managed_users)} users
              </strong>
              <small>
                {formatNumber(overview.racf.managed_groups)} groups
              </small>
            </div>
          </div>
        ) : (
          <div className="home-live__unavailable">
            {statusUnavailable
              ? "Live metrics are temporarily unavailable. The presentation content remains accessible."
              : "Loading the current platform snapshot…"}
          </div>
        )}

        <div className="home-live__links">
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noreferrer"
          >
            Grafana Dashboard ↗
          </a>

          <a
            href={githubActionsUrl}
            target="_blank"
            rel="noreferrer"
          >
            GitHub Actions ↗
          </a>
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <strong>Team 03 Operations Portal</strong>
          <span>
            Platform Engineer Mainframe Bootcamp Capstone
          </span>
        </div>

        <Link to="/overview">
          Continue to the live demonstration →
        </Link>
      </footer>
    </main>
  );
}
