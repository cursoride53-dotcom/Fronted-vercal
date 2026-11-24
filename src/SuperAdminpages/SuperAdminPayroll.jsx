
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "../services/firebase";
import {
  Wallet,
  Users,
  IndianRupee,
  CalendarDays,
  RefreshCw,
  Search,
  Settings2,
  CheckCircle2,
  Clock3,
  Banknote,
  Eye,
  X,
  Calculator,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const EMPTY_SALARY = {
  basicSalary: "",
  hra: "0",
  conveyanceAllowance: "0",
  otherAllowances: "0",
  professionalTax: "0",
  providentFund: "0",
  otherDeductions: "0",
  salaryCalculationMethod: "WORKING_DAYS",
  standardWorkingDays: "26",
  paidLeaveEnabled: true,
  deductUnpaidLeave: true,
  deductUnapprovedAbsence: true,
  halfDayFactor: "0.5",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  notes: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const number = (value) => Number(value) || 0;

const getItems = (response, keys = []) => {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;

  return [];
};

const getRecord = (response) =>
  response?.data?.payroll ||
  response?.data?.salary ||
  response?.data?.record ||
  response?.payroll ||
  response?.salary ||
  response?.record ||
  response?.data ||
  response;

const getErrorMessage = (error) =>
  error?.message || "Something went wrong. Please try again.";

const getEmployeeName = (item) =>
  item?.employeeName ||
  item?.name ||
  item?.fullName ||
  item?.employee?.name ||
  item?.employee?.fullName ||
  "Unnamed employee";

const getEmployeeId = (item) =>
  item?.employee?._id ||
  item?.employee?.id ||
  item?.employee ||
  item?.employeeId ||
  item?._id ||
  item?.id ||
  "";

const getMonthLabel = (month) => {
  if (!month) return "—";

  const date = new Date(`${month}-01T00:00:00`);

  return Number.isNaN(date.getTime())
    ? month
    : date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
};

const statusClass = (status) => {
  const value = String(status || "").toUpperCase();

  if (["PAID", "APPROVED", "ACTIVE"].includes(value)) {
    return "sp-status sp-status-success";
  }

  if (["CALCULATED", "DRAFT", "PENDING"].includes(value)) {
    return "sp-status sp-status-warning";
  }

  if (["CANCELLED", "REJECTED", "INACTIVE"].includes(value)) {
    return "sp-status sp-status-danger";
  }

  return "sp-status sp-status-neutral";
};

const downloadCsv = (rows, filename) => {
  if (!rows.length) return;

  const escapeCsv = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

export default function SuperAdminPayroll() {
  const [activeTab, setActiveTab] = useState("payroll");
  const [payrollMonth, setPayrollMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [payroll, setPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salaryForm, setSalaryForm] = useState(EMPTY_SALARY);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentPayroll, setPaymentPayroll] = useState(null);
  const [paymentReference, setPaymentReference] = useState("");

  const [confirmAction, setConfirmAction] = useState(null);

  const apiRequest = useCallback(async (path, options = {}) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    let result;

    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    if (!response.ok) {
      throw new Error(
        typeof result === "object"
          ? result.message ||
              result.error ||
              `Request failed (${response.status})`
          : result || `Request failed (${response.status})`
      );
    }

    return result;
  }, []);

  const loadData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);

      setError("");

      try {
        const [payrollResult, employeesResult, salariesResult] =
          await Promise.all([
            apiRequest(
              `/payroll/admin?payrollMonth=${encodeURIComponent(payrollMonth)}`
            ),
            apiRequest("/payroll/admin/employees"),
            apiRequest("/payroll/admin/salaries"),
          ]);

        setPayroll(
          getItems(payrollResult, ["payroll", "records", "results", "items"])
        );

        setEmployees(
          getItems(employeesResult, ["employees", "results", "items"])
        );

        setSalaries(
          getItems(salariesResult, ["salaries", "results", "items"])
        );
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [apiRequest, payrollMonth]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const salaryByEmployee = useMemo(() => {
    const map = new Map();

    salaries.forEach((salary) => {
      const id = String(getEmployeeId(salary));
      if (id) map.set(id, salary);
    });

    return map;
  }, [salaries]);

  const configuredEmployeeIds = useMemo(
    () => new Set(salaries.map((item) => String(getEmployeeId(item)))),
    [salaries]
  );

  const filteredPayroll = useMemo(() => {
    const term = search.trim().toLowerCase();

    return payroll.filter((item) => {
      const employeeName = getEmployeeName(item).toLowerCase();
      const employeeCode = String(item.employeeCode || "").toLowerCase();
      const status = String(item.status || "").toUpperCase();

      const matchesSearch =
        !term ||
        employeeName.includes(term) ||
        employeeCode.includes(term) ||
        String(item.payrollMonth || "").includes(term);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payroll, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayroll.length / pageSize)
  );

  const paginatedPayroll = filteredPayroll.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, payrollMonth]);

  const stats = useMemo(() => {
    return payroll.reduce(
      (totals, item) => {
        const status = String(item.status || "").toUpperCase();

        totals.gross += number(item.grossSalary);
        totals.net += number(item.netSalary);
        totals.deductions += number(item.totalDeductions);

        if (status === "PAID") totals.paid += number(item.netSalary);
        if (status === "APPROVED") totals.approved += 1;
        if (status === "CALCULATED" || status === "DRAFT") {
          totals.pending += 1;
        }

        return totals;
      },
      {
        gross: 0,
        net: 0,
        deductions: 0,
        paid: 0,
        approved: 0,
        pending: 0,
      }
    );
  }, [payroll]);

  const showSuccess = (message) => {
    setSuccess(message);
    setError("");

    window.setTimeout(() => {
      setSuccess("");
    }, 4000);
  };

  const openSalaryModal = (employee, existingSalary = null) => {
    setSelectedEmployee(employee);

    if (existingSalary) {
      setSalaryForm({
        ...EMPTY_SALARY,
        ...existingSalary,
        basicSalary: String(existingSalary.basicSalary ?? ""),
        hra: String(existingSalary.hra ?? 0),
        conveyanceAllowance: String(
          existingSalary.conveyanceAllowance ?? 0
        ),
        otherAllowances: String(existingSalary.otherAllowances ?? 0),
        professionalTax: String(existingSalary.professionalTax ?? 0),
        providentFund: String(existingSalary.providentFund ?? 0),
        otherDeductions: String(existingSalary.otherDeductions ?? 0),
        standardWorkingDays: String(
          existingSalary.standardWorkingDays ?? 26
        ),
        halfDayFactor: String(existingSalary.halfDayFactor ?? 0.5),
        effectiveFrom: existingSalary.effectiveFrom
          ? String(existingSalary.effectiveFrom).slice(0, 10)
          : EMPTY_SALARY.effectiveFrom,
        notes: existingSalary.notes || "",
      });
    } else {
      setSalaryForm(EMPTY_SALARY);
    }

    setSalaryModalOpen(true);
    setError("");
  };

  const saveSalary = async (event) => {
    event.preventDefault();

    if (!selectedEmployee) return;

    if (
      salaryForm.basicSalary === "" ||
      number(salaryForm.basicSalary) <= 0
    ) {
      setError("Enter a basic monthly salary greater than zero.");
      return;
    }

    const employeeId = getEmployeeId(selectedEmployee);

    if (!employeeId || typeof employeeId !== "string") {
      setError("The selected employee has an invalid employee ID.");
      return;
    }

    const payload = {
      basicSalary: number(salaryForm.basicSalary),
      hra: number(salaryForm.hra),
      conveyanceAllowance: number(salaryForm.conveyanceAllowance),
      otherAllowances: number(salaryForm.otherAllowances),
      professionalTax: number(salaryForm.professionalTax),
      providentFund: number(salaryForm.providentFund),
      otherDeductions: number(salaryForm.otherDeductions),
      salaryCalculationMethod: salaryForm.salaryCalculationMethod,
      standardWorkingDays: number(salaryForm.standardWorkingDays),
      paidLeaveEnabled: Boolean(salaryForm.paidLeaveEnabled),
      deductUnpaidLeave: Boolean(salaryForm.deductUnpaidLeave),
      deductUnapprovedAbsence: Boolean(
        salaryForm.deductUnapprovedAbsence
      ),
      halfDayFactor: number(salaryForm.halfDayFactor),
      effectiveFrom: salaryForm.effectiveFrom,
      notes: salaryForm.notes,
    };

    setSaving(true);
    setError("");

    try {
      await apiRequest(`/payroll/admin/salaries/${employeeId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setSalaryModalOpen(false);
      showSuccess("Employee salary settings saved successfully.");
      await loadData(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const generatePayroll = async () => {
    if (!payrollMonth) {
      setError("Select a payroll month first.");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const result = await apiRequest("/payroll/admin/generate", {
        method: "POST",
        body: JSON.stringify({ payrollMonth }),
      });

      showSuccess(
        result?.message || `Payroll generated for ${getMonthLabel(payrollMonth)}.`
      );

      await loadData(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
      setConfirmAction(null);
    }
  };

  const openPayrollDetails = async (item) => {
    setError("");

    try {
      const id = item._id || item.id;

      if (!id) {
        setSelectedPayroll(item);
        setDetailsModalOpen(true);
        return;
      }

      const result = await apiRequest(`/payroll/admin/${id}`);

      setSelectedPayroll(getRecord(result));
      setDetailsModalOpen(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const approvePayroll = async (item) => {
    const id = item._id || item.id;

    if (!id) {
      setError("Payroll record ID is missing.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await apiRequest(`/payroll/admin/${id}/approve`, {
        method: "PATCH",
      });

      showSuccess(result?.message || "Payroll approved successfully.");
      setConfirmAction(null);
      await loadData(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (item) => {
    setPaymentPayroll(item);
    setPaymentReference("");
    setPaymentModalOpen(true);
    setError("");
  };

  const markPayrollPaid = async (event) => {
    event.preventDefault();

    const id = paymentPayroll?._id || paymentPayroll?.id;

    if (!id) {
      setError("Payroll record ID is missing.");
      return;
    }

    if (!paymentReference.trim()) {
      setError("Enter a bank transaction or payment reference.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await apiRequest(
        `/payroll/admin/${id}/mark-paid`,
        {
          method: "PATCH",
          body: JSON.stringify({
            paymentReference: paymentReference.trim(),
          }),
        }
      );

      setPaymentModalOpen(false);
      setPaymentPayroll(null);
      showSuccess(result?.message || "Payroll marked as paid.");
      await loadData(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const updateSalaryField = (event) => {
    const { name, value, type, checked } = event.target;

    setSalaryForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString("en-IN");
  };

  const downloadPayrollCsv = () => {
    downloadCsv(
      filteredPayroll.map((item) => [
        item.employeeCode || "",
        getEmployeeName(item),
        item.payrollMonth || payrollMonth,
        item.grossSalary,
        item.totalDeductions,
        item.netSalary,
        item.status,
        item.paymentReference || "",
      ]).length
        ? [
            [
              "Employee Code",
              "Employee Name",
              "Payroll Month",
              "Gross Salary",
              "Total Deductions",
              "Net Salary",
              "Status",
              "Payment Reference",
            ],
            ...filteredPayroll.map((item) => [
              item.employeeCode || "",
              getEmployeeName(item),
              item.payrollMonth || payrollMonth,
              item.grossSalary ?? 0,
              item.totalDeductions ?? 0,
              item.netSalary ?? 0,
              item.status || "",
              item.paymentReference || "",
            ]),
          ]
        : [],
      `payroll-${payrollMonth}.csv`
    );
  };

  const monthlyGross = useMemo(() => {
    if (!selectedEmployee) return 0;

    return (
      number(salaryForm.basicSalary) +
      number(salaryForm.hra) +
      number(salaryForm.conveyanceAllowance) +
      number(salaryForm.otherAllowances)
    );
  }, [selectedEmployee, salaryForm]);

  return (
    <div className="sp-payroll">
      <style>{`
        .sp-payroll {
          --sp-primary: #6d28d9;
          --sp-primary-dark: #4c1d95;
          --sp-primary-light: #f3e8ff;
          --sp-border: #e9e2f4;
          --sp-text: #241b35;
          --sp-muted: #786d8b;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 24px;
          color: var(--sp-text);
          background: #faf9fc;
          overflow-x: hidden;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .sp-payroll *, .sp-payroll *::before, .sp-payroll *::after {
          box-sizing: border-box;
        }

        .sp-payroll button, .sp-payroll input, .sp-payroll select, .sp-payroll textarea {
          font: inherit;
        }

        .sp-payroll button { cursor: pointer; }

        .sp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 22px;
        }

        .sp-heading { min-width: 0; }

        .sp-eyebrow {
          color: var(--sp-primary);
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin: 0 0 8px;
        }

        .sp-title {
          font-size: clamp(24px, 3vw, 32px);
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.8px;
          margin: 0;
        }

        .sp-subtitle {
          color: var(--sp-muted);
          font-size: 13px;
          line-height: 1.7;
          margin: 8px 0 0;
        }

        .sp-header-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .sp-btn {
          min-height: 40px;
          padding: 10px 14px;
          border: 1px solid var(--sp-border);
          border-radius: 10px;
          background: white;
          color: var(--sp-text);
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 750;
          transition: background .15s ease, border-color .15s ease;
        }

        .sp-btn:hover:not(:disabled) {
          border-color: #c4b5fd;
          background: #faf5ff;
        }

        .sp-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .sp-btn-primary {
          color: white;
          background: var(--sp-primary);
          border-color: var(--sp-primary);
        }

        .sp-btn-primary:hover:not(:disabled) {
          color: white;
          background: var(--sp-primary-dark);
          border-color: var(--sp-primary-dark);
        }

        .sp-btn-danger {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff;
        }

        .sp-month {
          min-height: 40px;
          min-width: 155px;
          padding: 8px 10px;
          border: 1px solid var(--sp-border);
          border-radius: 10px;
          background: #fff;
          color: var(--sp-text);
          font-size: 12px;
        }

        .sp-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .sp-stat {
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--sp-border);
          border-radius: 15px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(41, 24, 67, .025);
        }

        .sp-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 17px;
        }

        .sp-stat-label {
          color: var(--sp-muted);
          font-size: 11px;
          font-weight: 750;
        }

        .sp-stat-icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          color: var(--sp-primary);
          background: var(--sp-primary-light);
          border-radius: 10px;
        }

        .sp-stat-value {
          overflow-wrap: anywhere;
          font-size: clamp(17px, 2vw, 23px);
          font-weight: 850;
          letter-spacing: -.5px;
          line-height: 1.3;
        }

        .sp-stat-foot {
          margin-top: 6px;
          color: var(--sp-muted);
          font-size: 10px;
        }

        .sp-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 5px;
          border: 1px solid var(--sp-border);
          border-radius: 12px;
          background: #f2eef8;
          margin-bottom: 18px;
        }

        .sp-tab {
          min-height: 39px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 14px;
          border: 0;
          border-radius: 9px;
          color: var(--sp-muted);
          background: transparent;
          font-size: 12px;
          font-weight: 750;
        }

        .sp-tab.active {
          color: var(--sp-primary-dark);
          background: white;
          box-shadow: 0 2px 5px rgba(40, 20, 60, .06);
        }

        .sp-panel {
          min-width: 0;
          border: 1px solid var(--sp-border);
          border-radius: 15px;
          background: white;
          overflow: hidden;
        }

        .sp-panel-header {
          padding: 18px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid #f0ebf5;
        }

        .sp-panel-title {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }

        .sp-panel-description {
          color: var(--sp-muted);
          font-size: 11px;
          margin: 5px 0 0;
          line-height: 1.6;
        }

        .sp-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
        }

        .sp-search-wrap {
          position: relative;
          min-width: 190px;
        }

        .sp-search-icon {
          position: absolute;
          top: 50%;
          left: 11px;
          transform: translateY(-50%);
          color: #9b91a9;
          pointer-events: none;
        }

        .sp-input, .sp-select, .sp-textarea {
          display: block;
          width: 100%;
          min-width: 0;
          min-height: 40px;
          padding: 10px 12px;
          color: var(--sp-text);
          border: 1px solid #e3dbea;
          border-radius: 9px;
          background: white;
          outline: none;
          font-size: 12px;
        }

        .sp-search {
          padding-left: 34px;
        }

        .sp-input:focus, .sp-select:focus, .sp-textarea:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, .08);
        }

        .sp-label {
          display: block;
          margin: 0 0 6px;
          color: #625571;
          font-size: 11px;
          font-weight: 750;
        }

        .sp-table-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .sp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12px;
          white-space: nowrap;
        }

        .sp-table th {
          padding: 13px 15px;
          background: #faf8fc;
          color: #82768f;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .55px;
          border-bottom: 1px solid #eee8f4;
        }

        .sp-table td {
          padding: 14px 15px;
          border-bottom: 1px solid #f1edf5;
          vertical-align: middle;
        }

        .sp-table tbody tr:last-child td { border-bottom: 0; }

        .sp-table tbody tr:hover { background: #fdfbff; }

        .sp-employee {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 180px;
        }

        .sp-avatar {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          color: var(--sp-primary);
          background: var(--sp-primary-light);
          border-radius: 11px;
          font-size: 12px;
          font-weight: 850;
        }

        .sp-employee-name {
          font-size: 12px;
          font-weight: 800;
          color: var(--sp-text);
        }

        .sp-employee-code {
          color: var(--sp-muted);
          font-size: 10px;
          margin-top: 4px;
        }

        .sp-amount {
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .sp-net { color: #047857; }

        .sp-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 9px;
          border-radius: 30px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .2px;
        }

        .sp-status-success { color: #047857; background: #d1fae5; }
        .sp-status-warning { color: #92400e; background: #fef3c7; }
        .sp-status-danger { color: #b91c1c; background: #fee2e2; }
        .sp-status-neutral { color: #5b5268; background: #f1edf5; }

        .sp-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .sp-icon-btn {
          width: 33px;
          height: 33px;
          display: inline-grid;
          place-items: center;
          border: 1px solid #e9e2f0;
          border-radius: 9px;
          color: #6d5b80;
          background: white;
        }

        .sp-icon-btn:hover:not(:disabled) {
          color: var(--sp-primary);
          border-color: #c4b5fd;
          background: #faf5ff;
        }

        .sp-empty {
          padding: 45px 20px;
          text-align: center;
          color: var(--sp-muted);
        }

        .sp-empty-icon {
          display: grid;
          place-items: center;
          width: 50px;
          height: 50px;
          margin: 0 auto 12px;
          color: var(--sp-primary);
          background: var(--sp-primary-light);
          border-radius: 15px;
        }

        .sp-empty-title {
          color: var(--sp-text);
          font-weight: 800;
          font-size: 14px;
        }

        .sp-empty-text {
          max-width: 400px;
          margin: 7px auto 0;
          font-size: 12px;
          line-height: 1.7;
        }

        .sp-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          padding: 14px 18px;
          border-top: 1px solid #f0ebf5;
        }

        .sp-muted { color: var(--sp-muted); font-size: 11px; }

        .sp-pager-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .sp-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px 15px;
          border-radius: 11px;
          margin-bottom: 16px;
          font-size: 12px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .sp-alert-error {
          color: #991b1b;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .sp-alert-success {
          color: #065f46;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
        }

        .sp-loader {
          width: 17px;
          height: 17px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: sp-spin .7s linear infinite;
        }

        @keyframes sp-spin {
          to { transform: rotate(360deg); }
        }

        .sp-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(28, 18, 40, .52);
          overflow-y: auto;
        }

        .sp-modal {
          width: 100%;
          max-width: 650px;
          max-height: calc(100vh - 36px);
          overflow-y: auto;
          background: white;
          border: 1px solid #eee5f7;
          border-radius: 17px;
          box-shadow: 0 20px 80px rgba(20, 10, 35, .24);
        }

        .sp-modal-wide { max-width: 850px; }

        .sp-modal-header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 19px 22px;
          background: white;
          border-bottom: 1px solid #eee8f4;
        }

        .sp-modal-title {
          margin: 0;
          font-size: 17px;
          font-weight: 850;
        }

        .sp-modal-subtitle {
          margin: 6px 0 0;
          color: var(--sp-muted);
          font-size: 11px;
          line-height: 1.6;
        }

        .sp-modal-body { padding: 22px; }

        .sp-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .sp-form-field { min-width: 0; }

        .sp-form-field-full { grid-column: 1 / -1; }

        .sp-section-label {
          grid-column: 1 / -1;
          margin: 5px 0 -4px;
          padding-bottom: 9px;
          color: var(--sp-primary-dark);
          border-bottom: 1px solid #eee8f4;
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .7px;
        }

        .sp-checkbox-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 11px;
        }

        .sp-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          color: #5b506a;
          font-size: 11px;
          line-height: 1.6;
        }

        .sp-checkbox input {
          accent-color: var(--sp-primary);
          margin-top: 2px;
        }

        .sp-modal-footer {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 9px;
          padding: 16px 22px;
          border-top: 1px solid #eee8f4;
          background: #fdfcff;
        }

        .sp-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 15px;
          border: 1px solid #ddd0f7;
          background: #faf5ff;
          border-radius: 12px;
        }

        .sp-preview-label { color: var(--sp-muted); font-size: 10px; }
        .sp-preview-value { margin-top: 5px; font-weight: 850; font-size: 20px; color: var(--sp-primary-dark); }

        .sp-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 11px;
        }

        .sp-detail-card {
          padding: 13px;
          min-width: 0;
          border: 1px solid #eee7f5;
          border-radius: 11px;
        }

        .sp-detail-label { color: var(--sp-muted); font-size: 10px; }
        .sp-detail-value { margin-top: 7px; font-size: 13px; font-weight: 800; overflow-wrap: anywhere; }

        .sp-detail-section {
          margin-top: 22px;
          margin-bottom: 10px;
          font-size: 12px;
          font-weight: 850;
        }

        .sp-detail-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 0;
          border-bottom: 1px solid #f0ebf5;
          font-size: 11px;
        }

        .sp-detail-row span:first-child { color: var(--sp-muted); }
        .sp-detail-row span:last-child { text-align: right; font-weight: 750; }

        .sp-info {
          padding: 12px 14px;
          background: #faf5ff;
          color: #5b21b6;
          border-radius: 10px;
          font-size: 11px;
          line-height: 1.7;
        }

        .sp-loading {
          padding: 45px 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 11px;
          color: var(--sp-muted);
          font-size: 12px;
        }

        @media (max-width: 1100px) {
          .sp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 700px) {
          .sp-payroll { padding: 14px; }
          .sp-stats { gap: 9px; }
          .sp-stat { padding: 13px; }
          .sp-stat-value { font-size: 18px; }
          .sp-header-actions { width: 100%; }
          .sp-header-actions > * { flex: 1; }
          .sp-month { min-width: 0; }
          .sp-search-wrap { min-width: 100%; }
          .sp-toolbar { width: 100%; }
          .sp-toolbar > * { flex: 1; }
          .sp-form-grid { grid-template-columns: minmax(0, 1fr); }
          .sp-section-label, .sp-form-field-full { grid-column: auto; }
          .sp-checkbox-list { grid-template-columns: minmax(0, 1fr); }
          .sp-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sp-modal-body { padding: 16px; }
          .sp-modal-header { padding: 16px; }
          .sp-modal-footer { padding: 14px 16px; }
          .sp-tabs { width: 100%; }
          .sp-tab { flex: 1; padding: 9px 7px; }
        }

        @media (max-width: 390px) {
          .sp-stats { grid-template-columns: minmax(0, 1fr); }
          .sp-detail-grid { grid-template-columns: minmax(0, 1fr); }
        }

        @media (prefers-reduced-motion: reduce) {
          .sp-payroll *, .sp-payroll *::before, .sp-payroll *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="sp-header">
        <div className="sp-heading">
          <p className="sp-eyebrow">HRMSZermii · Super Admin</p>
          <h1 className="sp-title">Payroll Management</h1>
          <p className="sp-subtitle">
            Configure employee salaries, calculate attendance-based payroll,
            approve salary payments, and maintain payment references.
          </p>
        </div>

        <div className="sp-header-actions">
          <input
            className="sp-month"
            type="month"
            value={payrollMonth}
            onChange={(event) => setPayrollMonth(event.target.value)}
            aria-label="Payroll month"
          />

          <button
            className="sp-btn"
            onClick={() => loadData()}
            disabled={loading || generating}
            type="button"
          >
            {loading ? (
              <span className="sp-loader" />
            ) : (
              <RefreshCw size={15} />
            )}
            Refresh
          </button>

          <button
            className="sp-btn sp-btn-primary"
            onClick={() =>
              setConfirmAction({ type: "generate" })
            }
            disabled={loading || generating}
            type="button"
          >
            {generating ? (
              <span className="sp-loader" />
            ) : (
              <Calculator size={15} />
            )}
            Generate Payroll
          </button>
        </div>
      </div>

      {error && (
        <div className="sp-alert sp-alert-error" role="alert">
          <AlertCircle size={17} />
          <div>{error}</div>
          <button
            className="sp-icon-btn"
            style={{ marginLeft: "auto", flexShrink: 0 }}
            onClick={() => setError("")}
            type="button"
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {success && (
        <div className="sp-alert sp-alert-success" role="status">
          <CheckCircle2 size={17} />
          <div>{success}</div>
        </div>
      )}

      <div className="sp-stats">
        <div className="sp-stat">
          <div className="sp-stat-top">
            <span className="sp-stat-label">Gross Salary</span>
            <span className="sp-stat-icon">
              <TrendingUp size={17} />
            </span>
          </div>
          <div className="sp-stat-value">{money(stats.gross)}</div>
          <div className="sp-stat-foot">
            {getMonthLabel(payrollMonth)}
          </div>
        </div>

        <div className="sp-stat">
          <div className="sp-stat-top">
            <span className="sp-stat-label">Total Deductions</span>
            <span className="sp-stat-icon">
              <IndianRupee size={17} />
            </span>
          </div>
          <div className="sp-stat-value">{money(stats.deductions)}</div>
          <div className="sp-stat-foot">Recorded payroll deductions</div>
        </div>

        <div className="sp-stat">
          <div className="sp-stat-top">
            <span className="sp-stat-label">Net Salary</span>
            <span className="sp-stat-icon">
              <Wallet size={17} />
            </span>
          </div>
          <div className="sp-stat-value">{money(stats.net)}</div>
          <div className="sp-stat-foot">After recorded deductions</div>
        </div>

        <div className="sp-stat">
          <div className="sp-stat-top">
            <span className="sp-stat-label">Paid Payroll</span>
            <span className="sp-stat-icon">
              <Banknote size={17} />
            </span>
          </div>
          <div className="sp-stat-value">{money(stats.paid)}</div>
          <div className="sp-stat-foot">
            {stats.pending} pending · {stats.approved} approved
          </div>
        </div>
      </div>

      <div className="sp-tabs">
        <button
          className={`sp-tab ${activeTab === "payroll" ? "active" : ""}`}
          onClick={() => setActiveTab("payroll")}
          type="button"
        >
          <Wallet size={15} /> Monthly Payroll
        </button>

        <button
          className={`sp-tab ${activeTab === "salaries" ? "active" : ""}`}
          onClick={() => setActiveTab("salaries")}
          type="button"
        >
          <Settings2 size={15} /> Salary Settings
        </button>
      </div>

      {activeTab === "payroll" && (
        <section className="sp-panel">
          <div className="sp-panel-header">
            <div>
              <h2 className="sp-panel-title">Monthly Payroll Register</h2>
              <p className="sp-panel-description">
                {getMonthLabel(payrollMonth)} · Review calculated salary,
                deductions, approval status, and payments.
              </p>
            </div>

            <div className="sp-toolbar">
              <div className="sp-search-wrap">
                <Search
                  size={15}
                  className="sp-search-icon"
                />
                <input
                  className="sp-input sp-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee..."
                  aria-label="Search payroll"
                />
              </div>

              <select
                className="sp-select"
                style={{ width: "auto", minWidth: 125 }}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter payroll status"
              >
                <option value="ALL">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="CALCULATED">Calculated</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                className="sp-btn"
                type="button"
                onClick={downloadPayrollCsv}
                disabled={!filteredPayroll.length}
              >
                <FileText size={14} /> Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="sp-loading">
              <span className="sp-loader" />
              Loading payroll records...
            </div>
          ) : paginatedPayroll.length === 0 ? (
            <div className="sp-empty">
              <div className="sp-empty-icon">
                <CalendarDays size={23} />
              </div>
              <div className="sp-empty-title">No payroll records found</div>
              <p className="sp-empty-text">
                No payroll records match the selected month and filters.
                Configure employee salaries and generate payroll to begin.
              </p>
              <button
                className="sp-btn sp-btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => setActiveTab("salaries")}
                type="button"
              >
                Configure Salaries
              </button>
            </div>
          ) : (
            <>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Payroll Month</th>
                      <th>Gross Salary</th>
                      <th>Deductions</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedPayroll.map((item, index) => {
                      const id = item._id || item.id || index;
                      const status = String(item.status || "").toUpperCase();

                      return (
                        <tr key={id}>
                          <td>
                            <div className="sp-employee">
                              <div className="sp-avatar">
                                {getEmployeeName(item)
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((word) => word[0])
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div className="sp-employee-name">
                                  {getEmployeeName(item)}
                                </div>
                                <div className="sp-employee-code">
                                  {item.employeeCode || "Employee"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            {getMonthLabel(item.payrollMonth || payrollMonth)}
                          </td>

                          <td className="sp-amount">
                            {money(item.grossSalary)}
                          </td>

                          <td className="sp-amount">
                            {money(item.totalDeductions)}
                          </td>

                          <td className="sp-amount sp-net">
                            {money(item.netSalary)}
                          </td>

                          <td>
                            <span className={statusClass(status)}>
                              {status || "UNKNOWN"}
                            </span>
                          </td>

                          <td>
                            <div className="sp-actions">
                              <button
                                className="sp-icon-btn"
                                type="button"
                                title="View payroll details"
                                aria-label="View payroll details"
                                onClick={() => openPayrollDetails(item)}
                              >
                                <Eye size={15} />
                              </button>

                              {(status === "CALCULATED" ||
                                status === "DRAFT") && (
                                <button
                                  className="sp-icon-btn"
                                  type="button"
                                  title="Approve payroll"
                                  aria-label="Approve payroll"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "approve",
                                      item,
                                    })
                                  }
                                >
                                  <ShieldCheck size={15} />
                                </button>
                              )}

                              {status === "APPROVED" && (
                                <button
                                  className="sp-icon-btn"
                                  type="button"
                                  title="Mark payroll as paid"
                                  aria-label="Mark payroll as paid"
                                  onClick={() => openPaymentModal(item)}
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

              <div className="sp-pagination">
                <span className="sp-muted">
                  Showing {Math.min((page - 1) * pageSize + 1, filteredPayroll.length)}
                  {"–"}
                  {Math.min(page * pageSize, filteredPayroll.length)} of{" "}
                  {filteredPayroll.length} records
                </span>

                <div className="sp-pager-actions">
                  <button
                    className="sp-icon-btn"
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="sp-muted">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    className="sp-icon-btn"
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === "salaries" && (
        <section className="sp-panel">
          <div className="sp-panel-header">
            <div>
              <h2 className="sp-panel-title">Employee Salary Configuration</h2>
              <p className="sp-panel-description">
                Set monthly salary components, attendance calculation rules,
                leave policies, and deductions.
              </p>
            </div>

            <div className="sp-toolbar">
              <div className="sp-search-wrap">
                <Search size={15} className="sp-search-icon" />
                <input
                  className="sp-input sp-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employees..."
                  aria-label="Search employees"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="sp-loading">
              <span className="sp-loader" />
              Loading employee salary settings...
            </div>
          ) : employees.length === 0 ? (
            <div className="sp-empty">
              <div className="sp-empty-icon">
                <Users size={23} />
              </div>
              <div className="sp-empty-title">No employees found</div>
              <p className="sp-empty-text">
                The employee API returned no employee records. Verify your
                employee model and backend response.
              </p>
            </div>
          ) : (
            <>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Basic Salary</th>
                      <th>Monthly Gross</th>
                      <th>Calculation Method</th>
                      <th>Configuration</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {employees
                      .filter((employee) => {
                        const term = search.trim().toLowerCase();

                        return (
                          !term ||
                          getEmployeeName(employee).toLowerCase().includes(term) ||
                          String(
                            employee.employeeCode || employee.code || ""
                          ).toLowerCase().includes(term)
                        );
                      })
                      .map((employee, index) => {
                        const id = String(getEmployeeId(employee));
                        const salary = salaryByEmployee.get(id);
                        const gross = salary
                          ? number(salary.basicSalary) +
                            number(salary.hra) +
                            number(salary.conveyanceAllowance) +
                            number(salary.otherAllowances)
                          : 0;

                        return (
                          <tr key={id || index}>
                            <td>
                              <div className="sp-employee">
                                <div className="sp-avatar">
                                  {getEmployeeName(employee)
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((word) => word[0])
                                    .join("")
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <div className="sp-employee-name">
                                    {getEmployeeName(employee)}
                                  </div>
                                  <div className="sp-employee-code">
                                    {employee.employeeCode ||
                                      employee.code ||
                                      "Employee"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="sp-amount">
                              {salary ? money(salary.basicSalary) : "Not set"}
                            </td>

                            <td className="sp-amount">
                              {salary ? money(gross) : "—"}
                            </td>

                            <td>
                              {salary?.salaryCalculationMethod || "—"}
                            </td>

                            <td>
                              <span
                                className={statusClass(
                                  salary?.status ||
                                    (configuredEmployeeIds.has(id)
                                      ? "ACTIVE"
                                      : "INACTIVE")
                                )}
                              >
                                {salary
                                  ? salary.status || "CONFIGURED"
                                  : "NOT CONFIGURED"}
                              </span>
                            </td>

                            <td>
                              <button
                                className="sp-btn"
                                type="button"
                                onClick={() =>
                                  openSalaryModal(employee, salary || null)
                                }
                              >
                                <Settings2 size={14} />
                                {salary ? "Edit Salary" : "Set Salary"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="sp-pagination">
                <span className="sp-muted">
                  {employees.length} employee records · {salaries.length} salary
                  configurations
                </span>
                <button
                  className="sp-btn"
                  type="button"
                  onClick={() => loadData()}
                  disabled={loading}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {salaryModalOpen && selectedEmployee && (
        <div
          className="sp-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setSalaryModalOpen(false);
            }
          }}
        >
          <form className="sp-modal sp-modal-wide" onSubmit={saveSalary}>
            <div className="sp-modal-header">
              <div>
                <h2 className="sp-modal-title">Employee Salary Settings</h2>
                <p className="sp-modal-subtitle">
                  {getEmployeeName(selectedEmployee)} ·{" "}
                  {selectedEmployee.employeeCode ||
                    selectedEmployee.code ||
                    "Employee"}
                </p>
              </div>

              <button
                className="sp-icon-btn"
                type="button"
                disabled={saving}
                onClick={() => setSalaryModalOpen(false)}
                aria-label="Close salary settings"
              >
                <X size={17} />
              </button>
            </div>

            <div className="sp-modal-body">
              <div className="sp-form-grid">
                <div className="sp-section-label">Monthly earnings</div>

                <div className="sp-form-field">
                  <label className="sp-label">Basic Salary (₹) *</label>
                  <input
                    className="sp-input"
                    type="number"
                    name="basicSalary"
                    min="1"
                    step="0.01"
                    value={salaryForm.basicSalary}
                    onChange={updateSalaryField}
                    required
                  />
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">HRA (₹)</label>
                  <input
                    className="sp-input"
                    type="number"
                    name="hra"
                    min="0"
                    step="0.01"
                    value={salaryForm.hra}
                    onChange={updateSalaryField}
                  />
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">Conveyance Allowance (₹)</label>
                  <input
                    className="sp-input"
                    type="number"
                    name="conveyanceAllowance"
                    min="0"
                    step="0.01"
                    value={salaryForm.conveyanceAllowance}
                    onChange={updateSalaryField}
                  />
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">Other Allowances (₹)</label>
                  <input
                    className="sp-input"
                    type="number"
                    name="otherAllowances"
                    min="0"
                    step="0.01"
                    value={salaryForm.otherAllowances}
                    onChange={updateSalaryField}
                  />
                </div>

                <div className="sp-preview sp-form-field-full">
                  <div>
                    <div className="sp-preview-label">
                      Monthly Gross Salary Preview
                    </div>
                    <div className="sp-preview-value">
                      {money(monthlyGross)}
                    </div>
                  </div>
                  <CircleDollarSign size={27} color="#6d28d9" />
                </div>

                <div className="sp-section-label">Deductions</div>

                <div className="sp-form-field">
                  <label className="sp-label">Professional Tax (₹)</label>
                  <input
                    className="sp-input"
                    type="number"
                    name="professionalTax"
                    min="0"
                    step="0.01"
                    value={salaryForm.professionalTax}
                    onChange={updateSalaryField}
                  />
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">Provident Fund (₹)</label>
                  <input
                    className="sp-input"
                    type="number"
                    name="providentFund"
                    min="0"
                    step="0.01"
                    value={salaryForm.providentFund}
                    onChange={updateSalaryField}
                  />
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">Other Deductions (₹)</label>
                  <input
                    className="sp-input"
                    type="number"
                    name="otherDeductions"
                    min="0"
                    step="0.01"
                    value={salaryForm.otherDeductions}
                    onChange={updateSalaryField}
                  />
                </div>

                <div className="sp-section-label">
                  Attendance and salary calculation
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">Calculation Method</label>
                  <select
                    className="sp-select"
                    name="salaryCalculationMethod"
                    value={salaryForm.salaryCalculationMethod}
                    onChange={updateSalaryField}
                  >
                    <option value="WORKING_DAYS">Working Days</option>
                    <option value="CALENDAR_DAYS">Calendar Days</option>
                    <option value="FIXED_30">Fixed 30 Days</option>
                  </select>
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">
                    Standard Working Days per Month
                  </label>
                  <input
                    className="sp-input"
                    type="number"
                    name="standardWorkingDays"
                    min="1"
                    max="31"
                    value={salaryForm.standardWorkingDays}
                    onChange={updateSalaryField}
                    required
                  />
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">Half-Day Salary Factor</label>
                  <select
                    className="sp-select"
                    name="halfDayFactor"
                    value={salaryForm.halfDayFactor}
                    onChange={updateSalaryField}
                  >
                    <option value="0.5">50% (Half Day)</option>
                    <option value="0.25">25%</option>
                    <option value="0">0%</option>
                  </select>
                </div>

                <div className="sp-form-field">
                  <label className="sp-label">Effective From</label>
                  <input
                    className="sp-input"
                    type="date"
                    name="effectiveFrom"
                    value={salaryForm.effectiveFrom}
                    onChange={updateSalaryField}
                    required
                  />
                </div>

                <div className="sp-form-field sp-form-field-full">
                  <label className="sp-label">Leave and Attendance Rules</label>

                  <div className="sp-checkbox-list">
                    <label className="sp-checkbox">
                      <input
                        type="checkbox"
                        name="paidLeaveEnabled"
                        checked={Boolean(salaryForm.paidLeaveEnabled)}
                        onChange={updateSalaryField}
                      />
                      <span>Enable paid leave</span>
                    </label>

                    <label className="sp-checkbox">
                      <input
                        type="checkbox"
                        name="deductUnpaidLeave"
                        checked={Boolean(salaryForm.deductUnpaidLeave)}
                        onChange={updateSalaryField}
                      />
                      <span>Deduct unpaid leave</span>
                    </label>

                    <label className="sp-checkbox">
                      <input
                        type="checkbox"
                        name="deductUnapprovedAbsence"
                        checked={Boolean(salaryForm.deductUnapprovedAbsence)}
                        onChange={updateSalaryField}
                      />
                      <span>Deduct unapproved absence</span>
                    </label>
                  </div>
                </div>

                <div className="sp-form-field sp-form-field-full">
                  <label className="sp-label">Notes</label>
                  <textarea
                    className="sp-textarea"
                    name="notes"
                    rows={3}
                    value={salaryForm.notes}
                    onChange={updateSalaryField}
                    placeholder="Optional salary configuration notes"
                  />
                </div>
              </div>

              <div className="sp-info" style={{ marginTop: 18 }}>
                Salary calculation uses the method and attendance rules saved
                in the backend. Verify the payroll calculation and statutory
                deduction rules before approving actual salary payments.
              </div>
            </div>

            <div className="sp-modal-footer">
              <button
                className="sp-btn"
                type="button"
                disabled={saving}
                onClick={() => setSalaryModalOpen(false)}
              >
                Cancel
              </button>

              <button
                className="sp-btn sp-btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <span className="sp-loader" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Save Salary Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {detailsModalOpen && selectedPayroll && (
        <div
          className="sp-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDetailsModalOpen(false);
            }
          }}
        >
          <div className="sp-modal sp-modal-wide">
            <div className="sp-modal-header">
              <div>
                <h2 className="sp-modal-title">Payroll Details</h2>
                <p className="sp-modal-subtitle">
                  {getEmployeeName(selectedPayroll)} ·{" "}
                  {getMonthLabel(
                    selectedPayroll.payrollMonth || payrollMonth
                  )}
                </p>
              </div>

              <button
                className="sp-icon-btn"
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                aria-label="Close payroll details"
              >
                <X size={17} />
              </button>
            </div>

            <div className="sp-modal-body">
              <div className="sp-detail-grid">
                <div className="sp-detail-card">
                  <div className="sp-detail-label">Gross Salary</div>
                  <div className="sp-detail-value">
                    {money(selectedPayroll.grossSalary)}
                  </div>
                </div>

                <div className="sp-detail-card">
                  <div className="sp-detail-label">Total Deductions</div>
                  <div className="sp-detail-value">
                    {money(selectedPayroll.totalDeductions)}
                  </div>
                </div>

                <div className="sp-detail-card">
                  <div className="sp-detail-label">Net Salary</div>
                  <div className="sp-detail-value" style={{ color: "#047857" }}>
                    {money(selectedPayroll.netSalary)}
                  </div>
                </div>
              </div>

              <div className="sp-detail-section">Attendance Summary</div>

              <div className="sp-detail-grid">
                {[
                  ["Present Days", selectedPayroll.attendanceSummary?.presentDays],
                  ["Half Days", selectedPayroll.attendanceSummary?.halfDays],
                  ["Absent Days", selectedPayroll.attendanceSummary?.absentDays],
                  ["Paid Leave", selectedPayroll.attendanceSummary?.paidLeaveDays],
                  ["Unpaid Leave", selectedPayroll.attendanceSummary?.unpaidLeaveDays],
                  ["Payable Days", selectedPayroll.attendanceSummary?.payableDays],
                ].map(([label, value]) => (
                  <div className="sp-detail-card" key={label}>
                    <div className="sp-detail-label">{label}</div>
                    <div className="sp-detail-value">{value ?? "—"}</div>
                  </div>
                ))}
              </div>

              <div className="sp-detail-section">Salary Breakdown</div>

              {[
                ["Basic Salary", selectedPayroll.salarySnapshot?.basicSalary],
                ["HRA", selectedPayroll.salarySnapshot?.hra],
                [
                  "Conveyance Allowance",
                  selectedPayroll.salarySnapshot?.conveyanceAllowance,
                ],
                [
                  "Other Allowances",
                  selectedPayroll.salarySnapshot?.otherAllowances,
                ],
                ["Attendance Deduction", selectedPayroll.attendanceDeduction],
                ["Unpaid Leave Deduction", selectedPayroll.unpaidLeaveDeduction],
                ["Absence Deduction", selectedPayroll.absenceDeduction],
                ["Professional Tax", selectedPayroll.professionalTax],
                ["Provident Fund", selectedPayroll.providentFund],
                ["Other Deductions", selectedPayroll.otherDeductions],
              ].map(([label, value]) => (
                <div className="sp-detail-row" key={label}>
                  <span>{label}</span>
                  <span>{value == null ? "—" : money(value)}</span>
                </div>
              ))}

              <div className="sp-detail-row">
                <span>Status</span>
                <span>
                  <span className={statusClass(selectedPayroll.status)}>
                    {selectedPayroll.status || "UNKNOWN"}
                  </span>
                </span>
              </div>

              <div className="sp-detail-row">
                <span>Payment Reference</span>
                <span>{selectedPayroll.paymentReference || "—"}</span>
              </div>

              <div className="sp-detail-row">
                <span>Paid At</span>
                <span>{formatDate(selectedPayroll.paidAt)}</span>
              </div>

              {selectedPayroll.calculationNotes && (
                <div className="sp-info" style={{ marginTop: 16 }}>
                  {selectedPayroll.calculationNotes}
                </div>
              )}

              {selectedPayroll.notes && (
                <div className="sp-info" style={{ marginTop: 10 }}>
                  {selectedPayroll.notes}
                </div>
              )}
            </div>

            <div className="sp-modal-footer">
              <button
                className="sp-btn"
                type="button"
                onClick={() => setDetailsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModalOpen && paymentPayroll && (
        <div
          className="sp-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setPaymentModalOpen(false);
            }
          }}
        >
          <form className="sp-modal" onSubmit={markPayrollPaid}>
            <div className="sp-modal-header">
              <div>
                <h2 className="sp-modal-title">Record Salary Payment</h2>
                <p className="sp-modal-subtitle">
                  {getEmployeeName(paymentPayroll)}
                </p>
              </div>

              <button
                className="sp-icon-btn"
                type="button"
                disabled={saving}
                onClick={() => setPaymentModalOpen(false)}
                aria-label="Close payment form"
              >
                <X size={17} />
              </button>
            </div>

            <div className="sp-modal-body">
              <div className="sp-preview">
                <div>
                  <div className="sp-preview-label">Net Salary</div>
                  <div className="sp-preview-value">
                    {money(paymentPayroll.netSalary)}
                  </div>
                </div>
                <Banknote size={27} color="#6d28d9" />
              </div>

              <div style={{ marginTop: 20 }}>
                <label className="sp-label">Payment Reference *</label>
                <input
                  className="sp-input"
                  value={paymentReference}
                  onChange={(event) =>
                    setPaymentReference(event.target.value)
                  }
                  placeholder="Bank transaction ID / UTR number"
                  required
                />
              </div>

              <div className="sp-info" style={{ marginTop: 15 }}>
                Only mark the payroll as paid after the salary transfer has
                actually been completed. This records the reference in your
                payroll system; it does not transfer money.
              </div>
            </div>

            <div className="sp-modal-footer">
              <button
                className="sp-btn"
                type="button"
                disabled={saving}
                onClick={() => setPaymentModalOpen(false)}
              >
                Cancel
              </button>

              <button
                className="sp-btn sp-btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <span className="sp-loader" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Confirm Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmAction && (
        <div className="sp-modal-backdrop">
          <div className="sp-modal" role="dialog" aria-modal="true">
            <div className="sp-modal-header">
              <div>
                <h2 className="sp-modal-title">
                  {confirmAction.type === "generate"
                    ? "Generate Monthly Payroll?"
                    : "Approve Payroll?"}
                </h2>
                <p className="sp-modal-subtitle">
                  {confirmAction.type === "generate"
                    ? `Calculate payroll using the configured salaries and attendance for ${getMonthLabel(payrollMonth)}.`
                    : `Approve payroll for ${getEmployeeName(confirmAction.item)}?`}
                </p>
              </div>

              <button
                className="sp-icon-btn"
                type="button"
                disabled={generating || saving}
                onClick={() => setConfirmAction(null)}
                aria-label="Close confirmation"
              >
                <X size={17} />
              </button>
            </div>

            <div className="sp-modal-body">
              <div className="sp-info">
                {confirmAction.type === "generate"
                  ? "Review salary settings and attendance data before generating. Previously approved, paid, or cancelled records may be skipped by the backend."
                  : "Approval changes the payroll status. Verify attendance, deductions, and net salary before continuing."}
              </div>
            </div>

            <div className="sp-modal-footer">
              <button
                className="sp-btn"
                type="button"
                disabled={generating || saving}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>

              <button
                className="sp-btn sp-btn-primary"
                type="button"
                disabled={generating || saving}
                onClick={() =>
                  confirmAction.type === "generate"
                    ? generatePayroll()
                    : approvePayroll(confirmAction.item)
                }
              >
                {generating || saving ? (
                  <span className="sp-loader" />
                ) : (
                  <CheckCircle2 size={15} />
                )}

                {confirmAction.type === "generate"
                  ? "Generate Payroll"
                  : "Approve Payroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
