import { Link } from "react-router-dom";

import { StatusCard } from "../components/StatusCard";

const HIGHLIGHTS = [
  { title: "Platforms Unified", value: "2", detail: "Linux + IBM z/OS" },
  {
    title: "Automation Layer",
    value: "Ansible",
    detail: "RACF, data sets, JCL, JES2",
  },
  {
    title: "Delivery Pipeline",
    value: "GitHub Actions",
    detail: "Version-controlled execution",
  },
  {
    title: "Visibility",
    value: "Prometheus + Grafana",
    detail: "Automation and workload health",
  },
];

const ACCOMPLISHMENTS = [
  "Provisioned AWS networking, compute, and security with Terraform.",
  "Automated RACF users/groups, data sets, and JCL/JES2 operations on z/OS with Ansible.",
  "Connected every change to version-controlled GitHub Actions workflows.",
  "Centralized health and run results in Prometheus and Grafana.",
  "Built this React/FastAPI operations portal so non-CLI users can trigger and observe automation.",
];

const CHALLENGES = [
  "Our AWS stack had to be rebuilt mid-project after the EC2 instances were destroyed, which lost prior data and Grafana dashboards that had to be recreated from scratch.",
  "Steep learning curve: no team members had prior DevOps/Infrastructure-as-Code experience with Ansible, and none had worked with z/OS before this training.",
];

export function ConclusionPage() {
  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Conclusion</p>
          <h1>One platform, two operating environments</h1>
          <p className="page-description">
            Team 03 replaced disconnected, manual Linux and z/OS operations
            with a single, code-driven workflow that provisions
            infrastructure, automates mainframe operations, and reports
            status through this portal and Grafana.
          </p>
        </div>
      </header>

      <div className="job-detail-grid">
        {HIGHLIGHTS.map((highlight) => (
          <StatusCard
            key={highlight.title}
            title={highlight.title}
            value={highlight.value}
            detail={highlight.detail}
          />
        ))}
      </div>

      <section className="batch-section">
        <div className="section-heading">
          <h2>What we delivered</h2>
        </div>

        <ul>
          {ACCOMPLISHMENTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="batch-section">
        <div className="section-heading">
          <h2>Challenges we faced</h2>
        </div>

        <ul>
          {CHALLENGES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="batch-section">
        <div className="section-heading">
          <h2>Thank you</h2>
        </div>

        <p className="page-description">
          Thanks for watching our demo. Any questions?
        </p>

        <Link className="home-button home-button--primary" to="/">
          Back to Home
        </Link>
      </section>
    </main>
  );
}
