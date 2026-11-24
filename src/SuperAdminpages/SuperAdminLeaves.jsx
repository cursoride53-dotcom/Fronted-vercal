import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Download,
  Plus,
  CalendarDays,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  ClipboardList,
  ShieldCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Check,
  LoaderCircle,
  UserRound,
  Building2,
  Mail,
  Phone,
  FileText,
  CalendarCheck,
  Ban,
  RotateCcw,
} from "lucide-react";
import api from "../services/api";

// Works with either API baseURL="http://localhost:5000/api"
// or API baseURL="http://localhost:5000". Do not duplicate /api.
function leaveEndpoint(path = "") {
  const baseURL = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const apiPrefix = /\/api$/i.test(baseURL) ? "" : "/api";
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${apiPrefix}/leaves${suffix}`;
}

const LEAVE_TYPES = [
  { value: "CASUAL", label: "Casual Leave" },
  { value: "SICK", label: "Sick Leave" },
  { value: "EARNED", label: "Earned Leave" },
  { value: "UNPAID", label: "Unpaid Leave" },
  { value: "MATERNITY", label: "Maternity Leave" },
  { value: "PATERNITY", label: "Paternity Leave" },
  { value: "COMPENSATORY", label: "Compensatory Leave" },
  { value: "OTHER", label: "Other Leave" },
];

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const PAGE_SIZE = 10;

const EMPTY_FORM = {
  employeeId: "",
  leaveType: "CASUAL",
  startDate: "",
  endDate: "",
  reason: "",
  contactDuringLeave: "",
};

const EMPTY_FILTERS = {
  search: "",
  status: "",
  leaveType: "",
  from: "",
  to: "",
};

function errorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function statusLabel(status) {
  return (
    {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      CANCELLED: "Cancelled",
    }[String(status || "").toUpperCase()] || status || "Unknown"
  );
}

function leaveTypeLabel(type) {
  return LEAVE_TYPES.find((item) => item.value === type)?.label || type || "—";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function calculateDays(start, end) {
  if (!start || !end || start > end) return 0;

  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);

  return Math.floor((last - first) / 86400000) + 1;
}

function initials(name) {
  return String(name || "Employee")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getId(record) {
  return record?._id || record?.id || "";
}

function escapeCsv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCsv(records) {
  if (!records.length) {
    window.alert("There are no records on this page to export.");
    return;
  }

  const headers = [
    "Employee Name",
    "Employee Code",
    "Email",
    "Branch",
    "Leave Type",
    "Start Date",
    "End Date",
    "Total Days",
    "Reason",
    "Application Source",
    "Status",
    "Review Note",
    "Applied At",
    "Reviewed At",
  ];

  const rows = records.map((record) => [
    record.employeeName,
    record.employeeCode,
    record.employeeEmail,
    record.branch,
    leaveTypeLabel(record.leaveType),
    record.startDate,
    record.endDate,
    record.totalDays,
    record.reason,
    record.appliedByRole,
    record.status,
    record.reviewNote,
    record.appliedAt,
    record.reviewedAt,
  ]);

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `hrms-leaves-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }) {
  const normalized = String(status || "PENDING").toUpperCase();

  return (
    <span className={`sl-status sl-status-${normalized.toLowerCase()}`}>
      {normalized === "APPROVED" ? (
        <CheckCircle2 size={13} />
      ) : normalized === "REJECTED" ? (
        <XCircle size={13} />
      ) : normalized === "CANCELLED" ? (
        <Ban size={13} />
      ) : (
        <Clock3 size={13} />
      )}
      {statusLabel(normalized)}
    </span>
  );
}

function StatCard({ title, value, description, icon: Icon, tone }) {
  return (
    <article className="sl-stat-card">
      <div className={`sl-stat-icon ${tone}`}>
        <Icon size={21} />
      </div>

      <div className="sl-stat-content">
        <span className="sl-stat-title">{title}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </article>
  );
}

function Field({ label, htmlFor, required, children }) {
  return (
    <div className="sl-field">
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="sl-required"> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function SuperAdminLeaves() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  });

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [reviewRecord, setReviewRecord] = useState(null);
  const [reviewDecision, setReviewDecision] = useState("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const [detailRecord, setDetailRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  const page = pagination.page;
  const totalPages = pagination.totalPages || 0;

  /* =====================================================
     FETCH LEAVE APPLICATIONS
     GET /api/leaves/admin
  ===================================================== */

  const fetchLeaves = useCallback(
    async ({ quiet = false } = {}) => {
      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = {
          page,
          limit: PAGE_SIZE,
        };

        if (appliedFilters.status) {
          params.status = appliedFilters.status;
        }

        if (appliedFilters.leaveType) {
          params.leaveType = appliedFilters.leaveType;
        }

        if (appliedFilters.from) params.from = appliedFilters.from;
        if (appliedFilters.to) params.to = appliedFilters.to;

        if (appliedFilters.search.trim()) {
          params.search = appliedFilters.search.trim();
        }

        const response = await api.get(leaveEndpoint("/admin"), { params });
        const payload = response?.data || {};

        if (payload.success === false) {
          throw new Error(payload.message || "Unable to load leave applications.");
        }

        const list = Array.isArray(payload.data) ? payload.data : [];

        setRecords(list);

        setPagination((previous) => ({
          ...previous,
          ...(payload.pagination || {}),
          page: payload.pagination?.page ?? page,
          limit: payload.pagination?.limit ?? PAGE_SIZE,
          total: payload.pagination?.total ?? list.length,
          totalPages:
            payload.pagination?.totalPages ??
            Math.ceil((payload.pagination?.total ?? list.length) / PAGE_SIZE),
        }));

        if (payload.summary) {
          setSummary({
            total: Number(payload.summary.total) || 0,
            pending: Number(payload.summary.pending) || 0,
            approved: Number(payload.summary.approved) || 0,
            rejected: Number(payload.summary.rejected) || 0,
            cancelled: Number(payload.summary.cancelled) || 0,
          });
        } else {
          setSummary({
            total: list.length,
            pending: list.filter((item) => item.status === "PENDING").length,
            approved: list.filter((item) => item.status === "APPROVED").length,
            rejected: list.filter((item) => item.status === "REJECTED").length,
            cancelled: list.filter((item) => item.status === "CANCELLED").length,
          });
        }
      } catch (fetchError) {
        console.error("SUPER ADMIN LEAVES FETCH ERROR:", fetchError);
        setError(errorMessage(fetchError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, appliedFilters, reloadVersion]
  );

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  /* =====================================================
     FETCH ACTIVE EMPLOYEES
     GET /api/leaves/admin/employees?search=
  ===================================================== */

  const fetchEmployees = useCallback(async (search = "") => {
    setEmployeeLoading(true);
    setFormError("");

    try {
      const response = await api.get(leaveEndpoint("/admin/employees"), {
        params: search.trim() ? { search: search.trim() } : {},
      });

      const payload = response?.data || {};

      if (payload.success === false) {
        throw new Error(payload.message || "Unable to load employees.");
      }

      setEmployees(Array.isArray(payload.data) ? payload.data : []);
    } catch (fetchError) {
      console.error("LEAVE EMPLOYEE DROPDOWN ERROR:", fetchError);
      setFormError(errorMessage(fetchError));
      setEmployees([]);
    } finally {
      setEmployeeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showCreate) return;

    fetchEmployees(employeeSearch);
  }, [showCreate, employeeSearch, fetchEmployees]);

  /* =====================================================
     FILTERS
  ===================================================== */

  function updateFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();

    if (filters.from && filters.to && filters.from > filters.to) {
      setError("The start date cannot be after the end date.");
      return;
    }

    setError("");
    setAppliedFilters({ ...filters });

    setPagination((previous) => ({ ...previous, page: 1 }));
  }

  function clearFilters() {
    setFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
    setError("");
    setPagination((previous) => ({ ...previous, page: 1 }));
  }

  /* =====================================================
     CREATE LEAVE FOR EMPLOYEE
     POST /api/leaves/admin/create-for-employee
  ===================================================== */

  function openCreateModal() {
    setForm({ ...EMPTY_FORM });
    setEmployeeSearch("");
    setFormError("");
    setShowCreate(true);
  }

  function closeCreateModal() {
    if (submitting) return;
    setShowCreate(false);
    setFormError("");
  }

  function updateForm(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee._id) === form.employeeId),
    [employees, form.employeeId]
  );

  const leaveDays = calculateDays(form.startDate, form.endDate);

  async function submitCreateLeave(event) {
    event.preventDefault();
    setFormError("");

    if (!form.employeeId) {
      setFormError("Please select an employee.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setFormError("Please select the start date and end date.");
      return;
    }

    if (form.startDate > form.endDate) {
      setFormError("End date cannot be earlier than start date.");
      return;
    }

    if (!form.reason.trim()) {
      setFormError("Please enter a reason for the leave.");
      return;
    }

    if (form.reason.trim().length > 2000) {
      setFormError("Reason cannot exceed 2000 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(
        leaveEndpoint("/admin/create-for-employee"),
        {
          employeeId: form.employeeId,
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason.trim(),
          contactDuringLeave: form.contactDuringLeave.trim(),
        }
      );

      const payload = response?.data || {};

      if (payload.success === false) {
        throw new Error(payload.message || "Failed to create leave application.");
      }

      setShowCreate(false);
      setSuccess("Leave application created successfully for the selected employee.");
      setPagination((previous) => ({ ...previous, page: 1 }));
      setAppliedFilters({ ...EMPTY_FILTERS });
      setFilters({ ...EMPTY_FILTERS });
      setReloadVersion((version) => version + 1);
    } catch (createError) {
      console.error("SUPER ADMIN CREATE LEAVE ERROR:", createError);
      setFormError(errorMessage(createError));
    } finally {
      setSubmitting(false);
    }
  }

  /* =====================================================
     APPROVE OR REJECT
     PATCH /api/leaves/admin/:id/review
  ===================================================== */

  function openReview(record, decision) {
    setReviewRecord(record);
    setReviewDecision(decision);
    setReviewNote("");
    setReviewError("");
  }

  function closeReviewModal() {
    if (reviewLoading) return;
    setReviewRecord(null);
    setReviewNote("");
    setReviewError("");
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!reviewRecord) return;

    const id = getId(reviewRecord);

    if (!id) {
      setReviewError("Leave application ID is missing.");
      return;
    }

    if (!["APPROVED", "REJECTED"].includes(reviewDecision)) {
      setReviewError("Choose approve or reject.");
      return;
    }

    if (reviewDecision === "REJECTED" && !reviewNote.trim()) {
      setReviewError("A rejection reason is required.");
      return;
    }

    if (reviewNote.trim().length > 1000) {
      setReviewError("Review note cannot exceed 1000 characters.");
      return;
    }

    setReviewLoading(true);
    setReviewError("");

    try {
      const response = await api.patch(
        leaveEndpoint(`/admin/${encodeURIComponent(id)}/review`),
        {
          status: reviewDecision,
          note: reviewNote.trim(),
        }
      );

      const payload = response?.data || {};

      if (payload.success === false) {
        throw new Error(payload.message || "Unable to update leave status.");
      }

      setReviewRecord(null);
      setSuccess(
        `Leave application ${reviewDecision.toLowerCase()} successfully.`
      );

      await fetchLeaves({ quiet: true });
    } catch (reviewRequestError) {
      console.error("LEAVE REVIEW ERROR:", reviewRequestError);
      setReviewError(errorMessage(reviewRequestError));
    } finally {
      setReviewLoading(false);
    }
  }

  /* =====================================================
     LOAD ONE APPLICATION
     GET /api/leaves/admin/:id
  ===================================================== */

  async function openDetails(record) {
    setDetailRecord(record);
    setDetailLoading(true);
    setError("");

    try {
      const id = getId(record);
      if (!id) throw new Error("Leave application ID is missing.");

      const response = await api.get(leaveEndpoint(`/admin/${encodeURIComponent(id)}`));
      const payload = response?.data || {};

      if (payload.success === false) {
        throw new Error(payload.message || "Unable to load leave application details.");
      }

      setDetailRecord(payload.data || record);
    } catch (detailError) {
      console.error("LEAVE DETAILS ERROR:", detailError);
      setError(errorMessage(detailError));
    } finally {
      setDetailLoading(false);
    }
  }

  /* =====================================================
     PAGINATION
  ===================================================== */

  function changePage(nextPage) {
    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) {
      return;
    }

    setPagination((previous) => ({ ...previous, page: nextPage }));
  }

  const startItem =
    pagination.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const endItem = Math.min(page * PAGE_SIZE, pagination.total);

  return (
    <div className="sl-page">
      <style>{`
        .sl-page {
          --sl-primary: #7027d8;
          --sl-primary-dark: #5118a5;
          --sl-primary-light: #f3e8ff;
          --sl-border: #e9e2f1;
          --sl-text: #261a36;
          --sl-muted: #82758f;
          --sl-bg: #faf9fd;
          width: 100%;
          min-width: 0;
          padding: 26px;
          box-sizing: border-box;
          color: var(--sl-text);
          background: var(--sl-bg);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .sl-page *,
        .sl-page *::before,
        .sl-page *::after {
          box-sizing: border-box;
        }

        .sl-page button,
        .sl-page input,
        .sl-page select,
        .sl-page textarea {
          font: inherit;
        }

        .sl-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 26px;
        }

        .sl-header-copy {
          min-width: 0;
        }

        .sl-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
          color: var(--sl-primary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .sl-title {
          margin: 0;
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 850;
          letter-spacing: -1px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .sl-subtitle {
          margin: 9px 0 0;
          color: var(--sl-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .sl-header-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 9px;
          flex-shrink: 0;
        }

        .sl-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 41px;
          padding: 10px 14px;
          border: 1px solid var(--sl-border);
          border-radius: 10px;
          background: #fff;
          color: #4d3a60;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: background .15s ease, border-color .15s ease;
        }

        .sl-btn:hover:not(:disabled) {
          border-color: #c4b5fd;
          background: #faf5ff;
        }

        .sl-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .sl-btn-primary {
          color: #fff;
          background: var(--sl-primary);
          border-color: var(--sl-primary);
        }

        .sl-btn-primary:hover:not(:disabled) {
          color: #fff;
          background: var(--sl-primary-dark);
          border-color: var(--sl-primary-dark);
        }

        .sl-btn-danger {
          color: #fff;
          background: #dc2626;
          border-color: #dc2626;
        }

        .sl-stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 23px;
        }

        .sl-stat-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
          padding: 19px 15px;
          border: 1px solid var(--sl-border);
          border-radius: 15px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(38, 19, 64, .025);
        }

        .sl-stat-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 41px;
          height: 41px;
          border-radius: 12px;
        }

        .sl-purple { color: #6d28d9; background: #f3e8ff; }
        .sl-blue { color: #2563eb; background: #dbeafe; }
        .sl-green { color: #15803d; background: #dcfce7; }
        .sl-red { color: #b91c1c; background: #fee2e2; }
        .sl-amber { color: #a16207; background: #fef3c7; }

        .sl-stat-content {
          min-width: 0;
        }

        .sl-stat-title {
          display: block;
          margin-bottom: 7px;
          color: var(--sl-muted);
          font-size: 11px;
          font-weight: 650;
        }

        .sl-stat-content strong {
          display: block;
          margin-bottom: 5px;
          font-size: 25px;
          font-weight: 850;
          line-height: 1.1;
          letter-spacing: -.5px;
          overflow-wrap: anywhere;
        }

        .sl-stat-content small {
          display: block;
          color: #a096ad;
          font-size: 10px;
          line-height: 1.5;
        }

        .sl-panel {
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--sl-border);
          border-radius: 17px;
          background: #fff;
          box-shadow: 0 4px 16px rgba(38, 19, 64, .025);
        }

        .sl-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 20px 22px;
          border-bottom: 1px solid #f0ebf5;
        }

        .sl-panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }

        .sl-panel-caption {
          margin: 6px 0 0;
          color: var(--sl-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .sl-api-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 20px;
          background: #f3e8ff;
          color: #6b21a8;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .sl-filter-form {
          display: grid;
          grid-template-columns: minmax(180px, 1.5fr) repeat(4, minmax(115px, 1fr)) auto;
          gap: 11px;
          align-items: end;
          padding: 19px 22px;
          border-bottom: 1px solid #f0ebf5;
        }

        .sl-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .sl-field > label {
          color: #665a77;
          font-size: 11px;
          font-weight: 750;
        }

        .sl-required {
          color: #dc2626;
        }

        .sl-input-wrap {
          position: relative;
          min-width: 0;
        }

        .sl-input-icon {
          position: absolute;
          top: 50%;
          left: 12px;
          color: #978ba8;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .sl-input,
        .sl-select,
        .sl-textarea {
          width: 100%;
          min-width: 0;
          min-height: 42px;
          padding: 10px 12px;
          outline: none;
          border: 1px solid #e7e0ef;
          border-radius: 10px;
          background: #fff;
          color: #352747;
          font-size: 12px;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .sl-input.sl-has-icon {
          padding-left: 37px;
        }

        .sl-input:focus,
        .sl-select:focus,
        .sl-textarea:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, .1);
        }

        .sl-filter-actions {
          display: flex;
          gap: 7px;
        }

        .sl-filter-actions .sl-btn {
          padding-inline: 11px;
        }

        .sl-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 16px 22px 0;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fff7f7;
          color: #b91c1c;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .sl-success {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .sl-alert-dismiss {
          margin-left: auto;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .sl-scroll-hint {
          display: none;
          padding: 10px 15px;
          border-bottom: 1px solid #f0ebf5;
          color: #9488a2;
          font-size: 11px;
        }

        .sl-table-wrap {
          width: 100%;
          overflow-x: auto;
          overscroll-behavior-x: contain;
        }

        .sl-table {
          width: 100%;
          min-width: 1150px;
          border-collapse: separate;
          border-spacing: 0;
          text-align: left;
        }

        .sl-table th {
          padding: 13px 15px;
          border-bottom: 1px solid #eee8f4;
          background: #fcfbfe;
          color: #887c98;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .6px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .sl-table td {
          padding: 15px;
          border-bottom: 1px solid #f1edf5;
          color: #51445f;
          font-size: 12px;
          vertical-align: middle;
        }

        .sl-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .sl-table tbody tr:hover {
          background: #fdfbff;
        }

        .sl-employee {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 185px;
        }

        .sl-avatar {
          display: grid;
          place-items: center;
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          border: 1px solid #e9d5ff;
          border-radius: 12px;
          background: #f3e8ff;
          color: #6b21a8;
          font-size: 11px;
          font-weight: 850;
        }

        .sl-employee-name {
          color: #30223f;
          font-size: 12px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .sl-employee-meta {
          margin-top: 4px;
          color: #9589a3;
          font-size: 10px;
        }

        .sl-table-main {
          color: #40314e;
          font-weight: 750;
          white-space: nowrap;
        }

        .sl-table-sub {
          margin-top: 5px;
          color: #998da7;
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        .sl-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .sl-status-pending { color: #a16207; background: #fef3c7; }
        .sl-status-approved { color: #15803d; background: #dcfce7; }
        .sl-status-rejected { color: #b91c1c; background: #fee2e2; }
        .sl-status-cancelled { color: #6b7280; background: #f3f4f6; }

        .sl-row-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sl-icon-btn {
          display: grid;
          place-items: center;
          width: 33px;
          height: 33px;
          flex-shrink: 0;
          border: 1px solid #e8e0f0;
          border-radius: 9px;
          background: #fff;
          color: #78658f;
          cursor: pointer;
        }

        .sl-icon-btn:hover:not(:disabled) {
          border-color: #c4b5fd;
          background: #f5f0ff;
          color: #6d28d9;
        }

        .sl-icon-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .sl-icon-approve {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
        }

        .sl-icon-reject {
          border-color: #fecaca;
          background: #fff7f7;
          color: #b91c1c;
        }

        .sl-empty,
        .sl-loading {
          display: flex;
          min-height: 250px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 30px;
          color: #9488a2;
          text-align: center;
        }

        .sl-empty-icon {
          display: grid;
          place-items: center;
          width: 55px;
          height: 55px;
          border-radius: 17px;
          background: #f5f0fb;
          color: #8b5cf6;
        }

        .sl-empty strong {
          color: #4a3a5c;
          font-size: 14px;
        }

        .sl-empty p {
          max-width: 390px;
          margin: 0;
          font-size: 12px;
          line-height: 1.7;
        }

        .sl-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 17px 22px;
          border-top: 1px solid #f0ebf5;
        }

        .sl-footer-info {
          color: #8b8098;
          font-size: 11px;
        }

        .sl-pagination {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .sl-page-btn {
          display: grid;
          place-items: center;
          min-width: 34px;
          height: 34px;
          padding: 0 8px;
          border: 1px solid #e9e1f1;
          border-radius: 9px;
          background: #fff;
          color: #5d4c70;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .sl-page-btn.active {
          border-color: var(--sl-primary);
          background: var(--sl-primary);
          color: #fff;
        }

        .sl-page-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .sl-overlay {
          position: fixed;
          z-index: 9999;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
          background: rgba(27, 17, 40, .55);
          backdrop-filter: blur(5px);
        }

        .sl-modal {
          width: 100%;
          max-width: 600px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border: 1px solid #eee5f7;
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(28, 13, 45, .25);
        }

        .sl-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          padding: 21px 24px;
          border-bottom: 1px solid #f0ebf5;
        }

        .sl-modal-header h3 {
          margin: 0;
          color: #30223f;
          font-size: 19px;
          font-weight: 850;
        }

        .sl-modal-header p {
          margin: 7px 0 0;
          color: #8b8098;
          font-size: 12px;
          line-height: 1.6;
        }

        .sl-modal-body {
          padding: 23px 24px;
        }

        .sl-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .sl-full {
          grid-column: 1 / -1;
        }

        .sl-textarea {
          min-height: 100px;
          resize: vertical;
          line-height: 1.6;
        }

        .sl-helper {
          margin-top: 7px;
          color: #998da7;
          font-size: 10px;
          line-height: 1.5;
        }

        .sl-selected-employee {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-top: 10px;
          padding: 12px;
          border: 1px solid #e9d5ff;
          border-radius: 11px;
          background: #faf5ff;
        }

        .sl-selected-employee strong {
          display: block;
          color: #4c1d95;
          font-size: 12px;
        }

        .sl-selected-employee span {
          display: block;
          margin-top: 4px;
          color: #8b5aa9;
          font-size: 10px;
        }

        .sl-duration {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 15px;
          border: 1px solid #e9d5ff;
          border-radius: 11px;
          background: #faf5ff;
        }

        .sl-duration span {
          color: #7e668f;
          font-size: 12px;
        }

        .sl-duration strong {
          color: #6b21a8;
          font-size: 18px;
          font-weight: 850;
        }

        .sl-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 17px 24px;
          border-top: 1px solid #f0ebf5;
          background: #fdfcff;
        }

        .sl-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .sl-detail-item {
          min-width: 0;
          padding: 13px;
          border: 1px solid #eee8f5;
          border-radius: 11px;
          background: #fdfcff;
        }

        .sl-detail-item > span {
          display: block;
          margin-bottom: 7px;
          color: #8b8098;
          font-size: 10px;
          font-weight: 700;
        }

        .sl-detail-item > strong {
          display: block;
          color: #3c2d4d;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .sl-note-box {
          padding: 13px;
          border: 1px solid #eee8f5;
          border-radius: 11px;
          color: #5d4c70;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .sl-review-notice {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 16px;
          padding: 12px;
          border: 1px solid #e9d5ff;
          border-radius: 10px;
          background: #faf5ff;
          color: #6b21a8;
          font-size: 11px;
          line-height: 1.6;
        }

        .sl-spin {
          animation: sl-rotate 1s linear infinite;
        }

        @keyframes sl-rotate {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .sl-page *,
          .sl-page *::before,
          .sl-page *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }

        @media (max-width: 1450px) {
          .sl-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .sl-filter-form {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .sl-filter-actions {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 900px) {
          .sl-page {
            padding: 18px;
          }

          .sl-header {
            flex-direction: column;
            align-items: stretch;
          }

          .sl-header-actions {
            justify-content: flex-start;
          }

          .sl-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sl-filter-form {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            padding: 16px;
          }
        }

        @media (max-width: 600px) {
          .sl-page {
            padding: 13px 10px;
          }

          .sl-stats {
            gap: 9px;
          }

          .sl-stat-card {
            gap: 9px;
            padding: 13px 10px;
            border-radius: 12px;
          }

          .sl-stat-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
          }

          .sl-stat-content strong {
            font-size: 21px;
          }

          .sl-stat-title {
            font-size: 10px;
          }

          .sl-stat-content small {
            font-size: 9px;
          }

          .sl-panel-header {
            align-items: flex-start;
            padding: 15px;
          }

          .sl-api-badge {
            display: none;
          }

          .sl-filter-form {
            grid-template-columns: minmax(0, 1fr);
            padding: 15px;
          }

          .sl-filter-actions {
            grid-column: auto;
          }

          .sl-scroll-hint {
            display: block;
          }

          .sl-footer {
            align-items: flex-start;
            flex-direction: column;
            padding: 15px;
          }

          .sl-pagination {
            flex-wrap: wrap;
          }

          .sl-overlay {
            padding: 9px;
          }

          .sl-modal {
            max-height: calc(100vh - 18px);
            border-radius: 15px;
          }

          .sl-modal-header,
          .sl-modal-body {
            padding: 17px;
          }

          .sl-modal-footer {
            padding: 14px 17px;
          }

          .sl-form-grid,
          .sl-detail-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .sl-full {
            grid-column: auto;
          }

          .sl-header-actions .sl-btn {
            flex: 1;
          }
        }
      `}</style>

      <header className="sl-header">
        <div className="sl-header-copy">
          <div className="sl-eyebrow">
            <ShieldCheck size={15} />
            HRMSZermii / Super Admin
          </div>

          <h1 className="sl-title">Leave Management</h1>

          <p className="sl-subtitle">
            Manage employee leave requests, create applications on behalf of
            employees, and track approval decisions.
          </p>
        </div>

        <div className="sl-header-actions">
          <button
            type="button"
            className="sl-btn"
            onClick={() => fetchLeaves({ quiet: true })}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <LoaderCircle size={15} className="sl-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            Refresh
          </button>

          <button
            type="button"
            className="sl-btn"
            onClick={() => exportCsv(records)}
            disabled={loading || records.length === 0}
          >
            <Download size={15} />
            Export CSV
          </button>

          <button
            type="button"
            className="sl-btn sl-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            Apply for Employee
          </button>
        </div>
      </header>

      <section className="sl-stats">
        <StatCard
          title="Total Applications"
          value={summary.total}
          description="Matching selected filters"
          icon={ClipboardList}
          tone="sl-purple"
        />

        <StatCard
          title="Pending Review"
          value={summary.pending}
          description="Waiting for a decision"
          icon={Clock3}
          tone="sl-amber"
        />

        <StatCard
          title="Approved"
          value={summary.approved}
          description="Approved applications"
          icon={CheckCircle2}
          tone="sl-green"
        />

        <StatCard
          title="Rejected"
          value={summary.rejected}
          description="Rejected applications"
          icon={XCircle}
          tone="sl-red"
        />

        <StatCard
          title="Cancelled"
          value={summary.cancelled}
          description="Cancelled applications"
          icon={Ban}
          tone="sl-blue"
        />
      </section>

      <section className="sl-panel">
        <div className="sl-panel-header">
          <div>
            <h2 className="sl-panel-title">
              <CalendarCheck size={19} color="#7c3aed" />
              Employee Leave Applications
            </h2>
            <p className="sl-panel-caption">
              Search, inspect, approve, or reject leave applications.
            </p>
          </div>

          <span className="sl-api-badge">
            <CheckCircle2 size={13} />
            Connected to API
          </span>
        </div>

        <form className="sl-filter-form" onSubmit={applyFilters}>
          <Field label="Search employee" htmlFor="sl-search">
            <div className="sl-input-wrap">
              <Search size={15} className="sl-input-icon" />
              <input
                id="sl-search"
                className="sl-input sl-has-icon"
                placeholder="Name, code, email, branch"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </div>
          </Field>

          <Field label="Application status" htmlFor="sl-status-filter">
            <select
              id="sl-status-filter"
              className="sl-select"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Leave type" htmlFor="sl-type-filter">
            <select
              id="sl-type-filter"
              className="sl-select"
              value={filters.leaveType}
              onChange={(event) =>
                updateFilter("leaveType", event.target.value)
              }
            >
              <option value="">All leave types</option>
              {LEAVE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="From date" htmlFor="sl-from">
            <input
              id="sl-from"
              className="sl-input"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => updateFilter("from", event.target.value)}
            />
          </Field>

          <Field label="To date" htmlFor="sl-to">
            <input
              id="sl-to"
              className="sl-input"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => updateFilter("to", event.target.value)}
            />
          </Field>

          <div className="sl-filter-actions">
            <button type="submit" className="sl-btn sl-btn-primary">
              <Filter size={14} />
              Apply
            </button>

            <button type="button" className="sl-btn" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </form>

        {error && (
          <div className="sl-alert" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
            <button
              type="button"
              className="sl-alert-dismiss"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {success && (
          <div className="sl-alert sl-success" role="status">
            <CheckCircle2 size={17} />
            <span>{success}</span>
            <button
              type="button"
              className="sl-alert-dismiss"
              aria-label="Dismiss message"
              onClick={() => setSuccess("")}
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="sl-scroll-hint">
          Scroll horizontally to see all application details.
        </div>

        {loading ? (
          <div className="sl-loading">
            <LoaderCircle size={32} className="sl-spin" color="#7c3aed" />
            <strong>Loading leave applications...</strong>
            <span>Connecting to the HRMS leave API.</span>
          </div>
        ) : records.length === 0 ? (
          <div className="sl-empty">
            <div className="sl-empty-icon">
              <CalendarDays size={25} />
            </div>
            <strong>No leave applications found</strong>
            <p>
              Try changing the filters, or create a leave application for an
              employee using the button above.
            </p>
            <button
              type="button"
              className="sl-btn sl-btn-primary"
              onClick={openCreateModal}
            >
              <Plus size={15} />
              Apply for Employee
            </button>
          </div>
        ) : (
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave type</th>
                  <th>Leave period</th>
                  <th>Days</th>
                  <th>Application source</th>
                  <th>Status</th>
                  <th>Applied on</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => {
                  const id = getId(record);
                  const status = String(record.status || "PENDING").toUpperCase();

                  return (
                    <tr key={id || `${record.employeeCode}-${record.startDate}`}>
                      <td>
                        <div className="sl-employee">
                          <div className="sl-avatar">
                            {initials(record.employeeName)}
                          </div>
                          <div>
                            <div className="sl-employee-name">
                              {record.employeeName || "Employee"}
                            </div>
                            <div className="sl-employee-meta">
                              {record.employeeCode || "No employee code"}
                              {record.branch ? ` · ${record.branch}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="sl-table-main">
                          {leaveTypeLabel(record.leaveType)}
                        </div>
                        <div className="sl-table-sub">
                          {record.contactDuringLeave || "No contact supplied"}
                        </div>
                      </td>

                      <td>
                        <div className="sl-table-main">
                          {formatDate(record.startDate)}
                        </div>
                        <div className="sl-table-sub">
                          To {formatDate(record.endDate)}
                        </div>
                      </td>

                      <td>
                        <div className="sl-table-main">
                          {record.totalDays ?? calculateDays(
                            record.startDate,
                            record.endDate
                          )}{" "}
                          {Number(record.totalDays ?? calculateDays(
                            record.startDate,
                            record.endDate
                          )) === 1 ? "day" : "days"}
                        </div>
                      </td>

                      <td>
                        <div className="sl-table-main">
                          {record.appliedByRole === "SUPER_ADMIN"
                            ? "Super Admin"
                            : "Employee"}
                        </div>
                        <div className="sl-table-sub">
                          {record.appliedByRole === "SUPER_ADMIN"
                            ? record.createdBySuperAdmin?.name ||
                              "Created on employee's behalf"
                            : "Self application"}
                        </div>
                      </td>

                      <td>
                        <StatusBadge status={status} />
                      </td>

                      <td>
                        <div className="sl-table-main">
                          {formatDate(record.appliedAt)}
                        </div>
                        <div className="sl-table-sub">
                          {formatDateTime(record.appliedAt).split(", ").slice(-1)[0]}
                        </div>
                      </td>

                      <td>
                        <div className="sl-row-actions">
                          <button
                            type="button"
                            className="sl-icon-btn"
                            title="View application details"
                            aria-label="View application details"
                            onClick={() => openDetails(record)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="sl-icon-btn sl-icon-approve"
                            title="Approve leave"
                            aria-label="Approve leave"
                            disabled={status !== "PENDING"}
                            onClick={() => openReview(record, "APPROVED")}
                          >
                            <Check size={15} />
                          </button>

                          <button
                            type="button"
                            className="sl-icon-btn sl-icon-reject"
                            title="Reject leave"
                            aria-label="Reject leave"
                            disabled={status !== "PENDING"}
                            onClick={() => openReview(record, "REJECTED")}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <footer className="sl-footer">
            <div className="sl-footer-info">
              Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
              <strong>{pagination.total}</strong> applications
            </div>

            <div className="sl-pagination">
              <button
                type="button"
                className="sl-page-btn"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                let number;

                if (totalPages <= 5) {
                  number = index + 1;
                } else if (page <= 3) {
                  number = index + 1;
                } else if (page >= totalPages - 2) {
                  number = totalPages - 4 + index;
                } else {
                  number = page - 2 + index;
                }

                return (
                  <button
                    key={number}
                    type="button"
                    className={`sl-page-btn ${page === number ? "active" : ""}`}
                    aria-current={page === number ? "page" : undefined}
                    onClick={() => changePage(number)}
                  >
                    {number}
                  </button>
                );
              })}

              <button
                type="button"
                className="sl-page-btn"
                aria-label="Next page"
                disabled={totalPages === 0 || page >= totalPages}
                onClick={() => changePage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* CREATE LEAVE FOR EMPLOYEE */}
      {showCreate && (
        <div
          className="sl-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
        >
          <section
            className="sl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sl-create-title"
          >
            <div className="sl-modal-header">
              <div>
                <h3 id="sl-create-title">Apply Leave for Employee</h3>
                <p>
                  Select an active employee and create a leave application on
                  their behalf.
                </p>
              </div>

              <button
                type="button"
                className="sl-icon-btn"
                aria-label="Close create leave dialog"
                disabled={submitting}
                onClick={closeCreateModal}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={submitCreateLeave}>
              <div className="sl-modal-body">
                <div className="sl-form-grid">
                  <div className="sl-field sl-full">
                    <label htmlFor="sl-employee-search">
                      Search employees
                    </label>
                    <div className="sl-input-wrap">
                      <Search size={15} className="sl-input-icon" />
                      <input
                        id="sl-employee-search"
                        className="sl-input sl-has-icon"
                        placeholder="Search by employee name, code, or email"
                        value={employeeSearch}
                        onChange={(event) => setEmployeeSearch(event.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <Field
                    label="Select employee"
                    htmlFor="sl-employee-select"
                    required
                  >
                    <select
                      id="sl-employee-select"
                      className="sl-select"
                      value={form.employeeId}
                      onChange={(event) =>
                        updateForm("employeeId", event.target.value)
                      }
                      disabled={submitting || employeeLoading}
                      required
                    >
                      <option value="">
                        {employeeLoading
                          ? "Loading employees..."
                          : "Choose an active employee"}
                      </option>

                      {employees.map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {employee.employeeName || "Employee"}
                          {employee.employeeCode
                            ? ` (${employee.employeeCode})`
                            : ""}
                        </option>
                      ))}
                    </select>

                    <div className="sl-helper">
                      Only active employees returned by the backend are listed.
                    </div>
                  </Field>

                  <Field label="Leave type" htmlFor="sl-leave-type" required>
                    <select
                      id="sl-leave-type"
                      className="sl-select"
                      value={form.leaveType}
                      onChange={(event) =>
                        updateForm("leaveType", event.target.value)
                      }
                      disabled={submitting}
                    >
                      {LEAVE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {selectedEmployee && (
                    <div className="sl-full sl-selected-employee">
                      <div className="sl-avatar">
                        {initials(selectedEmployee.employeeName)}
                      </div>
                      <div>
                        <strong>{selectedEmployee.employeeName}</strong>
                        <span>
                          {selectedEmployee.employeeCode || "No employee code"}
                          {selectedEmployee.branch
                            ? ` · ${selectedEmployee.branch}`
                            : ""}
                          {selectedEmployee.employeeEmail
                            ? ` · ${selectedEmployee.employeeEmail}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  )}

                  <Field label="Start date" htmlFor="sl-start-date" required>
                    <input
                      id="sl-start-date"
                      type="date"
                      className="sl-input"
                      value={form.startDate}
                      max={form.endDate || undefined}
                      onChange={(event) =>
                        updateForm("startDate", event.target.value)
                      }
                      disabled={submitting}
                      required
                    />
                  </Field>

                  <Field label="End date" htmlFor="sl-end-date" required>
                    <input
                      id="sl-end-date"
                      type="date"
                      className="sl-input"
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={(event) =>
                        updateForm("endDate", event.target.value)
                      }
                      disabled={submitting}
                      required
                    />
                  </Field>

                  <div className="sl-full sl-duration">
                    <span>
                      <CalendarDays
                        size={15}
                        style={{
                          verticalAlign: "middle",
                          marginRight: 7,
                        }}
                      />
                      Total calendar days
                    </span>
                    <strong>{leaveDays > 0 ? leaveDays : 0}</strong>
                  </div>

                  <Field label="Reason for leave" htmlFor="sl-reason" required>
                    <textarea
                      id="sl-reason"
                      className="sl-textarea"
                      placeholder="Enter the reason for this leave application..."
                      value={form.reason}
                      onChange={(event) =>
                        updateForm("reason", event.target.value)
                      }
                      maxLength={2000}
                      disabled={submitting}
                      required
                    />
                  </Field>

                  <Field
                    label="Contact during leave"
                    htmlFor="sl-contact"
                  >
                    <input
                      id="sl-contact"
                      className="sl-input"
                      placeholder="Contact number (optional)"
                      value={form.contactDuringLeave}
                      onChange={(event) =>
                        updateForm("contactDuringLeave", event.target.value)
                      }
                      maxLength={30}
                      disabled={submitting}
                    />
                  </Field>
                </div>

                {formError && (
                  <div className="sl-alert" style={{ margin: "17px 0 0" }}>
                    <AlertCircle size={17} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="sl-review-notice">
                  <ShieldCheck size={17} />
                  <span>
                    This application will be recorded as created by the Super
                    Admin. It will appear as a pending leave request and can be
                    approved or rejected through the review actions.
                  </span>
                </div>
              </div>

              <div className="sl-modal-footer">
                <button
                  type="button"
                  className="sl-btn"
                  onClick={closeCreateModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sl-btn sl-btn-primary"
                  disabled={submitting || employeeLoading}
                >
                  {submitting ? (
                    <LoaderCircle size={15} className="sl-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  {submitting ? "Submitting..." : "Create Application"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* APPROVE / REJECT MODAL */}
      {reviewRecord && (
        <div
          className="sl-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReviewModal();
          }}
        >
          <section
            className="sl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sl-review-title"
          >
            <div className="sl-modal-header">
              <div>
                <h3 id="sl-review-title">
                  {reviewDecision === "APPROVED"
                    ? "Approve Leave Application"
                    : "Reject Leave Application"}
                </h3>
                <p>
                  {reviewRecord.employeeName || "Employee"} ·{" "}
                  {leaveTypeLabel(reviewRecord.leaveType)}
                </p>
              </div>

              <button
                type="button"
                className="sl-icon-btn"
                aria-label="Close review dialog"
                disabled={reviewLoading}
                onClick={closeReviewModal}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={submitReview}>
              <div className="sl-modal-body">
                <div className="sl-detail-grid">
                  <div className="sl-detail-item">
                    <span>Employee code</span>
                    <strong>{reviewRecord.employeeCode || "—"}</strong>
                  </div>

                  <div className="sl-detail-item">
                    <span>Branch</span>
                    <strong>{reviewRecord.branch || "—"}</strong>
                  </div>

                  <div className="sl-detail-item">
                    <span>Start date</span>
                    <strong>{formatDate(reviewRecord.startDate)}</strong>
                  </div>

                  <div className="sl-detail-item">
                    <span>End date</span>
                    <strong>{formatDate(reviewRecord.endDate)}</strong>
                  </div>

                  <div className="sl-detail-item">
                    <span>Duration</span>
                    <strong>
                      {reviewRecord.totalDays ??
                        calculateDays(reviewRecord.startDate, reviewRecord.endDate)}{" "}
                      days
                    </strong>
                  </div>

                  <div className="sl-detail-item">
                    <span>Current status</span>
                    <strong>
                      <StatusBadge status={reviewRecord.status} />
                    </strong>
                  </div>
                </div>

                <div className="sl-field" style={{ marginBottom: 16 }}>
                  <label htmlFor="sl-review-decision">Decision</label>
                  <select
                    id="sl-review-decision"
                    className="sl-select"
                    value={reviewDecision}
                    onChange={(event) => setReviewDecision(event.target.value)}
                    disabled={reviewLoading}
                  >
                    <option value="APPROVED">Approve application</option>
                    <option value="REJECTED">Reject application</option>
                  </select>
                </div>

                <div className="sl-field">
                  <label htmlFor="sl-review-note">
                    Review note
                    {reviewDecision === "REJECTED"
                      ? " (required)"
                      : " (optional)"}
                  </label>
                  <textarea
                    id="sl-review-note"
                    className="sl-textarea"
                    placeholder={
                      reviewDecision === "REJECTED"
                        ? "Enter the reason for rejecting this leave..."
                        : "Add an optional approval note..."
                    }
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    maxLength={1000}
                    disabled={reviewLoading}
                  />
                </div>

                {reviewError && (
                  <div className="sl-alert" style={{ margin: "15px 0 0" }}>
                    <AlertCircle size={17} />
                    <span>{reviewError}</span>
                  </div>
                )}

                <div className="sl-review-notice">
                  <ShieldCheck size={17} />
                  <span>
                    Only pending applications can be reviewed. The server will
                    record the Super Admin and the review timestamp.
                  </span>
                </div>
              </div>

              <div className="sl-modal-footer">
                <button
                  type="button"
                  className="sl-btn"
                  onClick={closeReviewModal}
                  disabled={reviewLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`sl-btn ${
                    reviewDecision === "REJECTED"
                      ? "sl-btn-danger"
                      : "sl-btn-primary"
                  }`}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? (
                    <LoaderCircle size={15} className="sl-spin" />
                  ) : reviewDecision === "REJECTED" ? (
                    <XCircle size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}

                  {reviewLoading
                    ? "Saving..."
                    : reviewDecision === "REJECTED"
                      ? "Reject Application"
                      : "Approve Application"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* APPLICATION DETAILS MODAL */}
      {detailRecord && (
        <div
          className="sl-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailRecord(null);
          }}
        >
          <section
            className="sl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sl-details-title"
          >
            <div className="sl-modal-header">
              <div>
                <h3 id="sl-details-title">Leave Application Details</h3>
                <p>
                  {detailRecord.employeeName || "Employee"} ·{" "}
                  {leaveTypeLabel(detailRecord.leaveType)}
                </p>
              </div>

              <button
                type="button"
                className="sl-icon-btn"
                aria-label="Close details"
                onClick={() => setDetailRecord(null)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="sl-modal-body">
              {detailLoading ? (
                <div className="sl-loading" style={{ minHeight: 140 }}>
                  <LoaderCircle size={26} className="sl-spin" color="#7c3aed" />
                  <strong>Loading application details…</strong>
                </div>
              ) : (
              <>
              <div className="sl-detail-grid">
                <div className="sl-detail-item">
                  <span>Employee name</span>
                  <strong>{detailRecord.employeeName || "—"}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>Employee code</span>
                  <strong>{detailRecord.employeeCode || "—"}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>Email</span>
                  <strong>{detailRecord.employeeEmail || "—"}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>Branch</span>
                  <strong>{detailRecord.branch || "—"}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>Leave type</span>
                  <strong>{leaveTypeLabel(detailRecord.leaveType)}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>Duration</span>
                  <strong>
                    {detailRecord.totalDays ??
                      calculateDays(detailRecord.startDate, detailRecord.endDate)}{" "}
                    calendar days
                  </strong>
                </div>

                <div className="sl-detail-item">
                  <span>Start date</span>
                  <strong>{formatDate(detailRecord.startDate)}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>End date</span>
                  <strong>{formatDate(detailRecord.endDate)}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>Applied at</span>
                  <strong>{formatDateTime(detailRecord.appliedAt)}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>Application source</span>
                  <strong>
                    {detailRecord.appliedByRole === "SUPER_ADMIN"
                      ? "Super Admin"
                      : "Employee"}
                  </strong>
                </div>

                <div className="sl-detail-item">
                  <span>Current status</span>
                  <strong>
                    <StatusBadge status={detailRecord.status} />
                  </strong>
                </div>

                <div className="sl-detail-item">
                  <span>Contact during leave</span>
                  <strong>{detailRecord.contactDuringLeave || "—"}</strong>
                </div>

                <div className="sl-detail-item">
                  <span>Reviewed by</span>
                  <strong>
                    {detailRecord.reviewedBy?.name ||
                      detailRecord.reviewedBy?.email ||
                      "Not reviewed"}
                  </strong>
                </div>

                <div className="sl-detail-item">
                  <span>Reviewed at</span>
                  <strong>{formatDateTime(detailRecord.reviewedAt)}</strong>
                </div>
              </div>

              <div className="sl-field" style={{ marginBottom: 16 }}>
                <label>Reason for leave</label>
                <div className="sl-note-box">
                  {detailRecord.reason || "No reason provided."}
                </div>
              </div>

              <div className="sl-field">
                <label>Review note</label>
                <div className="sl-note-box">
                  {detailRecord.reviewNote || "No review note provided."}
                </div>
              </div>

              <div className="sl-review-notice">
                <ShieldCheck size={17} />
                <span>
                  Leave details are read from the protected Super Admin API.
                  Review decisions are recorded on the server.
                </span>
              </div>
              </>
              )}
            </div>

            <div className="sl-modal-footer">
              <button
                type="button"
                className="sl-btn"
                onClick={() => setDetailRecord(null)}
              >
                Close
              </button>

              {detailRecord.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    className="sl-btn sl-btn-primary"
                    onClick={() => {
                      const record = detailRecord;
                      setDetailRecord(null);
                      openReview(record, "APPROVED");
                    }}
                  >
                    <CheckCircle2 size={15} />
                    Approve
                  </button>

                  <button
                    type="button"
                    className="sl-btn sl-btn-danger"
                    onClick={() => {
                      const record = detailRecord;
                      setDetailRecord(null);
                      openReview(record, "REJECTED");
                    }}
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
