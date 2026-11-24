import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  Search,
  Plus,
  RefreshCw,
  Filter,
  Users,
  Building2,
  CalendarDays,
  Phone,
  Mail,
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  BriefcaseBusiness,
  IndianRupee,
  ClipboardList,
  History,
  UserRound,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ArrowUpRight,
  FileText,
} from "lucide-react";

const STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "MEETING_SET",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const EMPTY_FORM = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  requirement: "",
  expectedDeal: "",
  status: "NEW",
  branch: "",
  assignedEmployee: "",
  notes: "",
};

const STATUS_LABELS = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  MEETING_SET: "Meeting Set",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

const STATUS_COLORS = {
  NEW: { color: "#4338ca", bg: "#eef2ff" },
  CONTACTED: { color: "#0369a1", bg: "#e0f2fe" },
  INTERESTED: { color: "#7e22ce", bg: "#f3e8ff" },
  MEETING_SET: { color: "#0f766e", bg: "#ccfbf1" },
  PROPOSAL_SENT: { color: "#92400e", bg: "#fef3c7" },
  NEGOTIATION: { color: "#c2410c", bg: "#ffedd5" },
  WON: { color: "#15803d", bg: "#dcfce7" },
  LOST: { color: "#b91c1c", bg: "#fee2e2" },
};

function unwrap(response) {
  return response?.data ?? response;
}

function extractList(payload, keys = []) {
  // Supports Axios responses and common Express response shapes:
  // { data: { branches: [] } }, { branches: [] }, and nested data wrappers.
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.result,
    payload?.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    for (const key of keys) {
      if (Array.isArray(candidate?.[key])) return candidate[key];
    }
  }

  return [];
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return String(value._id || value.id || "");
}

function getBranchId(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") {
    return String(
      value._id || value.id || value.branchId?._id || value.branchId?.id || value.branchId || ""
    );
  }
  return String(value);
}

function getName(value, fallback = "Unassigned") {
  if (!value) return fallback;
  if (typeof value === "string") return value;

  return (
    value.name ||
    value.fullName ||
    value.employeeName ||
    value.branchName ||
    value.companyName ||
    value.email ||
    fallback
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value) {
  if (value === "" || value === null || value === undefined) {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function StatusBadge({ status }) {
  const normalized = STATUSES.includes(status) ? status : "NEW";
  const colors = STATUS_COLORS[normalized];

  return (
    <span
      className="slm-status"
      style={{
        color: colors.color,
        backgroundColor: colors.bg,
      }}
    >
      <span
        className="slm-status-dot"
        style={{ backgroundColor: colors.color }}
      />
      {STATUS_LABELS[normalized]}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="slm-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`slm-modal ${wide ? "slm-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="slm-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            type="button"
            className="slm-icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </header>

        <div className="slm-modal-body">{children}</div>
      </section>
    </div>
  );
}

export default function SuperAdminLeadManagement() {
  const [leads, setLeads] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modal, setModal] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [searchInput, setSearchInput] = useState("");

  // Match employees by branch when branch metadata is available.
  // Some employee records return branchName or no branch ID from the options API;
  // keep those visible rather than incorrectly showing an empty dropdown.
  const filteredEmployees = useMemo(() => {
    if (!form.branch) return [];

    return employees.filter((employee) => {
      const employeeBranchId = getBranchId(
        employee.branchId ??
          employee.branch_id ??
          employee.branch ??
          employee.branchRef ??
          employee.branch_id_ref
      );

      // If the API does not provide a branch ID, don't hide the employee.
      // The backend remains responsible for validating the assignment.
      return !employeeBranchId || employeeBranchId === String(form.branch);
    });
  }, [employees, form.branch]);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);

    try {
      const response = await api.get("/leads/admin/options");
      const payload = unwrap(response);

      const branchOptions = extractList(payload, ["branches", "branchOptions"]);
      const employeeOptions = extractList(payload, ["employees", "employeeOptions"]);

      setBranches(branchOptions.filter((item) => item && getId(item)));
      setEmployees(employeeOptions.filter((item) => item && getId(item)));

      if (!branchOptions.length) {
        console.warn("Lead options endpoint returned no branches:", payload);
      }
      if (!employeeOptions.length) {
        console.warn("Lead options endpoint returned no employees:", payload);
      }
    } catch (err) {
      console.error("Lead options loading error:", err);
      // Lead list remains usable if dropdown options cannot be loaded.
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit,
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (branchFilter) params.branchId = branchFilter;
      if (employeeFilter) params.employeeId = employeeFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const response = await api.get("/leads/admin", { params });
      const payload = unwrap(response);

      const rows = extractList(payload, ["leads", "results"]);
      setLeads(rows);

      const pagination = payload?.pagination || payload?.data?.pagination || {};

      const count = Number(
        pagination.total ??
          pagination.totalItems ??
          payload?.total ??
          payload?.totalCount ??
          rows.length
      );

      const pages = Number(
        pagination.totalPages ??
          pagination.pages ??
          payload?.totalPages ??
          Math.max(1, Math.ceil(count / limit))
      );

      setTotal(Number.isFinite(count) ? count : rows.length);
      setTotalPages(Number.isFinite(pages) ? Math.max(1, pages) : 1);
    } catch (err) {
      console.error("Super Admin leads loading error:", err);
      setError(getErrorMessage(err));
      setLeads([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    statusFilter,
    branchFilter,
    employeeFilter,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const stats = useMemo(() => {
    const result = {
      total: total,
      new: 0,
      active: 0,
      won: 0,
    };

    // These counts describe the currently loaded page except for total.
    leads.forEach((lead) => {
      const status = lead.status || "NEW";

      if (status === "NEW") result.new += 1;
      if (
        ["CONTACTED", "INTERESTED", "MEETING_SET", "PROPOSAL_SENT", "NEGOTIATION"].includes(
          status
        )
      ) {
        result.active += 1;
      }
      if (status === "WON") result.won += 1;
    });

    return result;
  }, [leads, total]);

  const closeModal = useCallback(() => {
    setModal("");
    setSelectedLead(null);
    setHistory([]);
    setError("");
  }, []);

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setBranchFilter("");
    setEmployeeFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openCreate = () => {
    setError("");
    setSelectedLead(null);
    setForm({ ...EMPTY_FORM });
    setModal("create");
  };

  const openEdit = (lead) => {
    setError("");
    setSelectedLead(lead);

    setForm({
      companyName: lead.companyName || "",
      contactName: lead.contactName || "",
      email: lead.email || "",
      phone: lead.phone || "",
      requirement: lead.requirement || "",
      expectedDeal:
        lead.expectedDeal === null || lead.expectedDeal === undefined
          ? ""
          : String(lead.expectedDeal),
      status: lead.status || "NEW",
      branch: getId(lead.branch || lead.branchId),
      assignedEmployee: getId(
        lead.assignedEmployee || lead.employee || lead.assignedEmployeeId
      ),
      notes: lead.notes || "",
    });

    setModal("edit");
  };

  const openDetails = (lead) => {
    setSelectedLead(lead);
    setModal("details");
  };

  const openHistory = async (lead) => {
    setSelectedLead(lead);
    setHistory([]);
    setHistoryLoading(true);
    setError("");
    setModal("history");

    try {
      const response = await api.get(
        `/leads/admin/${getId(lead)}/history`
      );

      const payload = unwrap(response);
      setHistory(
        extractList(payload, ["history", "logs", "items", "records"])
      );
    } catch (err) {
      console.error("Lead history loading error:", err);
      setError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      if (name === "branch") {
        // A previously selected employee may belong to the old branch.
        return {
          ...previous,
          branch: value,
          assignedEmployee: "",
        };
      }

      return {
        ...previous,
        [name]: value,
      };
    });

    setError("");
  };

  const submitLead = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!form.contactName.trim()) {
      setError("Contact name is required.");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (form.expectedDeal !== "" && Number(form.expectedDeal) < 0) {
      setError("Expected deal amount cannot be negative.");
      return;
    }

    const payload = {
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      requirement: form.requirement.trim(),
      expectedDeal:
        form.expectedDeal === "" ? null : Number(form.expectedDeal),
      status: form.status,
      notes: form.notes.trim(),
    };

    // Validate the branch/employee combination before sending to the API.
    if (form.assignedEmployee && !form.branch) {
      setError("Select a branch before assigning an employee.");
      return;
    }

    if (form.assignedEmployee) {
      const selectedEmployee = employees.find(
        (employee) => getId(employee) === String(form.assignedEmployee)
      );
      const selectedEmployeeBranch = getBranchId(
        selectedEmployee?.branchId ??
          selectedEmployee?.branch_id ??
          selectedEmployee?.branch ??
          selectedEmployee?.branchRef ??
          selectedEmployee?.branch_id_ref
      );

      // Only reject a mismatch when the options API actually supplied a branch ID.
      // The backend will perform the authoritative assignment validation.
      if (
        !selectedEmployee ||
        (selectedEmployeeBranch && selectedEmployeeBranch !== String(form.branch))
      ) {
        setError("Select an employee who belongs to the selected branch.");
        return;
      }
    }

    // The controller accepts branch/assignedEmployee or their *Id aliases.
    payload.branchId = form.branch || null;
    payload.assignedEmployeeId = form.assignedEmployee || null;

    setSaving(true);

    try {
      if (modal === "edit" && selectedLead) {
        await api.patch(`/leads/admin/${getId(selectedLead)}`, payload);
        setNotice("Lead updated successfully.");
      } else {
        await api.post("/leads/admin", payload);
        setNotice("Lead created successfully.");
      }

      closeModal();
      await loadLeads();
    } catch (err) {
      console.error("Lead save error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.delete(`/leads/admin/${getId(deleteTarget)}`);

      setDeleteTarget(null);
      setNotice("Lead deleted successfully.");

      if (leads.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await loadLeads();
      }
    } catch (err) {
      console.error("Lead deletion error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const currentBranch = (lead) =>
    getName(lead.branch || lead.branchId, lead.branchName || "Not assigned");

  const currentEmployee = (lead) =>
    getName(
      lead.assignedEmployee || lead.employee || lead.assignedEmployeeId,
      lead.assignedEmployeeName || "Unassigned"
    );

  const getHistoryDescription = (item) =>
    item.note ||
    item.description ||
    item.action ||
    item.message ||
    "Lead activity recorded";

  return (
    <div className="slm-page">
      <style>{`
        .slm-page {
          --slm-primary: #6d28d9;
          --slm-primary-dark: #4c1d95;
          --slm-primary-light: #f5f0ff;
          --slm-border: #e8e1f2;
          --slm-text: #211b2d;
          --slm-muted: #7b728b;
          min-width: 0;
          width: 100%;
          max-width: 100%;
          padding: 24px;
          box-sizing: border-box;
          color: var(--slm-text);
          background: #f8f7fc;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .slm-page *, .slm-page *::before, .slm-page *::after {
          box-sizing: border-box;
        }

        .slm-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 22px;
        }

        .slm-eyebrow {
          color: var(--slm-primary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .slm-heading {
          margin: 0;
          font-size: clamp(24px, 3vw, 32px);
          line-height: 1.2;
          letter-spacing: -1px;
          font-weight: 800;
        }

        .slm-subtitle {
          color: var(--slm-muted);
          font-size: 13px;
          line-height: 1.6;
          margin: 9px 0 0;
        }

        .slm-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
        }

        .slm-button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 10px 15px;
          border: 1px solid var(--slm-border);
          border-radius: 10px;
          background: white;
          color: #40364e;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: background .15s ease, border-color .15s ease;
        }

        .slm-button:hover {
          border-color: #c4b5fd;
          background: #faf8ff;
        }

        .slm-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .slm-button-primary {
          background: var(--slm-primary);
          color: white;
          border-color: var(--slm-primary);
        }

        .slm-button-primary:hover {
          background: var(--slm-primary-dark);
          border-color: var(--slm-primary-dark);
          color: white;
        }

        .slm-button-danger {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff;
        }

        .slm-button-danger:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .slm-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 22px;
        }

        .slm-stat {
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--slm-border);
          border-radius: 15px;
          background: white;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .slm-stat-label {
          color: var(--slm-muted);
          font-size: 12px;
          font-weight: 650;
          margin-bottom: 12px;
        }

        .slm-stat-value {
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -.8px;
          line-height: 1.1;
        }

        .slm-stat-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--slm-primary);
          background: var(--slm-primary-light);
          border-radius: 12px;
        }

        .slm-panel {
          background: white;
          border: 1px solid var(--slm-border);
          border-radius: 15px;
          overflow: hidden;
          min-width: 0;
        }

        .slm-panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 19px 20px;
          border-bottom: 1px solid #f0ebf7;
        }

        .slm-panel-title {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }

        .slm-panel-caption {
          color: var(--slm-muted);
          font-size: 11px;
          margin-top: 5px;
        }

        .slm-filter-grid {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: minmax(200px, 1.8fr) repeat(3, minmax(120px, 1fr));
          gap: 11px;
          border-bottom: 1px solid #f0ebf7;
        }

        .slm-search-form {
          display: flex;
          gap: 7px;
          min-width: 0;
        }

        .slm-search-box {
          position: relative;
          min-width: 0;
          flex: 1;
        }

        .slm-search-box > svg {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: #9b91aa;
          pointer-events: none;
        }

        .slm-input, .slm-select, .slm-textarea {
          display: block;
          width: 100%;
          min-width: 0;
          min-height: 40px;
          border: 1px solid #e6e0ee;
          border-radius: 9px;
          padding: 10px 11px;
          color: #211b2d;
          background-color: #ffffff;
          font: inherit;
          font-size: 13px;
          outline: none;
          opacity: 1;
          visibility: visible;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .slm-select {
          appearance: auto;
          -webkit-appearance: menulist;
          color-scheme: light;
          cursor: pointer;
          position: relative;
          z-index: 1;
        }

        .slm-select option {
          color: #211b2d;
          background: #ffffff;
          font-size: 13px;
        }

        .slm-select:disabled {
          color: #7b728b;
          background-color: #f4f1f8;
          cursor: not-allowed;
        }

        .slm-search-box .slm-input {
          padding-left: 37px;
        }

        .slm-input:focus, .slm-select:focus, .slm-textarea:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 3px #ede9fe;
        }

        .slm-input::placeholder, .slm-textarea::placeholder {
          color: #a59bad;
        }

        .slm-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .slm-label {
          color: #62586f;
          font-size: 11px;
          font-weight: 750;
        }

        .slm-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .slm-table {
          width: 100%;
          min-width: 950px;
          border-collapse: collapse;
          text-align: left;
        }

        .slm-table th {
          background: #fbfaff;
          color: #80758e;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .7px;
          padding: 13px 16px;
          border-bottom: 1px solid #eee8f6;
          white-space: nowrap;
        }

        .slm-table td {
          padding: 15px 16px;
          font-size: 12px;
          border-bottom: 1px solid #f2eef7;
          vertical-align: middle;
        }

        .slm-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .slm-table tbody tr:hover {
          background: #fdfcff;
        }

        .slm-company {
          color: #30253d;
          font-weight: 800;
          font-size: 12px;
          max-width: 210px;
          overflow-wrap: anywhere;
        }

        .slm-secondary {
          color: var(--slm-muted);
          font-size: 11px;
          margin-top: 5px;
          overflow-wrap: anywhere;
        }

        .slm-contact-line {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #635970;
          margin-top: 5px;
          overflow-wrap: anywhere;
        }

        .slm-contact-line svg {
          flex: 0 0 auto;
          color: #9b8bad;
        }

        .slm-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 7px;
          padding: 6px 9px;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 800;
        }

        .slm-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .slm-row-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .slm-icon-button {
          width: 32px;
          height: 32px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: #766887;
          display: inline-grid;
          place-items: center;
          cursor: pointer;
          flex: 0 0 auto;
        }

        .slm-icon-button:hover {
          background: #f3edff;
          border-color: #e5d8ff;
          color: var(--slm-primary);
        }

        .slm-empty, .slm-loading {
          text-align: center;
          padding: 52px 20px;
          color: var(--slm-muted);
          font-size: 12px;
        }

        .slm-empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #f5f0ff;
          color: var(--slm-primary);
        }

        .slm-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding: 15px 20px;
          border-top: 1px solid #f0ebf7;
        }

        .slm-pagination-info {
          color: var(--slm-muted);
          font-size: 11px;
        }

        .slm-pagination-buttons {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .slm-page-number {
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          display: grid;
          place-items: center;
          border: 1px solid #e8e1f2;
          border-radius: 8px;
          color: #655777;
          background: white;
          font-size: 11px;
          font-weight: 700;
        }

        .slm-page-number.active {
          color: white;
          background: var(--slm-primary);
          border-color: var(--slm-primary);
        }

        .slm-page-number:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .slm-alert {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.5;
          margin-bottom: 14px;
          overflow-wrap: anywhere;
        }

        .slm-alert-error {
          color: #991b1b;
          border: 1px solid #fecaca;
          background: #fef2f2;
        }

        .slm-alert-success {
          color: #166534;
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
        }

        .slm-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: rgba(25, 16, 42, .48);
          overflow-y: auto;
        }

        .slm-modal {
          width: 100%;
          max-width: 640px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border-radius: 17px;
          background: white;
          box-shadow: 0 25px 80px rgba(24, 13, 43, .24);
        }

        .slm-modal-wide {
          max-width: 800px;
        }

        .slm-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 21px 23px;
          border-bottom: 1px solid #eee8f6;
        }

        .slm-modal-header h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: -.4px;
          font-weight: 800;
        }

        .slm-modal-header p {
          color: var(--slm-muted);
          font-size: 11px;
          line-height: 1.5;
          margin: 7px 0 0;
        }

        .slm-modal-body {
          padding: 22px 23px;
        }

        .slm-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .slm-span-2 {
          grid-column: span 2;
        }

        .slm-textarea {
          min-height: 85px;
          resize: vertical;
          line-height: 1.5;
        }

        .slm-form-actions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 9px;
          padding-top: 20px;
          margin-top: 20px;
          border-top: 1px solid #eee8f6;
        }

        .slm-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .slm-detail-item {
          min-width: 0;
          border: 1px solid #eee8f6;
          border-radius: 10px;
          padding: 13px;
        }

        .slm-detail-label {
          color: var(--slm-muted);
          font-size: 10px;
          font-weight: 750;
          margin-bottom: 7px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .slm-detail-value {
          color: #332741;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .slm-history-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .slm-history-item {
          position: relative;
          padding: 0 0 20px 25px;
          border-left: 2px solid #e9d5ff;
          margin-left: 7px;
        }

        .slm-history-item:last-child {
          border-left-color: transparent;
          padding-bottom: 0;
        }

        .slm-history-dot {
          position: absolute;
          left: -7px;
          top: 0;
          width: 12px;
          height: 12px;
          background: #7c3aed;
          border: 3px solid #f3e8ff;
          border-radius: 50%;
        }

        .slm-history-title {
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .slm-history-note {
          color: #756982;
          font-size: 11px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .slm-history-meta {
          color: #9a8eaa;
          font-size: 10px;
          margin-top: 7px;
        }

        .slm-spin {
          animation: slm-rotate 1s linear infinite;
        }

        @keyframes slm-rotate {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1100px) {
          .slm-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .slm-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .slm-page {
            padding: 14px;
          }

          .slm-topbar {
            gap: 14px;
          }

          .slm-actions {
            width: 100%;
          }

          .slm-actions .slm-button {
            flex: 1;
          }

          .slm-stats {
            gap: 9px;
          }

          .slm-stat {
            padding: 13px;
            gap: 7px;
          }

          .slm-stat-value {
            font-size: 22px;
          }

          .slm-stat-icon {
            width: 34px;
            height: 34px;
          }

          .slm-filter-grid {
            padding: 13px;
            grid-template-columns: minmax(0, 1fr);
          }

          .slm-panel-heading {
            padding: 15px;
          }

          .slm-modal-backdrop {
            padding: 10px;
          }

          .slm-modal {
            max-height: calc(100vh - 20px);
          }

          .slm-modal-header,
          .slm-modal-body {
            padding: 17px;
          }

          .slm-form-grid,
          .slm-detail-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .slm-span-2 {
            grid-column: auto;
          }

          .slm-pagination {
            padding: 13px;
          }
        }
      `}</style>

      <div className="slm-topbar">
        <div>
          <div className="slm-eyebrow">CRM / Lead Management</div>
          <h1 className="slm-heading">Lead Management</h1>
          <p className="slm-subtitle">
            Manage enquiries, track sales progress, and assign leads to
            branches and employees.
          </p>
        </div>

        <div className="slm-actions">
          <button
            type="button"
            className="slm-button"
            onClick={() => {
              loadOptions();
              loadLeads();
            }}
            disabled={loading || optionsLoading}
          >
            <RefreshCw
              size={15}
              className={loading ? "slm-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="slm-button slm-button-primary"
            onClick={openCreate}
          >
            <Plus size={16} />
            Create Lead
          </button>
        </div>
      </div>

      {error && !modal && (
        <div className="slm-alert slm-alert-error">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button
            type="button"
            className="slm-icon-button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div className="slm-alert slm-alert-success">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
          <button
            type="button"
            className="slm-icon-button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="slm-stats">
        <div className="slm-stat">
          <div>
            <div className="slm-stat-label">Total Leads</div>
            <div className="slm-stat-value">{stats.total}</div>
          </div>
          <div className="slm-stat-icon">
            <ClipboardList size={20} />
          </div>
        </div>

        <div className="slm-stat">
          <div>
            <div className="slm-stat-label">New Leads</div>
            <div className="slm-stat-value">{stats.new}</div>
          </div>
          <div className="slm-stat-icon">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="slm-stat">
          <div>
            <div className="slm-stat-label">Active Pipeline</div>
            <div className="slm-stat-value">{stats.active}</div>
          </div>
          <div className="slm-stat-icon">
            <BriefcaseBusiness size={20} />
          </div>
        </div>

        <div className="slm-stat">
          <div>
            <div className="slm-stat-label">Won Leads</div>
            <div className="slm-stat-value">{stats.won}</div>
          </div>
          <div className="slm-stat-icon">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </section>

      <section className="slm-panel">
        <div className="slm-panel-heading">
          <div>
            <h2 className="slm-panel-title">All Leads</h2>
            <div className="slm-panel-caption">
              Search, filter, assign, and manage your CRM pipeline.
            </div>
          </div>

          <span className="slm-secondary">
            {loading ? "Loading..." : `${total} records`}
          </span>
        </div>

        <div className="slm-filter-grid">
          <form className="slm-search-form" onSubmit={submitSearch}>
            <div className="slm-search-box">
              <Search size={15} />
              <input
                className="slm-input"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search company, contact, email..."
                aria-label="Search leads"
              />
            </div>

            <button
              type="submit"
              className="slm-button slm-button-primary"
              aria-label="Search"
            >
              Search
            </button>
          </form>

          <select
            className="slm-select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <select
            className="slm-select"
            value={branchFilter}
            onChange={(event) => {
              setBranchFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by branch"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={getId(branch)} value={getId(branch)}>
                {getName(branch, "Unnamed branch")}
              </option>
            ))}
          </select>

          <select
            className="slm-select"
            value={employeeFilter}
            onChange={(event) => {
              setEmployeeFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by employee"
          >
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={getId(employee)} value={getId(employee)}>
                {getName(employee, "Unnamed employee")}
              </option>
            ))}
          </select>

          <div className="slm-field">
            <label className="slm-label" htmlFor="slm-from-date">
              From date
            </label>
            <input
              id="slm-from-date"
              className="slm-input"
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="slm-field">
            <label className="slm-label" htmlFor="slm-to-date">
              To date
            </label>
            <input
              id="slm-to-date"
              className="slm-input"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            type="button"
            className="slm-button"
            onClick={resetFilters}
          >
            <Filter size={14} />
            Clear filters
          </button>
        </div>

        <div className="slm-table-wrap">
          <table className="slm-table">
            <thead>
              <tr>
                <th>Lead / Company</th>
                <th>Contact details</th>
                <th>Branch</th>
                <th>Assigned employee</th>
                <th>Expected deal</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="slm-loading">
                      <LoaderCircle
                        size={25}
                        className="slm-spin"
                        style={{ margin: "0 auto 12px" }}
                      />
                      Loading leads...
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="slm-empty">
                      <div className="slm-empty-icon">
                        <ClipboardList size={22} />
                      </div>
                      <strong>No leads found</strong>
                      <p>
                        Try changing your filters or create a new lead.
                      </p>
                      <button
                        type="button"
                        className="slm-button slm-button-primary"
                        onClick={openCreate}
                      >
                        <Plus size={15} />
                        Create first lead
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={getId(lead)}>
                    <td>
                      <div className="slm-company">
                        {lead.companyName || "Unnamed company"}
                      </div>
                      <div className="slm-secondary">
                        {lead.requirement || "No requirement added"}
                      </div>
                    </td>

                    <td>
                      <div>{lead.contactName || "No contact name"}</div>

                      {lead.phone && (
                        <div className="slm-contact-line">
                          <Phone size={12} />
                          {lead.phone}
                        </div>
                      )}

                      {lead.email && (
                        <div className="slm-contact-line">
                          <Mail size={12} />
                          {lead.email}
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="slm-contact-line">
                        <Building2 size={14} />
                        {currentBranch(lead)}
                      </div>
                    </td>

                    <td>
                      <div className="slm-contact-line">
                        <UserRound size={14} />
                        {currentEmployee(lead)}
                      </div>
                    </td>

                    <td>
                      {formatCurrency(lead.expectedDeal)}
                    </td>

                    <td>
                      <StatusBadge status={lead.status} />
                    </td>

                    <td>{formatDate(lead.createdAt)}</td>

                    <td>
                      <div className="slm-row-actions">
                        <button
                          type="button"
                          className="slm-icon-button"
                          title="View details"
                          aria-label="View lead details"
                          onClick={() => openDetails(lead)}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          className="slm-icon-button"
                          title="Edit lead"
                          aria-label="Edit lead"
                          onClick={() => openEdit(lead)}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="slm-icon-button"
                          title="View history"
                          aria-label="View lead history"
                          onClick={() => openHistory(lead)}
                        >
                          <History size={16} />
                        </button>

                        <button
                          type="button"
                          className="slm-icon-button"
                          title="Delete lead"
                          aria-label="Delete lead"
                          onClick={() => setDeleteTarget(lead)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="slm-pagination">
          <div className="slm-pagination-info">
            {total === 0
              ? "Showing 0 records"
              : `Showing ${(page - 1) * limit + 1}–${Math.min(
                  page * limit,
                  total
                )} of ${total} records`}
          </div>

          <div className="slm-pagination-buttons">
            <button
              type="button"
              className="slm-page-number"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="slm-page-number active">{page}</span>

            <span className="slm-pagination-info">of {totalPages}</span>

            <button
              type="button"
              className="slm-page-number"
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {(modal === "create" || modal === "edit") && (
        <Modal
          title={modal === "edit" ? "Edit Lead" : "Create New Lead"}
          subtitle="Enter the lead details and configure branch and employee assignment."
          onClose={closeModal}
          wide
        >
          {error && (
            <div className="slm-alert slm-alert-error">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submitLead}>
            <div className="slm-form-grid">
              <div className="slm-field">
                <label className="slm-label">Company name *</label>
                <input
                  className="slm-input"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleFormChange}
                  placeholder="Enter company name"
                  required
                  maxLength={200}
                />
              </div>

              <div className="slm-field">
                <label className="slm-label">Contact person *</label>
                <input
                  className="slm-input"
                  name="contactName"
                  value={form.contactName}
                  onChange={handleFormChange}
                  placeholder="Enter contact name"
                  required
                  maxLength={150}
                />
              </div>

              <div className="slm-field">
                <label className="slm-label">Email address</label>
                <input
                  className="slm-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="name@company.com"
                />
              </div>

              <div className="slm-field">
                <label className="slm-label">Phone number</label>
                <input
                  className="slm-input"
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  placeholder="Enter contact number"
                  maxLength={30}
                />
              </div>

              <div className="slm-field">
                <label className="slm-label">Lead status</label>
                <select
                  className="slm-select"
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="slm-field">
                <label className="slm-label">
                  Expected deal amount (₹)
                </label>
                <input
                  className="slm-input"
                  type="number"
                  name="expectedDeal"
                  value={form.expectedDeal}
                  onChange={handleFormChange}
                  placeholder="Enter amount"
                  min="0"
                  step="1"
                />
              </div>

              <div className="slm-field">
                <label className="slm-label">Branch</label>
                <select
                  className="slm-select"
                  name="branch"
                  value={form.branch}
                  onChange={handleFormChange}
                  disabled={optionsLoading}
                >
                  <option value="">
                    {optionsLoading
                      ? "Loading branches..."
                      : branches.length
                        ? "Select branch"
                        : "No branches available"}
                  </option>
                  {branches.map((branch) => (
                    <option key={getId(branch)} value={getId(branch)}>
                      {getName(branch, "Unnamed branch")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="slm-field">
                <label className="slm-label">Assigned employee</label>
                <select
                  className="slm-select"
                  name="assignedEmployee"
                  value={form.assignedEmployee}
                  onChange={handleFormChange}
                  disabled={optionsLoading || !form.branch}
                >
                  <option value="">
                    {optionsLoading
                      ? "Loading employees..."
                      : !form.branch
                        ? "Select a branch first"
                        : filteredEmployees.length
                          ? "Unassigned"
                          : "No employees for this branch"}
                  </option>
                  {filteredEmployees.map((employee) => (
                    <option key={getId(employee)} value={getId(employee)}>
                      {getName(employee, "Unnamed employee")}
                    </option>
                  ))}
                </select>
                {form.branch && filteredEmployees.length === 0 && !optionsLoading && (
                  <small className="slm-secondary">
                    No active employees were found for this branch.
                  </small>
                )}
              </div>

              <div className="slm-field slm-span-2">
                <label className="slm-label">Requirement / Description</label>
                <textarea
                  className="slm-textarea"
                  name="requirement"
                  value={form.requirement}
                  onChange={handleFormChange}
                  placeholder="Describe the customer's requirements..."
                  maxLength={5000}
                />
              </div>

              <div className="slm-field slm-span-2">
                <label className="slm-label">Notes</label>
                <textarea
                  className="slm-textarea"
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Add notes for this lead..."
                  maxLength={5000}
                />
              </div>
            </div>

            <div className="slm-form-actions">
              <button
                type="button"
                className="slm-button"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="slm-button slm-button-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoaderCircle size={15} className="slm-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    {modal === "edit" ? "Save Changes" : "Create Lead"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "details" && selectedLead && (
        <Modal
          title="Lead Details"
          subtitle="Review the lead information and assignment."
          onClose={closeModal}
          wide
        >
          <div style={{ marginBottom: 18 }}>
            <div className="slm-company" style={{ fontSize: 19 }}>
              {selectedLead.companyName || "Unnamed company"}
            </div>
            <div style={{ marginTop: 10 }}>
              <StatusBadge status={selectedLead.status} />
            </div>
          </div>

          <div className="slm-detail-grid">
            <div className="slm-detail-item">
              <div className="slm-detail-label">Contact person</div>
              <div className="slm-detail-value">
                {selectedLead.contactName || "—"}
              </div>
            </div>

            <div className="slm-detail-item">
              <div className="slm-detail-label">Phone</div>
              <div className="slm-detail-value">
                {selectedLead.phone || "—"}
              </div>
            </div>

            <div className="slm-detail-item">
              <div className="slm-detail-label">Email</div>
              <div className="slm-detail-value">
                {selectedLead.email || "—"}
              </div>
            </div>

            <div className="slm-detail-item">
              <div className="slm-detail-label">Expected deal</div>
              <div className="slm-detail-value">
                {formatCurrency(selectedLead.expectedDeal)}
              </div>
            </div>

            <div className="slm-detail-item">
              <div className="slm-detail-label">Branch</div>
              <div className="slm-detail-value">
                {currentBranch(selectedLead)}
              </div>
            </div>

            <div className="slm-detail-item">
              <div className="slm-detail-label">Assigned employee</div>
              <div className="slm-detail-value">
                {currentEmployee(selectedLead)}
              </div>
            </div>

            <div className="slm-detail-item">
              <div className="slm-detail-label">Created by</div>
              <div className="slm-detail-value">
                {getName(
                  selectedLead.createdBy,
                  selectedLead.createdByName || "—"
                )}
              </div>
            </div>

            <div className="slm-detail-item">
              <div className="slm-detail-label">Created date</div>
              <div className="slm-detail-value">
                {formatDate(selectedLead.createdAt)}
              </div>
            </div>

            <div className="slm-detail-item slm-span-2">
              <div className="slm-detail-label">Requirement</div>
              <div className="slm-detail-value">
                {selectedLead.requirement || "No requirement added"}
              </div>
            </div>

            <div className="slm-detail-item slm-span-2">
              <div className="slm-detail-label">Notes</div>
              <div className="slm-detail-value">
                {selectedLead.notes || "No notes added"}
              </div>
            </div>
          </div>

          <div className="slm-form-actions">
            <button
              type="button"
              className="slm-button"
              onClick={() => openHistory(selectedLead)}
            >
              <History size={15} />
              View History
            </button>

            <button
              type="button"
              className="slm-button slm-button-primary"
              onClick={() => openEdit(selectedLead)}
            >
              <Pencil size={15} />
              Edit Lead
            </button>
          </div>
        </Modal>
      )}

      {modal === "history" && selectedLead && (
        <Modal
          title="Lead Activity History"
          subtitle={`Activity recorded for ${selectedLead.companyName || "this lead"}.`}
          onClose={closeModal}
        >
          {error && (
            <div className="slm-alert slm-alert-error">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          {historyLoading ? (
            <div className="slm-loading">
              <LoaderCircle
                size={24}
                className="slm-spin"
                style={{ margin: "0 auto 12px" }}
              />
              Loading activity history...
            </div>
          ) : history.length === 0 ? (
            <div className="slm-empty">
              <div className="slm-empty-icon">
                <History size={22} />
              </div>
              <strong>No activity history found</strong>
              <p>
                The backend may not have recorded any activity for this lead
                yet.
              </p>
            </div>
          ) : (
            <div className="slm-history-list">
              {history.map((item, index) => (
                <div
                  className="slm-history-item"
                  key={item._id || item.id || index}
                >
                  <span className="slm-history-dot" />

                  <div className="slm-history-title">
                    {getHistoryDescription(item)}
                  </div>

                  {item.status && (
                    <div style={{ margin: "7px 0" }}>
                      <StatusBadge status={item.status} />
                    </div>
                  )}

                  <div className="slm-history-note">
                    {item.performedByName ||
                      item.performedBy?.name ||
                      item.userName ||
                      "System"}
                  </div>

                  <div className="slm-history-meta">
                    {formatDate(
                      item.createdAt || item.timestamp || item.date
                    )}
                    {item.performedByRole
                      ? ` · ${item.performedByRole}`
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete Lead"
          subtitle="Confirm that you want to remove this lead."
          onClose={() => !saving && setDeleteTarget(null)}
        >
          {error && (
            <div className="slm-alert slm-alert-error">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="slm-detail-item" style={{ marginBottom: 18 }}>
            <div className="slm-detail-label">Selected lead</div>
            <div className="slm-detail-value">
              <strong>{deleteTarget.companyName || "Unnamed company"}</strong>
              <div className="slm-secondary">
                {deleteTarget.contactName || "No contact name"}
              </div>
            </div>
          </div>

          <div className="slm-alert slm-alert-error">
            <AlertCircle size={17} />
            <span>
              This action will request the backend to delete the selected lead.
              Confirm before proceeding.
            </span>
          </div>

          <div className="slm-form-actions">
            <button
              type="button"
              className="slm-button"
              disabled={saving}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="slm-button slm-button-danger"
              disabled={saving}
              onClick={deleteLead}
            >
              {saving ? (
                <LoaderCircle size={15} className="slm-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              {saving ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
