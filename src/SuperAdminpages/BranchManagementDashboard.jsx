import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Users,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  Navigation,
  AlertCircle,
  LoaderCircle,
  BriefcaseBusiness,
  Eye,
} from "lucide-react";
import { auth } from "../services/firebase";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const BRANCH_API = `${API_BASE}/branches`;

const cn = (...values) => values.filter(Boolean).join(" ");

const idOf = (value) => String(value?._id || value?.id || value || "");

const employeeName = (employee) =>
  employee?.fullName ||
  employee?.name ||
  employee?.nameOfEmployee ||
  "Unnamed employee";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const initials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "EM";

function extractPayload(response) {
  // Supports raw fetch JSON and common API wrapper shapes.
  let value = response;
  for (let i = 0; i < 3 && value?.data; i += 1) value = value.data;
  return value || {};
}

function extractBranches(response) {
  const candidates = [
    response?.data?.branches,
    response?.data?.data?.branches,
    response?.branches,
    response?.data?.data,
    response?.data,
  ];
  return candidates.find(Array.isArray) || [];
}

function getPhoto(employee) {
  return (
    employee?.photoUrl ||
    employee?.profilePhoto ||
    employee?.photo ||
    employee?.avatar ||
    employee?.imageUrl ||
    ""
  );
}

function getGrossSalary(employee) {
  const salary = employee?.salary || {};
  return (
    Number(employee?.grossSalary ?? salary?.grossSalary) ||
    (Number(salary?.basicPay) || 0) +
      (Number(salary?.hra) || 0) +
      (Number(salary?.conveyance) || 0)
  );
}

function departmentName(employee) {
  return (
    employee?.department ||
    employee?.operationalTeam ||
    employee?.team ||
    "Other"
  );
}

function employeeRole(employee) {
  return (
    employee?.designationTitle ||
    employee?.designation ||
    employee?.jobTitle ||
    employee?.systemRole ||
    employee?.role ||
    "Employee"
  );
}

function roleLabel(employee) {
  const role = String(employee?.systemRole || employee?.role || "").toUpperCase();
  const title = employeeRole(employee);
  if (role.includes("BRANCH_MANAGER") || title.toLowerCase().includes("branch manager")) {
    return "Branch Manager";
  }
  if (role.includes("HR") || title.toLowerCase().includes("human resource")) {
    return "HR";
  }
  return employee?.operationalTeam || employee?.department || employeeRole(employee);
}

function managerOf(branch) {
  return branch?.branchManager || branch?.manager || null;
}

function hrOf(branch) {
  return branch?.hrEmployee || branch?.hr || null;
}

function employeeList(branch) {
  const list = Array.isArray(branch?.employees) ? branch.employees : [];
  const manager = managerOf(branch);
  const hr = hrOf(branch);
  const unique = new Map();

  [...list, ...(manager ? [manager] : []), ...(hr ? [hr] : [])].forEach((employee) => {
    if (!employee || String(employee.status || "ACTIVE").toUpperCase() === "DELETED") return;
    const id = idOf(employee);
    const key = id || `${employeeName(employee)}-${employee.email || ""}`;
    if (key) unique.set(key, employee);
  });

  return [...unique.values()].sort((a, b) =>
    employeeName(a).localeCompare(employeeName(b))
  );
}

function StatPill({ children, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition",
        active
          ? "bg-violet-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-700 hover:bg-violet-50"
      )}
    >
      {children}
    </button>
  );
}

function BranchCard({ branch, selected, onClick }) {
  const manager = managerOf(branch);
  const staffCount = employeeList(branch).length;
  const radius =
    branch?.geofence?.radiusMeters ??
    branch?.geofenceRadius ??
    branch?.geofenceRadiusMeters;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-[22px] border p-4 text-left transition",
        selected
          ? "border-violet-500 bg-violet-50/80 shadow-[0_0_0_2px_rgba(139,92,246,0.15)]"
          : "border-slate-200 bg-white hover:border-violet-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-md bg-indigo-50 px-2.5 py-1 font-mono text-[10px] font-bold text-indigo-700">
          {branch.branchCode || "NO-CODE"}
        </span>
        <span className="text-[11px] text-slate-500">
          {radius ? `Geofence: ${radius}m` : "Geofence: Not set"}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-[15px] font-bold text-slate-950">
        {branch.branchName || "Unnamed Branch"}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {[branch.city, branch.state].filter(Boolean).join(", ") || "Location not set"}
      </p>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px]">
        <span className="min-w-0 truncate text-slate-600">
          Mgr: <strong className="text-slate-800">{manager ? employeeName(manager) : branch.branchManagerName || "Not assigned"}</strong>
        </span>
        <span className="shrink-0 font-bold text-violet-700">
          {staffCount} Staff
        </span>
      </div>
    </button>
  );
}

function EmployeeAvatar({ employee }) {
  const photo = getPhoto(employee);
  if (photo) {
    return (
      <img
        src={photo}
        alt={employeeName(employee)}
        className="h-10 w-10 shrink-0 rounded-xl object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-xs font-bold text-violet-800">
      {initials(employeeName(employee))}
    </div>
  );
}

function EmployeeRow({ employee, branch, onViewWork }) {
  const manager = managerOf(branch);
  const reportingManager =
    employee?.reportingManager?.fullName ||
    employee?.reportingManager?.name ||
    (typeof employee?.reportingManager === "string" ? employee.reportingManager : "") ||
    (String(idOf(employee)) === String(idOf(manager)) ? "Self / Branch Office" : "—");

  return (
    <tr className="border-t border-slate-100 align-middle">
      <td className="px-4 py-3">
        <div className="flex min-w-[170px] items-center gap-3">
          <EmployeeAvatar employee={employee} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{employeeName(employee)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {employee.employeeCode || employee.employeeId || "Code not set"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="min-w-[170px] text-sm font-medium text-slate-900">{employeeRole(employee)}</p>
        <span className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
          {roleLabel(employee)}
        </span>
        {employee.operationalTeam && employee.department && employee.operationalTeam !== employee.department && (
          <p className="mt-1 text-[11px] text-slate-500">{employee.operationalTeam}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{reportingManager}</td>
      <td className="px-4 py-3 text-sm font-bold tabular-nums text-slate-950">
        {currency(getGrossSalary(employee))}
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">
        {employee.todayAttendance?.status ||
          employee.attendanceToday?.status ||
          "Not Checked In"}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onViewWork(employee)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
        >
          <Eye size={14} />
          View Work
        </button>
      </td>
    </tr>
  );
}

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [workEmployee, setWorkEmployee] = useState(null);

  const apiRequest = useCallback(async (url, options = {}) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Your Super Admin session has expired. Please sign in again.");
    }

    const token = await user.getIdToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(
        result?.message ||
          result?.error ||
          (typeof result === "string" ? result : "") ||
          `Request failed (${response.status})`
      );
    }

    return result;
  }, []);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      let response;
      try {
        response = await apiRequest(`${BRANCH_API}/dashboard?status=ALL`);
      } catch (dashboardError) {
        // Use the existing overview endpoint if the dedicated dashboard route
        // has not yet been registered in branchRoutes.js.
        if (!String(dashboardError.message).includes("404")) throw dashboardError;
        response = await apiRequest(`${BRANCH_API}/overview?status=ALL`);
      }

      const data = extractPayload(response);
      const loadedBranches = extractBranches(response).length
        ? extractBranches(response)
        : Array.isArray(data?.branches)
          ? data.branches
          : [];

      setBranches(loadedBranches);
      setSelectedBranchId((current) => {
        if (current && loadedBranches.some((branch) => idOf(branch) === current)) {
          return current;
        }
        return idOf(loadedBranches[0]);
      });
    } catch (requestError) {
      setError(requestError.message || "Could not load branch dashboard.");
      setBranches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return branches;
    return branches.filter((branch) =>
      [
        branch.branchName,
        branch.branchCode,
        branch.city,
        branch.state,
        branch.branchManagerName,
        branch.hrEmployeeName,
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [branches, search]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => idOf(branch) === selectedBranchId) || filteredBranches[0] || null,
    [branches, selectedBranchId, filteredBranches]
  );

  useEffect(() => {
    if (selectedBranch && !filteredBranches.some((branch) => idOf(branch) === idOf(selectedBranch))) {
      setSelectedBranchId(idOf(filteredBranches[0]));
    }
  }, [filteredBranches, selectedBranch]);

  const staff = useMemo(() => employeeList(selectedBranch), [selectedBranch]);

  const departments = useMemo(
    () => ["ALL", ...new Set(staff.map(departmentName).filter(Boolean))],
    [staff]
  );

  const visibleStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    return staff.filter((employee) => {
      const matchesDepartment =
        departmentFilter === "ALL" || departmentName(employee) === departmentFilter;
      const matchesSearch =
        !term ||
        [
          employeeName(employee),
          employee.employeeCode,
          employee.email,
          employee.department,
          employee.designationTitle,
          employee.systemRole,
        ].some((value) => String(value || "").toLowerCase().includes(term));
      return matchesDepartment && matchesSearch;
    });
  }, [staff, departmentFilter, search]);

  const summary = useMemo(() => ({
    total: branches.length,
    active: branches.filter((branch) => String(branch.status || "").toUpperCase() === "ACTIVE").length,
    inactive: branches.filter((branch) => String(branch.status || "").toUpperCase() === "INACTIVE").length,
    employees: new Set(branches.flatMap((branch) => employeeList(branch).map(idOf).filter(Boolean))).size,
  }), [branches]);

  const onViewWork = (employee) => setWorkEmployee(employee);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="overflow-hidden rounded-[22px] bg-[#11182c] px-5 py-5 text-white shadow-sm sm:px-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">HRMS · Super Admin</p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">Branch Operations Dashboard</h1>
              <p className="mt-1 text-xs text-slate-300">Company branches, personnel, roles and operational work</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1 md:flex-none">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search branches or employees"
                  className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-400 focus:border-violet-300"
                />
              </div>
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 disabled:opacity-60"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Could not load branch dashboard</p>
              <p className="mt-1 break-words">{error}</p>
              <p className="mt-1 text-xs">Check the backend route, Firebase token, and VITE_API_BASE_URL.</p>
            </div>
            <button type="button" onClick={() => setError("")} className="text-xs font-bold">Dismiss</button>
          </div>
        )}

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Select branch for drill-down analysis</h2>
            <p className="mt-1 text-[11px] text-slate-400">Showing branch data returned by your authorized API</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-lg font-extrabold">{summary.total}</p>
              <p className="text-[10px] text-slate-500">Branches</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-lg font-extrabold text-emerald-600">{summary.active}</p>
              <p className="text-[10px] text-slate-500">Active</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-lg font-extrabold text-violet-700">{summary.employees}</p>
              <p className="text-[10px] text-slate-500">Unique staff</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            <LoaderCircle size={22} className="animate-spin text-violet-600" />
            Loading branches, HR, managers and employees…
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <Building2 size={32} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-bold">No branches found</h3>
            <p className="mt-1 text-sm text-slate-500">The API returned no branches matching your search.</p>
            <button type="button" onClick={() => { setSearch(""); loadDashboard(true); }} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Reload all branches</button>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {filteredBranches.map((branch) => (
                <BranchCard
                  key={idOf(branch)}
                  branch={branch}
                  selected={idOf(branch) === idOf(selectedBranch)}
                  onClick={() => {
                    setSelectedBranchId(idOf(branch));
                    setDepartmentFilter("ALL");
                  }}
                />
              ))}
            </section>

            {selectedBranch && (
              <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-extrabold">{selectedBranch.branchName}</h2>
                      <span className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-bold",
                        String(selectedBranch.status || "").toUpperCase() === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      )}>
                        {selectedBranch.status || "UNKNOWN"}
                      </span>
                    </div>
                    <div className="mt-2 flex max-w-3xl flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {selectedBranch.address && <span className="inline-flex items-center gap-1"><MapPin size={13} />{selectedBranch.address}</span>}
                      <span>{[selectedBranch.city, selectedBranch.state, selectedBranch.pincode].filter(Boolean).join(", ")}</span>
                      {selectedBranch.branchContactPhone && <span className="inline-flex items-center gap-1"><Phone size={13} />{selectedBranch.branchContactPhone}</span>}
                      {selectedBranch.geofence?.latitude != null && selectedBranch.geofence?.longitude != null && (
                        <span className="inline-flex items-center gap-1"><Navigation size={13} />GPS: {selectedBranch.geofence.latitude}, {selectedBranch.geofence.longitude}</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-indigo-800">Manager: <strong>{employeeName(managerOf(selectedBranch)) !== "Unnamed employee" ? employeeName(managerOf(selectedBranch)) : selectedBranch.branchManagerName || "Not assigned"}</strong></span>
                      <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-rose-800">HR: <strong>{employeeName(hrOf(selectedBranch)) !== "Unnamed employee" ? employeeName(hrOf(selectedBranch)) : selectedBranch.hrEmployeeName || "Not assigned"}</strong></span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700">Staff: <strong>{staff.length}</strong></span>
                    </div>
                  </div>

                  <div className="min-w-0 xl:max-w-[62%]">
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                      <BriefcaseBusiness size={14} />
                      <span>Department</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatPill active={departmentFilter === "ALL"} onClick={() => setDepartmentFilter("ALL")}>
                        All Departments ({staff.length})
                      </StatPill>
                      {departments.filter((item) => item !== "ALL").map((department) => (
                        <StatPill
                          key={department}
                          active={departmentFilter === department}
                          onClick={() => setDepartmentFilter(department)}
                        >
                          {department} ({staff.filter((employee) => departmentName(employee) === department).length})
                        </StatPill>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Assigned personnel &amp; operational status ({visibleStaff.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {selectedBranch.branchCode || "Branch"} · {selectedBranch.taskSummary?.total || (selectedBranch.assignedTasks || []).length} tasks
                    </span>
                  </div>

                  {visibleStaff.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                      No employees are associated with this branch in the API response.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full min-w-[1000px] border-collapse text-left">
                        <thead className="bg-slate-50">
                          <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                            <th className="px-4 py-3">Employee</th>
                            <th className="px-4 py-3">Designation &amp; Team</th>
                            <th className="px-4 py-3">Reporting Manager</th>
                            <th className="px-4 py-3">Gross Salary</th>
                            <th className="px-4 py-3">Today's Attendance</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleStaff.map((employee, index) => (
                            <EmployeeRow
                              key={idOf(employee) || employee.email || `${employeeName(employee)}-${index}`}
                              employee={employee}
                              branch={selectedBranch}
                              onViewWork={onViewWork}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {workEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setWorkEmployee(null);
          }}>
            <section role="dialog" aria-modal="true" aria-labelledby="employee-work-title" className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Employee work overview</p>
                  <h2 id="employee-work-title" className="mt-1 text-lg font-extrabold">{employeeName(workEmployee)}</h2>
                  <p className="mt-1 text-xs text-slate-500">{workEmployee.employeeCode || "No employee code"} · {employeeRole(workEmployee)}</p>
                </div>
                <button type="button" onClick={() => setWorkEmployee(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold">Close</button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Total", workEmployee.taskSummary?.total || 0],
                  ["Assigned", workEmployee.taskSummary?.assigned || 0],
                  ["In progress", workEmployee.taskSummary?.inProgress || 0],
                  ["Completed", workEmployee.taskSummary?.completed || 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-extrabold">{value}</p>
                  </div>
                ))}
              </div>
              <h3 className="mt-5 text-sm font-bold">Assigned tasks</h3>
              {(workEmployee.assignedTasks || []).length ? (
                <div className="mt-3 space-y-2">
                  {workEmployee.assignedTasks.map((task, index) => (
                    <article key={idOf(task) || `${task.title}-${index}`} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{task.title || "Untitled task"}</p>
                        <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">{task.status || "ASSIGNED"}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{task.instructions || "No task instructions"}</p>
                      <p className="mt-2 text-[11px] text-slate-400">Due: {task.dueDate ? new Date(task.dueDate).toLocaleString("en-IN") : "No due date"} · Priority: {task.priority || "MEDIUM"}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No task details were returned for this employee.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
