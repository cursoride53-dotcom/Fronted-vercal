import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, ClipboardList,
  Download, Edit3, Eye, FileClock, Headphones, Package, Phone, Plus,
  RefreshCw, Search, ShieldCheck, Trash2, Truck, X
} from "lucide-react";

const API = "/operational-desk/admin";

const MODULES = {
  calls: {
    label: "Telecalling Desk", singular: "Call", icon: Phone,
    description: "Customer calling and follow-up management",
    statuses: ["CONNECTED", "NO_ANSWER", "BUSY", "CALLBACK_REQUESTED", "INTERESTED", "NOT_INTERESTED", "FOLLOW_UP", "COMPLETED"],
    fields: ["customerName", "customerPhone", "customerEmail", "callerRep", "callType", "disposition", "durationSeconds", "discussionNotes", "followUpDate"],
  },
  tickets: {
    label: "Support Tickets", singular: "Ticket", icon: Headphones,
    description: "Customer complaints and service requests",
    statuses: ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"],
    fields: ["ticketId", "customerName", "customerPhone", "subject", "description", "priority", "assignedAgent", "status", "slaDueAt", "resolutionNotes"],
  },
  installations: {
    label: "Installation Ops", singular: "Installation", icon: Package,
    description: "Installation jobs, technicians and site sign-off",
    statuses: ["SCHEDULED", "ASSIGNED", "AT_SITE", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"],
    fields: ["jobId", "customerName", "customerPhone", "siteName", "siteAddress", "assignedTechnician", "scheduledDate", "status", "latitude", "longitude", "signOffNotes"],
  },
  vehicles: {
    label: "Transport Fleet", singular: "Vehicle", icon: Truck,
    description: "Fleet assignments, delivery and pickup operations",
    statuses: ["AVAILABLE", "ASSIGNED", "IN_TRANSIT", "COMPLETED", "MAINTENANCE", "INACTIVE"],
    fields: ["vehicleId", "vehicleType", "registrationNumber", "driverName", "driverPhone", "operationMode", "assignedRoute", "status", "latitude", "longitude", "notes"],
  },
};

const EMPTY_FORMS = {
  calls: { customerName: "", customerPhone: "", customerEmail: "", callerRep: "", callType: "OUTBOUND", disposition: "CONNECTED", durationSeconds: 0, discussionNotes: "", followUpDate: "" },
  tickets: { ticketId: "", customerName: "", customerPhone: "", subject: "", description: "", priority: "MEDIUM", assignedAgent: "", status: "OPEN", slaDueAt: "", resolutionNotes: "" },
  installations: { jobId: "", customerName: "", customerPhone: "", siteName: "", siteAddress: "", assignedTechnician: "", scheduledDate: "", status: "SCHEDULED", latitude: "", longitude: "", signOffNotes: "" },
  vehicles: { vehicleId: "", vehicleType: "", registrationNumber: "", driverName: "", driverPhone: "", operationMode: "DELIVERY", assignedRoute: "", status: "AVAILABLE", latitude: "", longitude: "", notes: "" },
};

const LABELS = {
  customerName: "Customer name", customerPhone: "Customer phone", customerEmail: "Customer email",
  callerRep: "Caller representative", callType: "Call direction", disposition: "Call disposition",
  durationSeconds: "Duration (seconds)", discussionNotes: "Discussion notes", followUpDate: "Follow-up date",
  ticketId: "Ticket ID", subject: "Subject", description: "Description", priority: "Priority",
  assignedAgent: "Assigned support agent", status: "Status", slaDueAt: "SLA due date",
  resolutionNotes: "Resolution notes", jobId: "Job ID", siteName: "Site name", siteAddress: "Site address",
  assignedTechnician: "Assigned technician", scheduledDate: "Scheduled date", signOffNotes: "Sign-off notes",
  vehicleId: "Vehicle ID", vehicleType: "Vehicle type", registrationNumber: "Registration number",
  driverName: "Driver name", driverPhone: "Driver phone", operationMode: "Operation mode",
  assignedRoute: "Assigned route", notes: "Notes", latitude: "Latitude", longitude: "Longitude",
};

const OPTIONS = {
  callType: ["INBOUND", "OUTBOUND"],
  disposition: MODULES.calls.statuses,
  priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  operationMode: ["DELIVERY", "PICKUP"],
};

const STATUS_STYLE = {
  OPEN: "bg-violet-100 text-violet-800", CONNECTED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800", RESOLVED: "bg-emerald-100 text-emerald-800",
  AVAILABLE: "bg-emerald-100 text-emerald-800", INTERESTED: "bg-emerald-100 text-emerald-800",
  ASSIGNED: "bg-blue-100 text-blue-800", IN_PROGRESS: "bg-blue-100 text-blue-800",
  AT_SITE: "bg-blue-100 text-blue-800", IN_TRANSIT: "bg-blue-100 text-blue-800",
  CALLBACK_REQUESTED: "bg-amber-100 text-amber-800", FOLLOW_UP: "bg-amber-100 text-amber-800",
  ON_HOLD: "bg-amber-100 text-amber-800", SCHEDULED: "bg-blue-100 text-blue-800",
  BUSY: "bg-amber-100 text-amber-800", NO_ANSWER: "bg-slate-100 text-slate-700",
  NOT_INTERESTED: "bg-slate-100 text-slate-700", CLOSED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-rose-100 text-rose-800", MAINTENANCE: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-slate-100 text-slate-700", LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-800", HIGH: "bg-amber-100 text-amber-800",
  CRITICAL: "bg-rose-100 text-rose-800",
};

function unwrap(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  for (const key of ["records", "items", "data", "results"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function errorMessage(error) {
  return error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";
}
function label(value) {
  return value ? String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "—";
}
function dateText(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function idOf(record) { return record?._id || record?.id || ""; }
function displayId(resource, record) {
  if (resource === "calls") return record.callId || record._id?.slice(-8) || "—";
  if (resource === "tickets") return record.ticketId || record._id?.slice(-8) || "—";
  if (resource === "installations") return record.jobId || record._id?.slice(-8) || "—";
  return record.vehicleId || record.registrationNumber || "—";
}
function primary(resource, record) {
  if (resource === "calls") return record.customerName || record.customerPhone || "Unknown customer";
  if (resource === "tickets") return record.subject || record.customerName || "Support ticket";
  if (resource === "installations") return record.siteName || record.customerName || "Installation job";
  return record.registrationNumber || record.vehicleId || "Fleet vehicle";
}
function secondary(resource, record) {
  if (resource === "calls") return record.customerPhone || record.callerRep || "No phone";
  if (resource === "tickets") return record.customerName || record.customerPhone || "No customer details";
  if (resource === "installations") return record.siteAddress || record.customerName || "No site address";
  return record.driverName || record.vehicleType || "No driver assigned";
}
function statusOf(record) { return record?.status || record?.disposition || "UNKNOWN"; }
function dateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function toPayload(resource, form) {
  const payload = { ...form };
  if (resource === "calls") {
    payload.durationSeconds = Number(payload.durationSeconds || 0);
    if (!payload.followUpDate) delete payload.followUpDate;
  }
  if (resource === "tickets") {
    if (!payload.assignedAgent) delete payload.assignedAgent;
    if (!payload.slaDueAt) delete payload.slaDueAt;
  }
  if (resource === "installations" || resource === "vehicles") {
    const lat = payload.latitude, lng = payload.longitude;
    delete payload.latitude; delete payload.longitude;
    if (lat !== "" && lng !== "") {
      payload[resource === "installations" ? "siteGps" : "currentGps"] = {
        latitude: Number(lat), longitude: Number(lng),
        ...(resource === "vehicles" ? { recordedAt: new Date().toISOString() } : {}),
      };
    }
    if (resource === "installations") {
      if (!payload.assignedTechnician) delete payload.assignedTechnician;
      if (!payload.scheduledDate) delete payload.scheduledDate;
    }
  }
  for (const key of Object.keys(payload)) if (payload[key] === "" && ["customerEmail", "followUpDate", "assignedAgent", "slaDueAt", "assignedTechnician", "scheduledDate"].includes(key)) delete payload[key];
  return payload;
}

function Badge({ value }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${STATUS_STYLE[value] || "bg-slate-100 text-slate-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label(value)}</span>;
}

function Metric({ title, value, subtitle, icon: Icon, tone }) {
  const tones = { purple: "bg-violet-100 text-violet-700", blue: "bg-blue-100 text-blue-700", orange: "bg-orange-100 text-orange-700", green: "bg-emerald-100 text-emerald-700" };
  return <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={21} /></div>
    <div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{title}</p><p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-400">{subtitle}</p></div>
  </div>;
}

function RecordFormModal({ resource, record, saving, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    const initial = { ...EMPTY_FORMS[resource] };
    if (record) Object.keys(initial).forEach(key => {
      let value = record[key];
      if (resource === "installations" && key === "latitude") value = record.siteGps?.latitude ?? "";
      if (resource === "installations" && key === "longitude") value = record.siteGps?.longitude ?? "";
      if (resource === "vehicles" && key === "latitude") value = record.currentGps?.latitude ?? "";
      if (resource === "vehicles" && key === "longitude") value = record.currentGps?.longitude ?? "";
      if (value && typeof value === "object") value = value._id || "";
      if (["scheduledDate", "followUpDate", "slaDueAt"].includes(key)) value = dateInput(value);
      initial[key] = value ?? initial[key];
    });
    return initial;
  });
  const required = { calls: ["customerName", "customerPhone"], tickets: ["customerName", "subject"], installations: ["customerName", "siteAddress"], vehicles: ["vehicleId"] };
  const longFields = ["discussionNotes", "description", "resolutionNotes", "signOffNotes", "notes", "siteAddress", "assignedRoute"];
  const setField = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const submit = event => { event.preventDefault(); onSave(toPayload(resource, form)); };
  const optionsFor = key => key === "status" ? MODULES[resource].statuses : key === "disposition" ? MODULES.calls.statuses : OPTIONS[key];
  const inputType = key => key.toLowerCase().includes("email") ? "email" : key.toLowerCase().includes("phone") ? "tel" : key === "durationSeconds" ? "number" : (key.toLowerCase().includes("date") || key === "slaDueAt") ? "datetime-local" : "text";
  const ResourceIcon = MODULES[resource].icon;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="operational-form-title" className="my-auto max-h-[calc(100vh-24px)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-violet-100 bg-white px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><ResourceIcon size={22} /></div><div><h2 id="operational-form-title" className="font-extrabold text-slate-900">{record ? "Edit" : "Create"} {MODULES[resource].singular}</h2><p className="mt-1 text-xs text-slate-500">{MODULES[resource].description}</p></div></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close form" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"><X size={19} /></button>
      </header>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
          {MODULES[resource].fields.map(key => {
            const opts = optionsFor(key);
            const isRequired = required[resource].includes(key);
            const common = { id: `field-${key}`, name: key, value: form[key] ?? "", required: isRequired, onChange: e => setField(key, e.target.value), className: "mt-1.5 w-full min-w-0 rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" };
            return <label key={key} htmlFor={common.id} className={`min-w-0 text-xs font-bold text-slate-600 ${longFields.includes(key) ? "sm:col-span-2" : ""}`}>
              {LABELS[key] || label(key)}{isRequired && <span className="ml-1 text-rose-600">*</span>}
              {opts?.length ? <select {...common}>{opts.map(option => <option key={option} value={option}>{label(option)}</option>)}</select>
                : longFields.includes(key) ? <textarea {...common} rows={3} placeholder={`Enter ${(LABELS[key] || label(key)).toLowerCase()}`} />
                : <input {...common} type={inputType(key)} min={key === "durationSeconds" ? 0 : undefined} placeholder={`Enter ${(LABELS[key] || label(key)).toLowerCase()}`} />}
            </label>;
          })}
        </div>
        {(resource === "installations" || resource === "vehicles") && <p className="mx-5 mb-4 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-800 sm:mx-6">GPS coordinates are optional. Enter both latitude and longitude to save location data.</p>}
        <footer className="flex justify-end gap-2 border-t border-violet-100 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:opacity-60">{saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{saving ? "Saving..." : record ? "Save changes" : "Create record"}</button>
        </footer>
      </form>
    </section>
  </div>;
}

function HistoryModal({ record, history, loading, onClose }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="my-auto max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-violet-100 px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><FileClock size={21} /></div><div><h2 className="font-extrabold text-slate-900">Record history</h2><p className="mt-1 text-xs text-slate-500">{displayId(record.resource, record)}</p></div></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-violet-50" aria-label="Close history"><X size={19} /></button></header>
      <div className="p-5 sm:p-6">
        {loading ? <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500"><RefreshCw size={24} className="animate-spin text-violet-700" />Loading history...</div> : history.length === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-400"><FileClock size={32} /><strong className="text-sm text-slate-700">No history available</strong><span className="text-xs">No history entries were returned by the API.</span></div> : <div className="space-y-5">{history.map((item, index) => <article key={item._id || `${item.action}-${index}`} className="relative grid grid-cols-[12px_minmax(0,1fr)] gap-3"><span className="mt-1.5 h-3 w-3 rounded-full border-2 border-violet-200 bg-violet-700" /><div className="min-w-0 border-b border-slate-100 pb-4"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-sm text-slate-800">{label(item.action)}</strong><time className="text-[11px] text-slate-400">{dateText(item.performedAt || item.createdAt)}</time></div><p className="mt-2 text-xs leading-5 text-slate-600">{item.description || "Record updated"}</p>{item.performedByName && <small className="mt-1 block text-xs text-slate-400">By {item.performedByName}</small>}{item.changes && Object.keys(item.changes).length > 0 && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-violet-50 p-3 text-[11px] text-violet-800">{JSON.stringify(item.changes, null, 2)}</pre>}</div></article>)}</div>}
      </div>
    </section>
  </div>;
}

export default function SuperAdminOperationalDesk() {
  const [activeResource, setActiveResource] = useState("calls");
  const [records, setRecords] = useState({ calls: [], tickets: [], installations: [], vehicles: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [modalRecord, setModalRecord] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const clearMessages = () => { setError(""); setSuccess(""); };
  const loadResource = useCallback(async (resource = activeResource) => {
    setLoading(true); setError("");
    try {
      const response = await api.get(`${API}/${resource}`);
      setRecords(previous => ({ ...previous, [resource]: unwrap(response) }));
    } catch (err) {
      console.error(`LOAD ${resource.toUpperCase()} ERROR:`, err);
      setError(errorMessage(err));
    } finally { setLoading(false); }
  }, [activeResource]);

  const loadAllResources = useCallback(async () => {
    setLoading(true); setError("");
    const resources = Object.keys(MODULES);
    const results = await Promise.allSettled(resources.map(resource => api.get(`${API}/${resource}`)));
    const next = {}; const failures = [];
    results.forEach((result, index) => {
      const resource = resources[index];
      if (result.status === "fulfilled") next[resource] = unwrap(result.value);
      else { next[resource] = records[resource] || []; failures.push(`${MODULES[resource].label}: ${errorMessage(result.reason)}`); }
    });
    setRecords(previous => ({ ...previous, ...next }));
    if (failures.length) setError(failures.join(" | "));
    setLoading(false);
  }, [records]);

  useEffect(() => { loadResource(activeResource); }, [activeResource, loadResource]);

  const currentRecords = records[activeResource] || [];
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return currentRecords.filter(record => {
      const searchable = [displayId(activeResource, record), primary(activeResource, record), secondary(activeResource, record), record.customerPhone, record.driverPhone, record.assignedRoute, record.siteAddress, record.subject].filter(Boolean).join(" ").toLowerCase();
      const matchesStatus = statusFilter === "ALL" || statusOf(record) === statusFilter;
      const matchesPriority = activeResource !== "tickets" || priorityFilter === "ALL" || record.priority === priorityFilter;
      return (!query || searchable.includes(query)) && matchesStatus && matchesPriority;
    });
  }, [currentRecords, activeResource, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => {
    const count = key => (records[key] || []).length;
    return {
      total: count("calls") + count("tickets") + count("installations") + count("vehicles"),
      calls: count("calls"), tickets: count("tickets"),
      openTickets: (records.tickets || []).filter(item => ["OPEN", "IN_PROGRESS", "ON_HOLD"].includes(item.status)).length,
      activeInstallations: (records.installations || []).filter(item => !["COMPLETED", "CANCELLED"].includes(item.status)).length,
    };
  }, [records]);

  const openCreate = () => { clearMessages(); setModalRecord(null); setShowForm(true); };
  const openEdit = record => { clearMessages(); setModalRecord(record); setShowForm(true); };

  const saveRecord = async payload => {
    setSaving(true); clearMessages();
    try {
      if (modalRecord) {
        await api.patch(`${API}/${activeResource}/${idOf(modalRecord)}`, payload);
        setSuccess(`${MODULES[activeResource].singular} updated successfully.`);
      } else {
        await api.post(`${API}/${activeResource}`, payload);
        setSuccess(`${MODULES[activeResource].singular} created successfully.`);
      }
      setShowForm(false); setModalRecord(null); await loadResource(activeResource);
    } catch (err) { console.error("SAVE OPERATIONAL RECORD ERROR:", err); setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const deleteRecord = async record => {
    const id = idOf(record);
    if (!id) { setError("This record does not have a valid ID."); return; }
    if (!window.confirm(`Delete ${MODULES[activeResource].singular} "${displayId(activeResource, record)}"?`)) return;
    clearMessages();
    try { await api.delete(`${API}/${activeResource}/${id}`); setSuccess(`${MODULES[activeResource].singular} deleted successfully.`); await loadResource(activeResource); }
    catch (err) { console.error("DELETE OPERATIONAL RECORD ERROR:", err); setError(errorMessage(err)); }
  };

  const openHistory = async record => {
    const id = idOf(record);
    if (!id) { setError("Cannot load history because this record has no ID."); return; }
    setHistoryRecord({ ...record, resource: activeResource }); setHistory([]); setHistoryLoading(true);
    try { setHistory(unwrap(await api.get(`${API}/${activeResource}/${id}/history`))); }
    catch (err) { console.error("LOAD RECORD HISTORY ERROR:", err); setError(errorMessage(err)); }
    finally { setHistoryLoading(false); }
  };

  const signOffInstallation = async record => {
    const notes = window.prompt("Enter installation sign-off notes:", record.signOffNotes || "");
    if (notes === null) return;
    clearMessages();
    try {
      await api.post(`${API}/installations/${idOf(record)}/sign-off`, { signOffNotes: notes });
      setSuccess("Installation sign-off submitted successfully."); await loadResource("installations");
    } catch (err) { console.error("INSTALLATION SIGN-OFF ERROR:", err); setError(errorMessage(err)); }
  };

  const exportCsv = () => {
    const rows = filteredRecords.map(record => ({
      ID: displayId(activeResource, record), Name: primary(activeResource, record),
      Details: secondary(activeResource, record), Status: statusOf(record),
      Priority: record.priority || "", Created: record.createdAt || "", Updated: record.updatedAt || "",
    }));
    if (!rows.length) { setError("There are no records to export."); return; }
    const headers = Object.keys(rows[0]);
    const escapeCsv = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(escapeCsv).join(","), ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `operational-${activeResource}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  const ActiveIcon = MODULES[activeResource].icon;
  const Button = ({ children, onClick, secondary = false, disabled = false, className = "", type = "button" }) => <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${secondary ? "border border-violet-100 bg-white text-violet-800 hover:bg-violet-50" : "bg-violet-700 text-white shadow-sm hover:bg-violet-800"} ${className}`}>{children}</button>;

  return <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-violet-50/50 p-3 text-slate-800 sm:p-5 lg:p-7">
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 text-white shadow-lg shadow-violet-200"><Activity size={25} /></div>
          <div className="min-w-0"><h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">Operational Execution Desk</h1><p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Manage calls, customer support, installation operations and fleet activity.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button secondary onClick={loadAllResources} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh all</Button>
          <Button onClick={openCreate}><Plus size={16} />Add {MODULES[activeResource].singular}</Button>
        </div>
      </header>

      {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><X size={17} className="mt-0.5 shrink-0" /><span className="min-w-0 flex-1 break-words">{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
      {success && <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0" /><span className="min-w-0 flex-1">{success}</span><button onClick={() => setSuccess("")} aria-label="Dismiss success"><X size={16} /></button></div>}

      <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric title="Total records" value={counts.total} subtitle="Across all modules" icon={ClipboardList} tone="purple" />
        <Metric title="Telecalling" value={counts.calls} subtitle="Customer call records" icon={Phone} tone="blue" />
        <Metric title="Open support tickets" value={counts.openTickets} subtitle="Awaiting closure" icon={Headphones} tone="orange" />
        <Metric title="Active installations" value={counts.activeInstallations} subtitle="Not completed or cancelled" icon={Package} tone="green" />
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)] xl:gap-5">
        <aside className="min-w-0 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
          <p className="px-3 pb-3 pt-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Operations</p>
          <nav className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {Object.entries(MODULES).map(([key, module]) => {
              const NavIcon = module.icon; const active = activeResource === key;
              return <button key={key} type="button" onClick={() => { setActiveResource(key); setSearch(""); setStatusFilter("ALL"); setPriorityFilter("ALL"); clearMessages(); }} className={`flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-3 text-left text-xs font-bold transition ${active ? "bg-violet-100 text-violet-800 ring-1 ring-violet-200" : "text-slate-600 hover:bg-violet-50 hover:text-violet-800"}`}><NavIcon size={17} className="shrink-0" /><span className="min-w-0 flex-1">{module.label}</span><span className={`rounded-lg px-2 py-1 text-[10px] ${active ? "bg-white text-violet-800" : "bg-slate-100 text-slate-500"}`}>{records[key]?.length || 0}</span></button>;
            })}
          </nav>
        </aside>

        <main className="min-w-0 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
          <header className="flex flex-col justify-between gap-4 border-b border-violet-100 p-4 sm:p-5 xl:flex-row xl:items-center">
            <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><ActiveIcon size={21} /></div><div className="min-w-0"><h2 className="font-extrabold text-slate-900">{MODULES[activeResource].label}</h2><p className="mt-1 text-xs text-slate-500">{MODULES[activeResource].description}</p></div></div>
            <div className="flex flex-wrap gap-2"><Button secondary onClick={exportCsv}><Download size={15} />Export CSV</Button><Button onClick={openCreate}><Plus size={16} />Add new</Button></div>
          </header>

          <div className="flex flex-wrap items-center gap-2.5 border-b border-violet-100 p-3 sm:p-4">
            <div className="relative min-w-[180px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, customer, phone or details..." aria-label="Search records" className="h-10 w-full rounded-xl border border-violet-100 bg-white pl-9 pr-3 text-xs outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status" className="h-10 min-w-0 flex-1 rounded-xl border border-violet-100 bg-white px-3 text-xs outline-none focus:border-violet-400 sm:flex-none"><option value="ALL">All statuses</option>{MODULES[activeResource].statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select>
            {activeResource === "tickets" && <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} aria-label="Filter by priority" className="h-10 min-w-0 flex-1 rounded-xl border border-violet-100 bg-white px-3 text-xs outline-none focus:border-violet-400 sm:flex-none"><option value="ALL">All priorities</option>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(priority => <option key={priority} value={priority}>{label(priority)}</option>)}</select>}
            <span className="w-full text-right text-[11px] text-slate-400 sm:w-auto">{filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"}</span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-violet-50/70"><tr>{["Record ID", "Details", "Status", ...(activeResource === "tickets" ? ["Priority"] : activeResource === "calls" ? ["Direction"] : activeResource === "installations" ? ["Scheduled"] : ["Driver"]), "Last updated", "Actions"].map(name => <th key={name} className="whitespace-nowrap border-b border-violet-100 px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{name}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={activeResource === "tickets" ? 6 : 5} className="px-4 py-14 text-center text-sm text-slate-500"><RefreshCw size={22} className="mx-auto mb-3 animate-spin text-violet-700" />Loading records...</td></tr>
                  : filteredRecords.length === 0 ? <tr><td colSpan={activeResource === "tickets" ? 6 : 5} className="px-4 py-14 text-center"><div className="flex flex-col items-center gap-3"><ActiveIcon size={32} className="text-violet-300" /><strong className="text-sm text-slate-700">No records found</strong><span className="text-xs text-slate-400">Create a new record or adjust your search and filters.</span><Button onClick={openCreate}><Plus size={15} />Create {MODULES[activeResource].singular}</Button></div></td></tr>
                  : filteredRecords.map(record => <tr key={idOf(record)} className="hover:bg-violet-50/40">
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-violet-700">{displayId(activeResource, record)}</td>
                    <td className="max-w-[280px] px-4 py-4"><strong className="block break-words text-xs font-bold text-slate-800">{primary(activeResource, record)}</strong><small className="mt-1 block break-words text-xs leading-5 text-slate-400">{secondary(activeResource, record)}</small></td>
                    <td className="px-4 py-4"><Badge value={statusOf(record)} /></td>
                    {activeResource === "tickets" && <td className="px-4 py-4"><Badge value={record.priority || "MEDIUM"} /></td>}
                    {activeResource === "calls" && <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-xs text-slate-600">{record.callType === "INBOUND" ? <ArrowDownLeft size={14} className="text-emerald-600" /> : <ArrowUpRight size={14} className="text-violet-600" />}{label(record.callType)}</span></td>}
                    {activeResource === "installations" && <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{dateText(record.scheduledDate)}</td>}
                    {activeResource === "vehicles" && <td className="px-4 py-4 text-xs text-slate-500">{record.driverName || "Unassigned"}</td>}
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{dateText(record.updatedAt || record.createdAt)}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-1">
                      <button type="button" title="View history" aria-label="View record history" onClick={() => openHistory(record)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-800"><Eye size={16} /></button>
                      <button type="button" title="Edit record" aria-label="Edit record" onClick={() => openEdit(record)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-800"><Edit3 size={15} /></button>
                      {activeResource === "installations" && !["COMPLETED", "CANCELLED"].includes(record.status) && <button type="button" title="Sign off installation" aria-label="Sign off installation" onClick={() => signOffInstallation(record)} className="grid h-8 w-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50"><CheckCircle2 size={16} /></button>}
                      <button type="button" title="Delete record" aria-label="Delete record" onClick={() => deleteRecord(record)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button>
                    </div></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-col gap-2 border-t border-violet-100 px-4 py-3 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-violet-600" />Super Admin operational management</span><span>Showing {filteredRecords.length} of {currentRecords.length}</span></footer>
        </main>
      </div>
    </div>

    {showForm && <RecordFormModal resource={activeResource} record={modalRecord} saving={saving} onClose={() => { if (!saving) { setShowForm(false); setModalRecord(null); } }} onSave={saveRecord} />}
    {historyRecord && <HistoryModal record={historyRecord} history={history} loading={historyLoading} onClose={() => setHistoryRecord(null)} />}
  </div>;
}
