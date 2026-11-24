
import { useCallback, useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  Sun,
  LayoutDashboard,
  Users,
  IdCard,
  CalendarDays,
  ClipboardCheck,
  Wallet,
  Settings,
  UserRound,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ShieldCheck,
  ChevronRight,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Building2,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Activity,
} from "lucide-react";


import { authApi } from "../services/api";
import { auth, logoutFirebase } from "../services/firebase";

import EmployeeManagement from "./EmployeeManagement.jsx";
import BranchManagement from "./BranchManagement.jsx";
import WorkTaskManagement from "./WorkTaskManagement.jsx";
import BranchManagementDashboard from "./BranchManagementDashboard.jsx";
import SuperAdminOperationalDesk from "./SuperAdminOperationalDesk.jsx";
import SuperAdminAttendance from "./SuperAdminAttendance.jsx";
import SuperAdminLeaves from "./SuperAdminLeaves.jsx";
import SuperAdminPayroll from "./SuperAdminPayroll";
import SuperAdminAdvances from "./SuperAdminAdvances";
import SuperAdminEODReports from "./SuperAdminEODReports";
import SuperAdminLeadManagement from "./SuperAdminLeadManagement.jsx";

const navigation = [
  { label: "Overview", path: "/super-admin/overview", icon: LayoutDashboard },
  { label: "Employees", path: "/super-admin/employees", icon: Users },

  // New branch management module
  { label: "Branch Management", path: "/super-admin/branches", icon: Building2 },
  {
    label: "Task Management",
    path: "/super-admin/work-tasks",
    icon: ClipboardList,
  },
  {
    label: "Conrol Panel",
    path: "/super-admin/branchess",
    icon: Building2,
  },

  {
    label: "Operational Execution Desk",
    path: "/super-admin/operational-desk",
    icon: Activity,
  },
  { label: "Attendance", path: "/super-admin/attendance", icon: CalendarDays },
  { label: "Leave Management", path: "/super-admin/leaves", icon: ClipboardCheck },
  { label: "Payroll", path: "/super-admin/payroll", icon: Wallet },
  {
    label: "Advance Management",
    path: "/super-admin/advances",
    icon: Wallet,
  },
  {
    label: "EOD Work Reports",
    path: "/super-admin/eod-reports",
    icon: ClipboardCheck,
  },

  {
    label: "Lead Management",
    path: "/super-admin/leads",
    icon: ClipboardList,
  },
  { label: "My Profile", path: "/super-admin/profile", icon: UserRound },
  { label: "Settings", path: "/super-admin/settings", icon: Settings },
];

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    if (!auth.currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authApi.getMe();
      const result = response?.data;

      if (result?.success === false) {
        throw new Error(result.message || "Unable to load administrator profile.");
      }

      const account =
        result?.data?.admin ||
        result?.data?.user ||
        result?.admin ||
        result?.user ||
        result?.data ||
        result;

      setProfile(account);
    } catch (err) {
      const status = err?.response?.status ?? err?.status;

      if (status === 401 || status === 403) {
        await logoutFirebase();
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err?.response?.data?.message ||
        err.message ||
        "Could not connect to the HRMS backend."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);

      if (!user) {
        setProfile(null);
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      loadProfile();
    });

    return unsubscribe;
  }, [navigate, loadProfile]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      try {
        await authApi.logout();
      } catch (err) {
        console.error("Backend logout failed:", err.message);
      }

      await logoutFirebase();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  const name =
    profile?.name ||
    profile?.fullName ||
    profile?.username ||
    auth.currentUser?.displayName ||
    "Super Admin";

  const email = profile?.email || auth.currentUser?.email || "Administrator account";

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SA";

  const activeItem =
    navigation.find((item) => location.pathname === item.path) ||
    navigation.find((item) => location.pathname.startsWith(`${item.path}/`)) ||
    navigation[0];

  const filteredNavigation = navigation.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase().trim())
  );

  if (!authReady || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6fc] p-5">
        <div className="rounded-3xl border border-violet-100 bg-white p-9 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <LoaderCircle size={30} className="animate-spin" />
          </div>
          <h2 className="mt-5 text-lg font-extrabold text-slate-900">
            Preparing your workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Verifying your administrator session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6fc] text-slate-800">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-violet-100 bg-white transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
      >
        <div className="flex h-[78px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 text-white shadow-lg shadow-violet-200">
              <Sun size={25} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                ZERMII
              </h1>
              <p className="text-[10px] font-bold tracking-[0.2em] text-violet-700">
                HRMS WORKSPACE
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-2 pt-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Main menu
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {filteredNavigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => {
                setSidebarOpen(false);
                setSearch("");
              }}
              className={({ isActive }) =>
                `group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive
                  ? "bg-violet-700 text-white shadow-lg shadow-violet-200"
                  : "text-slate-600 hover:bg-violet-50 hover:text-violet-800"
                }`
              }
            >
              <Icon size={19} />
              <span className="flex-1">{label}</span>
              {location.pathname === path && <ChevronRight size={16} />}
            </NavLink>
          ))}
          {filteredNavigation.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">
              No matching menu items.
            </p>
          )}
        </nav>

        <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 p-4">
          <div className="mb-2 flex items-center gap-2 text-violet-800">
            <ShieldCheck size={19} />
            <span className="text-sm font-bold">Secure workspace</span>
          </div>
          <p className="text-xs leading-5 text-slate-600">
            Your administrator session is protected by Firebase authentication.
          </p>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <NavLink
            to="/super-admin/profile"
            className="mb-3 flex items-center gap-3 rounded-xl p-1 hover:bg-violet-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-800">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{name}</p>
              <p className="text-xs text-slate-500">Super Administrator</p>
            </div>
          </NavLink>

          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            {loggingOut ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <LogOut size={18} />
            )}
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex min-h-[78px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">
                Workspace / {activeItem.label}
              </p>
              <h2 className="truncate text-lg font-bold text-slate-900">
                {activeItem.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <label className="relative hidden md:block">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search menu..."
                aria-label="Search navigation menu"
                className="w-44 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 xl:w-56"
              />
              {search && (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {filteredNavigation.map(({ label, path, icon: Icon }) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => {
                        navigate(path);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-violet-50"
                    >
                      <Icon size={16} /> {label}
                    </button>
                  ))}
                  {filteredNavigation.length === 0 && (
                    <p className="p-2 text-sm text-slate-500">
                      No menu items found.
                    </p>
                  )}
                </div>
              )}
            </label>

            <button
              type="button"
              title="Notifications"
              onClick={() => window.alert("Notifications API is not connected yet.")}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-violet-50"
            >
              <Bell size={19} />
            </button>

            <NavLink
              to="/super-admin/profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 font-bold text-violet-800"
            >
              {initials}
            </NavLink>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-7 xl:p-9">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle size={20} className="shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Profile service warning</p>
                <p className="mt-1">{error}</p>
                <button
                  type="button"
                  onClick={loadProfile}
                  className="mt-2 inline-flex items-center gap-2 font-bold text-violet-800"
                >
                  <RefreshCw size={15} /> Retry
                </button>
              </div>
            </div>
          )}

          <Routes>
            <Route index element={<Navigate to="overview" replace />} />

            <Route
              path="overview"
              element={
                <OverviewPage
                  name={name}
                  email={email}
                  profile={profile}
                  onNavigate={navigate}
                />
              }
            />

            <Route path="employees" element={<EmployeeManagement />} />
            <Route
              path="branches"
              element={<BranchManagement />}
            />
            <Route
              path="work-tasks"
              element={<WorkTaskManagement />}
            />
            <Route
              path="branchess"
              element={<BranchManagementDashboard />}
            />
            <Route
  path="operational-desk"
  element={<SuperAdminOperationalDesk />}
/>

            <Route path="profile" element={<ProfilePage profile={profile} email={email} name={name} />} />
            <Route
  path="attendance"
  element={<SuperAdminAttendance />}
/>
<Route
  path="leaves"
  element={<SuperAdminLeaves />}
/>
<Route
  path="payroll"
  element={<SuperAdminPayroll />}
/>

<Route
  path="advances"
  element={<SuperAdminAdvances />}
/>

<Route
  path="eod-reports"
  element={<SuperAdminEODReports />}
/>


<Route
  path="leads"
  element={<SuperAdminLeadManagement />}
/>


            <Route path="settings" element={<ModulePage title="Settings" icon={Settings} />} />

            <Route path="*" element={<Navigate to="/super-admin/overview" replace />} />
          </Routes>

          <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} ZERMII HRMS. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={15} /> Secure administrator workspace
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function OverviewPage({ name, email, profile, onNavigate }) {
  const [employeeCount, setEmployeeCount] = useState("—");
  const [countLoading, setCountLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadEmployeeCount() {
      try {
        if (!auth.currentUser) return;

        const token = await auth.currentUser.getIdToken();
        const response = await fetch(`${API_BASE}/employee/auth`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || "Employee API unavailable");

        const data =
          result?.data?.employees ||
          result?.employees ||
          result?.data?.items ||
          result?.items ||
          result?.data;

        if (active && Array.isArray(data)) {
          setEmployeeCount(String(result?.pagination?.total ?? result?.total ?? data.length));
        }
      } catch (error) {
        console.error("Employee dashboard count:", error);
      } finally {
        if (active) setCountLoading(false);
      }
    }

    loadEmployeeCount();
    return () => { active = false; };
  }, []);

  const stats = [
    { label: "Total employees", value: countLoading ? "…" : employeeCount, note: "Employee records", icon: Users, path: "/super-admin/employees" },
    { label: "Present today", value: "—", note: "Attendance API required", icon: CheckCircle2, path: "/super-admin/attendance" },
    { label: "Pending leave requests", value: "—", note: "Leave API required", icon: CalendarDays, path: "/super-admin/leaves" },
    { label: "Payroll overview", value: "—", note: "Payroll API required", icon: Wallet, path: "/super-admin/payroll" },
  ];

  const shortcuts = [
    { label: "Employee management", description: "Create and manage employee records", icon: Users, path: "/super-admin/employees" },
    { label: "Employee ID cards", description: "Preview and print employee cards", icon: IdCard, path: "/super-admin/employee-id-cards" },
    { label: "Attendance records", description: "View attendance module", icon: CalendarDays, path: "/super-admin/attendance" },
    { label: "Leave requests", description: "Manage leave module", icon: ClipboardCheck, path: "/super-admin/leaves" },
    { label: "Workspace settings", description: "Configure workspace settings", icon: Settings, path: "/super-admin/settings" },
  ];

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#32116d] via-violet-800 to-[#7c3aed] p-6 text-white shadow-xl shadow-violet-200/60 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
              <Sparkles size={14} /> SUPER ADMIN CONTROL CENTER
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back, {name}!
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-violet-100 sm:text-base">
              Manage employees, employee ID cards, and your HRMS workspace from one secure place.
            </p>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-3xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-sm md:self-center">
            <Building2 size={39} />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Workspace overview</h2>
            <p className="mt-1 text-sm text-slate-500">Your available HRMS modules.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
            <ShieldCheck size={14} /> Secure administrator session
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, note, icon: Icon, path }) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(path)}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <Icon size={21} />
                </div>
                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-violet-700" />
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
              <p className="mt-2 text-xs text-slate-400">{note}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Administrator profile</h2>
              <p className="mt-1 text-sm text-slate-500">Account information from your backend.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <UserRound size={22} />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-violet-50 to-white p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-lg font-bold text-white">
              {name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SA"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{name}</p>
              <p className="break-all text-sm text-slate-500">{email}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={13} /> Firebase authenticated
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <ProfileValue label="Role" value={profile?.role || "SUPER_ADMIN"} />
            <ProfileValue label="Account status" value={profile?.status || "Authenticated"} />
            <ProfileValue label="Account ID" value={profile?._id || profile?.id || auth.currentUser?.uid || "—"} />
            <ProfileValue label="Email" value={email} />
          </div>

          <button
            type="button"
            onClick={() => onNavigate("/super-admin/profile")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800"
          >
            View profile <ChevronRight size={16} />
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Quick access</h2>
          <p className="mt-1 text-sm text-slate-500">Open a workspace module.</p>

          <div className="mt-5 space-y-2">
            {shortcuts.map(({ label, description, icon: Icon, path }) => (
              <button
                key={path}
                type="button"
                onClick={() => onNavigate(path)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3.5 text-left transition hover:border-violet-200 hover:bg-violet-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <Icon size={19} />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-700">{label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{description}</span>
                </span>
                <ChevronRight size={17} className="shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function ProfileValue({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );
}

function ProfilePage({ profile, email, name }) {
  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        <UserRound size={27} />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-slate-900">Super Admin Profile</h1>
      <p className="mt-2 text-sm text-slate-500">Your authenticated administrator information.</p>
      <div className="mt-6 space-y-4">
        <ProfileValue label="Name" value={name} />
        <ProfileValue label="Email" value={email} />
        <ProfileValue label="Role" value={profile?.role || "SUPER_ADMIN"} />
        <ProfileValue label="Account ID" value={profile?._id || profile?.id || auth.currentUser?.uid} />
      </div>
      <p className="mt-6 rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-800">
        Profile editing can be enabled once your backend exposes a Super Admin profile-update endpoint.
      </p>
    </section>
  );
}

function ModulePage({ title, icon: Icon }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
        <Icon size={24} />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        This module has its own navigation page. Live records and management actions
        require the corresponding backend endpoints.
      </p>
    </section>
  );
}
