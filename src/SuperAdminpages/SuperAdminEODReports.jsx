import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Download, Eye, FileText, Filter, LoaderCircle, MessageSquare,
  RefreshCw, Search, ShieldCheck, Users, X, XCircle
} from "lucide-react";
import { auth } from "../services/firebase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const BASE = `${API_BASE}/eod-reports`;

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "DRAFT"];
const LABELS = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "Under review",
  APPROVED: "Approved", REJECTED: "Rejected", CHANGES_REQUESTED: "Changes requested"
};
const BADGES = {
  DRAFT: "bg-slate-100 text-slate-700", SUBMITTED: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800", APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800", CHANGES_REQUESTED: "bg-violet-100 text-violet-800"
};

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function dateTimeLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function initials(value = "") {
  return String(value).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "E";
}
function statusLabel(status) {
  const value = String(status || "SUBMITTED").toUpperCase();
  return LABELS[value] || value.replaceAll("_", " ");
}
function canReview(report) {
  return ["SUBMITTED", "UNDER_REVIEW"].includes(String(report?.status || "").toUpperCase());
}
async function request(path, options = {}) {
  if (!auth.currentUser) throw new Error("Your Firebase session has expired. Please sign in again.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
function Badge({ status }) {
  const value = String(status || "SUBMITTED").toUpperCase();
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${BADGES[value] || BADGES.DRAFT}`}>{statusLabel(value)}</span>;
}
function Stat({ title, value, caption, icon: Icon, tone = "violet" }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700"
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{caption}</p></div><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={21}/></div></div>
  </div>;
}
function Field({ label, children }) {
  return <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>{children}</div>;
}
function Section({ title, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-2 text-sm font-extrabold text-slate-900">{title}</h3><div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{children || "Not provided"}</div></section>;
}
function Modal({ title, close, children, wide = false }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
    <div className={`max-h-[94vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? "max-w-4xl" : "max-w-xl"}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-extrabold text-slate-900">{title}</h2><button type="button" onClick={close} aria-label="Close" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button></div>
      <div className="max-h-[calc(94vh-72px)] overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  </div>;
}

export default function SuperAdminEODReports() {
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "", employeeId: "", branchId: "", from: "", to: "", reportDate: "" });
  const [applied, setApplied] = useState({});
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadReports = useCallback(async (page = 1, filterValues = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit || 20) });
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) params.set(key, String(value));
      });
      const result = await request(`/admin/reports?${params.toString()}`);
      setReports(Array.isArray(result.data) ? result.data : []);
      setPagination(result.pagination || { page, limit: 20, total: (result.data || []).length, pages: 1 });
      setSummary(result.summary || {});
    } catch (e) {
      setError(e.message || "Unable to load EOD reports.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  const loadEmployees = useCallback(async () => {
    try {
      const result = await request("/admin/employees");
      setEmployees(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      setError((current) => current || `Unable to load employee filters: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    loadReports(1, {});
    loadEmployees();
  }, [loadReports, loadEmployees]);

  const branches = useMemo(() => {
    const map = new Map();
    employees.forEach((employee) => {
      const branch = employee.branch;
      const id = branch && typeof branch === "object" ? branch.id || branch._id : branch;
      const name = branch && typeof branch === "object" ? branch.name : employee.branchName;
      if (id && name) map.set(String(id), String(name));
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [employees]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = () => {
    const next = Object.fromEntries(Object.entries(filters).filter(([, value]) => String(value || "").trim()));
    setApplied(next);
    loadReports(1, next);
  };
  const clearFilters = () => {
    const empty = { search: "", status: "", employeeId: "", branchId: "", from: "", to: "", reportDate: "" };
    setFilters(empty);
    setApplied({});
    loadReports(1, {});
  };
  const refresh = () => {
    loadReports(pagination.page || 1, applied);
    loadEmployees();
  };

  const openDetails = async (report) => {
    setSelected(report);
    setDetailLoading(true);
    setHistory([]);
    try {
      const [details, historyResult] = await Promise.all([
        request(`/admin/reports/${report._id}`),
        request(`/admin/reports/${report._id}/history`)
      ]);
      setSelected(details.data || report);
      setHistory(Array.isArray(historyResult.data) ? historyResult.data : []);
    } catch (e) {
      setNotice(e.message || "Unable to load report details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const startReview = (report, action) => {
    setNote("");
    setReview({ report, action });
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!review) return;
    if (review.action !== "approve" && !note.trim()) {
      setNotice("A reason is required for rejection or requested changes.");
      return;
    }
    const actionPath = { approve: "approve", reject: "reject", changes: "request-changes" }[review.action];
    setReviewLoading(true);
    setNotice("");
    try {
      await request(`/admin/reports/${review.report._id}/${actionPath}`, {
        method: "PATCH",
        body: JSON.stringify({ note: note.trim() })
      });
      setReview(null);
      setNote("");
      setNotice(review.action === "approve" ? "Report approved." : review.action === "reject" ? "Report rejected." : "Changes requested.");
      await loadReports(pagination.page || 1, applied);
      if (selected?._id === review.report._id) {
        setSelected(null);
        await openDetails({ ...review.report });
      }
    } catch (e) {
      setNotice(e.message || "Unable to save review.");
    } finally {
      setReviewLoading(false);
    }
  };

  const exportCsv = () => {
    const columns = [
      ["Report date", "reportDate"], ["Employee", "employeeName"], ["Employee code", "employeeCode"],
      ["Branch", "branchName"], ["Calls", "callsLogged"], ["Client visits", "clientVisits"],
      ["Work completed", "workCompleted"], ["Tasks pending", "tasksPending"],
      ["Impediments", "impediments"], ["Tomorrow plan", "tomorrowPlan"],
      ["Status", "status"], ["Review note", "reviewNote"]
    ];
    const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [columns.map(([label]) => quote(label)).join(","), ...reports.map((r) => columns.map(([, key]) => quote(r[key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `eod-reports-page-${pagination.page || 1}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const total = Number(pagination.total || 0);
  const pending = Number(summary.SUBMITTED || 0) + Number(summary.UNDER_REVIEW || 0);

  return <div className="min-h-screen min-w-0 bg-[#f7f6fc] px-3 py-4 text-slate-800 sm:px-5 sm:py-6 lg:px-7">
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex flex-col justify-between gap-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7 xl:flex-row xl:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold tracking-wide text-violet-700"><FileText size={15}/> END OF DAY (EOD) OPERATIONS</div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Daily Work Reporting &amp; Manager Review</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">View employee activity logs, calls, client visits, impediments, pending work and tomorrow&apos;s operational agenda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/> Refresh</button>
          <button type="button" onClick={exportCsv} disabled={!reports.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-800 disabled:opacity-50"><Download size={17}/> Export current page</button>
        </div>
      </header>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={20} className="shrink-0"/><div className="min-w-0 flex-1"><p className="font-bold">Unable to load EOD data</p><p className="mt-1 break-words">{error}</p><p className="mt-2 text-xs">Check Firebase authentication, API base URL and the mounted /api/eod-reports route.</p></div><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={17}/></button></div>}
      {notice && <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900"><CheckCircle2 size={19} className="shrink-0"/><p className="min-w-0 flex-1 break-words">{notice}</p><button type="button" onClick={() => setNotice("")} aria-label="Dismiss message"><X size={17}/></button></div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat title="All reports" value={total} caption="Matching filters" icon={FileText}/>
        <Stat title="Awaiting review" value={pending} caption="Submitted / under review" icon={Clock3} tone="amber"/>
        <Stat title="Approved" value={summary.APPROVED || 0} caption="Reviewed and approved" icon={CheckCircle2} tone="green"/>
        <Stat title="Rejected" value={summary.REJECTED || 0} caption="Rejected reports" icon={XCircle} tone="rose"/>
        <Stat title="Changes requested" value={summary.CHANGES_REQUESTED || 0} caption="Needs employee update" icon={MessageSquare} tone="blue"/>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Filter size={18}/></div><div><h2 className="font-extrabold text-slate-900">Filter reports</h2><p className="text-xs text-slate-500">Search by employee, branch, date or status.</p></div></div><button type="button" onClick={clearFilters} className="text-sm font-bold text-violet-700 hover:text-violet-900">Clear all</button></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Search"><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilters()} placeholder="Employee, code or branch" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"/></div></Field>
          <Field label="Status"><select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}</select></Field>
          <Field label="Employee"><select value={filters.employeeId} onChange={(e) => setFilter("employeeId", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"><option value="">All employees</option>{employees.map((e) => <option key={e._id} value={e._id}>{e.name}{e.employeeCode ? ` (${e.employeeCode})` : ""}</option>)}</select></Field>
          <Field label="Branch"><select value={filters.branchId} onChange={(e) => setFilter("branchId", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"><option value="">All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="From date"><input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></Field>
          <Field label="To date"><input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></Field>
          <Field label="Exact report date"><input type="date" value={filters.reportDate} onChange={(e) => setFilter("reportDate", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></Field>
          <div className="flex items-end"><button type="button" onClick={applyFilters} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60"><Filter size={16}/> Apply filters</button></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div><h2 className="text-lg font-extrabold text-slate-900">Employee EOD reports</h2><p className="mt-1 text-sm text-slate-500">{total} matching report(s)</p></div><span className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500"><ShieldCheck size={15} className="text-violet-600"/> Super Admin view</span></div>
        {loading ? <div className="py-16 text-center"><LoaderCircle size={28} className="mx-auto animate-spin text-violet-700"/><p className="mt-3 text-sm text-slate-500">Loading reports...</p></div> : reports.length === 0 ? <div className="px-5 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><FileText size={27}/></div><h3 className="mt-4 font-bold text-slate-900">No reports found</h3><p className="mt-1 text-sm text-slate-500">Change the filters or refresh to check for new submissions.</p><button type="button" onClick={refresh} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white"><RefreshCw size={16}/> Refresh reports</button></div> : <>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1050px] border-collapse text-left"><thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><th className="px-5 py-3">Employee</th><th className="px-4 py-3">Report date</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{reports.map((r) => <tr key={r._id} className="hover:bg-violet-50/40"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-extrabold text-violet-800">{initials(r.employeeName)}</div><div className="min-w-0"><p className="max-w-[220px] truncate text-sm font-bold text-slate-900">{r.employeeName || "Employee"}</p><p className="mt-1 text-xs text-slate-500">{r.employeeCode || "No employee code"}</p></div></div></td><td className="px-4 py-4"><p className="text-sm font-semibold">{dateLabel(r.reportDate)}</p><p className="mt-1 text-xs text-slate-400">Submitted {dateTimeLabel(r.submittedAt)}</p></td><td className="px-4 py-4"><div className="flex flex-wrap gap-1.5"><span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">{r.callsLogged || 0} calls</span><span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{r.clientVisits || 0} visits</span></div><p className="mt-2 max-w-[240px] truncate text-xs text-slate-500">{r.workCompleted || "No work summary"}</p></td><td className="px-4 py-4 text-sm text-slate-600">{r.branchName || "—"}</td><td className="px-4 py-4"><Badge status={r.status}/></td><td className="px-4 py-4"><div className="flex items-center justify-end gap-1.5"><button type="button" onClick={() => openDetails(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold hover:bg-violet-50"><Eye size={15}/> View</button>{canReview(r) && <><button type="button" title="Approve" onClick={() => startReview(r, "approve")} className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700"><CheckCircle2 size={16}/></button><button type="button" title="Request changes" onClick={() => startReview(r, "changes")} className="rounded-lg bg-violet-100 p-2 text-violet-800 hover:bg-violet-200"><MessageSquare size={16}/></button><button type="button" title="Reject" onClick={() => startReview(r, "reject")} className="rounded-lg bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"><XCircle size={16}/></button></>}</div></td></tr>)}</tbody></table></div>
          <div className="space-y-3 p-3 lg:hidden">{reports.map((r) => <article key={r._id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 font-extrabold text-violet-800">{initials(r.employeeName)}</div><div className="min-w-0 flex-1"><p className="break-words font-bold text-slate-900">{r.employeeName || "Employee"}</p><p className="mt-1 text-xs text-slate-500">{r.employeeCode || "No employee code"} · {dateLabel(r.reportDate)}</p><div className="mt-2"><Badge status={r.status}/></div></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Calls logged</p><p className="mt-1 font-extrabold">{r.callsLogged || 0}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Client visits</p><p className="mt-1 font-extrabold">{r.clientVisits || 0}</p></div></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{r.workCompleted || "No work summary"}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => openDetails(r)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><Eye size={16}/> View details</button>{canReview(r) && <><button type="button" onClick={() => startReview(r, "approve")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white"><CheckCircle2 size={16}/> Approve</button><button type="button" onClick={() => startReview(r, "changes")} aria-label="Request changes" className="rounded-xl bg-violet-100 p-2.5 text-violet-800"><MessageSquare size={17}/></button><button type="button" onClick={() => startReview(r, "reject")} aria-label="Reject report" className="rounded-xl bg-rose-50 p-2.5 text-rose-700"><XCircle size={17}/></button></>}</div></article>)}</div>
        </>}
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5"><p className="text-xs text-slate-500">Page {pagination.page || 1} of {Math.max(1, pagination.pages || 1)} · {total} total</p><div className="flex items-center gap-2"><button type="button" disabled={loading || (pagination.page || 1) <= 1} onClick={() => loadReports((pagination.page || 1) - 1, applied)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40"><ChevronLeft size={17}/> Previous</button><button type="button" disabled={loading || (pagination.page || 1) >= (pagination.pages || 1)} onClick={() => loadReports((pagination.page || 1) + 1, applied)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Next <ChevronRight size={17}/></button></div></div>
      </section>
      <footer className="flex gap-2 rounded-2xl border border-violet-100 bg-white p-4 text-xs leading-5 text-slate-500"><ShieldCheck size={18} className="shrink-0 text-violet-700"/><p>Super Admin access is verified by the backend. Records and actions depend on your authenticated account and API permissions.</p></footer>
    </div>

    {selected && <Modal title="EOD report details" close={() => setSelected(null)} wide>{detailLoading ? <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500"><LoaderCircle size={22} className="animate-spin text-violet-700"/>Loading report details...</div> : <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-[#32116d] via-violet-800 to-violet-600 p-5 text-white"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-extrabold">{initials(selected.employeeName)}</div><div><h3 className="font-extrabold">{selected.employeeName || "Employee"}</h3><p className="mt-1 text-sm text-violet-100">{selected.employeeCode || "No employee code"} · {selected.branchName || "No branch"}</p></div></div><Badge status={selected.status}/></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Report date", dateLabel(selected.reportDate)], ["Calls logged", selected.callsLogged || 0], ["Client visits", selected.clientVisits || 0], ["Submitted", dateTimeLabel(selected.submittedAt)]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/10 p-3"><p className="text-xs text-violet-100">{label}</p><p className="mt-1 break-words text-sm font-bold">{value}</p></div>)}</div></div>
      <div className="grid gap-4 md:grid-cols-2"><Section title="Work completed today">{selected.workCompleted}</Section><Section title="Tasks pending / in progress">{selected.tasksPending}</Section><Section title="Impediments and issues">{selected.impediments}</Section><Section title="Action plan for tomorrow">{selected.tomorrowPlan}</Section><div className="md:col-span-2"><Section title="Additional notes">{selected.additionalNotes}</Section></div></div>
      {(selected.reviewNote || selected.reviewedAt) && <section className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><h3 className="font-extrabold text-violet-950">Latest review</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-violet-900">{selected.reviewNote || "No review note"}</p><p className="mt-2 text-xs text-violet-700">{selected.reviewedByName || "Reviewer"} · {dateTimeLabel(selected.reviewedAt)}</p></section>}
      <section className="rounded-2xl border border-slate-200 p-4"><h3 className="mb-3 font-extrabold text-slate-900">Review history</h3>{!history.length ? <p className="text-sm text-slate-500">No history entries available.</p> : <div className="space-y-3">{history.map((item, index) => <div key={`${item.action}-${item.createdAt}-${index}`} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-50"/><div className="min-w-0 flex-1 border-b border-slate-100 pb-3 last:border-0"><p className="text-sm font-bold text-slate-800">{String(item.action || "UPDATE").replaceAll("_", " ")}</p><p className="mt-1 break-words text-sm text-slate-600">{item.note || "No note"}</p><p className="mt-1 text-xs text-slate-400">{item.performedByRole || "User"} · {dateTimeLabel(item.createdAt)}</p></div></div>)}</div>}</section>
      {canReview(selected) && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => startReview(selected, "reject")} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700"><XCircle size={16}/> Reject</button><button type="button" onClick={() => startReview(selected, "changes")} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-bold text-violet-800"><MessageSquare size={16}/> Request changes</button><button type="button" onClick={() => startReview(selected, "approve")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><CheckCircle2 size={16}/> Approve report</button></div>}
    </div>}</Modal>}

    {review && <Modal title={review.action === "approve" ? "Approve EOD report" : review.action === "reject" ? "Reject EOD report" : "Request changes"} close={() => !reviewLoading && setReview(null)}><form onSubmit={submitReview} className="space-y-4"><div className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-900">{review.report.employeeName || "Employee"}</p><p className="mt-1 text-sm text-slate-500">{dateLabel(review.report.reportDate)} · {review.report.employeeCode || "No employee code"}</p></div><Field label={review.action === "approve" ? "Review note (optional)" : "Reason / feedback (required)"}><textarea value={note} onChange={(e) => setNote(e.target.value)} required={review.action !== "approve"} maxLength={2000} rows={5} placeholder={review.action === "approve" ? "Add an optional note..." : review.action === "reject" ? "Explain why this report is rejected..." : "Describe what the employee must update..."} className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></Field><div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={reviewLoading} onClick={() => setReview(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button type="submit" disabled={reviewLoading || (review.action !== "approve" && !note.trim())} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${review.action === "approve" ? "bg-emerald-600" : review.action === "reject" ? "bg-rose-600" : "bg-violet-700"}`}>{reviewLoading ? <LoaderCircle size={17} className="animate-spin"/> : <CheckCircle2 size={17}/>} {reviewLoading ? "Saving..." : review.action === "approve" ? "Confirm approval" : review.action === "reject" ? "Confirm rejection" : "Send change request"}</button></div></form></Modal>}
  </div>;
}
