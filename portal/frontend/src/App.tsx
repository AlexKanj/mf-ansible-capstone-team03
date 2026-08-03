import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";

import { AutomationRunPage } from "./pages/AutomationRunPage";
import { BatchOperationsPage } from "./pages/BatchOperationsPage";
import { HomePage } from "./pages/HomePage";
import { OverallStatusPage } from "./pages/OverallStatusPage";
import { RacfManagementPage } from "./pages/RacfManagementPage";

function navLinkClass(isActive: boolean): string {
  return isActive
    ? "app-nav__link app-nav__link--active"
    : "app-nav__link";
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="app-nav" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              navLinkClass(isActive)
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/overview"
            className={({ isActive }) =>
              navLinkClass(isActive)
            }
          >
            Overall Status
          </NavLink>

          <NavLink
            to="/automation-run"
            className={({ isActive }) =>
              navLinkClass(isActive)
            }
          >
            Automation Runs
          </NavLink>

          <NavLink
            to="/batch-operations"
            className={({ isActive }) =>
              navLinkClass(isActive)
            }
          >
            JCL &amp; Batch Operations
          </NavLink>

          <NavLink
            to="/racf-management"
            className={({ isActive }) =>
              navLinkClass(isActive)
            }
          >
            RACF Management
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/overview"
            element={<OverallStatusPage />}
          />
          <Route
            path="/automation-run"
            element={<AutomationRunPage />}
          />
          <Route
            path="/batch-operations"
            element={<BatchOperationsPage />}
          />
          <Route
            path="/racf-management"
            element={<RacfManagementPage />}
          />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
