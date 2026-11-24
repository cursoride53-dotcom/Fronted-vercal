

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
  } from "react";
  import { onAuthStateChanged } from "firebase/auth";
  import {
    Activity,
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock3,
    FileText,
    History,
    LoaderCircle,
    MapPin,
    Phone,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Truck,
    UserRound,
    Wrench,
    X,
    Save,
  } from "lucide-react";
  
  import { auth } from "../services/firebase";
  import api from "../services/api";
  
  /* =========================================================
     CONFIGURATION
     The Axios api service should use /api as its baseURL.
     Example: http://localhost:5000/api
  ========================================================= */
  
  const RESOURCE_CONFIG = {
    calls: {
      label: "Operational Calls",
      singular: "Call",
      icon: Phone,
      description: "Manage customer calls and follow-ups.",
      searchPlaceholder: "Search customer, phone, or caller",
      columns: [
        { key: "customerName", label: "Customer" },
        { key: "customerPhone", label: "Phone" },
        { key: "callerRep", label: "Caller" },
        { key: "disposition", label: "Disposition" },
        { key: "followUpDate", label: "Follow-up" },
      ],
      createFields: [
        {
          name: "customerName",
          label: "Customer name",
          required: true,
        },
        {
          name: "customerPhone",
          label: "Phone number",
          required: true,
        },
        {
          name: "customerEmail",
          label: "Email address",
          type: "email",
        },
        {
          name: "callerRep",
          label: "Caller representative",
        },
        {
          name: "callType",
          label: "Call type",
          type: "select",
          options: [
            "INBOUND",
            "OUTBOUND",
            "FOLLOW_UP",
            "SUPPORT",
            "OTHER",
          ],
        },
        {
          name: "disposition",
          label: "Disposition",
          type: "select",
          options: [
            "PENDING",
            "CONNECTED",
            "NO_ANSWER",
            "CALLBACK",
            "INTERESTED",
            "NOT_INTERESTED",
            "COMPLETED",
          ],
        },
        {
          name: "durationSeconds",
          label: "Duration in seconds",
          type: "number",
        },
        {
          name: "followUpDate",
          label: "Follow-up date",
          type: "date",
        },
        {
          name: "discussionNotes",
          label: "Discussion notes",
          type: "textarea",
        },
      ],
      editFields: [
        {
          name: "disposition",
          label: "Disposition",
          type: "select",
          options: [
            "PENDING",
            "CONNECTED",
            "NO_ANSWER",
            "CALLBACK",
            "INTERESTED",
            "NOT_INTERESTED",
            "COMPLETED",
          ],
        },
        {
          name: "durationSeconds",
          label: "Duration in seconds",
          type: "number",
        },
        {
          name: "followUpDate",
          label: "Follow-up date",
          type: "date",
        },
        {
          name: "discussionNotes",
          label: "Discussion notes",
          type: "textarea",
        },
      ],
    },
  
    tickets: {
      label: "Support Tickets",
      singular: "Support Ticket",
      icon: ClipboardList,
      description: "Review assigned support requests.",
      searchPlaceholder: "Search ticket, customer, or subject",
      columns: [
        { key: "ticketId", label: "Ticket ID" },
        { key: "customerName", label: "Customer" },
        { key: "subject", label: "Subject" },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status" },
      ],
      createFields: [
        {
          name: "customerName",
          label: "Customer name",
          required: true,
        },
        {
          name: "customerPhone",
          label: "Phone number",
          required: true,
        },
        {
          name: "subject",
          label: "Subject",
          required: true,
        },
        {
          name: "priority",
          label: "Priority",
          type: "select",
          options: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          required: true,
        },
      ],
      editFields: [
        {
          name: "description",
          label: "Description",
          type: "textarea",
        },
      ],
    },
  
    installations: {
      label: "Installation Jobs",
      singular: "Installation Job",
      icon: Wrench,
      description: "Track installation progress and site information.",
      searchPlaceholder: "Search job, customer, or site",
      columns: [
        { key: "jobId", label: "Job ID" },
        { key: "customerName", label: "Customer" },
        { key: "siteName", label: "Site" },
        { key: "status", label: "Status" },
        { key: "scheduledDate", label: "Scheduled date" },
      ],
      createFields: [],
      editFields: [
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            "PENDING",
            "ASSIGNED",
            "SCHEDULED",
            "IN_PROGRESS",
            "ON_HOLD",
          ],
        },
        {
          name: "siteGps",
          label: "Site GPS",
        },
        {
          name: "materialsConsumed",
          label: "Materials consumed",
          type: "textarea",
        },
        {
          name: "signOffNotes",
          label: "Installation notes",
          type: "textarea",
        },
      ],
    },
  
    vehicles: {
      label: "Transport Fleet",
      singular: "Vehicle",
      icon: Truck,
      description: "View fleet information and update vehicle status.",
      searchPlaceholder: "Search vehicle, driver, or registration",
      columns: [
        { key: "vehicleId", label: "Vehicle ID" },
        { key: "vehicleType", label: "Vehicle type" },
        { key: "registrationNumber", label: "Registration" },
        { key: "driverName", label: "Driver" },
        { key: "status", label: "Status" },
      ],
      createFields: [],
      editFields: [
        {
          name: "currentGps",
          label: "Current GPS",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            "AVAILABLE",
            "IN_USE",
            "MAINTENANCE",
            "INACTIVE",
          ],
        },
        {
          name: "notes",
          label: "Notes",
          type: "textarea",
        },
      ],
    },
  };
  
  const EMPTY_FORM = {
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    callerRep: "",
    callType: "OUTBOUND",
    disposition: "PENDING",
    durationSeconds: "",
    followUpDate: "",
    discussionNotes: "",
    subject: "",
    description: "",
    priority: "MEDIUM",
    siteGps: "",
    materialsConsumed: "",
    signOffNotes: "",
    currentGps: "",
    status: "",
    notes: "",
  };
  
  function getRecordId(record) {
    return record?._id || record?.id || "";
  }
  
  function getErrorMessage(error) {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
  
    if (!error?.response) {
      return "Unable to reach the server. Check your connection and API configuration.";
    }
  
    if (status === 401) {
      return (
        message ||
        "Your authentication token was rejected. Please verify your Firebase and backend authentication configuration."
      );
    }
  
    if (status === 403) {
      return (
        message ||
        "You do not have permission to perform this operation."
      );
    }
  
    if (status === 404) {
      return message || "The requested API endpoint or record was not found.";
    }
  
    if (status === 400) {
      const errors = error?.response?.data?.errors;
  
      return Array.isArray(errors) && errors.length
        ? errors.join(", ")
        : message || "Please check the submitted information.";
    }
  
    return message || error.message || "Something went wrong.";
  }
  
  function formatDate(value) {
    if (!value) return "—";
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
  
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  
  function formatDateTime(value) {
    if (!value) return "—";
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
  
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  
  function displayValue(value) {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
  
    if (typeof value === "object") {
      return value.name || value.fullName || value._id || JSON.stringify(value);
    }
  
    return String(value);
  }
  
  function toInputDate(value) {
    if (!value) return "";
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }
  
    return date.toISOString().slice(0, 10);
  }
  
  function makeFormValues(record, fields) {
    const result = { ...EMPTY_FORM };
  
    for (const field of fields) {
      const value = record?.[field.name];
  
      if (field.type === "date") {
        result[field.name] = toInputDate(value);
      } else if (value !== undefined && value !== null) {
        result[field.name] = String(value);
      }
    }
  
    return result;
  }
  
  function StatusBadge({ value }) {
    const normalized = String(value || "UNKNOWN")
      .toLowerCase()
      .replace(/[_-]+/g, " ");
  
    let className = "od-status";
  
    if (
      /completed|resolved|active|available|connected/.test(normalized)
    ) {
      className += " od-status-success";
    } else if (
      /pending|scheduled|assigned|in progress|callback/.test(normalized)
    ) {
      className += " od-status-warning";
    } else if (
      /cancelled|rejected|inactive|urgent|high|maintenance/.test(normalized)
    ) {
      className += " od-status-danger";
    }
  
    return (
      <span className={className}>
        {normalized.replace(/\b\w/g, (letter) => letter.toUpperCase())}
      </span>
    );
  }
  
  function FieldControl({ field, value, onChange, disabled }) {
    const commonProps = {
      id: `od-${field.name}`,
      name: field.name,
      value: value ?? "",
      disabled,
      onChange: (event) => onChange(field.name, event.target.value),
      required: Boolean(field.required),
    };
  
    if (field.type === "textarea") {
      return (
        <textarea
          {...commonProps}
          rows={4}
          className="od-input od-textarea"
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      );
    }
  
    if (field.type === "select") {
      return (
        <select {...commonProps} className="od-input">
          <option value="">Select {field.label.toLowerCase()}</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      );
    }
  
    return (
      <input
        {...commonProps}
        type={field.type || "text"}
        className="od-input"
        placeholder={`Enter ${field.label.toLowerCase()}`}
        min={field.type === "number" ? 0 : undefined}
      />
    );
  }
  
  export default function OperationalExecutionDesk() {
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
  
    const [resource, setResource] = useState("calls");
    const [records, setRecords] = useState([]);
    const [pagination, setPagination] = useState({
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    });
  
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [dispositionFilter, setDispositionFilter] = useState("");
  
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
  
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formValues, setFormValues] = useState({ ...EMPTY_FORM });
  
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
  
    const config = RESOURCE_CONFIG[resource];
    const ResourceIcon = config.icon;
  
    const isSupervised = false;
  
    const availableCreateFields = config.createFields;
    const availableEditFields = config.editFields;
  
    /* ---------------------------------------------------------
       Restore Firebase authentication before making requests.
       A refresh must not automatically sign the user out.
    --------------------------------------------------------- */
  
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          setFirebaseUser(user || null);
          setAuthReady(true);
        },
        (authError) => {
          console.error("Operational desk Firebase error:", authError);
          setFirebaseUser(null);
          setAuthReady(true);
        }
      );
  
      return unsubscribe;
    }, []);
  
    /* ---------------------------------------------------------
       Always obtain a current Firebase ID token for API calls.
       Do not automatically sign out on 403 or temporary errors.
    --------------------------------------------------------- */
  
    const getAuthConfig = useCallback(async () => {
      if (!authReady) {
        throw new Error("Authentication is still loading.");
      }
  
      if (!firebaseUser) {
        throw new Error("Please sign in to access the operational desk.");
      }
  
      const token = await firebaseUser.getIdToken();
  
      if (!token) {
        throw new Error("Could not obtain a Firebase authentication token.");
      }
  
      return {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
    }, [authReady, firebaseUser]);
  
    /* ---------------------------------------------------------
       Load resource records from the employee API.
       The supplied backend restricts records by the current user.
    --------------------------------------------------------- */
  
    const loadRecords = useCallback(
      async (options = {}) => {
        if (!authReady || !firebaseUser) {
          setRecords([]);
          setPagination({
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          });
          setLoading(false);
          return;
        }
  
        const requestedPage = options.page ?? pagination.page;
  
        setLoading(true);
        setError("");
        setNotice("");
  
        try {
          const authConfig = await getAuthConfig();
  
          const params = {
            page: requestedPage,
            limit: pagination.limit || 20,
          };
  
          if (search.trim()) {
            params.search = search.trim();
          }
  
          if (statusFilter && resource !== "calls") {
            params.status = statusFilter;
          }
  
          if (priorityFilter && resource === "tickets") {
            params.priority = priorityFilter;
          }
  
          if (dispositionFilter && resource === "calls") {
            params.disposition = dispositionFilter;
          }
  
          const response = await api.get(
            `/operational-desk/employee/${resource}`,
            {
              ...authConfig,
              params,
            }
          );
  
          const payload = response?.data || {};
          const result = payload.data;
  
          setRecords(Array.isArray(result) ? result : []);
  
          setPagination((previous) => ({
            ...previous,
            ...(payload.pagination || {}),
            page: payload.pagination?.page ?? requestedPage,
          }));
        } catch (requestError) {
          console.error("OPERATIONAL DESK LIST ERROR:", requestError);
          setRecords([]);
          setError(getErrorMessage(requestError));
        } finally {
          setLoading(false);
        }
      },
      [
        authReady,
        firebaseUser,
        getAuthConfig,
        pagination.page,
        pagination.limit,
        search,
        statusFilter,
        priorityFilter,
        dispositionFilter,
        resource,
      ]
    );
  
    useEffect(() => {
      if (authReady && firebaseUser) {
        loadRecords({ page: 1 });
      } else if (authReady && !firebaseUser) {
        setRecords([]);
        setError("Please sign in to view operational records.");
      }
    }, [authReady, firebaseUser, resource, search, statusFilter,
      priorityFilter, dispositionFilter]); // loadRecords is triggered by these dependencies.
  
    const totalRecords = pagination.total || records.length;
  
    const stats = useMemo(() => {
      const active = records.filter((record) => {
        const value = String(record.status || record.disposition || "")
          .toUpperCase();
  
        return ![
          "COMPLETED",
          "RESOLVED",
          "CANCELLED",
          "CLOSED",
        ].includes(value);
      }).length;
  
      return {
        loaded: records.length,
        active,
        total: totalRecords,
      };
    }, [records, totalRecords]);
  
    const changeResource = (nextResource) => {
      setResource(nextResource);
      setRecords([]);
      setSelectedRecord(null);
      setHistory([]);
      setSearchInput("");
      setSearch("");
      setStatusFilter("");
      setPriorityFilter("");
      setDispositionFilter("");
      setPagination((previous) => ({
        ...previous,
        page: 1,
      }));
      setError("");
      setNotice("");
    };
  
    const handleSearchSubmit = (event) => {
      event.preventDefault();
      setSearch(searchInput.trim());
      setPagination((previous) => ({
        ...previous,
        page: 1,
      }));
    };
  
    const changePage = (nextPage) => {
      if (
        nextPage < 1 ||
        (pagination.pages > 0 && nextPage > pagination.pages)
      ) {
        return;
      }
  
      setPagination((previous) => ({
        ...previous,
        page: nextPage,
      }));
  
      loadRecords({ page: nextPage });
    };
  
    const openCreateModal = () => {
      if (!availableCreateFields.length) {
        setError(
          "Creating this resource is not available to employee accounts through the supplied backend configuration."
        );
        return;
      }
  
      setEditingRecord(null);
      setFormValues(makeFormValues(null, availableCreateFields));
      setError("");
      setNotice("");
      setModalOpen(true);
    };
  
    const openEditModal = (record) => {
      if (!availableEditFields.length) {
        setError("Editing is not available for this resource.");
        return;
      }
  
      setEditingRecord(record);
      setFormValues(makeFormValues(record, availableEditFields));
      setError("");
      setNotice("");
      setModalOpen(true);
    };
  
    const updateFormValue = (name, value) => {
      setFormValues((previous) => ({
        ...previous,
        [name]: value,
      }));
    };
  
    const handleSave = async (event) => {
      event.preventDefault();
  
      if (!firebaseUser) {
        setError("Please sign in before saving records.");
        return;
      }
  
      const fields = editingRecord
        ? availableEditFields
        : availableCreateFields;
  
      const payload = {};
  
      for (const field of fields) {
        let value = formValues[field.name];
  
        if (typeof value === "string") {
          value = value.trim();
        }
  
        if (field.required && (value === "" || value == null)) {
          setError(`${field.label} is required.`);
          return;
        }
  
        if (field.type === "number" && value !== "") {
          value = Number(value);
  
          if (!Number.isFinite(value) || value < 0) {
            setError(`${field.label} must be a valid non-negative number.`);
            return;
          }
        }
  
        if (value !== "") {
          payload[field.name] = value;
        }
      }
  
      setSaving(true);
      setError("");
      setNotice("");
  
      try {
        const authConfig = await getAuthConfig();
  
        if (editingRecord) {
          const id = getRecordId(editingRecord);
  
          if (!id) {
            throw new Error("The selected record does not have a valid ID.");
          }
  
          await api.patch(
            `/operational-desk/employee/${resource}/${encodeURIComponent(id)}`,
            payload,
            authConfig
          );
  
          setNotice(`${config.singular} updated successfully.`);
        } else {
          await api.post(
            `/operational-desk/employee/${resource}`,
            payload,
            authConfig
          );
  
          setNotice(`${config.singular} created successfully.`);
        }
  
        setModalOpen(false);
        setEditingRecord(null);
  
        await loadRecords({ page: pagination.page });
      } catch (saveError) {
        console.error("OPERATIONAL DESK SAVE ERROR:", saveError);
        setError(getErrorMessage(saveError));
      } finally {
        setSaving(false);
      }
    };
  
    const openRecordDetails = async (record) => {
      setSelectedRecord(record);
      setHistory([]);
      setHistoryLoading(true);
      setError("");
  
      const id = getRecordId(record);
  
      if (!id) {
        setHistoryLoading(false);
        setError("This record does not contain a valid record ID.");
        return;
      }
  
      try {
        const authConfig = await getAuthConfig();
  
        const response = await api.get(
          `/operational-desk/employee/${resource}/${encodeURIComponent(id)}/history`,
          authConfig
        );
  
        const result = response?.data?.data;
  
        setHistory(Array.isArray(result) ? result : []);
      } catch (historyError) {
        console.error("OPERATIONAL DESK HISTORY ERROR:", historyError);
        setError(getErrorMessage(historyError));
      } finally {
        setHistoryLoading(false);
      }
    };
  
    const closeDetails = () => {
      setSelectedRecord(null);
      setHistory([]);
    };
  
    const renderTableCell = (record, column) => {
      const value = record[column.key];
  
      if (
        column.key === "status" ||
        column.key === "priority" ||
        column.key === "disposition"
      ) {
        return <StatusBadge value={value} />;
      }
  
      if (
        column.key.toLowerCase().includes("date") ||
        column.key.toLowerCase().includes("followup")
      ) {
        return formatDate(value);
      }
  
      return displayValue(value);
    };
  
    if (!authReady) {
      return (
        <div className="od-root">
          <div className="od-loading-screen">
            <LoaderCircle className="od-spin" size={28} />
            <span>Restoring your authenticated session...</span>
          </div>
          <OperationalDeskStyles />
        </div>
      );
    }
  
    if (!firebaseUser) {
      return (
        <div className="od-root">
          <div className="od-empty-auth">
            <div className="od-empty-icon">
              <ShieldCheck size={30} />
            </div>
            <h2>Sign in required</h2>
            <p>
              Your operational workspace is available after you sign in to
              HRMS. Return to the login page and authenticate again if your
              session has ended.
            </p>
          </div>
          <OperationalDeskStyles />
        </div>
      );
    }
  
    return (
      <div className="od-root">
        <OperationalDeskStyles />
  
        <div className="od-page-header">
          <div className="od-heading-group">
            <div className="od-heading-icon">
              <Activity size={25} />
            </div>
  
            <div>
              <div className="od-eyebrow">HRMS WORKSPACE</div>
              <h1>Operational Execution Desk</h1>
              <p>
                Manage operational records, review progress, and track changes.
              </p>
            </div>
          </div>
  
          <div className="od-header-actions">
            <button
              type="button"
              className="od-btn od-btn-secondary"
              onClick={() => loadRecords({ page: pagination.page })}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "od-spin" : ""}
              />
              Refresh
            </button>
  
            {availableCreateFields.length > 0 && (
              <button
                type="button"
                className="od-btn od-btn-primary"
                onClick={openCreateModal}
              >
                <Plus size={17} />
                New {config.singular}
              </button>
            )}
          </div>
        </div>
  
        <div className="od-stat-grid">
          <div className="od-stat-card">
            <div className="od-stat-icon od-stat-blue">
              <ClipboardList size={20} />
            </div>
            <div className="od-stat-label">Records on this page</div>
            <div className="od-stat-value">{stats.loaded}</div>
            <div className="od-stat-note">Records returned by the API</div>
          </div>
  
          <div className="od-stat-card">
            <div className="od-stat-icon od-stat-purple">
              <Activity size={20} />
            </div>
            <div className="od-stat-label">Open / active on this page</div>
            <div className="od-stat-value">{stats.active}</div>
            <div className="od-stat-note">
              Calculated from the currently loaded records
            </div>
          </div>
  
          <div className="od-stat-card">
            <div className="od-stat-icon od-stat-green">
              <CheckCircle2 size={20} />
            </div>
            <div className="od-stat-label">Matching records</div>
            <div className="od-stat-value">{stats.total}</div>
            <div className="od-stat-note">
              Total reported by the backend for this query
            </div>
          </div>
        </div>
  
        <div className="od-workspace">
          <aside className="od-resource-sidebar">
            <div className="od-sidebar-heading">OPERATIONS</div>
  
            {Object.entries(RESOURCE_CONFIG).map(([key, item]) => {
              const Icon = item.icon;
  
              return (
                <button
                  key={key}
                  type="button"
                  className={`od-resource-link ${
                    resource === key ? "od-resource-active" : ""
                  }`}
                  onClick={() => changeResource(key)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {resource === key && <ChevronRight size={16} />}
                </button>
              );
            })}
  
            <div className="od-sidebar-info">
              <ShieldCheck size={19} />
              <strong>Authenticated workspace</strong>
              <p>
                Records are retrieved through your employee authentication
                middleware and the backend access rules.
              </p>
            </div>
          </aside>
  
          <section className="od-record-panel">
            {selectedRecord ? (
              <>
                <div className="od-record-heading">
                  <button
                    type="button"
                    className="od-back-button"
                    onClick={closeDetails}
                  >
                    <ArrowLeft size={17} />
                    Back to records
                  </button>
  
                  <div className="od-record-heading-row">
                    <div>
                      <div className="od-eyebrow">RECORD DETAILS</div>
                      <h2>
                        {displayValue(
                          selectedRecord.customerName ||
                            selectedRecord.ticketId ||
                            selectedRecord.jobId ||
                            selectedRecord.vehicleId
                        )}
                      </h2>
                      <p>
                        {config.singular} · ID: {getRecordId(selectedRecord)}
                      </p>
                    </div>
  
                    {availableEditFields.length > 0 && (
                      <button
                        type="button"
                        className="od-btn od-btn-primary"
                        onClick={() => openEditModal(selectedRecord)}
                      >
                        <FileText size={16} />
                        Edit record
                      </button>
                    )}
                  </div>
                </div>
  
                <div className="od-detail-grid">
                  {Object.entries(selectedRecord)
                    .filter(
                      ([key, value]) =>
                        !key.startsWith("__") &&
                        ![
                          "createdBy",
                          "updatedBy",
                          "__v",
                        ].includes(key) &&
                        value !== undefined &&
                        value !== null &&
                        typeof value !== "object"
                    )
                    .map(([key, value]) => (
                      <div className="od-detail-item" key={key}>
                        <span>
                          {key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (letter) => letter.toUpperCase())}
                        </span>
                        <strong>
                          {/date|At$/i.test(key) &&
                          !Number.isNaN(new Date(value).getTime())
                            ? formatDateTime(value)
                            : displayValue(value)}
                        </strong>
                      </div>
                    ))}
                </div>
  
                <div className="od-history-panel">
                  <div className="od-section-title">
                    <div className="od-section-title-icon">
                      <History size={19} />
                    </div>
                    <div>
                      <h3>Audit history</h3>
                      <p>Changes recorded by the backend</p>
                    </div>
                  </div>
  
                  {historyLoading ? (
                    <div className="od-inline-loading">
                      <LoaderCircle size={20} className="od-spin" />
                      Loading audit history...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="od-empty-state">
                      <Clock3 size={22} />
                      <p>
                        No history entries are available for this record.
                      </p>
                    </div>
                  ) : (
                    <div className="od-history-list">
                      {history.map((entry, index) => (
                        <div
                          className="od-history-item"
                          key={entry._id || `${entry.action}-${index}`}
                        >
                          <div className="od-history-dot" />
                          <div className="od-history-content">
                            <div className="od-history-top">
                              <strong>
                                {displayValue(entry.action)}
                              </strong>
                              <span>
                                {formatDateTime(
                                  entry.performedAt || entry.createdAt
                                )}
                              </span>
                            </div>
                            <p>
                              {displayValue(entry.description)}
                            </p>
                            <small>
                              Performed by:{" "}
                              {displayValue(entry.performedByName)}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="od-section-title od-main-section-title">
                  <div className="od-section-title-icon">
                    <ResourceIcon size={20} />
                  </div>
                  <div>
                    <h2>{config.label}</h2>
                    <p>{config.description}</p>
                  </div>
                </div>
  
                <div className="od-filter-bar">
                  <form
                    className="od-search-form"
                    onSubmit={handleSearchSubmit}
                  >
                    <Search size={17} />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(event) =>
                        setSearchInput(event.target.value)
                      }
                      placeholder={config.searchPlaceholder}
                      aria-label="Search operational records"
                    />
                    <button type="submit">Search</button>
                  </form>
  
                  <div className="od-filters">
                    {resource !== "calls" && (
                      <select
                        className="od-filter-select"
                        value={statusFilter}
                        onChange={(event) => {
                          setStatusFilter(event.target.value);
                          setPagination((previous) => ({
                            ...previous,
                            page: 1,
                          }));
                        }}
                        aria-label="Filter by status"
                      >
                        <option value="">All statuses</option>
                        {[
                          "PENDING",
                          "ASSIGNED",
                          "SCHEDULED",
                          "IN_PROGRESS",
                          "ON_HOLD",
                          "COMPLETED",
                          "RESOLVED",
                          "CANCELLED",
                          "ACTIVE",
                          "INACTIVE",
                          "AVAILABLE",
                          "IN_USE",
                          "MAINTENANCE",
                        ].map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    )}
  
                    {resource === "tickets" && (
                      <select
                        className="od-filter-select"
                        value={priorityFilter}
                        onChange={(event) => {
                          setPriorityFilter(event.target.value);
                          setPagination((previous) => ({
                            ...previous,
                            page: 1,
                          }));
                        }}
                        aria-label="Filter by priority"
                      >
                        <option value="">All priorities</option>
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map(
                          (priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          )
                        )}
                      </select>
                    )}
  
                    {resource === "calls" && (
                      <select
                        className="od-filter-select"
                        value={dispositionFilter}
                        onChange={(event) => {
                          setDispositionFilter(event.target.value);
                          setPagination((previous) => ({
                            ...previous,
                            page: 1,
                          }));
                        }}
                        aria-label="Filter by disposition"
                      >
                        <option value="">All dispositions</option>
                        {[
                          "PENDING",
                          "CONNECTED",
                          "NO_ANSWER",
                          "CALLBACK",
                          "INTERESTED",
                          "NOT_INTERESTED",
                          "COMPLETED",
                        ].map((disposition) => (
                          <option key={disposition} value={disposition}>
                            {disposition.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
  
                {notice && (
                  <div className="od-alert od-alert-success" role="status">
                    <CheckCircle2 size={17} />
                    <span>{notice}</span>
                    <button
                      type="button"
                      onClick={() => setNotice("")}
                      aria-label="Dismiss notification"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
  
                {error && (
                  <div className="od-alert od-alert-error" role="alert">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => setError("")}
                      aria-label="Dismiss error"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
  
                {loading ? (
                  <div className="od-loading-screen od-table-loading">
                    <LoaderCircle size={26} className="od-spin" />
                    <span>Loading {config.label.toLowerCase()}...</span>
                  </div>
                ) : records.length === 0 ? (
                  <div className="od-empty-state od-empty-records">
                    <div className="od-empty-icon">
                      <ResourceIcon size={28} />
                    </div>
                    <h3>No records found</h3>
                    <p>
                      No records were returned for this resource and filter.
                      Try a different search or refresh the data.
                    </p>
                    <button
                      type="button"
                      className="od-btn od-btn-secondary"
                      onClick={() => {
                        setSearchInput("");
                        setSearch("");
                        setStatusFilter("");
                        setPriorityFilter("");
                        setDispositionFilter("");
                        setPagination((previous) => ({
                          ...previous,
                          page: 1,
                        }));
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="od-table-wrapper">
                    <table className="od-table">
                      <thead>
                        <tr>
                          {config.columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                          <th>Actions</th>
                        </tr>
                      </thead>
  
                      <tbody>
                        {records.map((record) => (
                          <tr key={getRecordId(record)}>
                            {config.columns.map((column) => (
                              <td key={column.key}>
                                {renderTableCell(record, column)}
                              </td>
                            ))}
  
                            <td>
                              <div className="od-row-actions">
                                <button
                                  type="button"
                                  className="od-icon-action"
                                  title="View record and history"
                                  aria-label="View record and history"
                                  onClick={() =>
                                    openRecordDetails(record)
                                  }
                                >
                                  <FileText size={16} />
                                </button>
  
                                {availableEditFields.length > 0 && (
                                  <button
                                    type="button"
                                    className="od-icon-action"
                                    title="Edit record"
                                    aria-label="Edit record"
                                    onClick={() => openEditModal(record)}
                                  >
                                    <Wrench size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
  
                <div className="od-pagination">
                  <div className="od-pagination-info">
                    Page {pagination.page} of{" "}
                    {Math.max(pagination.pages || 0, 1)}
                    <span> · {pagination.total || 0} matching records</span>
                  </div>
  
                  <div className="od-pagination-actions">
                    <button
                      type="button"
                      className="od-page-button"
                      disabled={loading || pagination.page <= 1}
                      onClick={() => changePage(pagination.page - 1)}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={17} />
                    </button>
  
                    <button
                      type="button"
                      className="od-page-button"
                      disabled={
                        loading ||
                        (pagination.pages > 0 &&
                          pagination.page >= pagination.pages) ||
                        records.length < pagination.limit
                      }
                      onClick={() => changePage(pagination.page + 1)}
                      aria-label="Next page"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
  
        {modalOpen && (
          <div
            className="od-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) {
                setModalOpen(false);
              }
            }}
          >
            <section
              className="od-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="od-modal-title"
            >
              <div className="od-modal-header">
                <div>
                  <div className="od-eyebrow">
                    OPERATIONAL WORKSPACE
                  </div>
                  <h2 id="od-modal-title">
                    {editingRecord ? "Edit" : "Create"}{" "}
                    {config.singular}
                  </h2>
                  <p>
                    {editingRecord
                      ? "Update the fields available to your account."
                      : "Enter the details for this new record."}
                  </p>
                </div>
  
                <button
                  type="button"
                  className="od-icon-action od-close-modal"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  aria-label="Close form"
                >
                  <X size={19} />
                </button>
              </div>
  
              <form onSubmit={handleSave}>
                <div className="od-modal-body">
                  {(editingRecord
                    ? availableEditFields
                    : availableCreateFields
                  ).map((field) => (
                    <div
                      className={`od-form-field ${
                        field.type === "textarea"
                          ? "od-form-field-full"
                          : ""
                      }`}
                      key={field.name}
                    >
                      <label htmlFor={`od-${field.name}`}>
                        {field.label}
                        {field.required && (
                          <span className="od-required"> *</span>
                        )}
                      </label>
  
                      <FieldControl
                        field={field}
                        value={formValues[field.name]}
                        onChange={updateFormValue}
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>
  
                {error && (
                  <div className="od-alert od-alert-error od-modal-error">
                    <AlertCircle size={17} />
                    <span>{error}</span>
                  </div>
                )}
  
                <div className="od-modal-footer">
                  <button
                    type="button"
                    className="od-btn od-btn-secondary"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
  
                  <button
                    type="submit"
                    className="od-btn od-btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <LoaderCircle size={17} className="od-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    );
  }
  
  /* =========================================================
     COMPONENT STYLES
  ========================================================= */
  
  function OperationalDeskStyles() {
    return (
      <style>{`
        .od-root {
          --od-primary: #245bd6;
          --od-primary-dark: #1946ad;
          --od-primary-soft: #edf3ff;
          --od-purple: #7046d9;
          --od-text: #17243b;
          --od-muted: #77849b;
          --od-border: #e5eaf2;
          --od-surface: #ffffff;
          --od-bg: #f5f7fb;
          color: var(--od-text);
          background: var(--od-bg);
          min-height: 100%;
          padding: 26px;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 13px;
          line-height: 1.5;
        }
  
        .od-root *,
        .od-root *::before,
        .od-root *::after {
          box-sizing: border-box;
        }
  
        .od-root button,
        .od-root input,
        .od-root textarea,
        .od-root select {
          font: inherit;
        }
  
        .od-root button {
          cursor: pointer;
        }
  
        .od-root button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }
  
        .od-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
  
        .od-heading-group {
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 0;
        }
  
        .od-heading-icon {
          display: grid;
          place-items: center;
          width: 55px;
          height: 55px;
          flex: 0 0 55px;
          color: #fff;
          border-radius: 17px;
          background: linear-gradient(140deg, #245bd6, #6b75ec);
          box-shadow: 0 8px 22px #245bd626;
        }
  
        .od-eyebrow {
          color: var(--od-primary);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 1.6px;
          margin-bottom: 5px;
        }
  
        .od-heading-group h1 {
          font-size: clamp(21px, 2vw, 29px);
          line-height: 1.25;
          letter-spacing: -.8px;
          margin: 0;
          font-weight: 850;
          overflow-wrap: anywhere;
        }
  
        .od-heading-group p {
          margin: 7px 0 0;
          color: var(--od-muted);
          font-size: 12px;
          line-height: 1.65;
        }
  
        .od-header-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }
  
        .od-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 39px;
          padding: 9px 14px;
          border-radius: 10px;
          border: 1px solid transparent;
          font-weight: 750;
          font-size: 11px;
          white-space: nowrap;
          transition: background .15s ease, border-color .15s ease;
        }
  
        .od-btn-primary {
          background: var(--od-primary);
          color: #fff;
          border-color: var(--od-primary);
        }
  
        .od-btn-primary:hover:not(:disabled) {
          background: var(--od-primary-dark);
          border-color: var(--od-primary-dark);
        }
  
        .od-btn-secondary {
          color: #42536d;
          background: #fff;
          border-color: var(--od-border);
        }
  
        .od-btn-secondary:hover:not(:disabled) {
          border-color: #b9cbed;
          background: #f9fbff;
        }
  
        .od-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 22px;
        }
  
        .od-stat-card {
          padding: 19px;
          background: var(--od-surface);
          border: 1px solid var(--od-border);
          border-radius: 15px;
          min-width: 0;
        }
  
        .od-stat-icon {
          display: grid;
          place-items: center;
          width: 39px;
          height: 39px;
          border-radius: 12px;
          margin-bottom: 13px;
        }
  
        .od-stat-blue {
          color: #245bd6;
          background: #edf3ff;
        }
  
        .od-stat-purple {
          color: #7046d9;
          background: #f2edff;
        }
  
        .od-stat-green {
          color: #16865c;
          background: #e8f8f0;
        }
  
        .od-stat-label {
          color: var(--od-muted);
          font-size: 11px;
          font-weight: 700;
        }
  
        .od-stat-value {
          font-size: 29px;
          line-height: 1.2;
          font-weight: 900;
          margin-top: 6px;
          overflow-wrap: anywhere;
        }
  
        .od-stat-note {
          color: #8a96a9;
          font-size: 10px;
          margin-top: 7px;
          line-height: 1.5;
        }
  
        .od-workspace {
          display: grid;
          grid-template-columns: 225px minmax(0, 1fr);
          align-items: start;
          gap: 18px;
        }
  
        .od-resource-sidebar,
        .od-record-panel {
          min-width: 0;
          background: var(--od-surface);
          border: 1px solid var(--od-border);
          border-radius: 16px;
        }
  
        .od-resource-sidebar {
          padding: 14px 10px;
        }
  
        .od-sidebar-heading {
          color: #95a0b2;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 1.4px;
          padding: 9px 10px 12px;
        }
  
        .od-resource-link {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #64738b;
          padding: 12px 10px;
          margin-bottom: 4px;
          font-size: 11px;
          font-weight: 750;
        }
  
        .od-resource-link span {
          flex: 1;
          min-width: 0;
        }
  
        .od-resource-link:hover {
          background: #f6f8fd;
          color: var(--od-primary);
        }
  
        .od-resource-active {
          background: var(--od-primary-soft);
          color: var(--od-primary);
        }
  
        .od-resource-active:hover {
          background: var(--od-primary-soft);
        }
  
        .od-sidebar-info {
          margin: 24px 3px 3px;
          padding: 13px;
          border-radius: 12px;
          background: #f5f8ff;
          color: #526b98;
        }
  
        .od-sidebar-info > svg {
          color: var(--od-primary);
          margin-bottom: 8px;
        }
  
        .od-sidebar-info strong {
          display: block;
          color: #314968;
          font-size: 10px;
        }
  
        .od-sidebar-info p {
          color: #7a8aa3;
          font-size: 10px;
          line-height: 1.7;
          margin: 7px 0 0;
        }
  
        .od-record-panel {
          padding: 22px;
        }
  
        .od-section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
  
        .od-section-title-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 12px;
          color: var(--od-primary);
          background: var(--od-primary-soft);
        }
  
        .od-section-title h2,
        .od-section-title h3 {
          font-size: 16px;
          font-weight: 850;
          margin: 0;
          overflow-wrap: anywhere;
        }
  
        .od-section-title p {
          color: var(--od-muted);
          font-size: 11px;
          margin: 5px 0 0;
          line-height: 1.5;
        }
  
        .od-main-section-title {
          margin-bottom: 20px;
        }
  
        .od-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 17px;
        }
  
        .od-search-form {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1 1 250px;
          min-width: 0;
          min-height: 40px;
          padding: 4px 5px 4px 11px;
          border: 1px solid var(--od-border);
          border-radius: 10px;
          color: #8b98ac;
          background: #fff;
        }
  
        .od-search-form input {
          min-width: 0;
          flex: 1;
          height: 30px;
          border: 0;
          outline: 0;
          color: var(--od-text);
          background: transparent;
          font-size: 11px;
        }
  
        .od-search-form input::placeholder {
          color: #9ba6b6;
        }
  
        .od-search-form button {
          min-height: 30px;
          border: 0;
          border-radius: 7px;
          padding: 0 11px;
          background: var(--od-primary-soft);
          color: var(--od-primary);
          font-size: 10px;
          font-weight: 800;
        }
  
        .od-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
  
        .od-filter-select {
          max-width: 190px;
          min-width: 120px;
          height: 39px;
          padding: 0 10px;
          border: 1px solid var(--od-border);
          border-radius: 9px;
          outline-color: #9cb9f6;
          background: #fff;
          color: #53647d;
          font-size: 10px;
        }
  
        .od-alert {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 12px;
          margin: 0 0 15px;
          border-radius: 10px;
          font-size: 11px;
          line-height: 1.6;
        }
  
        .od-alert > svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }
  
        .od-alert span {
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }
  
        .od-alert button {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
        }
  
        .od-alert-error {
          color: #a72e40;
          background: #fff1f2;
          border: 1px solid #f8d6dc;
        }
  
        .od-alert-success {
          color: #16734e;
          background: #edfbf4;
          border: 1px solid #cceedd;
        }
  
        .od-table-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid var(--od-border);
          border-radius: 11px;
        }
  
        .od-table {
          width: 100%;
          min-width: 650px;
          border-collapse: collapse;
          text-align: left;
        }
  
        .od-table th {
          padding: 13px 12px;
          color: #77849a;
          background: #f8faff;
          border-bottom: 1px solid var(--od-border);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: .35px;
          white-space: nowrap;
        }
  
        .od-table td {
          padding: 13px 12px;
          border-bottom: 1px solid #edf0f5;
          color: #475770;
          font-size: 10px;
          vertical-align: middle;
          max-width: 230px;
          overflow-wrap: anywhere;
        }
  
        .od-table tbody tr:last-child td {
          border-bottom: 0;
        }
  
        .od-table tbody tr:hover {
          background: #fbfcff;
        }
  
        .od-status {
          display: inline-flex;
          align-items: center;
          max-width: 180px;
          padding: 5px 8px;
          border-radius: 6px;
          background: #f0f2f6;
          color: #5f6d82;
          font-size: 9px;
          font-weight: 800;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }
  
        .od-status-success {
          color: #16734e;
          background: #e7f8ef;
        }
  
        .od-status-warning {
          color: #986014;
          background: #fff5df;
        }
  
        .od-status-danger {
          color: #ae3745;
          background: #ffebee;
        }
  
        .od-row-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
  
        .od-icon-action {
          display: inline-grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--od-border);
          border-radius: 8px;
          color: #61728b;
          background: #fff;
        }
  
        .od-icon-action:hover:not(:disabled) {
          color: var(--od-primary);
          border-color: #bed0f5;
          background: #f5f8ff;
        }
  
        .od-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
  
        .od-pagination-info {
          color: #718099;
          font-size: 10px;
        }
  
        .od-pagination-actions {
          display: flex;
          gap: 7px;
        }
  
        .od-page-button {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 1px solid var(--od-border);
          border-radius: 9px;
          color: #4c607d;
          background: #fff;
        }
  
        .od-page-button:disabled {
          opacity: .4;
        }
  
        .od-loading-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 190px;
          color: var(--od-primary);
          font-size: 12px;
          font-weight: 700;
        }
  
        .od-table-loading {
          min-height: 250px;
        }
  
        .od-spin {
          animation: od-rotate .9s linear infinite;
        }
  
        @keyframes od-rotate {
          to { transform: rotate(360deg); }
        }
  
        .od-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 28px 18px;
          text-align: center;
          color: #8a97ab;
        }
  
        .od-empty-state > svg {
          color: #9aa9c1;
        }
  
        .od-empty-state p {
          margin: 0;
          font-size: 11px;
          line-height: 1.7;
        }
  
        .od-empty-records {
          min-height: 260px;
        }
  
        .od-empty-records h3 {
          margin: 0;
          color: #34445c;
          font-size: 15px;
        }
  
        .od-empty-records > p {
          max-width: 370px;
          margin: 0 0 7px;
        }
  
        .od-empty-icon {
          display: grid;
          place-items: center;
          width: 54px;
          height: 54px;
          border-radius: 17px;
          background: var(--od-primary-soft);
          color: var(--od-primary);
        }
  
        .od-back-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0;
          border: 0;
          color: var(--od-primary);
          background: transparent;
          font-size: 11px;
          font-weight: 750;
        }
  
        .od-record-heading {
          padding-bottom: 20px;
          border-bottom: 1px solid var(--od-border);
        }
  
        .od-record-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
          margin-top: 18px;
        }
  
        .od-record-heading h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }
  
        .od-record-heading p {
          color: var(--od-muted);
          font-size: 11px;
          margin: 6px 0 0;
          overflow-wrap: anywhere;
        }
  
        .od-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin: 20px 0 28px;
        }
  
        .od-detail-item {
          padding: 13px;
          min-width: 0;
          border: 1px solid var(--od-border);
          border-radius: 10px;
          background: #fff;
        }
  
        .od-detail-item span {
          display: block;
          color: #8592a6;
          font-size: 10px;
          margin-bottom: 6px;
          overflow-wrap: anywhere;
        }
  
        .od-detail-item strong {
          display: block;
          color: #314159;
          font-size: 11px;
          font-weight: 750;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
  
        .od-history-panel {
          padding-top: 4px;
        }
  
        .od-history-list {
          margin-top: 20px;
        }
  
        .od-history-item {
          position: relative;
          display: flex;
          gap: 13px;
          padding-bottom: 21px;
        }
  
        .od-history-item:not(:last-child)::before {
          content: "";
          position: absolute;
          left: 5px;
          top: 14px;
          bottom: -1px;
          width: 1px;
          background: #dce5f5;
        }
  
        .od-history-dot {
          position: relative;
          z-index: 1;
          width: 11px;
          height: 11px;
          flex: 0 0 11px;
          margin-top: 4px;
          border-radius: 50%;
          background: #376ce0;
          box-shadow: 0 0 0 4px #edf3ff;
        }
  
        .od-history-content {
          flex: 1;
          min-width: 0;
        }
  
        .od-history-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
  
        .od-history-top strong {
          color: #33445c;
          font-size: 11px;
        }
  
        .od-history-top span,
        .od-history-content small {
          color: #8a96a9;
          font-size: 9px;
        }
  
        .od-history-content p {
          color: #64738a;
          font-size: 11px;
          line-height: 1.6;
          margin: 5px 0;
          overflow-wrap: anywhere;
        }
  
        .od-inline-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 24px 0;
          color: var(--od-primary);
          font-size: 11px;
        }
  
        .od-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(18, 29, 49, .48);
          backdrop-filter: blur(4px);
        }
  
        .od-modal {
          width: min(100%, 700px);
          max-height: min(88vh, 850px);
          overflow-y: auto;
          background: #fff;
          border-radius: 17px;
          box-shadow: 0 24px 80px #14213b33;
        }
  
        .od-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 23px 24px;
          border-bottom: 1px solid var(--od-border);
        }
  
        .od-modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }
  
        .od-modal-header p {
          margin: 6px 0 0;
          color: var(--od-muted);
          font-size: 11px;
          line-height: 1.6;
        }
  
        .od-close-modal {
          flex: 0 0 32px;
        }
  
        .od-modal-body {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          padding: 23px 24px;
        }
  
        .od-form-field {
          min-width: 0;
        }
  
        .od-form-field-full {
          grid-column: 1 / -1;
        }
  
        .od-form-field label {
          display: block;
          color: #46566e;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 7px;
        }
  
        .od-required {
          color: #d63d51;
        }
  
        .od-input {
          width: 100%;
          min-width: 0;
          min-height: 40px;
          padding: 10px 11px;
          border: 1px solid #dfe5ee;
          border-radius: 9px;
          outline: none;
          background: #fff;
          color: #26364d;
          font-size: 11px;
          transition: border-color .15s, box-shadow .15s;
        }
  
        .od-input:focus {
          border-color: #8baaf0;
          box-shadow: 0 0 0 3px #245bd612;
        }
  
        .od-input:disabled {
          background: #f5f7fa;
          cursor: not-allowed;
        }
  
        .od-textarea {
          resize: vertical;
          min-height: 95px;
        }
  
        .od-modal-error {
          margin: 0 24px 15px;
        }
  
        .od-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          flex-wrap: wrap;
          padding: 16px 24px 22px;
          border-top: 1px solid var(--od-border);
        }
  
        .od-empty-auth {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 340px;
          padding: 30px;
          text-align: center;
          background: #fff;
          border: 1px solid var(--od-border);
          border-radius: 16px;
        }
  
        .od-empty-auth h2 {
          margin: 15px 0 8px;
          font-size: 21px;
        }
  
        .od-empty-auth p {
          max-width: 480px;
          color: var(--od-muted);
          font-size: 12px;
          line-height: 1.8;
        }
  
        @media (max-width: 1050px) {
          .od-root {
            padding: 20px;
          }
  
          .od-workspace {
            grid-template-columns: 190px minmax(0, 1fr);
            gap: 12px;
          }
  
          .od-record-panel {
            padding: 17px;
          }
  
          .od-stat-card {
            padding: 15px;
          }
        }
  
        @media (max-width: 760px) {
          .od-root {
            padding: 15px;
          }
  
          .od-workspace {
            grid-template-columns: minmax(0, 1fr);
          }
  
          .od-resource-sidebar {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px;
          }
  
          .od-sidebar-heading,
          .od-sidebar-info {
            grid-column: 1 / -1;
          }
  
          .od-resource-link {
            min-width: 0;
            margin: 0;
            padding: 11px 8px;
            font-size: 10px;
          }
  
          .od-resource-link span {
            overflow-wrap: anywhere;
          }
  
          .od-resource-link > svg:first-child {
            flex-shrink: 0;
          }
  
          .od-stat-grid {
            gap: 9px;
          }
  
          .od-stat-card {
            padding: 12px;
          }
  
          .od-stat-value {
            font-size: 24px;
          }
  
          .od-stat-note {
            font-size: 9px;
          }
  
          .od-filter-bar {
            align-items: stretch;
          }
  
          .od-search-form {
            flex-basis: 100%;
          }
  
          .od-filters {
            width: 100%;
          }
  
          .od-filter-select {
            flex: 1;
            min-width: 0;
            max-width: none;
          }
        }
  
        @media (max-width: 480px) {
          .od-root {
            padding: 11px;
          }
  
          .od-page-header {
            align-items: flex-start;
          }
  
          .od-heading-group {
            align-items: flex-start;
            gap: 10px;
          }
  
          .od-heading-icon {
            width: 43px;
            height: 43px;
            flex-basis: 43px;
            border-radius: 12px;
          }
  
          .od-heading-group h1 {
            font-size: 20px;
          }
  
          .od-heading-group p {
            font-size: 10px;
          }
  
          .od-header-actions {
            width: 100%;
          }
  
          .od-header-actions .od-btn {
            flex: 1;
          }
  
          .od-stat-grid {
            grid-template-columns: 1fr;
          }
  
          .od-stat-card {
            display: grid;
            grid-template-columns: 38px minmax(0, 1fr);
            column-gap: 11px;
            align-items: center;
          }
  
          .od-stat-icon {
            grid-row: 1 / span 3;
            margin: 0;
          }
  
          .od-stat-label,
          .od-stat-value,
          .od-stat-note {
            grid-column: 2;
            margin-top: 0;
          }
  
          .od-stat-value {
            font-size: 22px;
          }
  
          .od-record-panel {
            padding: 13px;
          }
  
          .od-section-title h2 {
            font-size: 14px;
          }
  
          .od-detail-grid {
            grid-template-columns: 1fr;
          }
  
          .od-modal-overlay {
            padding: 8px;
            align-items: flex-end;
          }
  
          .od-modal {
            max-height: 92vh;
            border-radius: 16px 16px 10px 10px;
          }
  
          .od-modal-header,
          .od-modal-body {
            padding: 17px;
          }
  
          .od-modal-body {
            grid-template-columns: minmax(0, 1fr);
            gap: 13px;
          }
  
          .od-form-field-full {
            grid-column: auto;
          }
  
          .od-modal-footer {
            padding: 14px 17px 18px;
          }
  
          .od-modal-footer .od-btn {
            flex: 1;
          }
  
          .od-pagination-info span {
            display: block;
            margin-top: 4px;
          }
        }
      `}</style>
    );
  }
  