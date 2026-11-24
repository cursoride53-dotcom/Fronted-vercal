

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "../services/firebase";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Building2,
  BriefcaseBusiness,
  ShieldCheck,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  MapPin,
  CalendarDays,
  LockKeyhole,
} from "lucide-react";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const EMPLOYEE_API = `${API_BASE}/employee/auth`;
const BRANCH_API = `${API_BASE}/branches`;

const STATUSES = ["ACTIVE", "PROBATION", "ON_HOLD", "INACTIVE"];

const ROLES = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "BRANCH_MANAGER", label: "Branch Manager" },
  { value: "HR_ADMIN", label: "HR Admin" },
];

const EMPTY_FORM = {
  fullName: "",
  email: "",
  mobileNumber: "",
  systemRole: "EMPLOYEE",
  branch: "",
  department: "",
  operationalTeam: "",
  designationTitle: "",
  reportingManager: "",
  status: "ACTIVE",
  basicPay: "",
  hra: "",
  conveyance: "",
  tdsDeduction: "",
  password: "",
};

const INPUT =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100";

function getMessage(error) {
  return (
    error?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function unwrapList(result) {
  const candidates = [
    result?.data?.employees,
    result?.employees,
    result?.data?.branches,
    result?.branches,
    result?.data?.items,
    result?.items,
    result?.data?.results,
    result?.results,
    result?.data,
  ];

  return candidates.find(Array.isArray) || [];
}

function unwrapEmployee(result) {
  return (
    result?.data?.employee ||
    result?.employee ||
    result?.data?.item ||
    result?.data?.result ||
    result?.data ||
    result
  );
}

function employeeId(employee) {
  return employee?._id || employee?.id || "";
}

function employeeName(employee) {
  return employee?.fullName || employee?.name || "Unnamed employee";
}

function branchId(branch) {
  return branch?._id || branch?.id || "";
}

function branchName(branch) {
  return (
    branch?.branchName ||
    branch?.name ||
    branch?.branch_name ||
    branch?.branchCode ||
    branch?.code ||
    ""
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function statusStyle(status) {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "PROBATION":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "ON_HOLD":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "INACTIVE":
    case "DELETED":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-violet-50 text-violet-700 ring-violet-200";
  }
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function EmployeeAvatar({ employee, large = false }) {
  const name = employeeName(employee);
  const photo =
    employee?.photoUrl || employee?.profilePhoto || employee?.photo;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-violet-100 font-extrabold text-violet-800 ${
        large ? "h-16 w-16 text-xl" : "h-11 w-11 text-sm"
      }`}
    >
      {photo ? (
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase() || "E"
      )}
    </div>
  );
}

async function apiRequest(path = "", options = {}, baseUrl = EMPLOYEE_API) {
  const user = auth.currentUser;

  if (!user) {
    const error = new Error("Your session has expired. Please sign in again.");
    error.status = 401;
    throw error;
  }

  const token = await user.getIdToken();

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
    const error = new Error(
      result?.message || `API request failed (${response.status})`
    );
    error.status = response.status;
    error.data = result;
    throw error;
  }

  return result;
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("");
      setEmployees(unwrapList(result));
    } catch (err) {
      setError(getMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);

    try {
      const result = await apiRequest("", {}, BRANCH_API);
      const list = unwrapList(result);

      setBranches(
        list.filter(
          (branch) =>
            !["INACTIVE", "DELETED"].includes(
              String(branch.status || "ACTIVE").toUpperCase()
            )
        )
      );
    } catch (err) {
      console.error("Failed to load branches:", err);
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadBranches();
  }, [loadEmployees, loadBranches]);

  const departments = useMemo(
    () =>
      [
        ...new Set(
          employees.map((employee) => employee.department).filter(Boolean)
        ),
      ].sort(),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const fields = [
        employee.fullName,
        employee.name,
        employee.employeeCode,
        employee.email,
        employee.mobileNumber,
        employee.department,
        employee.designationTitle,
        employee.branch,
      ];

      const matchesSearch =
        !term ||
        fields.some((value) =>
          String(value || "").toLowerCase().includes(term)
        );

      const status = String(employee.status || "ACTIVE").toUpperCase();
      const role = String(employee.systemRole || "EMPLOYEE").toUpperCase();

      return (
        matchesSearch &&
        (statusFilter === "ALL" || status === statusFilter) &&
        (roleFilter === "ALL" || role === roleFilter) &&
        (departmentFilter === "ALL" ||
          employee.department === departmentFilter)
      );
    });
  }, [employees, search, statusFilter, roleFilter, departmentFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / pageSize)
  );

  const visibleEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, roleFilter, departmentFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const activeCount = employees.filter(
    (employee) => String(employee.status).toUpperCase() === "ACTIVE"
  ).length;

  const probationCount = employees.filter(
    (employee) => String(employee.status).toUpperCase() === "PROBATION"
  ).length;

  function notifySuccess(message) {
    setSuccess(message);
    setError("");
  }

  function openCreate() {
    setSelected(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setSuccess("");
    setModal("create");
  }

  function openEdit(employee) {
    setSelected(employee);

    setForm({
      ...EMPTY_FORM,
      ...employee,
      branch:
        typeof employee.branch === "object"
          ? branchName(employee.branch)
          : employee.branch || "",
      basicPay: employee.salary?.basicPay ?? "",
      hra: employee.salary?.hra ?? "",
      conveyance: employee.salary?.conveyance ?? "",
      tdsDeduction: employee.salary?.tdsDeduction ?? "",
      password: "",
    });

    setError("");
    setSuccess("");
    setModal("edit");
  }

  async function openView(employee) {
    setSelected(employee);
    setError("");
    setModal("view");

    const id = employeeId(employee);
    if (!id) return;

    try {
      setSelected(unwrapEmployee(await apiRequest(`/${encodeURIComponent(id)}`)));
    } catch (err) {
      setError(getMessage(err));
    }
  }

  function closeModal() {
    if (saving) return;
    setModal("");
    setSelected(null);
    setError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        systemRole: form.systemRole,
        branch: form.branch.trim(),
        department: form.department.trim(),
        operationalTeam: form.operationalTeam.trim(),
        designationTitle: form.designationTitle.trim(),
        reportingManager: form.reportingManager.trim(),
        status: form.status,
        salary: {
          basicPay: Number(form.basicPay) || 0,
          hra: Number(form.hra) || 0,
          conveyance: Number(form.conveyance) || 0,
          tdsDeduction: Number(form.tdsDeduction) || 0,
        },
      };

      if (modal === "create") {
        if (form.password.length < 6) {
          throw new Error(
            "Enter an initial password of at least 6 characters."
          );
        }

        payload.password = form.password;

        await apiRequest("", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setModal("");
        setSelected(null);
        notifySuccess("Employee created successfully.");
      } else {
        const id = employeeId(selected);
        if (!id) throw new Error("Employee ID is missing.");

        if (form.password.trim()) {
          payload.password = form.password;
        }

        await apiRequest(`/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        setModal("");
        setSelected(null);
        notifySuccess("Employee details updated successfully.");
      }

      await loadEmployees();
    } catch (err) {
      setError(getMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(employee) {
    const id = employeeId(employee);

    if (!id) {
      setError("Employee ID is missing.");
      return;
    }

    setBusyId(id);
    setError("");

    try {
      await apiRequest(`/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      setConfirmDelete(null);
      setModal("");
      setSelected(null);
      notifySuccess("Employee deleted successfully.");
      await loadEmployees();
    } catch (err) {
      setError(getMessage(err));
    } finally {
      setBusyId("");
    }
  }

  async function handleStatusChange(employee, newStatus) {
    const id = employeeId(employee);
    if (!id) return;

    setBusyId(id);
    setError("");

    try {
      await apiRequest(`/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      notifySuccess(`${employeeName(employee)} status updated.`);
      await loadEmployees();
    } catch (err) {
      setError(getMessage(err));
    } finally {
      setBusyId("");
    }
  }

  function exportCsv() {
    const columns = [
      ["Employee ID", "employeeCode"],
      ["Full Name", "fullName"],
      ["Email", "email"],
      ["Mobile", "mobileNumber"],
      ["Department", "department"],
      ["Designation", "designationTitle"],
      ["Branch", "branch"],
      ["Role", "systemRole"],
      ["Status", "status"],
    ];

    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      columns.map(([label]) => escapeCsv(label)).join(","),
      ...filteredEmployees.map((employee) =>
        columns
          .map(([, key]) =>
            escapeCsv(
              key === "fullName"
                ? employeeName(employee)
                : typeof employee[key] === "object"
                  ? branchName(employee[key])
                  : employee[key]
            )
          )
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "zermii-employees.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  const selectedBranchExists = branches.some(
    (branch) => branchName(branch) === form.branch
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#32116d] via-violet-800 to-[#7c3aed] p-6 text-white shadow-xl shadow-violet-200/60 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[30px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-fuchsia-400/10 blur-2xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">
              HRMS / People
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Employee Management
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100">
              Create employee accounts, manage branch assignments, update
              employee information, and maintain employee records in one
              workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-800 shadow-lg transition hover:bg-violet-50"
          >
            <UserPlus size={18} />
            Add employee
          </button>
        </div>
      </section>

      {error && !modal && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <p className="min-w-0 flex-1 break-words">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={19} />
          <span className="flex-1">{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total employees", value: employees.length, icon: Users },
          { label: "Active employees", value: activeCount, icon: CheckCircle2 },
          { label: "On probation", value: probationCount, icon: ShieldCheck },
          {
            label: "Filtered records",
            value: filteredEmployees.length,
            icon: Filter,
          },
        ].map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  {value}
                </p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                <Icon size={22} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-4 sm:p-5 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              All employees
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search, filter, and manage employee records.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label className="relative min-w-0 sm:w-64">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, ID, email..."
                className={`${INPUT} pl-9`}
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={INPUT}
              aria-label="Filter employee status"
            >
              <option value="ALL">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className={INPUT}
              aria-label="Filter employee role"
            >
              <option value="ALL">All roles</option>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className={INPUT}
              aria-label="Filter department"
            >
              <option value="ALL">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                loadEmployees();
                loadBranches();
              }}
              disabled={loading || branchesLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-violet-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading || branchesLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={!filteredEmployees.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 px-3 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-bold">Employee</th>
                <th className="px-5 py-4 font-bold">Employee ID</th>
                <th className="px-5 py-4 font-bold">Department / Branch</th>
                <th className="px-5 py-4 font-bold">Designation</th>
                <th className="px-5 py-4 font-bold">Role</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <LoaderCircle
                      size={28}
                      className="mx-auto animate-spin text-violet-700"
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading employee records...
                    </p>
                  </td>
                </tr>
              ) : visibleEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-400">
                      <Users size={28} />
                    </div>
                    <p className="mt-4 font-bold text-slate-800">
                      No employees found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Change your filters or add a new employee.
                    </p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800"
                    >
                      <UserPlus size={16} />
                      Create employee
                    </button>
                  </td>
                </tr>
              ) : (
                visibleEmployees.map((employee) => {
                  const id = employeeId(employee);
                  const name = employeeName(employee);
                  const roleLabel =
                    ROLES.find(
                      (role) => role.value === employee.systemRole
                    )?.label ||
                    employee.systemRole ||
                    "Employee";

                  return (
                    <tr
                      key={id || name}
                      className="transition hover:bg-violet-50/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar employee={employee} />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">{name}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail size={12} />
                              <span className="max-w-[210px] truncate">
                                {employee.email || "No email"}
                              </span>
                            </p>
                            {employee.mobileNumber && (
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone size={12} />
                                {employee.mobileNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-violet-700">
                          {employee.employeeCode || "Pending"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <p className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-slate-400" />
                          {employee.department || "—"}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin size={12} />
                          {typeof employee.branch === "object"
                            ? branchName(employee.branch) || "—"
                            : employee.branch || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {employee.designationTitle || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {roleLabel}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          aria-label={`Change status for ${name}`}
                          value={
                            STATUSES.includes(
                              String(employee.status).toUpperCase()
                            )
                              ? String(employee.status).toUpperCase()
                              : "ACTIVE"
                          }
                          disabled={busyId === id}
                          onChange={(event) =>
                            handleStatusChange(employee, event.target.value)
                          }
                          className={`max-w-[145px] rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset outline-none ${statusStyle(
                            employee.status
                          )} disabled:opacity-50`}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View employee"
                            onClick={() => openView(employee)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-100 hover:text-violet-800"
                          >
                            <Eye size={17} />
                          </button>
                          <button
                            type="button"
                            title="Edit employee"
                            onClick={() => openEdit(employee)}
                            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            type="button"
                            title="Delete employee"
                            onClick={() => setConfirmDelete(employee)}
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              Showing{" "}
              {filteredEmployees.length ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, filteredEmployees.length)} of{" "}
              {filteredEmployees.length}
            </span>
            <label className="flex items-center gap-2">
              Rows
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-violet-50 disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="px-2 text-sm font-semibold text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-violet-50 disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
                  {modal === "view" ? (
                    <Eye size={21} />
                  ) : modal === "edit" ? (
                    <Pencil size={21} />
                  ) : (
                    <UserPlus size={21} />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {modal === "view"
                      ? "Employee details"
                      : modal === "edit"
                        ? "Edit employee"
                        : "Add new employee"}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {modal === "view"
                      ? "Review employee information"
                      : "Complete the information below"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {modal === "view" ? (
              <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5 sm:p-6">
                {selected ? (
                  <>
                    <div className="flex flex-col gap-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-5 sm:flex-row sm:items-center">
                      <EmployeeAvatar employee={selected} large />
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-xl font-extrabold text-slate-900">
                          {employeeName(selected)}
                        </h3>
                        <p className="mt-1 break-all text-sm text-slate-500">
                          {selected.email || "No email"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle(
                              selected.status
                            )}`}
                          >
                            {selected.status || "ACTIVE"}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
                            {ROLES.find(
                              (role) => role.value === selected.systemRole
                            )?.label ||
                              selected.systemRole ||
                              "Employee"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["Employee ID", selected.employeeCode],
                        ["Mobile", selected.mobileNumber],
                        ["Branch", typeof selected.branch === "object" ? branchName(selected.branch) : selected.branch],
                        ["Department", selected.department],
                        ["Operational team", selected.operationalTeam],
                        ["Designation", selected.designationTitle],
                        ["Reporting manager", selected.reportingManager],
                        ["Email", selected.email],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="min-w-0 rounded-xl border border-slate-200 p-4"
                        >
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            {label}
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                            {value || "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Wallet size={19} className="text-violet-700" />
                        <h3 className="font-extrabold text-slate-900">
                          Salary details
                        </h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["Basic pay", selected.salary?.basicPay],
                          ["HRA", selected.salary?.hra],
                          ["Conveyance", selected.salary?.conveyance],
                          ["TDS deduction", selected.salary?.tdsDeduction],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-xl bg-slate-50 p-3"
                          >
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="mt-1 font-bold text-slate-900">
                              {formatMoney(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(selected)}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800"
                      >
                        <Pencil size={16} />
                        Edit employee
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Loading employee details...
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="max-h-[72vh] space-y-6 overflow-y-auto p-5 sm:p-6">
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <Users size={19} className="text-violet-700" />
                      <h3 className="font-extrabold text-slate-900">
                        Personal information
                      </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name *">
                        <input
                          required
                          name="fullName"
                          value={form.fullName}
                          onChange={handleChange}
                          placeholder="Enter full name"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="Email address *">
                        <input
                          required
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="employee@example.com"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="Mobile number *">
                        <input
                          required
                          type="tel"
                          name="mobileNumber"
                          value={form.mobileNumber}
                          onChange={handleChange}
                          placeholder="Enter mobile number"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="System role *">
                        <select
                          required
                          name="systemRole"
                          value={form.systemRole}
                          onChange={handleChange}
                          className={INPUT}
                        >
                          {ROLES.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Branch *">
                        <div className="relative">
                          <MapPin
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-500"
                          />
                          <select
                            required
                            name="branch"
                            value={form.branch || ""}
                            onChange={handleChange}
                            className={`${INPUT} pl-9`}
                            disabled={branchesLoading}
                          >
                            <option value="">
                              {branchesLoading
                                ? "Loading branches..."
                                : branches.length
                                  ? "Select a branch"
                                  : "No branches available"}
                            </option>

                            {branches.map((branch) => {
                              const id = branchId(branch);
                              const name = branchName(branch);

                              if (!name) return null;

                              return (
                                <option key={id || name} value={name}>
                                  {name}
                                  {branch.branchCode
                                    ? ` (${branch.branchCode})`
                                    : ""}
                                </option>
                              );
                            })}

                            {form.branch && !selectedBranchExists && (
                              <option value={form.branch}>
                                {form.branch} (existing branch)
                              </option>
                            )}
                          </select>
                        </div>

                        <span className="mt-1.5 block text-xs text-slate-400">
                          Branches are loaded from Branch Management.
                        </span>
                      </Field>

                      <Field label="Department *">
                        <input
                          required
                          name="department"
                          value={form.department}
                          onChange={handleChange}
                          placeholder="e.g. Human Resources"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="Operational team">
                        <input
                          name="operationalTeam"
                          value={form.operationalTeam}
                          onChange={handleChange}
                          placeholder="Enter operational team"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="Designation">
                        <input
                          name="designationTitle"
                          value={form.designationTitle}
                          onChange={handleChange}
                          placeholder="e.g. HR Executive"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="Reporting manager">
                        <input
                          name="reportingManager"
                          value={form.reportingManager}
                          onChange={handleChange}
                          placeholder="Manager name"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="Employment status">
                        <select
                          name="status"
                          value={form.status}
                          onChange={handleChange}
                          className={INPUT}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </Field>

                      {modal === "create" && (
                        <Field label="Initial password *">
                          <div className="relative">
                            <LockKeyhole
                              size={16}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              required
                              minLength={6}
                              type="password"
                              name="password"
                              value={form.password}
                              onChange={handleChange}
                              placeholder="Minimum 6 characters"
                              className={`${INPUT} pl-9`}
                            />
                          </div>
                        </Field>
                      )}

                      {modal === "edit" && (
                        <Field label="New password (optional)">
                          <div className="relative">
                            <LockKeyhole
                              size={16}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              minLength={6}
                              type="password"
                              name="password"
                              value={form.password}
                              onChange={handleChange}
                              placeholder="Leave blank to keep current"
                              className={`${INPUT} pl-9`}
                            />
                          </div>
                        </Field>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Wallet size={19} className="text-violet-700" />
                      <div>
                        <h3 className="font-extrabold text-slate-900">
                          Salary information
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Enter amounts in Indian rupees.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Basic pay">
                        <input
                          type="number"
                          min="0"
                          name="basicPay"
                          value={form.basicPay}
                          onChange={handleChange}
                          placeholder="0"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="House rent allowance (HRA)">
                        <input
                          type="number"
                          min="0"
                          name="hra"
                          value={form.hra}
                          onChange={handleChange}
                          placeholder="0"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="Conveyance">
                        <input
                          type="number"
                          min="0"
                          name="conveyance"
                          value={form.conveyance}
                          onChange={handleChange}
                          placeholder="0"
                          className={INPUT}
                        />
                      </Field>

                      <Field label="TDS deduction">
                        <input
                          type="number"
                          min="0"
                          name="tdsDeduction"
                          value={form.tdsDeduction}
                          onChange={handleChange}
                          placeholder="0"
                          className={INPUT}
                        />
                      </Field>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-white p-3">
                      <span className="text-sm font-semibold text-slate-600">
                        Estimated net salary
                      </span>
                      <span className="text-lg font-extrabold text-violet-800">
                        {formatMoney(
                          Number(form.basicPay || 0) +
                            Number(form.hra || 0) +
                            Number(form.conveyance || 0) -
                            Number(form.tdsDeduction || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || branchesLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-800 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                    {saving
                      ? "Saving..."
                      : modal === "edit"
                        ? "Save changes"
                        : "Create employee"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={23} />
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-slate-900">
              Delete employee?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You are about to delete{" "}
              <strong className="text-slate-800">
                {employeeName(confirmDelete)}
              </strong>
              . This action depends on the deletion behavior implemented in
              your backend controller.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => handleDelete(confirmDelete)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {busyId ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {busyId ? "Deleting..." : "Confirm delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
