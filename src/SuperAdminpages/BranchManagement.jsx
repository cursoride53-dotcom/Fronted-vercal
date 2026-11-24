import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, Plus, Search, RefreshCw, Eye, Pencil, X, MapPin, Phone,
  UserRound, Users, Clock3, CheckCircle2, AlertCircle, LoaderCircle,
  ChevronDown, Navigation, Settings2, Save, FileSpreadsheet, Power, Mail,
  Hash, MapPinned, Filter, ShieldCheck, BriefcaseBusiness, UserCog,
} from "lucide-react";
import { auth } from "../services/firebase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const BRANCH_API = `${API_BASE}/branches`;
const EMPLOYEE_API = `${API_BASE}/employee/auth`;
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const EMPTY_BRANCH = {
  branchName: "",
  branchCode: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  branchManagerName: "",
  branchManagerEmployeeId: "",
  hrEmployeeName: "",
  hrEmployeeId: "",
  branchContactPhone: "",
  status: "ACTIVE",
  geofence: { latitude: "", longitude: "", radiusMeters: "300" },
  workingHours: {
    startTime: "09:00",
    endTime: "18:00",
    breakStartTime: "13:00",
    breakEndTime: "14:00",
    workingDays: DAYS.slice(0, 6),
  },
};

const cn = (...values) => values.filter(Boolean).join(" ");
const getId = (value) => String(value?._id || value?.id || "");
const getError = (error) => error?.message || "Something went wrong. Please try again.";
const initials = (name = "") =>
  String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "BR";
const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function getBranchList(response) {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  for (const list of [data?.branches, data?.items, data?.results, response?.branches]) {
    if (Array.isArray(list)) return list;
  }
  return [];
}

function getEmployeeList(response) {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  for (const list of [data?.employees, data?.items, data?.results, response?.employees]) {
    if (Array.isArray(list)) return list;
  }
  return [];
}

function unwrapObject(response) {
  return response?.data?.branch || response?.branch || response?.data || response;
}

function StatusBadge({ status = "ACTIVE" }) {
  const active = String(status).toUpperCase() === "ACTIVE";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase",
      active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
      {status}
    </span>
  );
}

function Avatar({ name, large = false, manager = false }) {
  return (
    <div className={cn(
      "flex shrink-0 items-center justify-center rounded-xl font-bold text-white",
      manager ? "bg-gradient-to-br from-violet-600 to-purple-600" : "bg-gradient-to-br from-indigo-600 to-blue-600",
      large ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs"
    )}>
      {initials(name)}
    </div>
  );
}

function Field({ label, icon: Icon, required = false, className, children }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        {Icon && <Icon size={13} className="text-indigo-500" />}
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 border-b border-slate-100 pb-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon size={17} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "my-auto flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl",
          wide ? "max-w-5xl" : "max-w-xl"
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 bg-slate-950 px-5 py-4 text-white">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-6">{title}</h2>
              {subtitle && <p className="mt-1 text-xs leading-5 text-slate-300">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
            <X size={19} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, note, icon: Icon, tone = "indigo" }) {
  const colors = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-600",
    green: "border-emerald-100 bg-emerald-50 text-emerald-600",
    violet: "border-violet-100 bg-violet-50 text-violet-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
  };
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{note}</p>
        </div>
        <div className={cn("rounded-xl border p-2.5", colors[tone])}><Icon size={19} /></div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
    </article>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><Icon size={14} /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 break-words text-xs font-medium leading-5 text-slate-700">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

function SimpleDetail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold text-slate-800">{value ?? "Not provided"}</p>
    </div>
  );
}

function DaySelector({ value = [], onChange }) {
  const toggle = (day) => {
    const next = value.includes(day) ? value.filter((item) => item !== day) : [...value, day];
    onChange(DAYS.filter((item) => next.includes(item)));
  };
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {DAYS.map((day) => {
        const checked = value.includes(day);
        return (
          <button key={day} type="button" onClick={() => toggle(day)} aria-pressed={checked}
            className={cn("rounded-lg border px-2 py-2.5 text-[10px] font-bold transition",
              checked ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")}>
            {day.slice(0, 3)}{checked && <CheckCircle2 size={12} className="ml-1 inline" />}
          </button>
        );
      })}
    </div>
  );
}

function WorkingHoursFields({ form, setNestedField }) {
  const fields = [
    ["Opening Time", "startTime"],
    ["Closing Time", "endTime"],
    ["Break Start", "breakStartTime"],
    ["Break End", "breakEndTime"],
  ];
  return (
    <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
      <SectionTitle icon={Clock3} title="Working Hours & Schedule" description="Configure opening, closing, break times and working days." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(([label, key]) => (
          <Field key={key} label={label} required>
            <input type="time" className={inputClass} value={form.workingHours?.[key] || ""}
              onChange={(event) => setNestedField("workingHours", key, event.target.value)} required />
          </Field>
        ))}
      </div>
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-slate-600">Working Days</p>
        <DaySelector value={form.workingHours?.workingDays || []} onChange={(days) => setNestedField("workingHours", "workingDays", days)} />
      </div>
    </section>
  );
}

function isHrEmployee(employee) {
  const role = String(employee?.systemRole || employee?.role || "").trim().toUpperCase();
  const designation = String(employee?.designationTitle || employee?.designation || employee?.jobTitle || "").trim().toUpperCase();
  return role === "HR_ADMIN" || role === "HR" || designation === "HR" || designation.includes("HUMAN RESOURCES");
}

function getBranchHrEmployee(branch, employeeList = []) {
  const assignedId = getId(branch?.hrEmployeeId);
  if (assignedId) {
    const assigned = employeeList.find((employee) => getId(employee) === assignedId);
    if (assigned) return assigned;
  }
  const branchNames = [branch?.branchName, branch?.branchCode]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return employeeList.find((employee) => {
    if (!isHrEmployee(employee)) return false;
    const employeeBranch = employee?.branch?.branchName || employee?.branch?.branchCode || employee?.branch;
    return branchNames.includes(String(employeeBranch || "").trim().toLowerCase());
  }) || null;
}

function BranchCard({ branch, employees = [], onView, onEdit, onEmployees, onHours, onStatus, onAssignments }) {
  const hrEmployee = getBranchHrEmployee(branch, employees);
  const hrName = hrEmployee?.fullName || hrEmployee?.name || hrEmployee?.nameOfEmployee || branch.hrEmployee?.fullName || branch.hrEmployeeName;
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={branch.branchName} large />
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-bold text-slate-900">{branch.branchName}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><Hash size={12} />{branch.branchCode || "No code"}</p>
            <div className="mt-2"><StatusBadge status={branch.status} /></div>
          </div>
          <button type="button" onClick={() => onView(branch)} aria-label={`View ${branch.branchName}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Eye size={15} /></button>
        </div>
        <div className="my-4 border-t border-slate-100" />
        <div className="space-y-3">
          <DetailItem icon={MapPin} label="Branch Address" value={[branch.address, branch.city, branch.state, branch.pincode].filter(Boolean).join(", ")} />
          <DetailItem icon={UserRound} label="Branch Manager" value={branch.branchManager?.fullName || branch.branchManagerName} />
          <DetailItem icon={UserCog} label="HR Employee" value={hrName} />
          <DetailItem icon={Phone} label="Contact Number" value={branch.branchContactPhone} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
            <div className="flex items-center gap-1.5 text-indigo-600"><Users size={14} /><span className="text-[10px] font-semibold">Employees</span></div>
            <p className="mt-1.5 text-xl font-bold text-slate-900">{Number(branch.employeeCount || 0)}</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3">
            <div className="flex items-center gap-1.5 text-violet-600"><Clock3 size={14} /><span className="text-[10px] font-semibold">Working hours</span></div>
            <p className="mt-1.5 text-sm font-bold text-slate-900">{branch.workingHours?.startTime || "09:00"} – {branch.workingHours?.endTime || "18:00"}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Quick status</p>
          <div className="relative">
            <select value={branch.status || "ACTIVE"} onChange={(event) => onStatus(branch, event.target.value)} aria-label={`Status for ${branch.branchName}`} className={`${inputClass} appearance-none pr-8 py-2 text-xs font-semibold`}>
              <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => onEdit(branch)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"><Pencil size={14} />Edit</button>
          <button type="button" onClick={() => onEmployees(branch)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"><Users size={14} />Employees</button>
          <button type="button" onClick={() => onAssignments(branch)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50 px-2 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"><UserCog size={14} />Assign roles</button>
          <button type="button" onClick={() => onHours(branch)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Clock3 size={14} />Work hours</button>
        </div>
      </div>
    </article>
  );
}

function EmployeeCard({ employee, branchName }) {
  const name = employee.fullName || employee.name || employee.nameOfEmployee || "Unnamed Employee";
  const role = employee.designationTitle || employee.designation || employee.jobTitle || employee.systemRole || employee.role || "Employee";
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="mb-4 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-bold text-slate-900">{name}</h3>
          <p className="mt-1 break-words text-xs text-slate-500">{role}</p>
          <div className="mt-2"><StatusBadge status={employee.status || "ACTIVE"} /></div>
        </div>
      </div>
      <div className="my-4 border-t border-slate-100" />
      <div className="space-y-3">
        <DetailItem icon={Mail} label="Email" value={employee.email || employee.officialEmail} />
        <DetailItem icon={Phone} label="Phone" value={employee.mobileNumber || employee.phone || employee.phoneNumber} />
        <DetailItem icon={Building2} label="Branch" value={employee.branch?.branchName || employee.branch || branchName} />
        <DetailItem icon={BriefcaseBusiness} label="Department" value={employee.department || employee.operationalTeam} />
        <DetailItem icon={Hash} label="Employee ID" value={employee.employeeCode || employee.employeeId || employee.empId} />
      </div>
    </article>
  );
}

function EmployeeDirectory({ employees, branch, loading }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (Array.isArray(employees) ? employees : []).filter((employee) => {
      const values = [
        employee.fullName, employee.name, employee.email, employee.officialEmail,
        employee.mobileNumber, employee.phone, employee.employeeCode, employee.employeeId,
        employee.designationTitle, employee.designation, employee.department, employee.systemRole,
      ];
      return !term || values.some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [employees, search]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard title="Employees in branch" value={employees.length} note="Employees returned by branch API" icon={Users} tone="indigo" />
        <MetricCard title="Selected branch" value={branch?.branchName || "—"} note={branch?.branchCode || "Branch code unavailable"} icon={Building2} tone="violet" />
      </div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee name, email, phone or ID..." className={`${inputClass} pl-9`} />
      </div>
      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white"><LoaderCircle size={28} className="animate-spin text-indigo-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <Users size={30} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">No employees found</h3>
          <p className="mt-1 text-xs text-slate-500">Employees appear here when their Employee.branch value matches this branch name or code.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-900">Branch employees</h3><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{filtered.length} records</span></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((employee, index) => <EmployeeCard key={getId(employee) || employee.email || `${employee.fullName || employee.name}-${index}`} employee={employee} branchName={branch?.branchName} />)}</div>
        </>
      )}
    </div>
  );
}

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modal, setModal] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [form, setForm] = useState(EMPTY_BRANCH);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const getHeaders = useCallback(async () => {
    if (!auth.currentUser) throw new Error("Your session has expired. Please sign in again.");
    return {
      Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
      "Content-Type": "application/json",
    };
  }, []);

  const apiRequest = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...(await getHeaders()), ...(options.headers || {}) },
    });
    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      throw new Error(result?.message || result?.error || (typeof result === "string" && result) || `Request failed (${response.status})`);
    }
    return result;
  }, [getHeaders]);

  const loadBranches = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      // The controller returns data.branches and pagination.
      const query = new URLSearchParams({ page: "1", limit: "200" });
      const list = getBranchList(await apiRequest(`${BRANCH_API}?${query}`));
      setBranches(list);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  const loadEmployeeOptions = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const result = await apiRequest(`${EMPLOYEE_API}?page=1&limit=500`);
      const list = getEmployeeList(result);
      setEmployeeOptions(list.filter((employee) => !["INACTIVE", "DELETED", "TERMINATED"].includes(String(employee.status || "ACTIVE").toUpperCase())));
    } catch (err) {
      setEmployeeOptions([]);
      setError(`Could not load employee options. ${getError(err)}`);
    } finally {
      setEmployeesLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { loadEmployeeOptions(); }, [loadEmployeeOptions]);

  const stats = useMemo(() => ({
    total: branches.length,
    active: branches.filter((branch) => String(branch.status).toUpperCase() === "ACTIVE").length,
    inactive: branches.filter((branch) => String(branch.status).toUpperCase() === "INACTIVE").length,
    employees: branches.reduce((sum, branch) => sum + Number(branch.employeeCount || 0), 0),
  }), [branches]);

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return branches.filter((branch) => {
      const matchesSearch = !term || [
        branch.branchName, branch.branchCode, branch.address, branch.city,
        branch.state, branch.pincode, branch.branchManagerName, branch.hrEmployeeName,
      ].some((value) => String(value || "").toLowerCase().includes(term));
      return matchesSearch && (statusFilter === "ALL" || String(branch.status || "").toUpperCase() === statusFilter);
    });
  }, [branches, search, statusFilter]);

  const setField = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));
  const setNestedField = (section, name, value) => setForm((previous) => ({
    ...previous,
    [section]: { ...previous[section], [name]: value },
  }));

  const resetForm = () => setForm({
    ...EMPTY_BRANCH,
    geofence: { ...EMPTY_BRANCH.geofence },
    workingHours: { ...EMPTY_BRANCH.workingHours, workingDays: [...EMPTY_BRANCH.workingHours.workingDays] },
  });

  const closeModal = useCallback(() => {
    setModal(null);
    setSelectedBranch(null);
    setEmployees([]);
    setError("");
  }, []);

  const openCreate = () => {
    setError("");
    setSelectedBranch(null);
    resetForm();
    setModal("create");
  };

  const openEdit = (branch) => {
    setError("");
    setSelectedBranch(branch);
    setForm({
      ...EMPTY_BRANCH,
      ...branch,
      branchManagerEmployeeId: getId(branch.branchManagerEmployeeId) || "",
      hrEmployeeId: getId(branch.hrEmployeeId) || "",
      geofence: { ...EMPTY_BRANCH.geofence, ...(branch.geofence || {}) },
      workingHours: {
        ...EMPTY_BRANCH.workingHours,
        ...(branch.workingHours || {}),
        workingDays: [...(branch.workingHours?.workingDays || EMPTY_BRANCH.workingHours.workingDays)],
      },
    });
    setModal("edit");
  };

  const openView = async (branch) => {
    setSelectedBranch(branch);
    setModal("view");
    setError("");
    try {
      const result = await apiRequest(`${BRANCH_API}/${getId(branch)}`);
      const detail = unwrapObject(result);
      if (detail) setSelectedBranch(detail);
    } catch (err) {
      setError(getError(err));
    }
  };

  const openEmployees = async (branch) => {
    setSelectedBranch(branch);
    setEmployees([]);
    setEmployeesLoading(true);
    setError("");
    setModal("employees");
    try {
      // Controller response: data.employees, data.branch, data.total.
      const result = await apiRequest(`${BRANCH_API}/${getId(branch)}/employees`);
      const data = result?.data ?? result;
      const list = Array.isArray(data?.employees) ? data.employees : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setEmployees(list);
      if (data?.branch) setSelectedBranch(data.branch);
    } catch (err) {
      setError(getError(err));
    } finally {
      setEmployeesLoading(false);
    }
  };

  const openHours = (branch) => {
    setSelectedBranch(branch);
    setError("");
    setForm({
      ...EMPTY_BRANCH,
      ...branch,
      geofence: { ...EMPTY_BRANCH.geofence, ...(branch.geofence || {}) },
      workingHours: {
        ...EMPTY_BRANCH.workingHours,
        ...(branch.workingHours || {}),
        workingDays: [...(branch.workingHours?.workingDays || EMPTY_BRANCH.workingHours.workingDays)],
      },
    });
    setModal("hours");
  };

  const openAssignments = async (branch) => {
    setSelectedBranch(branch);
    setError("");
    setForm({
      ...EMPTY_BRANCH,
      ...branch,
      branchManagerEmployeeId: getId(branch.branchManagerEmployeeId) || "",
      hrEmployeeId: getId(branch.hrEmployeeId) || "",
      geofence: { ...EMPTY_BRANCH.geofence, ...(branch.geofence || {}) },
      workingHours: { ...EMPTY_BRANCH.workingHours, ...(branch.workingHours || {}) },
    });
    setModal("assignments");
    try {
      const result = await apiRequest(`${BRANCH_API}/${getId(branch)}`);
      const detail = unwrapObject(result);
      if (detail) {
        setSelectedBranch(detail);
        setForm((previous) => ({
          ...previous,
          ...detail,
          branchManagerEmployeeId: getId(detail.branchManagerEmployeeId) || "",
          hrEmployeeId: getId(detail.hrEmployeeId) || "",
        }));
      }
    } catch (err) {
      setError(getError(err));
    }
  };

  const saveBranch = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        branchName: form.branchName.trim(),
        branchCode: form.branchCode.trim().toUpperCase(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        branchContactPhone: (form.branchContactPhone || "").trim(),
        status: form.status || "ACTIVE",
        geofence: {
          latitude: form.geofence.latitude === "" || form.geofence.latitude == null ? null : Number(form.geofence.latitude),
          longitude: form.geofence.longitude === "" || form.geofence.longitude == null ? null : Number(form.geofence.longitude),
          radiusMeters: Number(form.geofence.radiusMeters || 300),
        },
        workingHours: {
          ...form.workingHours,
          workingDays: form.workingHours.workingDays || [],
        },
      };

      // Manager and HR are intentionally optional at branch creation.
      const editing = modal === "edit";
      const result = await apiRequest(
        editing ? `${BRANCH_API}/${getId(selectedBranch)}` : BRANCH_API,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }
      );
      setNotice(result?.message || (editing ? "Branch updated successfully." : "Branch created successfully."));
      closeModal();
      await loadBranches(false);
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveAssignments = async (event) => {
    event.preventDefault();
    if (!selectedBranch) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        branchManagerEmployeeId: form.branchManagerEmployeeId || null,
        hrEmployeeId: form.hrEmployeeId || null,
      };
      const result = await apiRequest(`${BRANCH_API}/${getId(selectedBranch)}/assignments`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setNotice(result?.message || "Branch role assignments updated successfully.");
      closeModal();
      await loadBranches(false);
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (branch, status) => {
    if (!getId(branch) || String(branch.status).toUpperCase() === status) return;
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`${BRANCH_API}/${getId(branch)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const updated = unwrapObject(result);
      setBranches((previous) => previous.map((item) => getId(item) === getId(branch) ? { ...item, ...(updated || {}), status } : item));
      setNotice(`${branch.branchName} is now ${status.toLowerCase()}.`);
    } catch (err) {
      setError(getError(err));
      await loadBranches(false);
    }
  };

  const saveWorkingHours = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`${BRANCH_API}/${getId(selectedBranch)}/working-hours`, {
        method: "PATCH",
        body: JSON.stringify({ workingHours: form.workingHours }),
      });
      const updated = unwrapObject(result);
      setNotice(result?.message || "Working hours updated successfully.");
      setBranches((previous) => previous.map((branch) => getId(branch) === getId(selectedBranch)
        ? { ...branch, workingHours: updated?.workingHours || form.workingHours }
        : branch));
      closeModal();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivateBranch = async (branch) => {
    if (!getId(branch) || !window.confirm(`Deactivate "${branch.branchName}"? Branch records will be retained.`)) return;
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`${BRANCH_API}/${getId(branch)}`, { method: "DELETE" });
      setBranches((previous) => previous.map((item) => getId(item) === getId(branch) ? { ...item, status: "INACTIVE" } : item));
      setNotice(result?.message || "Branch deactivated.");
      if (modal === "view") setSelectedBranch((previous) => previous ? { ...previous, status: "INACTIVE" } : previous);
    } catch (err) {
      setError(getError(err));
    }
  };

  const exportBranches = () => {
    if (!branches.length) {
      setError("There are no loaded branches to export.");
      return;
    }
    setExporting(true);
    try {
      const columns = [
        ["Branch Name", (branch) => branch.branchName],
        ["Branch Code", (branch) => branch.branchCode],
        ["Address", (branch) => branch.address],
        ["City", (branch) => branch.city],
        ["State", (branch) => branch.state],
        ["Pincode", (branch) => branch.pincode],
        ["Branch Manager", (branch) => branch.branchManagerName],
        ["HR Employee", (branch) => branch.hrEmployeeName],
        ["Contact Phone", (branch) => branch.branchContactPhone],
        ["Status", (branch) => branch.status],
        ["Employees", (branch) => branch.employeeCount],
        ["Opening Time", (branch) => branch.workingHours?.startTime],
        ["Closing Time", (branch) => branch.workingHours?.endTime],
        ["Break Start", (branch) => branch.workingHours?.breakStartTime],
        ["Break End", (branch) => branch.workingHours?.breakEndTime],
        ["Working Days", (branch) => branch.workingHours?.workingDays?.join(", ")],
        ["Latitude", (branch) => branch.geofence?.latitude],
        ["Longitude", (branch) => branch.geofence?.longitude],
        ["Radius (Meters)", (branch) => branch.geofence?.radiusMeters],
      ];
      const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const header = columns.map(([label]) => `<th style="background:#4338ca;color:white;padding:9px;border:1px solid #ddd">${escapeHtml(label)}</th>`).join("");
      const rows = branches.map((branch, index) =>
        `<tr style="background:${index % 2 ? "#f8fafc" : "#fff"}">${columns.map(([, getter]) =>
          `<td style="padding:8px;border:1px solid #ddd">${escapeHtml(getter(branch))}</td>`).join("")}</tr>`
      ).join("");
      const blob = new Blob(["\ufeff", `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></body></html>`], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ZERMII_Branches_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`Exported ${branches.length} loaded branches.`);
    } catch (err) {
      setError(getError(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-3 py-5 text-slate-800 sm:px-5 sm:py-6 lg:px-7">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Building2 size={23} /></div>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Super Admin</span><span className="h-1 w-1 rounded-full bg-slate-300" /><span className="text-[10px] text-slate-500">Organization setup</span></div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Branch Management</h1>
                <p className="mt-1 text-xs leading-5 text-slate-500">Create branches first, then add employees and optionally assign Branch Manager and HR.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportBranches} disabled={exporting || loading || !branches.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                {exporting ? <LoaderCircle size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}Export Excel
              </button>
              <button type="button" onClick={openCreate} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><Plus size={16} />Register Branch</button>
            </div>
          </div>
        </section>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /><p className="min-w-0 flex-1 break-words">{error}</p><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
        {notice && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0" /><p className="min-w-0 flex-1 break-words">{notice}</p><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15} /></button></div>}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard title="Total Branches" value={stats.total} note="Loaded branch records" icon={Building2} />
          <MetricCard title="Active Branches" value={stats.active} note="Currently operational" icon={CheckCircle2} tone="green" />
          <MetricCard title="Inactive Branches" value={stats.inactive} note="Currently deactivated" icon={Power} tone="amber" />
          <MetricCard title="Assigned Employees" value={stats.employees} note="Across loaded branches" icon={Users} tone="violet" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base font-bold text-slate-900">Company Branches</h2><p className="mt-1 text-xs text-slate-500">{filteredBranches.length} matching branches</p></div>
            <button type="button" onClick={() => { loadBranches(); loadEmployeeOptions(); }} disabled={loading} className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-indigo-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh</button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 border-b border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-[minmax(200px,1fr)_180px] sm:p-4">
            <div className="relative min-w-0"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search branch, code, city, manager..." className={`${inputClass} pl-9`} aria-label="Search branches" /></div>
            <div className="relative min-w-0"><Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${inputClass} appearance-none pl-9 pr-8`} aria-label="Filter branch status"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></div>
          </div>
          <div className="p-3 sm:p-4 lg:p-5">
            {loading ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3"><LoaderCircle size={27} className="animate-spin text-indigo-600" /><p className="text-xs text-slate-500">Loading branches...</p></div>
            ) : filteredBranches.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
                <Building2 size={28} className="text-slate-300" />
                <h3 className="mt-3 text-sm font-bold text-slate-800">{branches.length ? "No matching branches" : "No branches registered yet"}</h3>
                <p className="mt-1.5 max-w-sm text-xs text-slate-500">{branches.length ? "Try another search or change the status filter." : "Register your first company branch to get started."}</p>
                {!branches.length && <button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white"><Plus size={15} />Register Branch</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredBranches.map((branch) => <BranchCard key={getId(branch)} branch={branch} onView={openView} onEdit={openEdit} onEmployees={openEmployees} onHours={openHours} onStatus={changeStatus} onAssignments={openAssignments} employees={employeeOptions} />)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[11px] text-slate-500 sm:flex-row sm:justify-between"><span>{filteredBranches.length} branches displayed</span><span>Export includes loaded branch records</span></div>
        </section>
      </div>

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "edit" ? "Update Company Branch" : "Register New Company Branch"} subtitle="Manager and HR assignments are optional and can be completed later." onClose={closeModal} wide>
          <form onSubmit={saveBranch} className="space-y-6">
            <section>
              <SectionTitle icon={Building2} title="Branch Information" description="Only the branch's basic information is required." />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Branch Name" required><input className={inputClass} value={form.branchName} onChange={(event) => setField("branchName", event.target.value)} placeholder="e.g. Jaipur Branch" required /></Field>
                <Field label="Branch Code" required icon={Hash}><input className={inputClass} value={form.branchCode} onChange={(event) => setField("branchCode", event.target.value.toUpperCase())} placeholder="e.g. ZER-JP01" required /></Field>
                <Field label="Full Street Address" required icon={MapPin} className="sm:col-span-2"><input className={inputClass} value={form.address} onChange={(event) => setField("address", event.target.value)} placeholder="Street, building, area" required /></Field>
                <Field label="City" required><input className={inputClass} value={form.city} onChange={(event) => setField("city", event.target.value)} required /></Field>
                <Field label="State" required><input className={inputClass} value={form.state} onChange={(event) => setField("state", event.target.value)} required /></Field>
                <Field label="Pincode" required><input className={inputClass} inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={form.pincode} onChange={(event) => setField("pincode", event.target.value.replace(/\D/g, ""))} required /></Field>
                <Field label="Branch Contact Phone" icon={Phone}><input className={inputClass} type="tel" value={form.branchContactPhone || ""} onChange={(event) => setField("branchContactPhone", event.target.value)} placeholder="+91..." /></Field>
                <Field label="Branch Status"><select className={inputClass} value={form.status || "ACTIVE"} onChange={(event) => setField("status", event.target.value)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>
              </div>
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-indigo-800">
                You can create this branch now without selecting a Branch Manager or HR. Create employees in Employee Management and assign them to this branch afterwards.
              </div>
            </section>
            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
              <SectionTitle icon={MapPinned} title="GPS Geofencing Settings" description="Coordinates and radius for location-based attendance." />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Latitude"><input className={inputClass} type="number" min="-90" max="90" step="any" value={form.geofence?.latitude ?? ""} onChange={(event) => setNestedField("geofence", "latitude", event.target.value)} /></Field>
                <Field label="Longitude"><input className={inputClass} type="number" min="-180" max="180" step="any" value={form.geofence?.longitude ?? ""} onChange={(event) => setNestedField("geofence", "longitude", event.target.value)} /></Field>
                <Field label="Radius (meters)"><input className={inputClass} type="number" min="1" max="100000" value={form.geofence?.radiusMeters ?? "300"} onChange={(event) => setNestedField("geofence", "radiusMeters", event.target.value)} required /></Field>
              </div>
            </section>
            <WorkingHoursFields form={form} setNestedField={setNestedField} />
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}{saving ? "Saving..." : modal === "edit" ? "Update Branch" : "Create Branch"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "assignments" && selectedBranch && (
        <Modal title="Assign Branch Roles" subtitle={`Optional assignments for ${selectedBranch.branchName}`} onClose={closeModal} wide>
          <form onSubmit={saveAssignments} className="space-y-5">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-indigo-800">
              Choose existing employees. Select the blank option to remove an assignment. This does not create employees.
            </div>
            <Field label="Branch Manager" icon={ShieldCheck}>
              <select className={inputClass} value={form.branchManagerEmployeeId || ""} disabled={employeesLoading} onChange={(event) => {
                const employee = employeeOptions.find((item) => getId(item) === event.target.value);
                setForm((previous) => ({
                  ...previous,
                  branchManagerEmployeeId: event.target.value,
                  branchManagerName: employee ? (employee.fullName || employee.name || employee.nameOfEmployee || "") : "",
                  branchContactPhone: employee ? (employee.mobileNumber || employee.phone || previous.branchContactPhone || "") : previous.branchContactPhone,
                }));
              }}>
                <option value="">{employeesLoading ? "Loading employees..." : "No branch manager assigned"}</option>
                {employeeOptions.map((employee) => {
                  const id = getId(employee);
                  const name = employee.fullName || employee.name || employee.nameOfEmployee || "Unnamed Employee";
                  const role = employee.designationTitle || employee.designation || employee.systemRole || employee.role || "Employee";
                  const employeeCode = employee.employeeCode || employee.employeeId || id;
                  return <option key={id} value={id}>{name} — {role}{employeeCode ? ` (${employeeCode})` : ""}</option>;
                })}
              </select>
            </Field>
            <Field label="HR Employee" icon={UserCog}>
              <select className={inputClass} value={form.hrEmployeeId || ""} disabled={employeesLoading} onChange={(event) => {
                const employee = employeeOptions.find((item) => getId(item) === event.target.value);
                setForm((previous) => ({
                  ...previous,
                  hrEmployeeId: event.target.value,
                  hrEmployeeName: employee ? (employee.fullName || employee.name || employee.nameOfEmployee || "") : "",
                }));
              }}>
                <option value="">{employeesLoading ? "Loading employees..." : "No HR employee assigned"}</option>
                {employeeOptions.map((employee) => {
                  const id = getId(employee);
                  const name = employee.fullName || employee.name || employee.nameOfEmployee || "Unnamed Employee";
                  const role = employee.designationTitle || employee.designation || employee.systemRole || employee.role || "Employee";
                  const employeeCode = employee.employeeCode || employee.employeeId || id;
                  return <option key={id} value={id}>{name} — {role}{employeeCode ? ` (${employeeCode})` : ""}</option>;
                })}
              </select>
            </Field>
            {employeesLoading && <p className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={14} className="animate-spin" />Loading employees...</p>}
            {employeeOptions.length === 0 && !employeesLoading && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">No active employees were returned by the employee API. Create employees first and refresh.</p>}
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}Save Assignments</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "hours" && selectedBranch && (
        <Modal title="Branch Working Hours" subtitle={`Update schedule for ${selectedBranch.branchName}`} onClose={closeModal} wide>
          <form onSubmit={saveWorkingHours} className="space-y-5">
            <WorkingHoursFields form={form} setNestedField={setNestedField} />
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}Save Working Hours</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "view" && selectedBranch && (
        <Modal title="Branch Details" subtitle="Branch profile and operating information." onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-4">
              <Avatar name={selectedBranch.branchName} large />
              <div className="min-w-0 flex-1"><h3 className="break-words text-base font-bold text-slate-900">{selectedBranch.branchName}</h3><p className="mt-1 text-xs text-slate-500">Code: {selectedBranch.branchCode || "Not set"}</p><div className="mt-2"><StatusBadge status={selectedBranch.status} /></div></div>
              <button type="button" onClick={() => openEdit(selectedBranch)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"><Pencil size={14} />Edit</button>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <SectionTitle icon={Building2} title="Branch Information" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem icon={MapPin} label="Address" value={selectedBranch.address} />
                <DetailItem icon={MapPin} label="City / State" value={[selectedBranch.city, selectedBranch.state, selectedBranch.pincode].filter(Boolean).join(", ")} />
                <DetailItem icon={UserRound} label="Manager" value={selectedBranch.branchManager?.fullName || selectedBranch.branchManagerName} />
                <DetailItem icon={UserCog} label="HR Employee" value={getBranchHrEmployee(selectedBranch, employeeOptions)?.fullName || getBranchHrEmployee(selectedBranch, employeeOptions)?.name || selectedBranch.hrEmployee?.fullName || selectedBranch.hrEmployeeName} />
                <DetailItem icon={Phone} label="Phone" value={selectedBranch.branchContactPhone} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <SectionTitle icon={Clock3} title="Working Hours" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <SimpleDetail label="Opening" value={selectedBranch.workingHours?.startTime || "09:00"} />
                <SimpleDetail label="Closing" value={selectedBranch.workingHours?.endTime || "18:00"} />
                <SimpleDetail label="Break starts" value={selectedBranch.workingHours?.breakStartTime || "13:00"} />
                <SimpleDetail label="Break ends" value={selectedBranch.workingHours?.breakEndTime || "14:00"} />
                <SimpleDetail label="Working days" value={(selectedBranch.workingHours?.workingDays || []).map((day) => day.slice(0, 3)).join(", ") || "Not configured"} />
              </div>
              <button type="button" onClick={() => openHours(selectedBranch)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"><Settings2 size={14} />Manage Working Hours</button>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <SectionTitle icon={Navigation} title="GPS Geofencing" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <SimpleDetail label="Latitude" value={selectedBranch.geofence?.latitude ?? "Not set"} />
                <SimpleDetail label="Longitude" value={selectedBranch.geofence?.longitude ?? "Not set"} />
                <SimpleDetail label="Radius" value={`${selectedBranch.geofence?.radiusMeters ?? 300} meters`} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => openEmployees(selectedBranch)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white"><Users size={15} />View Employees</button>
              <button type="button" onClick={() => openAssignments(selectedBranch)} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-semibold text-violet-700"><UserCog size={15} />Assign Manager / HR</button>
              <button type="button" onClick={() => deactivateBranch(selectedBranch)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Power size={15} />Deactivate Branch</button>
            </div>
          </div>
        </Modal>
      )}

      {modal === "employees" && selectedBranch && (
        <Modal title="Branch Employee Directory" subtitle={`Employees assigned to ${selectedBranch.branchName}`} onClose={closeModal} wide>
          {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <EmployeeDirectory employees={employees} branch={selectedBranch} loading={employeesLoading} />
        </Modal>
      )}
    </main>
  );
}
