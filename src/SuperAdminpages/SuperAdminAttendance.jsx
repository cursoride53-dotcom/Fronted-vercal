import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
  XCircle,
  ClipboardCheck,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";
import api from "../services/api";

/* =========================================================
   SUPER ADMIN ATTENDANCE MANAGEMENT
   API:
   GET   /api/attendance/admin/records
   PATCH /api/attendance/admin/records/:id/review
========================================================= */

const PAGE_SIZE = 10;

const REVIEW_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

const INITIAL_FILTERS = {
  search: "",
  from: "",
  to: "",
  reviewStatus: "",
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getRecordId(record) {
  return record?._id || record?.id || "";
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || minutes === "") {
    return "—";
  }

  const total = Number(minutes);

  if (!Number.isFinite(total) || total < 0) return "—";

  const hours = Math.floor(total / 60);
  const remainingMinutes = total % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function getEmployeeInitials(name) {
  if (!name) return "EM";

  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function normalizeStatus(status) {
  return String(status || "PENDING").toUpperCase();
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(records) {
  if (!records.length) {
    window.alert("There are no attendance records to export.");
    return;
  }

  const headers = [
    "Employee Name",
    "Employee Code",
    "Branch",
    "Attendance Date",
    "Check In",
    "Check Out",
    "Working Hours",
    "Review Status",
    "Review Note",
  ];

  const rows = records.map((record) => [
    record.employeeName,
    record.employeeCode,
    record.branch,
    record.attendanceDate,
    record.checkInAt ? new Date(record.checkInAt).toISOString() : "",
    record.checkOutAt ? new Date(record.checkOutAt).toISOString() : "",
    formatDuration(record.workedMinutes),
    normalizeStatus(record.reviewStatus),
    record.reviewNote,
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
  link.download = `hrms-attendance-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const classes = {
    PENDING: "sa-status-pending",
    APPROVED: "sa-status-approved",
    REJECTED: "sa-status-rejected",
  };

  const labels = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };

  const icons = {
    PENDING: <Clock3 size={13} />,
    APPROVED: <CheckCircle2 size={13} />,
    REJECTED: <XCircle size={13} />,
  };

  return (
    <span className={`sa-status ${classes[normalized] || classes.PENDING}`}>
      {icons[normalized] || icons.PENDING}
      {labels[normalized] || normalized}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <div className="sa-stat-card">
      <div className={`sa-stat-icon ${tone}`}>
        <Icon size={21} />
      </div>

      <div className="sa-stat-content">
        <p className="sa-stat-title">{title}</p>
        <h3>{value}</h3>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}

function AttendanceAvatar({ name }) {
  return (
    <div className="sa-avatar">
      {getEmployeeInitials(name)}
    </div>
  );
}

export default function SuperAdminAttendance() {
  const [records, setRecords] = useState([]);
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
  });

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [detailRecord, setDetailRecord] = useState(null);

  const page = pagination.page;
  const totalPages = pagination.totalPages || 0;

  const fetchAttendance = useCallback(
    async ({ showLoader = true } = {}) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const params = {
          page,
          limit: PAGE_SIZE,
        };

        if (appliedFilters.from) {
          params.from = appliedFilters.from;
        }

        if (appliedFilters.to) {
          params.to = appliedFilters.to;
        }

        if (appliedFilters.reviewStatus) {
          params.reviewStatus = appliedFilters.reviewStatus;
        }

        if (appliedFilters.search.trim()) {
          params.search = appliedFilters.search.trim();
        }

        const response = await api.get("/attendance/admin/records", {
          params,
        });

        const payload = response?.data || {};

        if (payload.success === false) {
          throw new Error(payload.message || "Failed to load attendance.");
        }

        const fetchedRecords = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.records)
            ? payload.records
            : [];

        setRecords(fetchedRecords);

        setPagination((previous) => ({
          ...previous,
          ...(payload.pagination || {}),
          page: payload.pagination?.page ?? page,
          limit: payload.pagination?.limit ?? PAGE_SIZE,
          total: payload.pagination?.total ?? fetchedRecords.length,
          totalPages:
            payload.pagination?.totalPages ??
            Math.ceil(
              (payload.pagination?.total ?? fetchedRecords.length) / PAGE_SIZE
            ),
        }));

        if (payload.summary) {
          setSummary({
            total: Number(payload.summary.total) || 0,
            pending: Number(payload.summary.pending) || 0,
            approved: Number(payload.summary.approved) || 0,
            rejected: Number(payload.summary.rejected) || 0,
          });
        } else {
          setSummary({
            total: fetchedRecords.length,
            pending: fetchedRecords.filter(
              (item) => normalizeStatus(item.reviewStatus) === "PENDING"
            ).length,
            approved: fetchedRecords.filter(
              (item) => normalizeStatus(item.reviewStatus) === "APPROVED"
            ).length,
            rejected: fetchedRecords.filter(
              (item) => normalizeStatus(item.reviewStatus) === "REJECTED"
            ).length,
          });
        }
      } catch (fetchError) {
        console.error("SUPER ADMIN ATTENDANCE FETCH ERROR:", fetchError);
        setError(getErrorMessage(fetchError));
        setRecords([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, appliedFilters]
  );

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const visibleRecords = useMemo(() => records, [records]);

  const startItem =
    pagination.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const endItem = Math.min(page * PAGE_SIZE, pagination.total);

  const updateFilter = (field, value) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyFilters = (event) => {
    event.preventDefault();

    if (filters.from && filters.to && filters.from > filters.to) {
      setError("The start date cannot be after the end date.");
      return;
    }

    setError("");
    setAppliedFilters({ ...filters });
    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
    setAppliedFilters({ ...INITIAL_FILTERS });
    setError("");

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const openReview = (record, status) => {
    setSelectedRecord(record);
    setReviewStatus(status);
    setReviewNote("");
    setActionError("");
    setSuccessMessage("");
  };

  const closeReview = () => {
    if (reviewing) return;

    setSelectedRecord(null);
    setReviewNote("");
    setActionError("");
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!selectedRecord) return;

    const recordId = getRecordId(selectedRecord);

    if (!recordId) {
      setActionError("Attendance record ID is missing.");
      return;
    }

    if (!["APPROVED", "REJECTED"].includes(reviewStatus)) {
      setActionError("Select a valid review status.");
      return;
    }

    if (reviewStatus === "REJECTED" && !reviewNote.trim()) {
      setActionError("Please provide a reason for rejecting attendance.");
      return;
    }

    setReviewing(true);
    setActionError("");

    try {
      const response = await api.patch(
        `/attendance/admin/records/${encodeURIComponent(recordId)}/review`,
        {
          status: reviewStatus,
          note: reviewNote.trim(),
        }
      );

      const payload = response?.data || {};

      if (payload.success === false) {
        throw new Error(payload.message || "Review update failed.");
      }

      setSuccessMessage(
        `Attendance ${reviewStatus.toLowerCase()} successfully.`
      );

      setSelectedRecord(null);
      setReviewNote("");

      await fetchAttendance({ showLoader: false });
    } catch (reviewError) {
      console.error("ATTENDANCE REVIEW ERROR:", reviewError);
      setActionError(getErrorMessage(reviewError));
    } finally {
      setReviewing(false);
    }
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) {
      return;
    }

    setPagination((previous) => ({
      ...previous,
      page: nextPage,
    }));
  };

  return (
    <div className="sa-attendance-page">
      <style>{`
        .sa-attendance-page {
          --sa-primary: #6d28d9;
          --sa-primary-dark: #4c1d95;
          --sa-primary-light: #f3e8ff;
          --sa-border: #e9e3f2;
          --sa-text: #241b35;
          --sa-muted: #766b85;
          --sa-bg: #faf9fd;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 26px;
          color: var(--sa-text);
          background: var(--sa-bg);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .sa-attendance-page *,
        .sa-attendance-page *::before,
        .sa-attendance-page *::after {
          box-sizing: border-box;
        }

        .sa-attendance-page button,
        .sa-attendance-page input,
        .sa-attendance-page select,
        .sa-attendance-page textarea {
          font: inherit;
        }

        .sa-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 26px;
        }

        .sa-heading-group {
          min-width: 0;
        }

        .sa-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--sa-primary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 9px;
        }

        .sa-page-title {
          margin: 0;
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 800;
          letter-spacing: -1px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .sa-page-description {
          margin: 9px 0 0;
          color: var(--sa-muted);
          font-size: 14px;
          line-height: 1.7;
        }

        .sa-header-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }

        .sa-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 10px 15px;
          border: 1px solid var(--sa-border);
          border-radius: 11px;
          background: #fff;
          color: #453658;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: background .15s ease, border-color .15s ease;
        }

        .sa-button:hover:not(:disabled) {
          border-color: #c4b5fd;
          background: #faf5ff;
        }

        .sa-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .sa-button-primary {
          color: #fff;
          background: var(--sa-primary);
          border-color: var(--sa-primary);
        }

        .sa-button-primary:hover:not(:disabled) {
          background: var(--sa-primary-dark);
          border-color: var(--sa-primary-dark);
        }

        .sa-button-danger {
          color: #fff;
          background: #dc2626;
          border-color: #dc2626;
        }

        .sa-button-danger:hover:not(:disabled) {
          background: #b91c1c;
          border-color: #b91c1c;
        }

        .sa-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .sa-stat-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
          padding: 21px 18px;
          border: 1px solid var(--sa-border);
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(38, 19, 64, .025);
        }

        .sa-stat-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 13px;
        }

        .sa-tone-purple { color: #6d28d9; background: #f3e8ff; }
        .sa-tone-blue { color: #2563eb; background: #dbeafe; }
        .sa-tone-green { color: #15803d; background: #dcfce7; }
        .sa-tone-red { color: #dc2626; background: #fee2e2; }

        .sa-stat-content {
          min-width: 0;
        }

        .sa-stat-title {
          margin: 0 0 8px;
          color: var(--sa-muted);
          font-size: 12px;
          font-weight: 650;
        }

        .sa-stat-content h3 {
          margin: 0 0 5px;
          font-size: 27px;
          font-weight: 850;
          line-height: 1;
          letter-spacing: -.6px;
          overflow-wrap: anywhere;
        }

        .sa-stat-content > span {
          color: #978da4;
          font-size: 11px;
        }

        .sa-panel {
          min-width: 0;
          border: 1px solid var(--sa-border);
          border-radius: 17px;
          background: #fff;
          box-shadow: 0 4px 16px rgba(38, 19, 64, .025);
        }

        .sa-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 20px 22px;
          border-bottom: 1px solid #f0ebf5;
        }

        .sa-panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }

        .sa-panel-subtitle {
          margin: 6px 0 0;
          color: var(--sa-muted);
          font-size: 12px;
        }

        .sa-filter-form {
          display: grid;
          grid-template-columns: minmax(180px, 1.5fr) repeat(3, minmax(130px, 1fr)) auto;
          gap: 12px;
          align-items: end;
          padding: 20px 22px;
          border-bottom: 1px solid #f0ebf5;
        }

        .sa-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .sa-field label {
          color: #665a77;
          font-size: 11px;
          font-weight: 750;
        }

        .sa-input-wrap {
          position: relative;
          min-width: 0;
        }

        .sa-input-icon {
          position: absolute;
          top: 50%;
          left: 12px;
          color: #978ba8;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .sa-input,
        .sa-select,
        .sa-textarea {
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

        .sa-input.has-icon {
          padding-left: 37px;
        }

        .sa-input:focus,
        .sa-select:focus,
        .sa-textarea:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, .1);
        }

        .sa-filter-actions {
          display: flex;
          gap: 8px;
        }

        .sa-filter-actions .sa-button {
          min-height: 42px;
          padding: 10px 12px;
        }

        .sa-alert {
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

        .sa-success-alert {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .sa-table-wrap {
          width: 100%;
          overflow-x: auto;
          overscroll-behavior-x: contain;
        }

        .sa-table {
          width: 100%;
          min-width: 1050px;
          border-collapse: separate;
          border-spacing: 0;
          text-align: left;
        }

        .sa-table th {
          padding: 13px 16px;
          background: #fcfbfe;
          border-bottom: 1px solid #eee8f4;
          color: #887c98;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .7px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .sa-table td {
          padding: 16px;
          border-bottom: 1px solid #f1edf5;
          color: #51445f;
          font-size: 12px;
          vertical-align: middle;
        }

        .sa-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .sa-table tbody tr:hover {
          background: #fdfbff;
        }

        .sa-employee-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 190px;
        }

        .sa-avatar {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border: 1px solid #e9d5ff;
          border-radius: 12px;
          background: #f3e8ff;
          color: #6b21a8;
          font-size: 11px;
          font-weight: 850;
        }

        .sa-employee-name {
          color: #30223f;
          font-size: 12px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .sa-employee-meta {
          margin-top: 5px;
          color: #9589a3;
          font-size: 10px;
        }

        .sa-date-text {
          color: #41344e;
          font-weight: 700;
          white-space: nowrap;
        }

        .sa-time-value {
          color: #352747;
          font-weight: 750;
          white-space: nowrap;
        }

        .sa-time-label {
          margin-top: 5px;
          color: #a196af;
          font-size: 10px;
        }

        .sa-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .sa-status-pending { color: #a16207; background: #fef3c7; }
        .sa-status-approved { color: #15803d; background: #dcfce7; }
        .sa-status-rejected { color: #b91c1c; background: #fee2e2; }

        .sa-row-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sa-icon-button {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border: 1px solid #e8e0f0;
          border-radius: 9px;
          background: #fff;
          color: #78658f;
          cursor: pointer;
        }

        .sa-icon-button:hover:not(:disabled) {
          border-color: #c4b5fd;
          background: #f5f0ff;
          color: #6d28d9;
        }

        .sa-icon-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .sa-icon-button.sa-icon-approve {
          color: #15803d;
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .sa-icon-button.sa-icon-reject {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .sa-empty,
        .sa-loading {
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

        .sa-empty-icon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 17px;
          background: #f5f0fb;
          color: #8b5cf6;
        }

        .sa-empty strong {
          color: #4a3a5c;
          font-size: 14px;
        }

        .sa-empty p {
          max-width: 380px;
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
        }

        .sa-table-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 17px 22px;
          border-top: 1px solid #f0ebf5;
        }

        .sa-pagination-info {
          color: #8b8098;
          font-size: 11px;
        }

        .sa-pagination {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sa-page-number {
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

        .sa-page-number.active {
          border-color: var(--sa-primary);
          background: var(--sa-primary);
          color: #fff;
        }

        .sa-page-number:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .sa-modal-overlay {
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

        .sa-modal {
          width: 100%;
          max-width: 520px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border: 1px solid #eee5f7;
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(28, 13, 45, .25);
        }

        .sa-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding: 22px 24px;
          border-bottom: 1px solid #f0ebf5;
        }

        .sa-modal-header h3 {
          margin: 0;
          color: #30223f;
          font-size: 19px;
          font-weight: 850;
        }

        .sa-modal-header p {
          margin: 7px 0 0;
          color: #8b8098;
          font-size: 12px;
          line-height: 1.6;
        }

        .sa-modal-body {
          padding: 22px 24px;
        }

        .sa-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 20px;
        }

        .sa-detail-item {
          min-width: 0;
          padding: 13px;
          border: 1px solid #eee8f5;
          border-radius: 11px;
          background: #fdfcff;
        }

        .sa-detail-item span {
          display: block;
          margin-bottom: 7px;
          color: #8b8098;
          font-size: 10px;
          font-weight: 700;
        }

        .sa-detail-item strong {
          display: block;
          color: #3c2d4d;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .sa-textarea {
          min-height: 105px;
          resize: vertical;
          line-height: 1.6;
        }

        .sa-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 17px 24px;
          border-top: 1px solid #f0ebf5;
          background: #fdfcff;
        }

        .sa-review-notice {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-bottom: 18px;
          padding: 12px;
          border: 1px solid #e9d5ff;
          border-radius: 10px;
          background: #faf5ff;
          color: #6b21a8;
          font-size: 11px;
          line-height: 1.6;
        }

        .sa-mobile-hint {
          display: none;
          padding: 10px 16px;
          border-bottom: 1px solid #f0ebf5;
          color: #9488a2;
          font-size: 11px;
        }

        @media (max-width: 1250px) {
          .sa-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sa-filter-form {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sa-filter-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
        }

        @media (max-width: 760px) {
          .sa-attendance-page {
            padding: 16px 12px;
          }

          .sa-page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .sa-header-actions {
            justify-content: flex-start;
          }

          .sa-stats-grid {
            gap: 10px;
          }

          .sa-stat-card {
            gap: 10px;
            padding: 14px 11px;
            border-radius: 13px;
          }

          .sa-stat-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }

          .sa-stat-content h3 {
            font-size: 22px;
          }

          .sa-stat-title {
            font-size: 11px;
          }

          .sa-stat-content > span {
            font-size: 10px;
          }

          .sa-panel-header {
            align-items: flex-start;
            padding: 16px;
          }

          .sa-filter-form {
            grid-template-columns: minmax(0, 1fr);
            padding: 16px;
          }

          .sa-filter-actions {
            grid-column: auto;
          }

          .sa-mobile-hint {
            display: block;
          }

          .sa-table-footer {
            align-items: flex-start;
            flex-direction: column;
            padding: 16px;
          }

          .sa-pagination {
            flex-wrap: wrap;
          }

          .sa-modal-overlay {
            padding: 10px;
          }

          .sa-modal {
            max-height: calc(100vh - 20px);
            border-radius: 15px;
          }

          .sa-modal-header,
          .sa-modal-body {
            padding: 18px;
          }

          .sa-modal-footer {
            padding: 15px 18px;
          }
        }

        @media (max-width: 380px) {
          .sa-stats-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .sa-detail-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .sa-header-actions .sa-button {
            flex: 1;
          }
        }
      `}</style>

      <header className="sa-page-header">
        <div className="sa-heading-group">
          <div className="sa-eyebrow">
            <ShieldCheck size={15} />
            HRMSZermii / Workforce Management
          </div>

          <h1 className="sa-page-title">Attendance Management</h1>

          <p className="sa-page-description">
            Monitor employee check-ins, check-outs, working hours, and attendance
            review requests.
          </p>
        </div>

        <div className="sa-header-actions">
          <button
            type="button"
            className="sa-button"
            onClick={() => fetchAttendance({ showLoader: false })}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <LoaderCircle size={16} className="sa-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>

          <button
            type="button"
            className="sa-button sa-button-primary"
            onClick={() => downloadCsv(visibleRecords)}
            disabled={loading || visibleRecords.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </header>

      <section className="sa-stats-grid">
        <StatCard
          title="Attendance Records"
          value={summary.total}
          subtitle="Matching current filters"
          icon={Users}
          tone="sa-tone-purple"
        />

        <StatCard
          title="Awaiting Review"
          value={summary.pending}
          subtitle="Require Super Admin action"
          icon={Clock3}
          tone="sa-tone-blue"
        />

        <StatCard
          title="Approved"
          value={summary.approved}
          subtitle="Reviewed and approved"
          icon={CheckCircle2}
          tone="sa-tone-green"
        />

        <StatCard
          title="Rejected"
          value={summary.rejected}
          subtitle="Returned for correction"
          icon={XCircle}
          tone="sa-tone-red"
        />
      </section>

      <section className="sa-panel">
        <div className="sa-panel-header">
          <div>
            <h2 className="sa-panel-title">
              <ClipboardCheck size={19} color="#7c3aed" />
              Employee Attendance
            </h2>
            <p className="sa-panel-subtitle">
              Review records submitted by registered employees.
            </p>
          </div>

          <span className="sa-status sa-status-pending">
            <Activity size={13} />
            Live API data
          </span>
        </div>

        <form className="sa-filter-form" onSubmit={applyFilters}>
          <div className="sa-field">
            <label htmlFor="sa-search">Search employee</label>
            <div className="sa-input-wrap">
              <Search size={16} className="sa-input-icon" />
              <input
                id="sa-search"
                className="sa-input has-icon"
                placeholder="Name, employee code, branch"
                value={filters.search}
                onChange={(event) =>
                  updateFilter("search", event.target.value)
                }
              />
            </div>
          </div>

          <div className="sa-field">
            <label htmlFor="sa-from">From date</label>
            <div className="sa-input-wrap">
              <CalendarDays size={15} className="sa-input-icon" />
              <input
                id="sa-from"
                type="date"
                className="sa-input has-icon"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) =>
                  updateFilter("from", event.target.value)
                }
              />
            </div>
          </div>

          <div className="sa-field">
            <label htmlFor="sa-to">To date</label>
            <div className="sa-input-wrap">
              <CalendarDays size={15} className="sa-input-icon" />
              <input
                id="sa-to"
                type="date"
                className="sa-input has-icon"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) =>
                  updateFilter("to", event.target.value)
                }
              />
            </div>
          </div>

          <div className="sa-field">
            <label htmlFor="sa-review-status">Review status</label>
            <select
              id="sa-review-status"
              className="sa-select"
              value={filters.reviewStatus}
              onChange={(event) =>
                updateFilter("reviewStatus", event.target.value)
              }
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="sa-filter-actions">
            <button
              type="submit"
              className="sa-button sa-button-primary"
              disabled={loading}
            >
              <Filter size={15} />
              Apply
            </button>

            <button
              type="button"
              className="sa-button"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>
        </form>

        {error && (
          <div className="sa-alert" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="sa-alert sa-success-alert" role="status">
            <CheckCircle2 size={17} />
            <span>{successMessage}</span>
            <button
              type="button"
              className="sa-icon-button"
              aria-label="Dismiss success message"
              onClick={() => setSuccessMessage("")}
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="sa-mobile-hint">
          Scroll horizontally to see all attendance columns.
        </div>

        {loading ? (
          <div className="sa-loading">
            <LoaderCircle size={32} className="sa-spin" color="#7c3aed" />
            <strong>Loading attendance records...</strong>
            <span>Please wait while we fetch the data.</span>
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty-icon">
              <CalendarCheck size={26} />
            </div>
            <strong>No attendance records found</strong>
            <p>
              No records match your current filters. Try changing the dates or
              review status, or refresh the page.
            </p>
            <button
              type="button"
              className="sa-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Attendance date</th>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Working hours</th>
                  <th>Review status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleRecords.map((record) => {
                  const id = getRecordId(record);
                  const status = normalizeStatus(record.reviewStatus);

                  return (
                    <tr key={id || `${record.employeeCode}-${record.attendanceDate}`}>
                      <td>
                        <div className="sa-employee-cell">
                          <AttendanceAvatar name={record.employeeName} />

                          <div>
                            <div className="sa-employee-name">
                              {record.employeeName || "Unnamed employee"}
                            </div>
                            <div className="sa-employee-meta">
                              {record.employeeCode || "No employee code"}
                              {record.branch ? ` · ${record.branch}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="sa-date-text">
                          {formatDate(record.attendanceDate)}
                        </div>
                      </td>

                      <td>
                        <div className="sa-time-value">
                          {formatTime(record.checkInAt)}
                        </div>
                        <div className="sa-time-label">Check-in</div>
                      </td>

                      <td>
                        <div className="sa-time-value">
                          {formatTime(record.checkOutAt)}
                        </div>
                        <div className="sa-time-label">Check-out</div>
                      </td>

                      <td>
                        <div className="sa-time-value">
                          {formatDuration(record.workedMinutes)}
                        </div>
                      </td>

                      <td>
                        <StatusBadge status={status} />
                      </td>

                      <td>
                        <div className="sa-row-actions">
                          <button
                            type="button"
                            className="sa-icon-button"
                            title="View attendance details"
                            aria-label="View attendance details"
                            onClick={() => setDetailRecord(record)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="sa-icon-button sa-icon-approve"
                            title="Approve attendance"
                            aria-label="Approve attendance"
                            disabled={status === "APPROVED"}
                            onClick={() => openReview(record, "APPROVED")}
                          >
                            <Check size={15} />
                          </button>

                          <button
                            type="button"
                            className="sa-icon-button sa-icon-reject"
                            title="Reject attendance"
                            aria-label="Reject attendance"
                            disabled={status === "REJECTED"}
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
          <footer className="sa-table-footer">
            <div className="sa-pagination-info">
              Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
              <strong>{pagination.total}</strong> records
            </div>

            <div className="sa-pagination">
              <button
                type="button"
                className="sa-page-number"
                aria-label="Previous page"
                disabled={page <= 1 || loading}
                onClick={() => changePage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from(
                { length: Math.min(totalPages, 5) },
                (_, index) => {
                  let pageNumber;

                  if (totalPages <= 5) {
                    pageNumber = index + 1;
                  } else if (page <= 3) {
                    pageNumber = index + 1;
                  } else if (page >= totalPages - 2) {
                    pageNumber = totalPages - 4 + index;
                  } else {
                    pageNumber = page - 2 + index;
                  }

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`sa-page-number ${
                        page === pageNumber ? "active" : ""
                      }`}
                      aria-current={page === pageNumber ? "page" : undefined}
                      onClick={() => changePage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                }
              )}

              <button
                type="button"
                className="sa-page-number"
                aria-label="Next page"
                disabled={
                  loading ||
                  totalPages === 0 ||
                  page >= totalPages
                }
                onClick={() => changePage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* Attendance review modal */}
      {selectedRecord && (
        <div
          className="sa-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReview();
          }}
        >
          <section
            className="sa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sa-review-title"
          >
            <div className="sa-modal-header">
              <div>
                <h3 id="sa-review-title">Review attendance</h3>
                <p>
                  {selectedRecord.employeeName || "Employee"} ·{" "}
                  {formatDate(selectedRecord.attendanceDate)}
                </p>
              </div>

              <button
                type="button"
                className="sa-icon-button"
                aria-label="Close review dialog"
                onClick={closeReview}
                disabled={reviewing}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={submitReview}>
              <div className="sa-modal-body">
                <div className="sa-detail-grid">
                  <div className="sa-detail-item">
                    <span>Employee code</span>
                    <strong>{selectedRecord.employeeCode || "—"}</strong>
                  </div>

                  <div className="sa-detail-item">
                    <span>Branch</span>
                    <strong>{selectedRecord.branch || "—"}</strong>
                  </div>

                  <div className="sa-detail-item">
                    <span>Check in</span>
                    <strong>{formatTime(selectedRecord.checkInAt)}</strong>
                  </div>

                  <div className="sa-detail-item">
                    <span>Check out</span>
                    <strong>{formatTime(selectedRecord.checkOutAt)}</strong>
                  </div>
                </div>

                <div className="sa-field" style={{ marginBottom: 17 }}>
                  <label htmlFor="sa-review-decision">Review decision</label>

                  <select
                    id="sa-review-decision"
                    className="sa-select"
                    value={reviewStatus}
                    onChange={(event) => setReviewStatus(event.target.value)}
                    disabled={reviewing}
                  >
                    <option value="APPROVED">Approve attendance</option>
                    <option value="REJECTED">Reject attendance</option>
                  </select>
                </div>

                <div className="sa-field">
                  <label htmlFor="sa-review-note">
                    Review note
                    {reviewStatus === "REJECTED" ? " (required)" : " (optional)"}
                  </label>

                  <textarea
                    id="sa-review-note"
                    className="sa-textarea"
                    placeholder={
                      reviewStatus === "REJECTED"
                        ? "Explain why this attendance record is being rejected..."
                        : "Add an optional review note..."
                    }
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    maxLength={1000}
                    disabled={reviewing}
                  />
                </div>

                {actionError && (
                  <div className="sa-alert" style={{ margin: "15px 0 0" }}>
                    <AlertCircle size={16} />
                    <span>{actionError}</span>
                  </div>
                )}

                <div className="sa-review-notice" style={{ marginTop: 17, marginBottom: 0 }}>
                  <ShieldCheck size={17} />
                  <span>
                    Your review will be recorded against this attendance record.
                    Ensure the employee details and recorded times are correct.
                  </span>
                </div>
              </div>

              <div className="sa-modal-footer">
                <button
                  type="button"
                  className="sa-button"
                  onClick={closeReview}
                  disabled={reviewing}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`sa-button ${
                    reviewStatus === "REJECTED"
                      ? "sa-button-danger"
                      : "sa-button-primary"
                  }`}
                  disabled={reviewing}
                >
                  {reviewing ? (
                    <LoaderCircle size={16} className="sa-spin" />
                  ) : reviewStatus === "REJECTED" ? (
                    <XCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}

                  {reviewing
                    ? "Saving..."
                    : reviewStatus === "REJECTED"
                      ? "Reject attendance"
                      : "Approve attendance"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Attendance details modal */}
      {detailRecord && (
        <div
          className="sa-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDetailRecord(null);
            }
          }}
        >
          <section
            className="sa-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sa-detail-title"
          >
            <div className="sa-modal-header">
              <div>
                <h3 id="sa-detail-title">Attendance details</h3>
                <p>
                  {detailRecord.employeeName || "Employee"} ·{" "}
                  {formatDate(detailRecord.attendanceDate)}
                </p>
              </div>

              <button
                type="button"
                className="sa-icon-button"
                aria-label="Close attendance details"
                onClick={() => setDetailRecord(null)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="sa-modal-body">
              <div className="sa-detail-grid">
                <div className="sa-detail-item">
                  <span>Employee name</span>
                  <strong>{detailRecord.employeeName || "—"}</strong>
                </div>

                <div className="sa-detail-item">
                  <span>Employee code</span>
                  <strong>{detailRecord.employeeCode || "—"}</strong>
                </div>

                <div className="sa-detail-item">
                  <span>Branch</span>
                  <strong>{detailRecord.branch || "—"}</strong>
                </div>

                <div className="sa-detail-item">
                  <span>Attendance date</span>
                  <strong>{formatDate(detailRecord.attendanceDate)}</strong>
                </div>

                <div className="sa-detail-item">
                  <span>Check-in time</span>
                  <strong>{formatTime(detailRecord.checkInAt)}</strong>
                </div>

                <div className="sa-detail-item">
                  <span>Check-out time</span>
                  <strong>{formatTime(detailRecord.checkOutAt)}</strong>
                </div>

                <div className="sa-detail-item">
                  <span>Working duration</span>
                  <strong>{formatDuration(detailRecord.workedMinutes)}</strong>
                </div>

                <div className="sa-detail-item">
                  <span>Review status</span>
                  <strong>
                    <StatusBadge status={detailRecord.reviewStatus} />
                  </strong>
                </div>

                <div className="sa-detail-item">
                  <span>Reviewed at</span>
                  <strong>{formatTime(detailRecord.reviewedAt)}</strong>
                </div>

                <div className="sa-detail-item">
                  <span>Reviewed by</span>
                  <strong>
                    {detailRecord.reviewedBy?.name ||
                      detailRecord.reviewedBy?.email ||
                      "—"}
                  </strong>
                </div>
              </div>

              <div className="sa-field">
                <label>Review note</label>
                <div
                  className="sa-detail-item"
                  style={{ lineHeight: 1.7, fontSize: 12 }}
                >
                  {detailRecord.reviewNote || "No review note provided."}
                </div>
              </div>

              <p
                style={{
                  margin: "16px 0 0",
                  color: "#8b8098",
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                Selfie previews are not included here because the backend must
                provide a protected image endpoint before these private files can
                be displayed safely.
              </p>
            </div>

            <div className="sa-modal-footer">
              <button
                type="button"
                className="sa-button"
                onClick={() => setDetailRecord(null)}
              >
                Close
              </button>

              {normalizeStatus(detailRecord.reviewStatus) !== "APPROVED" && (
                <button
                  type="button"
                  className="sa-button sa-button-primary"
                  onClick={() => {
                    const record = detailRecord;
                    setDetailRecord(null);
                    openReview(record, "APPROVED");
                  }}
                >
                  <CheckCircle2 size={15} />
                  Review record
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
