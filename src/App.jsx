
import React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import {
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

import RoleLogin from "./pages/RoleLogin.jsx";
import BranchManagerDashboard from "./BranchManager/BranchManagerDashboard.jsx";

import SuperAdminLogin from "./SuperAdminpages/SuperAdminLogin.jsx";
import SuperAdminPortal from "./SuperAdminpages/SuperAdminPortal.jsx";

import "./App.css";

function NotFound() {
  return (
    <main className="hrms-not-found">
      <div className="hrms-not-found-card">
        <div className="hrms-not-found-icon">
          <ShieldCheck size={32} />
        </div>

        <div className="hrms-not-found-tag">
          <Sparkles size={14} />
          ZERMII HRMS
        </div>

        <h1>Page not found</h1>

        <p>
          This page may have moved or does not exist.
          Return to the login portal to continue.
        </p>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          <ArrowLeft size={16} />
          Return to login
        </button>
      </div>

      <style>{`
        .hrms-not-found {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(ellipse at top left, #f3e8ff, transparent 48%),
            linear-gradient(135deg, #faf7ff, #fff);
          font-family: Inter, system-ui, sans-serif;
        }

        .hrms-not-found-card {
          width: min(100%, 470px);
          padding: 42px 34px;
          text-align: center;
          border: 1px solid #e9ddf7;
          border-radius: 24px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 24px 70px rgba(76,29,149,.10);
        }

        .hrms-not-found-icon {
          width: 68px;
          height: 68px;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
          border-radius: 21px;
          color: #6d28d9;
          background: #f3e8ff;
        }

        .hrms-not-found-tag {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #7c3aed;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .13em;
        }

        .hrms-not-found-card h1 {
          margin: 14px 0 10px;
          color: #24143b;
          font-size: 30px;
          letter-spacing: -.04em;
        }

        .hrms-not-found-card p {
          margin: 0 0 25px;
          color: #7b718b;
          font-size: 14px;
          line-height: 1.8;
        }

        .hrms-not-found-card button {
          width: 100%;
          min-height: 49px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(100deg, #5b21b6, #7c3aed);
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 9px 22px rgba(109,40,217,.20);
          transition: transform .2s, box-shadow .2s;
        }

        .hrms-not-found-card button:hover {
          transform: translateY(-2px);
          box-shadow: 0 13px 28px rgba(109,40,217,.27);
        }

        @media (max-width: 480px) {
          .hrms-not-found-card {
            padding: 32px 22px;
            border-radius: 20px;
          }
        }
      `}</style>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Employee, Branch Manager and HR Admin login */}
        <Route
          path="/login"
          element={<RoleLogin />}
        />

        {/* Branch Manager dashboard */}
        <Route
          path="/branch-manager/dashboard"
          element={<BranchManagerDashboard />}
        />

        {/* Super Admin login */}
        <Route
          path="/super-admin/login"
          element={<SuperAdminLogin />}
        />

        {/* Existing Super Admin portal */}
        <Route
          path="/super-admin/*"
          element={<SuperAdminPortal />}
        />

        {/* Default landing page */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Unknown routes */}
        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
    </BrowserRouter>
  );
}
