import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";

import { AutomationRunPage } from "./pages/AutomationRunPage";
import { OverallStatusPage } from "./pages/OverallStatusPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="app-nav" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
            }
          >
            Overview
          </NavLink>

          <NavLink
            to="/automation-run"
            className={({ isActive }) =>
              isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
            }
          >
            Automation Runs
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<OverallStatusPage />} />
          <Route
            path="/automation-run"
            element={<AutomationRunPage />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
