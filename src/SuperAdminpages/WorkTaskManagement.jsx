
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Clock3,
  CheckCircle2,
  ClipboardCheck,
  X,
  LoaderCircle,
  AlertCircle,
  Building2,
  UserRound,
  CalendarDays,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

import { auth } from "../services/firebase";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const TASK_API = `${API_BASE}/work-tasks`;
const BRANCH_API = `${API_BASE}/branches`;

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "COMPLETED",
  "CANCELLED",
];

const PRIORITY_STYLES = {
  LOW: "border-slate-200 bg-slate-100 text-slate-700",
  MEDIUM: "border-amber-200 bg-amber-100 text-amber-800",
  HIGH: "border-rose-200 bg-rose-100 text-rose-700",
  URGENT: "border-red-200 bg-red-100 text-red-800",
};

const STATUS_STYLES = {
  ASSIGNED: "border-violet-200 bg-violet-50 text-violet-700",
  ACCEPTED: "border-slate-200 bg-slate-100 text-slate-700",
  IN_PROGRESS: "border-blue-200 bg-blue-100 text-blue-700",
  SUBMITTED: "border-amber-200 bg-amber-100 text-amber-800",
  COMPLETED: "border-emerald-200 bg-emerald-100 text-emerald-700",
  CANCELLED: "border-red-200 bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  ASSIGNED: "ASSIGNED",
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN PROGRESS",
  SUBMITTED: "SUBMITTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

function unwrapList(payload, key) {
  const root = payload?.data ?? payload;
  const value = root?.[key] ?? root?.data?.[key];

  if (Array.isArray(value)) return value;
  if (Array.isArray(root)) return root;

  return [];
}

function employeeName(employee) {
  if (!employee) return "Unassigned";

  if (typeof employee === "string") return employee;

  return (
    employee.fullName ||
    employee.name ||
    employee.nameOfEmployee ||
    employee.employeeName ||
    "Employee"
  );
}

function branchName(branch) {
  if (!branch) return "Branch not available";

  if (typeof branch === "string") return branch;

  return (
    branch.branchName ||
    branch.name ||
    branch.branchCode ||
    "Branch"
  );
}

function getPriority(task) {
  const value = String(task.priority || "MEDIUM").toUpperCase();
  return PRIORITIES.includes(value) ? value : "MEDIUM";
}

function getStatus(task) {
  const value = String(task.status || "ASSIGNED").toUpperCase();

  // ACCEPTED is shown if returned by an existing API.
  return STATUSES.includes(value) ? value : "ASSIGNED";
}

function formatDate(value) {
  if (!value) return "No deadline";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No deadline";

  return `Due ${date.toLocaleDateString("en-CA")}`;
}

function isOverdue(task) {
  if (!task.dueDate) return false;

  const status = getStatus(task);

  if (["COMPLETED", "CANCELLED"].includes(status)) return false;

  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;

  return due.getTime() < Date.now();
}

async function apiRequest(url, options = {}) {
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const token = await currentUser.getIdToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";

  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return payload;
}

const initialForm = {
  title: "",
  branchId: "",
  assigneeEmployeeId: "",
  priority: "HIGH",
  dueDate: "",
  instructions: "",
  expectedDeliverable: "",
};

export default function WorkTaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState("");

  const loadTasks = useCallback(async () => {
    const payload = await apiRequest(
      `${TASK_API}?page=1&limit=200`
    );

    setTasks(unwrapList(payload, "tasks"));
  }, []);

  const loadBranches = useCallback(async () => {
    const payload = await apiRequest(
      `${BRANCH_API}?page=1&limit=200`
    );

    setBranches(unwrapList(payload, "branches"));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadTasks(), loadBranches()]);
    } catch (err) {
      setError(err.message || "Unable to load task management data.");
    } finally {
      setLoading(false);
    }
  }, [loadTasks, loadBranches]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadBranchEmployees = useCallback(async (selectedBranchId) => {
    if (!selectedBranchId) {
      setEmployees([]);
      return;
    }

    setLoadingEmployees(true);
    setError("");

    try {
      const payload = await apiRequest(
        `${BRANCH_API}/${selectedBranchId}/employees`
      );

      const root = payload?.data ?? payload;

      const list = Array.isArray(root?.employees)
        ? root.employees
        : Array.isArray(root?.branch?.employees)
          ? root.branch.employees
          : [];

      setEmployees(list);
    } catch (err) {
      setEmployees([]);
      setError(err.message || "Unable to load branch employees.");
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const assignee = employeeName(task.assigneeEmployeeId);
      const branch = branchName(task.branchId);

      const matchesSearch =
        !term ||
        String(task.title || "").toLowerCase().includes(term) ||
        assignee.toLowerCase().includes(term) ||
        branch.toLowerCase().includes(term) ||
        String(task.instructions || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "ALL" || getStatus(task) === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" ||
        getPriority(task) === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const metrics = useMemo(
    () => ({
      total: tasks.length,
      active: tasks.filter((task) =>
        ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(getStatus(task))
      ).length,
      completed: tasks.filter(
        (task) => getStatus(task) === "COMPLETED"
      ).length,
      overdue: tasks.filter(isOverdue).length,
    }),
    [tasks]
  );

  function openCreateModal() {
    setForm({
      ...initialForm,
      dueDate: new Date(Date.now() + 86400000)
        .toISOString()
        .slice(0, 10),
    });

    setEmployees([]);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setError("");
  }

  async function handleBranchChange(branchId) {
    setForm((current) => ({
      ...current,
      branchId,
      assigneeEmployeeId: "",
    }));

    setEmployees([]);
    await loadBranchEmployees(branchId);
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateTask(event) {
    event.preventDefault();

    setError("");
    setNotice("");

    if (
      !form.title.trim() ||
      !form.branchId ||
      !form.assigneeEmployeeId ||
      !form.dueDate ||
      !form.instructions.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest(TASK_API, {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          branchId: form.branchId,
          assigneeEmployeeId: form.assigneeEmployeeId,
          priority: form.priority,
          dueDate: new Date(
            `${form.dueDate}T23:59:00`
          ).toISOString(),
          instructions: form.instructions.trim(),
          expectedDeliverable: form.expectedDeliverable.trim(),
        }),
      });

      setModalOpen(false);
      setForm(initialForm);
      setNotice("Task assignment created successfully.");

      await loadTasks();
    } catch (err) {
      setError(err.message || "Unable to create task assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function changeTaskStatus(task, nextStatus) {
    setError("");
    setNotice("");
    setUpdatingTaskId(String(task._id));

    try {
      await apiRequest(`${TASK_API}/${task._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      setNotice("Task status updated successfully.");
      await loadTasks();
    } catch (err) {
      setError(err.message || "Unable to update task status.");
    } finally {
      setUpdatingTaskId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        {/* Page heading */}
        <section className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-violet-600">
              <ClipboardCheck size={19} />
              Work Assignments &amp; Accountability
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Task Management &amp; Deliverables
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Assign work by branch, team, and priority with real-time
              completion tracking and progress metrics.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200"
          >
            <Plus size={19} />
            Assign New Task
          </button>
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            {
              label: "Total Tasks",
              value: metrics.total,
              icon: ClipboardCheck,
              color: "text-violet-600",
              background: "bg-violet-50",
            },
            {
              label: "Active Tasks",
              value: metrics.active,
              icon: Clock3,
              color: "text-blue-600",
              background: "bg-blue-50",
            },
            {
              label: "Completed",
              value: metrics.completed,
              icon: CheckCircle2,
              color: "text-emerald-600",
              background: "bg-emerald-50",
            },
            {
              label: "Overdue",
              value: metrics.overdue,
              icon: AlertCircle,
              color: "text-rose-600",
              background: "bg-rose-50",
            },
          ].map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">
                    {metric.label}
                  </p>

                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.background} ${metric.color}`}
                  >
                    <Icon size={20} />
                  </span>
                </div>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {metric.value}
                </p>
              </div>
            );
          })}
        </section>

        {/* Search and filters */}
        <section className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-[360px]">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search task title or assignee..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadAll}
              title="Refresh tasks"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </section>

        {/* Messages */}
        {error && !modalOpen && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            <CheckCircle2 size={19} />
            {notice}
          </div>
        )}

        {/* Task cards */}
        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-[22px] border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
              <LoaderCircle
                size={22}
                className="animate-spin text-violet-600"
              />
              Loading task assignments...
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-white px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <ClipboardCheck size={26} />
            </span>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No tasks found
            </h2>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Create a new task assignment or change your search and filters.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Plus size={17} />
              Assign New Task
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredTasks.map((task) => {
              const priority = getPriority(task);
              const status = getStatus(task);
              const assignee = employeeName(task.assigneeEmployeeId);
              const branch = branchName(
                task.branchId || { branchName: task.branchName }
              );
              const overdue = isOverdue(task);
              const busy = updatingTaskId === String(task._id);

              const canStart = ["ASSIGNED", "ACCEPTED"].includes(status);
              const canComplete = [
                "ASSIGNED",
                "ACCEPTED",
                "IN_PROGRESS",
                "SUBMITTED",
              ].includes(status);

              return (
                <article
                  key={task._id}
                  className="flex min-h-[310px] flex-col rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${PRIORITY_STYLES[priority]}`}
                    >
                      {priority}
                    </span>

                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-bold leading-snug text-slate-950">
                    {task.title}
                  </h2>

                  <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-6 text-slate-600">
                    {task.instructions || "No additional instructions provided."}
                  </p>

                  <div className="my-5 border-t border-slate-100" />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                        {assignee.charAt(0).toUpperCase()}
                      </span>

                      <span className="truncate text-sm font-medium text-slate-800">
                        {assignee}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${overdue ? "font-semibold text-rose-600" : "text-slate-500"}`}
                    >
                      <Clock3 size={15} />
                      {formatDate(task.dueDate)}
                    </span>
                  </div>

                  <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                      <Building2
                        size={16}
                        className="shrink-0 text-slate-400"
                      />
                      <span className="truncate">{branch}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {canStart && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            changeTaskStatus(task, "IN_PROGRESS")
                          }
                          className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                        >
                          {busy ? "Saving..." : "Start Work"}
                        </button>
                      )}

                      {canComplete && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            changeTaskStatus(task, "COMPLETED")
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} />
                          {busy ? "Saving..." : "Mark Done"}
                        </button>
                      )}

                      {status === "COMPLETED" && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={16} />
                          Completed
                        </span>
                      )}

                      {status === "CANCELLED" && (
                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <div className="flex items-center justify-between gap-3 pb-4 text-xs text-slate-500">
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <ArrowUpRight size={14} />
            Live API data
          </span>
        </div>
      </div>

      {/* Create task modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 bg-slate-900 px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-3">
                <ClipboardCheck
                  size={23}
                  className="text-violet-400"
                />

                <h2
                  id="task-modal-title"
                  className="text-lg font-bold sm:text-xl"
                >
                  Assign Work / Task Deliverable
                </h2>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </header>

            <form onSubmit={handleCreateTask}>
              <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5 sm:p-7">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                  >
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="task-title"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Task Title <span className="text-rose-500">*</span>
                  </label>

                  <input
                    id="task-title"
                    name="title"
                    value={form.title}
                    onChange={updateField}
                    required
                    maxLength={200}
                    placeholder="e.g. Conduct On-site Solar Inverter Inspection"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="task-branch"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Branch <span className="text-rose-500">*</span>
                    </label>

                    <select
                      id="task-branch"
                      value={form.branchId}
                      onChange={(event) =>
                        handleBranchChange(event.target.value)
                      }
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="">Select branch</option>

                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.branchName} ({branch.branchCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="task-assignee"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Assignee Employee{" "}
                      <span className="text-rose-500">*</span>
                    </label>

                    <select
                      id="task-assignee"
                      name="assigneeEmployeeId"
                      value={form.assigneeEmployeeId}
                      onChange={updateField}
                      required
                      disabled={!form.branchId || loadingEmployees}
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">
                        {loadingEmployees
                          ? "Loading employees..."
                          : form.branchId
                            ? "Select employee"
                            : "Select a branch first"}
                      </option>

                      {employees
                        .filter(
                          (employee) =>
                            String(employee.status || "ACTIVE").toUpperCase() ===
                            "ACTIVE"
                        )
                        .map((employee) => (
                          <option
                            key={employee._id}
                            value={employee._id}
                          >
                            {employeeName(employee)}
                            {employee.employeeCode
                              ? ` (${employee.employeeCode})`
                              : ""}
                            {employee.systemRole
                              ? ` - ${employee.systemRole.replace(/_/g, " ")}`
                              : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {form.branchId && !loadingEmployees && employees.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No employees were returned for this branch. Confirm the
                    employee branch values and the branch employees API response.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="task-priority"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Priority Level <span className="text-rose-500">*</span>
                    </label>

                    <select
                      id="task-priority"
                      name="priority"
                      value={form.priority}
                      onChange={updateField}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority.charAt(0) +
                            priority.slice(1).toLowerCase() +
                            " Priority"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="task-due-date"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Due Deadline <span className="text-rose-500">*</span>
                    </label>

                    <div className="relative">
                      <CalendarDays
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="task-due-date"
                        type="date"
                        name="dueDate"
                        value={form.dueDate}
                        onChange={updateField}
                        required
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="task-instructions"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Detailed Instructions{" "}
                    <span className="text-rose-500">*</span>
                  </label>

                  <textarea
                    id="task-instructions"
                    name="instructions"
                    value={form.instructions}
                    onChange={updateField}
                    required
                    rows={4}
                    maxLength={10000}
                    placeholder="Provide scope of work, location or client reference..."
                    className="w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="task-deliverable"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Expected Deliverable / Output
                  </label>

                  <input
                    id="task-deliverable"
                    name="expectedDeliverable"
                    value={form.expectedDeliverable}
                    onChange={updateField}
                    maxLength={3000}
                    placeholder="e.g. Signed service report & commissioning photo"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>
              </div>

              <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || loadingEmployees}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Assigning Task...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Issue Task Assignment
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
