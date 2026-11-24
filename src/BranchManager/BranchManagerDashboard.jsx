
import React, { useCallback, useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {

  LayoutDashboard,

  UserRound,

  Users,

  CalendarCheck2,

  ClipboardList,

  LogOut,

  Menu,

  X,

  Bell,

  ChevronRight,

  ShieldCheck,

  Clock3,

  BriefcaseBusiness,

  AlertCircle,

  LoaderCircle,

  RefreshCw,

  Wrench,

  PhoneCall,

  LifeBuoy,

  Truck,

} from "lucide-react";

import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../services/firebase";

import api from "../services/api";

import OperationalExecutionDesk from "./OperationalExecutionDesk.jsx";

const NAV_ITEMS = [

  { label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },

  { label: "My Profile", icon: UserRound, id: "profile" },

  { label: "Employees", icon: Users, id: "employees" },

  { label: "Attendance", icon: CalendarCheck2, id: "attendance" },

  { label: "Leave Requests", icon: ClipboardList, id: "leaves" },

  {

    label: "Operational Execution Desk",

    icon: Wrench,

    id: "operational-desk",

  },

];

export default function BranchManagerDashboard() {

  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  const [activePage, setActivePage] = useState("dashboard");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");

  const loadProfile = useCallback(async (user = auth.currentUser) => {
    if (!user) {
      // Firebase may still be restoring the persisted session during a refresh.
      // The auth-state listener below handles the signed-out case.
      return;
    }

    setLoading(true);
    setError("");

    try {
      let token = await user.getIdToken();
      let response;

      try {
        response = await api.get("/employee/auth/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (requestError) {
        // Refresh the Firebase ID token once before treating a 401 as a
        // genuinely invalid session. A 403 is a permission error, not logout.
        if (requestError?.response?.status !== 401) {
          throw requestError;
        }

        token = await user.getIdToken(true);
        response = await api.get("/employee/auth/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const data = response?.data;
      const employee = data?.employee || data?.profile || data?.data || data;

      if (!employee || typeof employee !== "object") {
        throw new Error("The server did not return a valid profile.");
      }

      const role = String(
        employee.systemRole || employee.role || ""
      ).toUpperCase();

      if (role && role !== "BRANCH_MANAGER") {
        throw new Error("This account is not a Branch Manager account.");
      }

      setProfile(employee);
    } catch (err) {
      console.error("BRANCH MANAGER PROFILE ERROR:", err);

      const status = err?.response?.status;

      if (status === 401) {
        // The server rejected the freshly refreshed token too. This is the
        // only profile-request response that signs the user out.
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("FIREBASE SIGN-OUT ERROR:", signOutError);
        }

        localStorage.removeItem("hrmsEmployee");
        sessionStorage.removeItem("hrmsEmployee");
        navigate("/login", { replace: true });
        return;
      }

      if (status === 403) {
        setError(
          err?.response?.data?.message ||
            "You do not have permission to access the Branch Manager profile. Please contact your administrator."
        );
        return;
      }

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load your profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Wait until Firebase has restored the persisted session before loading
    // the profile. This prevents refresh from being mistaken for logout.
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          loadProfile(user);
        } else {
          setLoading(false);
          setProfile(null);
          navigate("/login", { replace: true });
        }
      },
      (authError) => {
        console.error("FIREBASE AUTH STATE ERROR:", authError);
        setLoading(false);
        setError("Unable to verify your session. Please try again.");
      }
    );

    return unsubscribe;
  }, [loadProfile, navigate]);

  const handleLogout = async () => {

    setLoggingOut(true);

    try {

      const token = await auth.currentUser?.getIdToken();

      if (token) {

        try {

          await api.post(

            "/employee/auth/logout",

            {},

            { headers: { Authorization: `Bearer ${token}` } }

          );

        } catch (err) {

          console.warn("Backend logout request failed:", err);

        }

      }

      await signOut(auth);

    } catch (err) {

      console.error("LOGOUT ERROR:", err);

    } finally {

      localStorage.removeItem("hrmsEmployee");

      sessionStorage.removeItem("hrmsEmployee");

      navigate("/login", { replace: true });

    }

  };

  const displayName =

    profile?.fullName ||

    profile?.name ||

    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||

    "Branch Manager";

  const email = profile?.email || auth.currentUser?.email || "—";

  const initials = displayName

    .split(" ")

    .filter(Boolean)

    .slice(0, 2)

    .map((part) => part[0]?.toUpperCase())

    .join("");

  const formatValue = (value) =>

    value === undefined || value === null || value === ""

      ? "—"

      : value;

  const openPage = (id) => {

    setActivePage(id);

    setSidebarOpen(false);

    setError("");

  };

  return (

    <div className="bm-app">

      <style>{`

        .bm-app {

          min-height: 100vh;

          background: #f4f7fc;

          color: #172b4d;

          font-family: Inter, system-ui, sans-serif;

        }

        .bm-app * { box-sizing: border-box; }

        .bm-layout { display: flex; min-height: 100vh; }

        .bm-sidebar {

          width: 255px; flex-shrink: 0; background: #fff;

          border-right: 1px solid #e3eaf4; padding: 24px 15px;

          display: flex; flex-direction: column;

        }

        .bm-brand {

          display: flex; align-items: center; gap: 12px;

          padding: 0 9px 28px;

        }

        .bm-logo {

          width: 44px; height: 44px; border-radius: 13px;

          display: grid; place-items: center; color: white;

          background: linear-gradient(135deg,#1769e0,#4f9bff);

        }

        .bm-brand-name { font-size: 21px; font-weight: 900; letter-spacing: 1px; }

        .bm-brand-sub { font-size: 10px; color: #71819b; margin-top: 4px; letter-spacing: 2px; }

        .bm-section-label { padding: 12px; color: #9aa8bd; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }

        .bm-nav { display: grid; gap: 6px; }

        .bm-nav button {

          display: flex; align-items: center; gap: 12px; width: 100%;

          padding: 12px; border: 0; border-radius: 11px;

          background: transparent; color: #657792; font: inherit;

          font-size: 12px; font-weight: 700; text-align: left; cursor: pointer;

        }

        .bm-nav button.active { background: #eaf2ff; color: #1769e0; }

        .bm-nav button:hover { background: #f3f7ff; }

        .bm-nav button.active:hover { background: #eaf2ff; }

        .bm-sidebar-bottom { margin-top: auto; }

        .bm-help {

          margin: 20px 3px; padding: 15px; border-radius: 14px;

          background: linear-gradient(145deg,#f3f7ff,#eaf2ff);

        }

        .bm-help strong { font-size: 12px; }

        .bm-help p { font-size: 10px; line-height: 1.7; color: #71819b; }

        .bm-logout {

          display: flex; align-items: center; gap: 10px; width: 100%;

          padding: 12px; border: 1px solid #f4dada; border-radius: 11px;

          background: #fff7f7; color: #c43d48; font: inherit;

          font-size: 12px; font-weight: 800; cursor: pointer;

        }

        .bm-logout:disabled { opacity: .6; cursor: not-allowed; }

        .bm-main { min-width: 0; flex: 1; }

        .bm-topbar {

          min-height: 76px; padding: 12px 30px; background: #fff;

          border-bottom: 1px solid #e3eaf4; display: flex;

          align-items: center; justify-content: space-between; gap: 15px;

        }

        .bm-top-left { display: flex; align-items: center; gap: 12px; min-width: 0; }

        .bm-topbar h2 { font-size: 17px; margin: 0; font-weight: 850; }

        .bm-topbar p { font-size: 11px; color: #8493aa; margin: 5px 0 0; }

        .bm-top-actions { display: flex; align-items: center; gap: 14px; }

        .bm-icon-button {

          width: 39px; height: 39px; display: grid; place-items: center;

          border: 1px solid #e3eaf4; border-radius: 11px;

          background: white; color: #547092; cursor: pointer;

        }

        .bm-user { display: flex; align-items: center; gap: 10px; }

        .bm-avatar {

          width: 40px; height: 40px; display: grid; place-items: center;

          border-radius: 13px; background: #e4efff; color: #155ac2;

          font-size: 13px; font-weight: 900;

        }

        .bm-user-name { font-size: 11px; font-weight: 850; }

        .bm-user-role { font-size: 10px; color: #8493aa; margin-top: 4px; }

        .bm-content { padding: 28px; max-width: 1600px; margin: 0 auto; min-width: 0; }

        .bm-welcome {

          display: flex; justify-content: space-between; align-items: center;

          flex-wrap: wrap; gap: 18px; margin-bottom: 24px;

        }

        .bm-welcome h1 { margin: 0; font-size: clamp(23px,2.4vw,31px); letter-spacing: -.8px; }

        .bm-welcome p { color: #71819b; font-size: 12px; line-height: 1.7; margin: 8px 0 0; }

        .bm-refresh {

          display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px;

          border: 1px solid #d9e7fc; border-radius: 10px; background: #fff;

          color: #1769e0; font: inherit; font-size: 11px; font-weight: 800; cursor: pointer;

        }

        .bm-cards { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; }

        .bm-stat { min-width: 0; padding: 19px; border: 1px solid #e4ebf5; border-radius: 16px; background: #fff; }

        .bm-stat-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }

        .bm-stat-icon {

          width: 42px; height: 42px; display: grid; place-items: center;

          border-radius: 12px; background: #eaf2ff; color: #1769e0;

        }

        .bm-stat-label { color: #71819b; font-size: 11px; font-weight: 700; }

        .bm-stat-value { margin-top: 19px; font-size: 25px; font-weight: 900; overflow-wrap: anywhere; }

        .bm-stat-note { margin-top: 6px; color: #8795aa; font-size: 10px; line-height: 1.5; }

        .bm-grid { display: grid; grid-template-columns: minmax(0,1.2fr) minmax(260px,.8fr); gap: 18px; margin-top: 20px; }

        .bm-panel { min-width: 0; padding: 22px; border: 1px solid #e4ebf5; border-radius: 16px; background: #fff; }

        .bm-panel h3 { margin: 0; font-size: 14px; font-weight: 850; }

        .bm-panel-desc { margin: 7px 0 18px; color: #8090a8; font-size: 11px; line-height: 1.6; }

        .bm-action-list { display: grid; gap: 10px; }

        .bm-action {

          display: flex; align-items: center; gap: 12px; padding: 13px;

          border: 1px solid #e6edf6; border-radius: 12px; background: #fff;

          color: #33264d; text-align: left; cursor: pointer; font: inherit; width: 100%;

        }

        .bm-action:hover { border-color: #bcd5ff; background: #f7faff; }

        .bm-action-icon { width: 38px; height: 38px; flex-shrink: 0; display: grid; place-items: center; border-radius: 10px; background: #edf4ff; color: #1769e0; }

        .bm-action-text { flex: 1; min-width: 0; }

        .bm-action-title { font-size: 11px; font-weight: 850; }

        .bm-action-desc { margin-top: 4px; color: #8090a8; font-size: 10px; line-height: 1.5; }

        .bm-profile-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; margin-top: 20px; }

        .bm-profile-field { padding: 15px; border: 1px solid #e6edf6; border-radius: 12px; min-width: 0; }

        .bm-profile-field span { display: block; color: #8090a8; font-size: 10px; margin-bottom: 8px; }

        .bm-profile-field strong { display: block; font-size: 12px; overflow-wrap: anywhere; }

        .bm-profile-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-bottom: 22px; border-bottom: 1px solid #e6edf6; }

        .bm-profile-avatar { width: 66px; height: 66px; display: grid; place-items: center; border-radius: 20px; background: #e4efff; color: #155ac2; font-size: 21px; font-weight: 900; }

        .bm-error { display: flex; align-items: flex-start; gap: 10px; padding: 14px; margin-bottom: 16px; border-radius: 12px; background: #fff5f6; color: #b42342; font-size: 12px; line-height: 1.6; }

        .bm-loading { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 200px; color: #1769e0; font-size: 13px; }

        .bm-mobile-menu { display: none; }

        @media(max-width:1100px) {

          .bm-cards { grid-template-columns: repeat(2,minmax(0,1fr)); }

          .bm-content { padding: 22px; }

        }

        @media(max-width:760px) {

          .bm-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 100; overflow-y: auto; transform: translateX(-100%); transition: transform .2s; box-shadow: 10px 0 35px #16356316; }

          .bm-sidebar.open { transform: translateX(0); }

          .bm-mobile-menu { display: grid; }

          .bm-topbar { padding: 12px 15px; min-height: 68px; }

          .bm-content { padding: 20px 14px; }

          .bm-top-user-details { display: none; }

          .bm-grid { grid-template-columns: 1fr; }

        }

        @media(max-width:420px) {

          .bm-cards { grid-template-columns: 1fr 1fr; gap: 9px; }

          .bm-stat { padding: 13px; }

          .bm-stat-value { font-size: 21px; }

          .bm-profile-grid { grid-template-columns: 1fr; }

          .bm-topbar h2 { font-size: 14px; }

          .bm-top-actions { gap: 7px; }

        }

      `}</style>

      <div className="bm-layout">

        <aside className={`bm-sidebar ${sidebarOpen ? "open" : ""}`}>

          <div className="bm-brand">

            <div className="bm-logo">

              <BriefcaseBusiness size={24} />

            </div>

            <div>

              <div className="bm-brand-name">ZERMII</div>

              <div className="bm-brand-sub">HR MANAGEMENT</div>

            </div>

          </div>

          <div className="bm-section-label">WORKSPACE</div>

          <nav className="bm-nav">

            {NAV_ITEMS.map(({ label, icon: Icon, id }) => (

              <button

                key={id}

                type="button"

                className={activePage === id ? "active" : ""}

                onClick={() => openPage(id)}

              >

                <Icon size={18} />

                <span>{label}</span>

                {activePage === id && (

                  <ChevronRight

                    size={15}

                    style={{ marginLeft: "auto", flexShrink: 0 }}

                  />

                )}

              </button>

            ))}

          </nav>

          <div className="bm-sidebar-bottom">

            <div className="bm-help">

              <ShieldCheck size={22} color="#1769e0" />

              <p><strong>Secure workspace</strong></p>

              <p>

                Your manager workspace is protected by authenticated access.

              </p>

            </div>

            <button

              type="button"

              className="bm-logout"

              onClick={handleLogout}

              disabled={loggingOut}

            >

              {loggingOut ? (

                <LoaderCircle size={17} />

              ) : (

                <LogOut size={17} />

              )}

              {loggingOut ? "Signing out..." : "Logout"}

            </button>

          </div>

        </aside>

        <main className="bm-main">

          <header className="bm-topbar">

            <div className="bm-top-left">

              <button

                type="button"

                className="bm-icon-button bm-mobile-menu"

                onClick={() => setSidebarOpen((value) => !value)}

                aria-label="Toggle navigation"

              >

                {sidebarOpen ? <X size={19} /> : <Menu size={19} />}

              </button>

              <div>

                <h2>Branch Manager Portal</h2>

                <p>

                  HRMS /{" "}

                  {NAV_ITEMS.find((item) => item.id === activePage)?.label}

                </p>

              </div>

            </div>

            <div className="bm-top-actions">

              <button

                type="button"

                className="bm-icon-button"

                aria-label="Open profile"

                onClick={() => openPage("profile")}

              >

                <Bell size={18} />

              </button>

              <button

                type="button"

                className="bm-user"

                onClick={() => openPage("profile")}

                style={{

                  border: 0,

                  background: "transparent",

                  cursor: "pointer",

                  textAlign: "left",

                }}

              >

                <span className="bm-avatar">{initials || "BM"}</span>

                <span className="bm-top-user-details">

                  <span className="bm-user-name" style={{ display: "block" }}>

                    {displayName}

                  </span>

                  <span className="bm-user-role" style={{ display: "block" }}>

                    Branch Manager

                  </span>

                </span>

              </button>

            </div>

          </header>

          <div className="bm-content">

            {error && (

              <div className="bm-error" role="alert">

                <AlertCircle size={18} />

                <div style={{ flex: 1 }}>{error}</div>

                <button

                  type="button"

                  className="bm-refresh"

                  onClick={loadProfile}

                >

                  <RefreshCw size={14} /> Retry

                </button>

              </div>

            )}

            {loading ? (

              <div className="bm-loading">

                <LoaderCircle size={22} />

                Loading your workspace...

              </div>

            ) : (

              <>

                {activePage === "dashboard" && (

                  <>

                    <div className="bm-welcome">

                      <div>

                        <h1>

                          Welcome back, {displayName.split(" ")[0]}!

                        </h1>

                        <p>

                          Here is your branch workspace overview.

                        </p>

                      </div>

                      <button

                        type="button"

                        className="bm-refresh"

                        onClick={loadProfile}

                      >

                        <RefreshCw size={15} /> Refresh profile

                      </button>

                    </div>

                    <div className="bm-cards">

                      {[

                        {

                          title: "My Profile",

                          value: "Available",

                          note: "Your account information",

                          icon: UserRound,

                        },

                        {

                          title: "Branch",

                          value: formatValue(

                            profile?.branchName || profile?.branch?.name

                          ),

                          note: "Assigned branch",

                          icon: BriefcaseBusiness,

                        },

                        {

                          title: "Employee Code",

                          value: formatValue(profile?.employeeCode),

                          note: "Your employee identifier",

                          icon: Users,

                        },

                        {

                          title: "Account Status",

                          value: formatValue(

                            profile?.status || profile?.accountStatus || "Active"

                          ),

                          note: "Profile account status",

                          icon: ShieldCheck,

                        },

                      ].map(({ title, value, note, icon: Icon }) => (

                        <div className="bm-stat" key={title}>

                          <div className="bm-stat-top">

                            <span className="bm-stat-label">{title}</span>

                            <span className="bm-stat-icon">

                              <Icon size={20} />

                            </span>

                          </div>

                          <div

                            className="bm-stat-value"

                            style={{

                              fontSize: String(value).length > 12 ? 16 : 23,

                            }}

                          >

                            {value}

                          </div>

                          <div className="bm-stat-note">{note}</div>

                        </div>

                      ))}

                    </div>

                    <div className="bm-grid">

                      <section className="bm-panel">

                        <h3>Quick Actions</h3>

                        <p className="bm-panel-desc">

                          Open a section of your manager workspace.

                        </p>

                        <div className="bm-action-list">

                          {[

                            {

                              id: "profile",

                              title: "View My Profile",

                              desc: "View your account and branch information",

                              icon: UserRound,

                            },

                            {

                              id: "employees",

                              title: "Employee Management",

                              desc: "Open the employee section",

                              icon: Users,

                            },

                            {

                              id: "attendance",

                              title: "Attendance",

                              desc: "Open the attendance section",

                              icon: CalendarCheck2,

                            },

                            {

                              id: "leaves",

                              title: "Leave Requests",

                              desc: "Open the leave requests section",

                              icon: ClipboardList,

                            },

                            {

                              id: "operational-desk",

                              title: "Operational Execution Desk",

                              desc:

                                "Manage calls, tickets, installations and fleet",

                              icon: Wrench,

                            },

                          ].map(({ id, title, desc, icon: Icon }) => (

                            <button

                              type="button"

                              className="bm-action"

                              key={id}

                              onClick={() => openPage(id)}

                            >

                              <span className="bm-action-icon">

                                <Icon size={19} />

                              </span>

                              <span className="bm-action-text">

                                <span

                                  className="bm-action-title"

                                  style={{ display: "block" }}

                                >

                                  {title}

                                </span>

                                <span

                                  className="bm-action-desc"

                                  style={{ display: "block" }}

                                >

                                  {desc}

                                </span>

                              </span>

                              <ChevronRight size={17} color="#8aa0bd" />

                            </button>

                          ))}

                        </div>

                      </section>

                      <section className="bm-panel">

                        <h3>My Account</h3>

                        <p className="bm-panel-desc">

                          Your authenticated account details.

                        </p>

                        {[

                          ["Full Name", displayName],

                          ["Email Address", email],

                          ["Role", "Branch Manager"],

                        ].map(([label, value]) => (

                          <div

                            className="bm-profile-field"

                            style={{ marginTop: 10 }}

                            key={label}

                          >

                            <span>{label}</span>

                            <strong>{value}</strong>

                          </div>

                        ))}

                        <button

                          type="button"

                          className="bm-refresh"

                          style={{

                            marginTop: 15,

                            width: "100%",

                            justifyContent: "center",

                          }}

                          onClick={() => openPage("profile")}

                        >

                          Open full profile <ChevronRight size={15} />

                        </button>

                      </section>

                    </div>

                  </>

                )}

                {activePage === "profile" && (

                  <section className="bm-panel">

                    <div className="bm-welcome">

                      <div>

                        <h1>My Profile</h1>

                        <p>

                          View your information retrieved from the HRMS backend.

                        </p>

                      </div>

                      <button

                        type="button"

                        className="bm-refresh"

                        onClick={loadProfile}

                      >

                        <RefreshCw size={15} /> Refresh

                      </button>

                    </div>

                    <div className="bm-profile-header">

                      <div className="bm-profile-avatar">

                        {initials || "BM"}

                      </div>

                      <div>

                        <h3 style={{ fontSize: 20, margin: "0 0 7px" }}>

                          {displayName}

                        </h3>

                        <div style={{ color: "#71819b", fontSize: 12 }}>

                          {email}

                        </div>

                        <div

                          style={{

                            color: "#1769e0",

                            fontSize: 11,

                            marginTop: 8,

                            fontWeight: 800,

                          }}

                        >

                          <ShieldCheck

                            size={14}

                            style={{

                              verticalAlign: "middle",

                              marginRight: 5,

                            }}

                          />

                          Branch Manager

                        </div>

                      </div>

                    </div>

                    <div className="bm-profile-grid">

                      {[

                        ["Full Name", displayName],

                        ["Email", email],

                        ["Employee Code", profile?.employeeCode],

                        [

                          "Phone",

                          profile?.phone ||

                            profile?.mobile ||

                            profile?.phoneNumber,

                        ],

                        [

                          "Branch",

                          profile?.branchName || profile?.branch?.name,

                        ],

                        [

                          "Department",

                          profile?.departmentName ||

                            profile?.department?.name ||

                            profile?.department,

                        ],

                        [

                          "Account Status",

                          profile?.status || profile?.accountStatus,

                        ],

                        [

                          "Role",

                          profile?.systemRole ||

                            profile?.role ||

                            "BRANCH_MANAGER",

                        ],

                      ].map(([label, value]) => (

                        <div className="bm-profile-field" key={label}>

                          <span>{label}</span>

                          <strong>{formatValue(value)}</strong>

                        </div>

                      ))}

                    </div>

                  </section>

                )}

                {activePage === "operational-desk" && (

                  <OperationalExecutionDesk />

                )}

                {["employees", "attendance", "leaves"].includes(activePage) && (

                  <section className="bm-panel">

                    <h3>

                      {NAV_ITEMS.find((item) => item.id === activePage)?.label}

                    </h3>

                    <p className="bm-panel-desc">

                      This section is ready for its feature page. Connect it

                      to the matching backend API to display live records.

                    </p>

                    <div className="bm-action">

                      <span className="bm-action-icon">

                        <Clock3 size={19} />

                      </span>

                      <span className="bm-action-text">

                        <span

                          className="bm-action-title"

                          style={{ display: "block" }}

                        >

                          Feature page not connected yet

                        </span>

                        <span

                          className="bm-action-desc"

                          style={{ display: "block" }}

                        >

                          No employee, attendance, or leave data is fabricated

                          by this dashboard.

                        </span>

                      </span>

                    </div>

                    <button

                      type="button"

                      className="bm-refresh"

                      style={{ marginTop: 18 }}

                      onClick={() => openPage("dashboard")}

                    >

                      Back to Dashboard

                    </button>

                  </section>

                )}

              </>

            )}

          </div>

        </main>

      </div>

    </div>

  );

}
