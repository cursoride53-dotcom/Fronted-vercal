
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "../services/firebase";
import {
  Wallet,
  Users,
  IndianRupee,
  Clock3,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Plus,
  Eye,
  ShieldCheck,
  Banknote,
  CalendarDays,
  FileText,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  History,
  Calculator,
  CircleDollarSign,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const ENDPOINT = "/employee-advances";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const monthLabel = (value) => {
  if (!value) return "—";
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
};

const employeeIdOf = (item) => {
  const id = item?.employee?._id || item?.employee?.id || item?.employee;
  return typeof id === "object" ? id?._id || id?.id || "" : id || "";
};

const employeeNameOf = (item) =>
  item?.employeeName ||
  item?.employee?.name ||
  item?.employee?.fullName ||
  item?.name ||
  item?.fullName ||
  "Employee";

const employeeCodeOf = (item) =>
  item?.employeeCode ||
  item?.employee?.employeeCode ||
  item?.employee?.employeeId ||
  item?.employee?.code ||
  item?.code ||
  "—";

const unwrap = (result) =>
  result?.data?.advance ||
  result?.data?.request ||
  result?.data?.record ||
  result?.advance ||
  result?.request ||
  result?.data;

const unwrapList = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.data?.advances)) return result.data.advances;
  if (Array.isArray(result?.data?.results)) return result.data.results;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.advances)) return result.advances;
  if (Array.isArray(result?.employees)) return result.employees;
  if (Array.isArray(result?.data?.employees)) return result.data.employees;
  return [];
};

const statusClass = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "APPROVED":
    case "DISBURSED":
    case "REPAID":
      return "adv-status adv-green";
    case "PENDING":
    case "PARTIALLY_REPAID":
      return "adv-status adv-amber";
    case "REJECTED":
    case "CANCELLED":
      return "adv-status adv-red";
    default:
      return "adv-status adv-neutral";
  }
};

const downloadCsv = (rows, filename) => {
  const escape = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const EMPTY_FORM = {
  employeeId: "",
  amount: "",
  reason: "",
  repaymentMonths: "4",
};

export default function SuperAdminAdvances() {
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveForm, setApproveForm] = useState({
    approvedAmount: "",
    repaymentMonths: "4",
    repaymentStartMonth: new Date().toISOString().slice(0, 7),
    note: "",
  });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [disburseOpen, setDisburseOpen] = useState(false);
  const [disburseTarget, setDisburseTarget] = useState(null);
  const [disburseForm, setDisburseForm] = useState({
    disbursedAmount: "",
    paymentReference: "",
    note: "",
  });

  const apiRequest = useCallback(async (path, options = {}) => {
    if (!auth.currentUser) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const token = await auth.currentUser.getIdToken();

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(
        typeof result === "object"
          ? result.message || result.error || `Request failed (${response.status})`
          : result || `Request failed (${response.status})`
      );
    }

    return result;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [advanceResult, employeeResult] = await Promise.all([
        apiRequest(`${ENDPOINT}/admin?page=1&limit=100`),
        apiRequest("/payroll/admin/employees"),
      ]);

      setAdvances(unwrapList(advanceResult));
      setEmployees(unwrapList(employeeResult));
    } catch (err) {
      setError(err.message || "Unable to load advance payment data.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (message) => {
    setError("");
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 4000);
  };

  const filteredAdvances = useMemo(() => {
    const term = search.trim().toLowerCase();

    return advances.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        String(item.status || "").toUpperCase() === statusFilter;

      const matchesSearch =
        !term ||
        employeeNameOf(item).toLowerCase().includes(term) ||
        String(employeeCodeOf(item)).toLowerCase().includes(term) ||
        String(item.reason || "").toLowerCase().includes(term) ||
        String(item.paymentReference || "").toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [advances, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAdvances.length / pageSize));

  const pageItems = filteredAdvances.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    return advances.reduce(
      (result, item) => {
        const status = String(item.status || "").toUpperCase();
        result.requested += Number(item.requestedAmount) || 0;
        result.disbursed += Number(item.disbursedAmount) || 0;
        result.repaid += Number(item.totalRepaid) || 0;

        if (status === "PENDING") result.pending += 1;
        if (status === "APPROVED") result.approved += 1;
        if (status === "REJECTED") result.rejected += 1;

        return result;
      },
      {
        requested: 0,
        disbursed: 0,
        repaid: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [advances]);

  const createAdvance = async (event) => {
    event.preventDefault();

    if (!createForm.employeeId) {
      setError("Please select an employee.");
      return;
    }

    if (Number(createForm.amount) <= 0) {
      setError("Advance amount must be greater than zero.");
      return;
    }

    if (createForm.reason.trim().length < 5) {
      setError("Enter a reason with at least five characters.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiRequest(`${ENDPOINT}/admin`, {
        method: "POST",
        body: JSON.stringify({
          employeeId: createForm.employeeId,
          amount: Number(createForm.amount),
          reason: createForm.reason.trim(),
          repaymentMonths: Number(createForm.repaymentMonths),
        }),
      });

      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      showSuccess("Advance request created. It must be approved before payment.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to create advance.");
    } finally {
      setSaving(false);
    }
  };

  const openApprove = (item) => {
    setApproveTarget(item);
    setApproveForm({
      approvedAmount: String(item.requestedAmount ?? ""),
      repaymentMonths: String(item.repaymentMonths || 4),
      repaymentStartMonth: new Date().toISOString().slice(0, 7),
      note: "",
    });
    setApproveOpen(true);
    setError("");
  };

  const approveAdvance = async (event) => {
    event.preventDefault();

    if (!approveTarget) return;

    const amount = Number(approveForm.approvedAmount);
    const requestedAmount = Number(approveTarget.requestedAmount || 0);
    const months = Number(approveForm.repaymentMonths);

    if (!Number.isFinite(amount) || amount <= 0 || amount > requestedAmount) {
      setError("Approved amount must be positive and cannot exceed the requested amount.");
      return;
    }

    if (!Number.isInteger(months) || months < 1 || months > 60) {
      setError("Repayment duration must be between 1 and 60 months.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiRequest(`${ENDPOINT}/admin/${approveTarget._id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          approvedAmount: amount,
          repaymentMonths: months,
          repaymentStartMonth: approveForm.repaymentStartMonth,
          note: approveForm.note.trim(),
        }),
      });

      setApproveOpen(false);
      setApproveTarget(null);
      showSuccess("Advance approved successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to approve advance.");
    } finally {
      setSaving(false);
    }
  };

  const openReject = (item) => {
    setRejectTarget(item);
    setRejectReason("");
    setRejectOpen(true);
    setError("");
  };

  const rejectAdvance = async (event) => {
    event.preventDefault();

    if (!rejectTarget || rejectReason.trim().length < 3) {
      setError("Please enter a rejection reason.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiRequest(`${ENDPOINT}/admin/${rejectTarget._id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      setRejectOpen(false);
      setRejectTarget(null);
      showSuccess("Advance request rejected.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to reject advance.");
    } finally {
      setSaving(false);
    }
  };

  const openDisburse = (item) => {
    setDisburseTarget(item);
    setDisburseForm({
      disbursedAmount: String(item.approvedAmount ?? ""),
      paymentReference: "",
      note: "",
    });
    setDisburseOpen(true);
    setError("");
  };

  const disburseAdvance = async (event) => {
    event.preventDefault();

    if (!disburseTarget) return;

    const amount = Number(disburseForm.disbursedAmount);
    const approvedAmount = Number(disburseTarget.approvedAmount || 0);

    if (!Number.isFinite(amount) || amount <= 0 || amount > approvedAmount) {
      setError("Disbursed amount must be positive and cannot exceed the approved amount.");
      return;
    }

    if (!disburseForm.paymentReference.trim()) {
      setError("Enter the bank transaction reference.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiRequest(`${ENDPOINT}/admin/${disburseTarget._id}/disburse`, {
        method: "PATCH",
        body: JSON.stringify({
          disbursedAmount: amount,
          paymentReference: disburseForm.paymentReference.trim(),
          note: disburseForm.note.trim(),
        }),
      });

      setDisburseOpen(false);
      setDisburseTarget(null);
      showSuccess("Advance disbursement recorded successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to record disbursement.");
    } finally {
      setSaving(false);
    }
  };

  const viewDetails = async (item) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedAdvance(item);
    setError("");

    try {
      const result = await apiRequest(`${ENDPOINT}/admin/${item._id}`);
      const record = unwrap(result);
      if (record && typeof record === "object") setSelectedAdvance(record);
    } catch (err) {
      setError(err.message || "Unable to load advance details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        "Employee",
        "Employee Code",
        "Requested Amount",
        "Approved Amount",
        "Disbursed Amount",
        "Total Repaid",
        "Outstanding",
        "Repayment Months",
        "Status",
        "Reason",
        "Payment Reference",
        "Requested Date",
      ],
      ...filteredAdvances.map((item) => [
        employeeNameOf(item),
        employeeCodeOf(item),
        item.requestedAmount,
        item.approvedAmount,
        item.disbursedAmount,
        item.totalRepaid,
        Math.max(
          0,
          Number(item.disbursedAmount || 0) - Number(item.totalRepaid || 0)
        ),
        item.repaymentMonths,
        item.status,
        item.reason,
        item.paymentReference,
        formatDate(item.requestedAt || item.createdAt),
      ]),
    ];

    downloadCsv(rows, "hrms-employee-advances.csv");
  };

  const closeAllModals = () => {
    if (saving) return;
    setCreateOpen(false);
    setApproveOpen(false);
    setRejectOpen(false);
    setDisburseOpen(false);
    setDetailsOpen(false);
  };

  const employeeOutstanding = (item) =>
    Math.max(
      0,
      Number(item.disbursedAmount || 0) - Number(item.totalRepaid || 0)
    );

  return (
    <div className="adv-page">
      <style>{`
        .adv-page {
          --purple: #6d28d9;
          --purple-dark: #4c1d95;
          --purple-soft: #f3e8ff;
          --text: #251b35;
          --muted: #786d8b;
          --border: #e9e2f4;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding: 24px;
          color: var(--text);
          background: #faf9fc;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow-x: hidden;
        }
        .adv-page *, .adv-page *::before, .adv-page *::after { box-sizing: border-box; }
        .adv-page button, .adv-page input, .adv-page select, .adv-page textarea { font: inherit; }
        .adv-page button { cursor: pointer; }
        .adv-header { display:flex; justify-content:space-between; align-items:flex-start; gap:18px; flex-wrap:wrap; margin-bottom:22px; }
        .adv-eyebrow { color:var(--purple); font-size:11px; letter-spacing:1.4px; font-weight:850; text-transform:uppercase; margin:0 0 8px; }
        .adv-title { font-size:clamp(24px,3vw,32px); font-weight:850; letter-spacing:-.7px; line-height:1.2; margin:0; }
        .adv-subtitle { font-size:13px; line-height:1.7; color:var(--muted); margin:8px 0 0; max-width:700px; }
        .adv-header-actions { display:flex; flex-wrap:wrap; gap:9px; }
        .adv-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:39px; padding:9px 13px; border:1px solid var(--border); border-radius:10px; background:white; color:var(--text); font-size:12px; font-weight:750; }
        .adv-btn:hover:not(:disabled) { background:#faf5ff; border-color:#c4b5fd; }
        .adv-btn:disabled { opacity:.55; cursor:not-allowed; }
        .adv-btn-primary { background:var(--purple); color:white; border-color:var(--purple); }
        .adv-btn-primary:hover:not(:disabled) { background:var(--purple-dark); color:white; border-color:var(--purple-dark); }
        .adv-btn-danger { color:#b91c1c; border-color:#fecaca; }
        .adv-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:13px; margin-bottom:21px; }
        .adv-stat { min-width:0; padding:17px; border:1px solid var(--border); border-radius:15px; background:white; }
        .adv-stat-top { display:flex; justify-content:space-between; align-items:center; gap:9px; margin-bottom:17px; }
        .adv-stat-label { color:var(--muted); font-size:11px; font-weight:750; }
        .adv-stat-icon { display:grid; place-items:center; width:34px; height:34px; color:var(--purple); background:var(--purple-soft); border-radius:10px; flex-shrink:0; }
        .adv-stat-value { font-size:clamp(17px,2vw,23px); font-weight:850; overflow-wrap:anywhere; letter-spacing:-.4px; }
        .adv-stat-foot { margin-top:6px; color:var(--muted); font-size:10px; }
        .adv-panel { min-width:0; overflow:hidden; border:1px solid var(--border); border-radius:15px; background:white; }
        .adv-panel-head { padding:17px 18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:13px; border-bottom:1px solid #f0ebf5; }
        .adv-panel-title { margin:0; font-size:15px; font-weight:850; }
        .adv-panel-desc { margin:5px 0 0; color:var(--muted); font-size:11px; line-height:1.6; }
        .adv-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:9px; }
        .adv-search-wrap { position:relative; min-width:200px; }
        .adv-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9b91a9; pointer-events:none; }
        .adv-input, .adv-select, .adv-textarea { display:block; width:100%; min-width:0; min-height:40px; padding:10px 12px; border:1px solid #e3dbea; border-radius:9px; background:white; color:var(--text); outline:none; font-size:12px; }
        .adv-search { padding-left:34px; }
        .adv-input:focus, .adv-select:focus, .adv-textarea:focus { border-color:#a78bfa; box-shadow:0 0 0 3px #7c3aed12; }
        .adv-label { display:block; margin:0 0 6px; color:#625571; font-size:11px; font-weight:750; }
        .adv-table-wrap { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .adv-table { width:100%; border-collapse:collapse; text-align:left; font-size:12px; white-space:nowrap; }
        .adv-table th { padding:13px 14px; background:#faf8fc; color:#82768f; border-bottom:1px solid #eee8f4; text-transform:uppercase; letter-spacing:.5px; font-size:10px; font-weight:850; }
        .adv-table td { padding:13px 14px; border-bottom:1px solid #f1edf5; vertical-align:middle; }
        .adv-table tbody tr:last-child td { border-bottom:0; }
        .adv-table tbody tr:hover { background:#fdfbff; }
        .adv-person { display:flex; align-items:center; gap:10px; min-width:175px; }
        .adv-avatar { width:35px; height:35px; flex-shrink:0; display:grid; place-items:center; border-radius:10px; background:var(--purple-soft); color:var(--purple); font-size:12px; font-weight:850; }
        .adv-person-name { font-size:12px; font-weight:800; }
        .adv-person-code { margin-top:4px; color:var(--muted); font-size:10px; }
        .adv-amount { font-weight:800; font-variant-numeric:tabular-nums; }
        .adv-status { display:inline-flex; align-items:center; justify-content:center; border-radius:30px; padding:5px 9px; font-size:10px; font-weight:850; text-transform:uppercase; letter-spacing:.2px; }
        .adv-green { color:#047857; background:#d1fae5; }
        .adv-amber { color:#92400e; background:#fef3c7; }
        .adv-red { color:#b91c1c; background:#fee2e2; }
        .adv-neutral { color:#5b5268; background:#f1edf5; }
        .adv-actions { display:flex; align-items:center; gap:5px; }
        .adv-icon-btn { width:32px; height:32px; display:inline-grid; place-items:center; border:1px solid #e9e2f0; border-radius:9px; color:#6d5b80; background:white; }
        .adv-icon-btn:hover:not(:disabled) { color:var(--purple); border-color:#c4b5fd; background:#faf5ff; }
        .adv-icon-btn:disabled { opacity:.5; cursor:not-allowed; }
        .adv-alert { display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-radius:10px; margin-bottom:15px; font-size:12px; line-height:1.6; overflow-wrap:anywhere; }
        .adv-error { color:#991b1b; background:#fef2f2; border:1px solid #fecaca; }
        .adv-success { color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; }
        .adv-empty { text-align:center; padding:45px 20px; color:var(--muted); }
        .adv-empty-icon { width:50px; height:50px; margin:0 auto 12px; display:grid; place-items:center; background:var(--purple-soft); color:var(--purple); border-radius:15px; }
        .adv-empty-title { color:var(--text); font-size:14px; font-weight:850; }
        .adv-empty-text { max-width:420px; margin:7px auto 0; font-size:12px; line-height:1.7; }
        .adv-pagination { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:14px 18px; border-top:1px solid #f0ebf5; }
        .adv-muted { color:var(--muted); font-size:11px; }
        .adv-pager { display:flex; align-items:center; gap:7px; }
        .adv-modal-backdrop { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; padding:18px; background:rgba(28,18,40,.52); overflow-y:auto; }
        .adv-modal { width:100%; max-width:650px; max-height:calc(100vh - 36px); overflow-y:auto; border:1px solid #eee5f7; border-radius:17px; background:white; box-shadow:0 20px 80px #140a233d; }
        .adv-modal-wide { max-width:850px; }
        .adv-modal-head { position:sticky; top:0; z-index:2; display:flex; align-items:flex-start; justify-content:space-between; gap:14px; padding:18px 21px; background:white; border-bottom:1px solid #eee8f4; }
        .adv-modal-title { margin:0; font-size:17px; font-weight:850; }
        .adv-modal-subtitle { margin:6px 0 0; color:var(--muted); font-size:11px; line-height:1.6; }
        .adv-modal-body { padding:21px; }
        .adv-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; }
        .adv-field { min-width:0; }
        .adv-full { grid-column:1/-1; }
        .adv-section { grid-column:1/-1; margin:5px 0 -4px; padding-bottom:9px; border-bottom:1px solid #eee8f4; color:var(--purple-dark); font-size:11px; font-weight:850; text-transform:uppercase; letter-spacing:.7px; }
        .adv-preview { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:14px; border:1px solid #ddd0f7; border-radius:12px; background:#faf5ff; }
        .adv-preview-label { color:var(--muted); font-size:10px; }
        .adv-preview-value { margin-top:5px; color:var(--purple-dark); font-size:20px; font-weight:850; }
        .adv-info { padding:12px 14px; border-radius:10px; background:#faf5ff; color:#5b21b6; font-size:11px; line-height:1.7; overflow-wrap:anywhere; }
        .adv-modal-foot { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:9px; padding:15px 21px; border-top:1px solid #eee8f4; background:#fdfcff; }
        .adv-details-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
        .adv-detail-card { min-width:0; padding:12px; border:1px solid #eee7f5; border-radius:10px; }
        .adv-detail-label { color:var(--muted); font-size:10px; }
        .adv-detail-value { margin-top:6px; font-size:13px; font-weight:850; overflow-wrap:anywhere; }
        .adv-detail-heading { margin:20px 0 10px; font-size:12px; font-weight:850; }
        .adv-detail-row { display:flex; justify-content:space-between; gap:15px; padding:10px 0; border-bottom:1px solid #f0ebf5; font-size:11px; }
        .adv-detail-row span:first-child { color:var(--muted); }
        .adv-detail-row span:last-child { text-align:right; font-weight:750; overflow-wrap:anywhere; }
        .adv-history-item { padding:12px 0; border-bottom:1px solid #f0ebf5; }
        .adv-history-title { font-size:11px; font-weight:850; }
        .adv-history-note { margin-top:4px; color:var(--muted); font-size:11px; line-height:1.6; overflow-wrap:anywhere; }
        .adv-history-date { margin-top:5px; color:#9589a3; font-size:10px; }
        .adv-spinner { width:16px; height:16px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:adv-spin .7s linear infinite; }
        @keyframes adv-spin { to { transform:rotate(360deg); } }
        @media(max-width:1050px) { .adv-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:700px) {
          .adv-page { padding:14px; }
          .adv-header-actions { width:100%; }
          .adv-header-actions > * { flex:1; }
          .adv-stats { gap:9px; }
          .adv-stat { padding:13px; }
          .adv-stat-value { font-size:18px; }
          .adv-panel-head, .adv-toolbar { width:100%; }
          .adv-toolbar > * { flex:1; }
          .adv-search-wrap { min-width:100%; }
          .adv-form-grid { grid-template-columns:minmax(0,1fr); }
          .adv-full, .adv-section { grid-column:auto; }
          .adv-modal-body { padding:15px; }
          .adv-modal-head { padding:15px; }
          .adv-modal-foot { padding:13px 15px; }
          .adv-details-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media(max-width:390px) {
          .adv-stats, .adv-details-grid { grid-template-columns:minmax(0,1fr); }
        }
        @media(prefers-reduced-motion:reduce) {
          .adv-page *, .adv-page *::before, .adv-page *::after { animation-duration:.01ms!important; transition-duration:.01ms!important; }
        }
      `}</style>

      <header className="adv-header">
        <div>
          <p className="adv-eyebrow">HRMSZermii · Super Admin</p>
          <h1 className="adv-title">Employee Advance Payments</h1>
          <p className="adv-subtitle">
            Review employee requests, create advances, approve or reject
            requests, and record payments and repayments.
          </p>
        </div>

        <div className="adv-header-actions">
          <button
            className="adv-btn"
            type="button"
            onClick={loadData}
            disabled={loading || saving}
          >
            {loading ? <span className="adv-spinner" /> : <RefreshCw size={15} />}
            Refresh
          </button>
          <button
            className="adv-btn adv-btn-primary"
            type="button"
            onClick={() => {
              setCreateForm(EMPTY_FORM);
              setCreateOpen(true);
              setError("");
            }}
          >
            <Plus size={15} /> Create Advance
          </button>
        </div>
      </header>

      {error && (
        <div className="adv-alert adv-error" role="alert">
          <AlertCircle size={17} />
          <div>{error}</div>
          <button
            type="button"
            className="adv-icon-btn"
            style={{ marginLeft: "auto", flexShrink: 0 }}
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {success && (
        <div className="adv-alert adv-success" role="status">
          <CheckCircle2 size={17} />
          <div>{success}</div>
        </div>
      )}

      <div className="adv-stats">
        <div className="adv-stat">
          <div className="adv-stat-top">
            <span className="adv-stat-label">Total Requested</span>
            <span className="adv-stat-icon"><Wallet size={17} /></span>
          </div>
          <div className="adv-stat-value">{money(stats.requested)}</div>
          <div className="adv-stat-foot">{advances.length} records loaded</div>
        </div>

        <div className="adv-stat">
          <div className="adv-stat-top">
            <span className="adv-stat-label">Total Disbursed</span>
            <span className="adv-stat-icon"><ArrowUpRight size={17} /></span>
          </div>
          <div className="adv-stat-value">{money(stats.disbursed)}</div>
          <div className="adv-stat-foot">Recorded payments</div>
        </div>

        <div className="adv-stat">
          <div className="adv-stat-top">
            <span className="adv-stat-label">Total Repaid</span>
            <span className="adv-stat-icon"><ArrowDownRight size={17} /></span>
          </div>
          <div className="adv-stat-value">{money(stats.repaid)}</div>
          <div className="adv-stat-foot">Recorded payroll repayments</div>
        </div>

        <div className="adv-stat">
          <div className="adv-stat-top">
            <span className="adv-stat-label">Pending Requests</span>
            <span className="adv-stat-icon"><Clock3 size={17} /></span>
          </div>
          <div className="adv-stat-value">{stats.pending}</div>
          <div className="adv-stat-foot">
            {stats.approved} approved · {stats.rejected} rejected
          </div>
        </div>
      </div>

      <section className="adv-panel">
        <div className="adv-panel-head">
          <div>
            <h2 className="adv-panel-title">Advance Request Register</h2>
            <p className="adv-panel-desc">
              Review requests and manage approval and disbursement status.
            </p>
          </div>

          <div className="adv-toolbar">
            <div className="adv-search-wrap">
              <Search size={15} className="adv-search-icon" />
              <input
                className="adv-input adv-search"
                placeholder="Search employee, reason..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search advance requests"
              />
            </div>

            <select
              className="adv-select"
              style={{ width: "auto", minWidth: 125 }}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DISBURSED">Disbursed</option>
              <option value="PARTIALLY_REPAID">Partially repaid</option>
              <option value="REPAID">Repaid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button
              className="adv-btn"
              type="button"
              onClick={exportCsv}
              disabled={!filteredAdvances.length}
            >
              <FileText size={14} /> Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="adv-empty">
            <span className="adv-spinner" />
            <p>Loading advance requests...</p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="adv-empty">
            <div className="adv-empty-icon"><Wallet size={23} /></div>
            <div className="adv-empty-title">No advance requests found</div>
            <p className="adv-empty-text">
              No requests match your current search or status filter.
              Create an advance for an employee or refresh the records.
            </p>
          </div>
        ) : (
          <>
            <div className="adv-table-wrap">
              <table className="adv-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Requested</th>
                    <th>Approved</th>
                    <th>Disbursed</th>
                    <th>Outstanding</th>
                    <th>Repayment Plan</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, index) => {
                    const status = String(item.status || "").toUpperCase();

                    return (
                      <tr key={item._id || item.id || index}>
                        <td>
                          <div className="adv-person">
                            <div className="adv-avatar">
                              {employeeNameOf(item)
                                .split(/\s+/)
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((word) => word[0])
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="adv-person-name">
                                {employeeNameOf(item)}
                              </div>
                              <div className="adv-person-code">
                                {employeeCodeOf(item)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="adv-amount">{money(item.requestedAmount)}</td>
                        <td className="adv-amount">
                          {item.approvedAmount == null ? "—" : money(item.approvedAmount)}
                        </td>
                        <td className="adv-amount">{money(item.disbursedAmount)}</td>
                        <td className="adv-amount">{money(employeeOutstanding(item))}</td>
                        <td>
                          <div>{item.repaymentMonths || 1} month(s)</div>
                          <div className="adv-muted" style={{ marginTop: 4 }}>
                            {item.repaymentStartMonth
                              ? `From ${monthLabel(item.repaymentStartMonth)}`
                              : "Start month not set"}
                          </div>
                        </td>
                        <td><span className={statusClass(status)}>{status || "UNKNOWN"}</span></td>
                        <td>
                          <div className="adv-actions">
                            <button
                              className="adv-icon-btn"
                              type="button"
                              title="View details and history"
                              aria-label="View advance details"
                              onClick={() => viewDetails(item)}
                            >
                              <Eye size={15} />
                            </button>

                            {status === "PENDING" && (
                              <>
                                <button
                                  className="adv-icon-btn"
                                  type="button"
                                  title="Approve request"
                                  aria-label="Approve request"
                                  onClick={() => openApprove(item)}
                                >
                                  <CheckCircle2 size={15} />
                                </button>
                                <button
                                  className="adv-icon-btn"
                                  type="button"
                                  title="Reject request"
                                  aria-label="Reject request"
                                  onClick={() => openReject(item)}
                                >
                                  <XCircle size={15} />
                                </button>
                              </>
                            )}

                            {status === "APPROVED" && (
                              <button
                                className="adv-icon-btn"
                                type="button"
                                title="Record disbursement"
                                aria-label="Record disbursement"
                                onClick={() => openDisburse(item)}
                              >
                                <Banknote size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="adv-pagination">
              <span className="adv-muted">
                Showing {Math.min((page - 1) * pageSize + 1, filteredAdvances.length)}
                {"–"}
                {Math.min(page * pageSize, filteredAdvances.length)} of{" "}
                {filteredAdvances.length} records
              </span>
              <div className="adv-pager">
                <button
                  className="adv-icon-btn"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="adv-muted">Page {page} of {totalPages}</span>
                <button
                  className="adv-icon-btn"
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Create advance */}
      {createOpen && (
        <div className="adv-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setCreateOpen(false);
        }}>
          <form className="adv-modal" onSubmit={createAdvance}>
            <div className="adv-modal-head">
              <div>
                <h2 className="adv-modal-title">Create Employee Advance</h2>
                <p className="adv-modal-subtitle">
                  Select an employee and create an advance request. Approval and disbursement are separate steps.
                </p>
              </div>
              <button className="adv-icon-btn" type="button" onClick={() => setCreateOpen(false)} disabled={saving} aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <div className="adv-modal-body">
              <div className="adv-form-grid">
                <div className="adv-field adv-full">
                  <label className="adv-label">Select Employee *</label>
                  <select
                    className="adv-select"
                    value={createForm.employeeId}
                    onChange={(event) => setCreateForm((form) => ({
                      ...form,
                      employeeId: event.target.value,
                    }))}
                    required
                  >
                    <option value="">Choose an employee</option>
                    {employees.map((employee, index) => {
                      const id = employee._id || employee.id;
                      return (
                        <option key={id || index} value={id}>
                          {employee.name || employee.fullName || employee.firstName || "Employee"}
                          {" — "}
                          {employee.employeeCode || employee.employeeId || employee.code || id}
                        </option>
                      );
                    })}
                  </select>
                  {employees.length === 0 && (
                    <p className="adv-muted">
                      No employees were returned by the employee API.
                    </p>
                  )}
                </div>

                <div className="adv-field">
                  <label className="adv-label">Advance Amount (₹) *</label>
                  <input
                    className="adv-input"
                    type="number"
                    min="1"
                    max="100000000"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(event) => setCreateForm((form) => ({
                      ...form,
                      amount: event.target.value,
                    }))}
                    required
                  />
                </div>

                <div className="adv-field">
                  <label className="adv-label">Repayment Period *</label>
                  <select
                    className="adv-select"
                    value={createForm.repaymentMonths}
                    onChange={(event) => setCreateForm((form) => ({
                      ...form,
                      repaymentMonths: event.target.value,
                    }))}
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                      <option key={month} value={month}>
                        {month} month{month > 1 ? "s" : ""}
                      </option>
                    ))}
                    <option value="18">18 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                    <option value="48">48 months</option>
                    <option value="60">60 months</option>
                  </select>
                </div>

                <div className="adv-field adv-full">
                  <label className="adv-label">Reason for Advance *</label>
                  <textarea
                    className="adv-textarea"
                    rows={4}
                    minLength={5}
                    maxLength={2000}
                    value={createForm.reason}
                    onChange={(event) => setCreateForm((form) => ({
                      ...form,
                      reason: event.target.value,
                    }))}
                    placeholder="Explain why this advance is required..."
                    required
                  />
                </div>

                <div className="adv-field adv-full">
                  <div className="adv-preview">
                    <div>
                      <div className="adv-preview-label">Indicative monthly installment</div>
                      <div className="adv-preview-value">
                        {money(Number(createForm.amount || 0) / Math.max(1, Number(createForm.repaymentMonths || 1)))}
                      </div>
                    </div>
                    <Calculator size={26} color="#6d28d9" />
                  </div>
                </div>

                <div className="adv-field adv-full">
                  <div className="adv-info">
                    This creates a PENDING advance record. The employee will not be marked paid until a Super Admin approves the request and records the actual disbursement.
                  </div>
                </div>
              </div>
            </div>

            <div className="adv-modal-foot">
              <button className="adv-btn" type="button" onClick={() => setCreateOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button className="adv-btn adv-btn-primary" type="submit" disabled={saving || !employees.length}>
                {saving ? <span className="adv-spinner" /> : <Plus size={15} />}
                Create Advance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Approve advance */}
      {approveOpen && approveTarget && (
        <div className="adv-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setApproveOpen(false);
        }}>
          <form className="adv-modal" onSubmit={approveAdvance}>
            <div className="adv-modal-head">
              <div>
                <h2 className="adv-modal-title">Approve Advance</h2>
                <p className="adv-modal-subtitle">
                  {employeeNameOf(approveTarget)} · Requested {money(approveTarget.requestedAmount)}
                </p>
              </div>
              <button className="adv-icon-btn" type="button" onClick={() => setApproveOpen(false)} disabled={saving} aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <div className="adv-modal-body">
              <div className="adv-form-grid">
                <div className="adv-field">
                  <label className="adv-label">Approved Amount (₹) *</label>
                  <input
                    className="adv-input"
                    type="number"
                    min="1"
                    max={approveTarget.requestedAmount}
                    step="0.01"
                    value={approveForm.approvedAmount}
                    onChange={(event) => setApproveForm((form) => ({
                      ...form,
                      approvedAmount: event.target.value,
                    }))}
                    required
                  />
                </div>

                <div className="adv-field">
                  <label className="adv-label">Repayment Months *</label>
                  <input
                    className="adv-input"
                    type="number"
                    min="1"
                    max="60"
                    value={approveForm.repaymentMonths}
                    onChange={(event) => setApproveForm((form) => ({
                      ...form,
                      repaymentMonths: event.target.value,
                    }))}
                    required
                  />
                </div>

                <div className="adv-field">
                  <label className="adv-label">Repayment Start Month *</label>
                  <input
                    className="adv-input"
                    type="month"
                    value={approveForm.repaymentStartMonth}
                    onChange={(event) => setApproveForm((form) => ({
                      ...form,
                      repaymentStartMonth: event.target.value,
                    }))}
                    required
                  />
                </div>

                <div className="adv-field">
                  <label className="adv-label">Estimated Installment</label>
                  <div className="adv-input" style={{ background: "#faf5ff", fontWeight: 850 }}>
                    {money(Number(approveForm.approvedAmount || 0) / Math.max(1, Number(approveForm.repaymentMonths || 1)))}
                  </div>
                </div>

                <div className="adv-field adv-full">
                  <label className="adv-label">Approval Note</label>
                  <textarea
                    className="adv-textarea"
                    rows={3}
                    maxLength={1000}
                    value={approveForm.note}
                    onChange={(event) => setApproveForm((form) => ({
                      ...form,
                      note: event.target.value,
                    }))}
                    placeholder="Optional note..."
                  />
                </div>

                <div className="adv-field adv-full">
                  <div className="adv-info">
                    Approval authorizes the advance but does not record a bank payment. Use the disbursement action after the transfer has actually been made.
                  </div>
                </div>
              </div>
            </div>

            <div className="adv-modal-foot">
              <button className="adv-btn" type="button" onClick={() => setApproveOpen(false)} disabled={saving}>Cancel</button>
              <button className="adv-btn adv-btn-primary" type="submit" disabled={saving}>
                {saving ? <span className="adv-spinner" /> : <ShieldCheck size={15} />}
                Approve Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject advance */}
      {rejectOpen && rejectTarget && (
        <div className="adv-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setRejectOpen(false);
        }}>
          <form className="adv-modal" onSubmit={rejectAdvance}>
            <div className="adv-modal-head">
              <div>
                <h2 className="adv-modal-title">Reject Advance Request</h2>
                <p className="adv-modal-subtitle">
                  {employeeNameOf(rejectTarget)} · {money(rejectTarget.requestedAmount)}
                </p>
              </div>
              <button className="adv-icon-btn" type="button" onClick={() => setRejectOpen(false)} disabled={saving} aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <div className="adv-modal-body">
              <label className="adv-label">Reason for Rejection *</label>
              <textarea
                className="adv-textarea"
                rows={4}
                minLength={3}
                maxLength={1000}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Explain why this request is rejected..."
                required
              />
              <div className="adv-info" style={{ marginTop: 14 }}>
                The rejection reason is saved in the advance history.
              </div>
            </div>

            <div className="adv-modal-foot">
              <button className="adv-btn" type="button" onClick={() => setRejectOpen(false)} disabled={saving}>Cancel</button>
              <button className="adv-btn adv-btn-danger" type="submit" disabled={saving}>
                {saving ? <span className="adv-spinner" /> : <XCircle size={15} />}
                Reject Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disburse advance */}
      {disburseOpen && disburseTarget && (
        <div className="adv-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setDisburseOpen(false);
        }}>
          <form className="adv-modal" onSubmit={disburseAdvance}>
            <div className="adv-modal-head">
              <div>
                <h2 className="adv-modal-title">Record Advance Payment</h2>
                <p className="adv-modal-subtitle">{employeeNameOf(disburseTarget)}</p>
              </div>
              <button className="adv-icon-btn" type="button" onClick={() => setDisburseOpen(false)} disabled={saving} aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <div className="adv-modal-body">
              <div className="adv-preview" style={{ marginBottom: 18 }}>
                <div>
                  <div className="adv-preview-label">Approved Amount</div>
                  <div className="adv-preview-value">{money(disburseTarget.approvedAmount)}</div>
                </div>
                <Banknote size={26} color="#6d28d9" />
              </div>

              <div className="adv-form-grid">
                <div className="adv-field adv-full">
                  <label className="adv-label">Actual Amount Disbursed (₹) *</label>
                  <input
                    className="adv-input"
                    type="number"
                    min="0.01"
                    max={disburseTarget.approvedAmount}
                    step="0.01"
                    value={disburseForm.disbursedAmount}
                    onChange={(event) => setDisburseForm((form) => ({
                      ...form,
                      disbursedAmount: event.target.value,
                    }))}
                    required
                  />
                </div>

                <div className="adv-field adv-full">
                  <label className="adv-label">Bank Transaction Reference / UTR *</label>
                  <input
                    className="adv-input"
                    value={disburseForm.paymentReference}
                    onChange={(event) => setDisburseForm((form) => ({
                      ...form,
                      paymentReference: event.target.value,
                    }))}
                    maxLength={200}
                    placeholder="Enter bank transaction ID"
                    required
                  />
                </div>

                <div className="adv-field adv-full">
                  <label className="adv-label">Payment Note</label>
                  <textarea
                    className="adv-textarea"
                    rows={3}
                    value={disburseForm.note}
                    onChange={(event) => setDisburseForm((form) => ({
                      ...form,
                      note: event.target.value,
                    }))}
                    placeholder="Optional payment note..."
                  />
                </div>
              </div>

              <div className="adv-info" style={{ marginTop: 15 }}>
                Only record disbursement after the actual payment has been completed. The API records the reference; it does not transfer funds.
              </div>
            </div>

            <div className="adv-modal-foot">
              <button className="adv-btn" type="button" onClick={() => setDisburseOpen(false)} disabled={saving}>Cancel</button>
              <button className="adv-btn adv-btn-primary" type="submit" disabled={saving}>
                {saving ? <span className="adv-spinner" /> : <CheckCircle2 size={15} />}
                Record Disbursement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Advance details and audit history */}
      {detailsOpen && (
        <div className="adv-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDetailsOpen(false);
        }}>
          <div className="adv-modal adv-modal-wide">
            <div className="adv-modal-head">
              <div>
                <h2 className="adv-modal-title">Advance Details & History</h2>
                <p className="adv-modal-subtitle">
                  {selectedAdvance ? employeeNameOf(selectedAdvance) : "Loading advance..."}
                </p>
              </div>
              <button className="adv-icon-btn" type="button" onClick={() => setDetailsOpen(false)} aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <div className="adv-modal-body">
              {detailsLoading || !selectedAdvance ? (
                <div className="adv-empty">
                  <span className="adv-spinner" />
                  <p>Loading advance details...</p>
                </div>
              ) : (
                <>
                  <div className="adv-details-grid">
                    <div className="adv-detail-card">
                      <div className="adv-detail-label">Requested</div>
                      <div className="adv-detail-value">{money(selectedAdvance.requestedAmount)}</div>
                    </div>
                    <div className="adv-detail-card">
                      <div className="adv-detail-label">Approved</div>
                      <div className="adv-detail-value">
                        {selectedAdvance.approvedAmount == null ? "—" : money(selectedAdvance.approvedAmount)}
                      </div>
                    </div>
                    <div className="adv-detail-card">
                      <div className="adv-detail-label">Disbursed</div>
                      <div className="adv-detail-value">{money(selectedAdvance.disbursedAmount)}</div>
                    </div>
                    <div className="adv-detail-card">
                      <div className="adv-detail-label">Total Repaid</div>
                      <div className="adv-detail-value">{money(selectedAdvance.totalRepaid)}</div>
                    </div>
                    <div className="adv-detail-card">
                      <div className="adv-detail-label">Outstanding</div>
                      <div className="adv-detail-value">
                        {money(employeeOutstanding(selectedAdvance))}
                      </div>
                    </div>
                    <div className="adv-detail-card">
                      <div className="adv-detail-label">Status</div>
                      <div className="adv-detail-value">
                        <span className={statusClass(selectedAdvance.status)}>
                          {selectedAdvance.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="adv-detail-heading">Request Information</h3>
                  {[
                    ["Employee Code", employeeCodeOf(selectedAdvance)],
                    ["Request Source", selectedAdvance.source || "—"],
                    ["Reason", selectedAdvance.reason || "—"],
                    ["Repayment Duration", `${selectedAdvance.repaymentMonths || 1} month(s)`],
                    ["Scheduled Installment", money(selectedAdvance.monthlyInstallment)],
                    ["Repayment Starts", monthLabel(selectedAdvance.repaymentStartMonth)],
                    ["Requested On", formatDate(selectedAdvance.requestedAt || selectedAdvance.createdAt)],
                    ["Reviewed On", formatDate(selectedAdvance.reviewedAt)],
                    ["Disbursed On", formatDate(selectedAdvance.disbursedAt)],
                    ["Payment Reference", selectedAdvance.paymentReference || "—"],
                    ["Rejection Reason", selectedAdvance.rejectionReason || "—"],
                  ].map(([label, value]) => (
                    <div className="adv-detail-row" key={label}>
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}

                  <h3 className="adv-detail-heading">
                    <History size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                    Audit History
                  </h3>

                  {Array.isArray(selectedAdvance.history) && selectedAdvance.history.length ? (
                    [...selectedAdvance.history].reverse().map((event, index) => (
                      <div className="adv-history-item" key={event._id || index}>
                        <div className="adv-history-title">
                          {String(event.action || "UPDATE").replaceAll("_", " ")}
                          {" · "}
                          {event.performedByRole || "SYSTEM"}
                        </div>
                        {event.note && <div className="adv-history-note">{event.note}</div>}
                        <div className="adv-history-date">{formatDate(event.createdAt)}</div>
                      </div>
                    ))
                  ) : (
                    <p className="adv-muted">No history entries were returned by the API.</p>
                  )}

                  <h3 className="adv-detail-heading">Repayment History</h3>

                  {Array.isArray(selectedAdvance.repaymentHistory) &&
                  selectedAdvance.repaymentHistory.length ? (
                    <div className="adv-table-wrap">
                      <table className="adv-table">
                        <thead>
                          <tr>
                            <th>Payroll Month</th>
                            <th>Deduction</th>
                            <th>Recorded On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAdvance.repaymentHistory.map((item, index) => (
                            <tr key={item._id || index}>
                              <td>{monthLabel(item.payrollMonth)}</td>
                              <td>{money(item.amount)}</td>
                              <td>{formatDate(item.deductedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="adv-muted">
                      No repayment entries are recorded yet. Payroll repayment integration must be enabled in the backend.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="adv-modal-foot">
              <button className="adv-btn" type="button" onClick={() => setDetailsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
