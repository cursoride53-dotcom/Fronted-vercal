
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  UserRound,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Crown,
  CalendarClock,
  CreditCard,
  ChartNoAxesColumnIncreasing,
  Building2,
  Folder,
  TrendingUp,
  Globe,
  ChevronDown,
  CalendarCheck2,
} from "lucide-react";

import { auth } from "../services/firebase";
import api from "../services/api";

const ROLE_OPTIONS = [
  {
    value: "EMPLOYEE",
    label: "Employee",
    description: "My workspace",
    icon: UserRound,
  },
  {
    value: "BRANCH_MANAGER",
    label: "Branch Manager",
    description: "Branch operations",
    icon: BriefcaseBusiness,
  },
  {
    value: "HR_ADMIN",
    label: "HR & Admin",
    description: "People management",
    icon: Users,
  },
];

const ROLE_DASHBOARDS = {
  EMPLOYEE: "/employee/dashboard",
  BRANCH_MANAGER: "/branch-manager/dashboard",
  HR_ADMIN: "/hr/dashboard",
};

const FEATURES = [
  {
    title: "Employee Management",
    description: "Organize and manage your workforce",
    icon: Users,
  },
  {
    title: "Attendance & Leave",
    description: "Track time and manage leaves",
    icon: CalendarCheck2,
  },
  {
    title: "Payroll & Benefits",
    description: "Manage payroll and employee benefits",
    icon: CreditCard,
  },
  {
    title: "Reports & Insights",
    description: "Make data-driven decisions",
    icon: ChartNoAxesColumnIncreasing,
  },
];

export default function RoleLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("EMPLOYEE");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [language, setLanguage] = useState("English");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Enter your work email and password.");
      return;
    }

    setLoading(true);
    let firebaseUser = null;

    try {
      // Step 1: Authenticate through Firebase Email/Password.
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      firebaseUser = credential.user;

      // Step 2: Get the Firebase ID token.
      const idToken = await firebaseUser.getIdToken(true);

      // Step 3: Verify the user with the HRMS backend.
      const response = await api.post("/employee/auth/login", {
        idToken,
      });

      const result = response?.data;

      if (!result?.success || !result?.employee) {
        throw new Error(
          result?.message ||
            "The server could not verify your employee account."
        );
      }

      // Step 4: Confirm that the selected role matches the account.
      const actualRole = String(
        result.employee.systemRole || ""
      )
        .trim()
        .toUpperCase();

      if (actualRole !== selectedRole) {
        await signOut(auth);
        firebaseUser = null;

        setError(
          `This account belongs to ${
            actualRole.replace(/_/g, " ") || "another role"
          }. Please select the correct role.`
        );
        return;
      }

      // Step 5: Resolve the dashboard route.
      const dashboard =
        result.redirectTo || ROLE_DASHBOARDS[actualRole];

      if (!dashboard) {
        await signOut(auth);
        firebaseUser = null;
        setError("No dashboard is configured for this role.");
        return;
      }

      // Step 6: Save display information only.
      // Authorization must always be checked by the backend.
      try {
        const employeeSession = {
          employeeId: result.employee._id,
          employeeCode: result.employee.employeeCode,
          fullName: result.employee.fullName,
          email: result.employee.email,
          systemRole: actualRole,
        };

        const storage = rememberMe
          ? window.localStorage
          : window.sessionStorage;

        storage.setItem(
          "hrmsEmployee",
          JSON.stringify(employeeSession)
        );

        if (rememberMe) {
          window.sessionStorage.removeItem("hrmsEmployee");
        } else {
          window.localStorage.removeItem("hrmsEmployee");
        }
      } catch (storageError) {
        console.warn(
          "Unable to save display information:",
          storageError
        );
      }

      setNotice("Login successful. Opening your workspace...");
      navigate(dashboard, { replace: true });
    } catch (err) {
      console.error("ROLE LOGIN ERROR:", err);

      // Clear Firebase session if backend verification failed.
      if (firebaseUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("FIREBASE SIGNOUT ERROR:", signOutError);
        }
      }

      const code = err?.code;
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;

      if (code === "auth/operation-not-allowed") {
        setError(
          "Email/Password sign-in is disabled for the Firebase project configured in this app. Verify that your frontend uses the same project where Email/Password is enabled."
        );
      } else if (
        [
          "auth/invalid-credential",
          "auth/wrong-password",
          "auth/user-not-found",
        ].includes(code)
      ) {
        setError("Incorrect email or password.");
      } else if (code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError(
          "Too many login attempts. Please wait and try again."
        );
      } else if (code === "auth/network-request-failed") {
        setError(
          "Network error. Check your internet connection and try again."
        );
      } else if (status === 401) {
        setError(
          serverMessage ||
            "Your login could not be verified. Please sign in again."
        );
      } else if (status === 403) {
        setError(
          serverMessage ||
            "Your account is not authorized to access this portal."
        );
      } else if (err?.response) {
        setError(
          serverMessage ||
            "The server could not verify your account."
        );
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your work email first to reset your password.");
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setNotice("Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error("PASSWORD RESET ERROR:", err);

      if (err?.code === "auth/operation-not-allowed") {
        setError(
          "Password authentication is disabled for this Firebase project. Check the project's Authentication settings."
        );
      } else if (err?.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else {
        setError(
          err?.message || "Unable to send the password reset email."
        );
      }
    } finally {
      setResetLoading(false);
    }
  };

  const openSuperAdminLogin = () => {
    navigate("/super-admin/login");
  };

  return (
    <main className="zhrms-login">
      <style>{`
        .zhrms-login {
          --purple: #7028e8;
          --purple-dark: #35118d;
          --ink: #17143d;
          --muted: #77729f;
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(430px, .9fr);
          background: #f7f5ff;
          color: var(--ink);
          font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .zhrms-login *,
        .zhrms-login *::before,
        .zhrms-login *::after {
          box-sizing: border-box;
        }

        .zhrms-left {
          min-height: 100vh;
          position: relative;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          padding: 35px clamp(24px, 4vw, 65px) 24px;
          overflow: hidden;
          color: white;
          background:
            radial-gradient(ellipse at 80% 35%, rgba(218,165,255,.65), transparent 45%),
            radial-gradient(ellipse at 10% 5%, rgba(111,55,226,.9), transparent 40%),
            linear-gradient(135deg, #35118d, #40159d 46%, #6425d7);
        }

        .zhrms-left::before {
          content: "";
          position: absolute;
          z-index: -1;
          right: -18%;
          top: -12%;
          width: 70%;
          height: 65%;
          border-radius: 50%;
          background: rgba(211,175,255,.17);
          filter: blur(5px);
        }

        .zhrms-topbar,
        .zhrms-brand,
        .zhrms-card-brand {
          display: flex;
          align-items: center;
        }

        .zhrms-topbar {
          justify-content: space-between;
          gap: 16px;
        }

        .zhrms-brand,
        .zhrms-card-brand {
          gap: 12px;
        }

        .zhrms-brand-mark {
          width: 49px;
          height: 49px;
          flex: 0 0 49px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: white;
          background: linear-gradient(145deg, #a66bff, #6e2be5);
          box-shadow: 0 8px 28px rgba(24,5,91,.22);
        }

        .zhrms-brand-title {
          font-size: 23px;
          font-weight: 950;
          letter-spacing: .075em;
          line-height: 1;
        }

        .zhrms-brand-sub {
          margin-top: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .25em;
          opacity: .83;
        }

        .zhrms-top-pills {
          display: flex;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid rgba(255,255,255,.24);
          border-radius: 999px;
          background: rgba(255,255,255,.09);
          font-size: 11px;
          white-space: nowrap;
        }

        .zhrms-top-pills b {
          color: #d8b4fe;
          margin-left: 8px;
        }

        .zhrms-left-content {
          position: relative;
          z-index: 2;
          width: min(100%, 600px);
          margin-top: clamp(45px, 8vh, 85px);
        }

        .zhrms-eyebrow {
          color: #e2caff;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .23em;
          text-transform: uppercase;
        }

        .zhrms-headline {
          max-width: 560px;
          margin: 23px 0 17px;
          font-size: clamp(40px, 4.5vw, 66px);
          line-height: 1.04;
          letter-spacing: -.052em;
          font-weight: 900;
        }

        .zhrms-headline span {
          display: block;
          color: #e7d3ff;
        }

        .zhrms-intro {
          max-width: 430px;
          margin: 0;
          color: rgba(255,255,255,.83);
          font-size: 14px;
          line-height: 1.8;
        }

        .zhrms-features {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px 18px;
          margin-top: 32px;
        }

        .zhrms-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .zhrms-feature-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: white;
          background: rgba(255,255,255,.13);
          border: 1px solid rgba(255,255,255,.15);
        }

        .zhrms-feature-title {
          font-size: 12px;
          font-weight: 850;
        }

        .zhrms-feature-desc {
          margin-top: 4px;
          color: rgba(238,226,255,.79);
          font-size: 10px;
          line-height: 1.5;
        }

        .zhrms-bottom-stats {
          margin-top: auto;
          padding-top: 32px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .zhrms-bottom-stat {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px 8px;
          min-width: 0;
        }

        .zhrms-bottom-stat + .zhrms-bottom-stat {
          border-left: 1px solid rgba(255,255,255,.2);
        }

        .zhrms-bottom-stat svg {
          flex: 0 0 auto;
          color: #d9b6ff;
        }

        .zhrms-bottom-value {
          font-size: 16px;
          font-weight: 900;
        }

        .zhrms-bottom-label {
          margin-top: 4px;
          color: rgba(255,255,255,.76);
          font-size: 9px;
        }

        .zhrms-left-footer {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 15px;
          color: rgba(255,255,255,.58);
          font-size: 10px;
        }

        .zhrms-right {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px clamp(18px, 3vw, 42px);
          background: linear-gradient(120deg, #f0eaff, #fbfaff 55%, #f2edff);
        }

        .zhrms-login-card {
          width: min(100%, 590px);
          padding: clamp(24px, 3vw, 38px);
          border: 1px solid white;
          border-radius: 25px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 22px 70px rgba(82,40,177,.13);
        }

        .zhrms-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 27px;
        }

        .zhrms-card-brand .zhrms-brand-mark {
          width: 42px;
          height: 42px;
          flex-basis: 42px;
          border-radius: 12px;
        }

        .zhrms-card-brand .zhrms-brand-title {
          color: #151322;
          font-size: 19px;
        }

        .zhrms-card-brand .zhrms-brand-sub {
          color: #63568d;
          font-size: 9px;
        }

        .zhrms-language {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 10px;
          border: 1px solid #e4dcfa;
          border-radius: 11px;
          background: white;
          color: #312454;
          font-size: 11px;
        }

        .zhrms-language svg {
          color: #7642dd;
        }

        .zhrms-language select {
          width: 76px;
          border: 0;
          outline: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          cursor: pointer;
        }

        .zhrms-card-heading {
          margin-bottom: 24px;
        }

        .zhrms-card-heading h2 {
          margin: 0 0 9px;
          color: #17143d;
          font-size: clamp(26px, 2.3vw, 36px);
          line-height: 1.2;
          letter-spacing: -.045em;
          font-weight: 900;
        }

        .zhrms-card-heading h2 span {
          color: #6828e5;
        }

        .zhrms-card-heading p {
          margin: 0;
          color: #77729f;
          font-size: 12px;
          line-height: 1.7;
        }

        .zhrms-label {
          display: block;
          margin: 0 0 9px;
          color: #201b48;
          font-size: 11px;
          font-weight: 850;
        }

        .zhrms-role-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin-bottom: 22px;
        }

        .zhrms-role {
          position: relative;
          display: flex;
          min-width: 0;
          min-height: 105px;
          flex-direction: column;
          align-items: flex-start;
          gap: 7px;
          padding: 12px 10px;
          border: 1px solid #ebe5f9;
          border-radius: 14px;
          background: white;
          text-align: left;
          color: #21183f;
          cursor: pointer;
          transition: border-color .18s, box-shadow .18s, background .18s;
        }

        .zhrms-role:hover {
          border-color: #c4a7ff;
        }

        .zhrms-role[aria-pressed="true"] {
          border: 1.5px solid #8a42ff;
          background: linear-gradient(145deg, white, #f7f0ff);
          box-shadow: 0 5px 18px rgba(123,58,237,.09);
          color: #5b20d2;
        }

        .zhrms-role-icon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #7b3fe0;
          background: #f0e8ff;
        }

        .zhrms-role-title {
          font-size: 10px;
          font-weight: 900;
          line-height: 1.35;
        }

        .zhrms-role-desc {
          font-size: 9px;
          color: #777096;
          line-height: 1.4;
        }

        .zhrms-role-check {
          position: absolute;
          top: 7px;
          right: 7px;
          color: #7428ef;
          opacity: 0;
        }

        .zhrms-role[aria-pressed="true"] .zhrms-role-check {
          opacity: 1;
        }

        .zhrms-field {
          position: relative;
          margin-bottom: 16px;
        }

        .zhrms-input {
          display: block;
          width: 100%;
          height: 49px;
          padding: 0 44px;
          border: 1px solid #e3ddfa;
          border-radius: 12px;
          outline: none;
          background: #fcfbff;
          color: #21183f;
          font: inherit;
          font-size: 12px;
          transition: border-color .18s, box-shadow .18s;
        }

        .zhrms-input::placeholder {
          color: #9a94ba;
        }

        .zhrms-input:focus {
          border-color: #9661f7;
          box-shadow: 0 0 0 4px rgba(126,58,237,.1);
        }

        .zhrms-input:disabled {
          opacity: .75;
        }

        .zhrms-input-icon {
          position: absolute;
          left: 15px;
          top: 15px;
          color: #8375ad;
          pointer-events: none;
        }

        .zhrms-password-toggle {
          position: absolute;
          right: 8px;
          top: 8px;
          width: 33px;
          height: 33px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #8a80aa;
          cursor: pointer;
        }

        .zhrms-password-toggle:hover {
          background: #eee7ff;
          color: #6424d5;
        }

        .zhrms-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin: 0 0 17px;
        }

        .zhrms-remember {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #252047;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .zhrms-remember input {
          width: 16px;
          height: 16px;
          margin: 0;
          accent-color: #7028e8;
        }

        .zhrms-forgot {
          border: 0;
          padding: 4px 0;
          background: transparent;
          color: #7028e8;
          font-size: 11px;
          font-weight: 850;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }

        .zhrms-forgot:disabled {
          opacity: .6;
          cursor: wait;
        }

        .zhrms-alert {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 13px;
          padding: 11px 12px;
          border-radius: 11px;
          font-size: 11px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .zhrms-alert.error {
          color: #a61b39;
          background: #fff1f2;
          border: 1px solid #ffe0e5;
        }

        .zhrms-alert.success {
          color: #166534;
          background: #f0fdf4;
          border: 1px solid #dcfce7;
        }

        .zhrms-submit {
          width: 100%;
          min-height: 51px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 0;
          border-radius: 12px;
          color: white;
          background: linear-gradient(100deg, #5e20d0, #8235fa);
          box-shadow: 0 9px 21px rgba(102,39,220,.23);
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: box-shadow .18s, opacity .18s;
        }

        .zhrms-submit:hover:not(:disabled) {
          box-shadow: 0 13px 27px rgba(102,39,220,.3);
        }

        .zhrms-submit:disabled {
          opacity: .7;
          cursor: not-allowed;
        }

        .zhrms-divider {
          display: flex;
          align-items: center;
          gap: 13px;
          margin: 19px 0 14px;
          color: #8a83a7;
          font-size: 10px;
          font-weight: 750;
        }

        .zhrms-divider::before,
        .zhrms-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: #e9e3f8;
        }

        .zhrms-admin-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e9ddff;
          border-radius: 14px;
          background: linear-gradient(105deg, #faf6ff, #f2eaff);
        }

        .zhrms-admin-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #7128e8;
          background: #eadcff;
        }

        .zhrms-admin-copy {
          min-width: 0;
          flex: 1;
        }

        .zhrms-admin-title {
          color: #201740;
          font-size: 11px;
          font-weight: 900;
        }

        .zhrms-admin-desc {
          margin-top: 4px;
          color: #77709d;
          font-size: 9px;
          line-height: 1.5;
        }

        .zhrms-admin-button {
          min-height: 36px;
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 10px;
          border: 1px solid #8b43ff;
          border-radius: 9px;
          color: #6820dd;
          background: white;
          font: inherit;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          transition: color .18s, background .18s;
        }

        .zhrms-admin-button:hover {
          color: white;
          background: #7028e8;
        }

        .zhrms-card-footer {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 17px;
          color: #817aa3;
          font-size: 9px;
          text-align: center;
        }

        @media (max-width: 1050px) {
          .zhrms-login {
            grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr);
          }

          .zhrms-top-pills {
            display: none;
          }

          .zhrms-bottom-stat {
            gap: 5px;
            padding-left: 4px;
            padding-right: 4px;
          }
        }

        @media (max-width: 780px) {
          .zhrms-login {
            display: block;
          }

          .zhrms-left {
            min-height: auto;
            padding: 25px 22px 28px;
          }

          .zhrms-left-content {
            margin-top: 36px;
          }

          .zhrms-headline {
            margin-top: 17px;
            font-size: clamp(39px, 8vw, 55px);
          }

          .zhrms-features {
            gap: 15px 10px;
          }

          .zhrms-bottom-stats {
            margin-top: 25px;
            padding-top: 15px;
          }

          .zhrms-right {
            min-height: auto;
            padding: 25px 16px 35px;
          }

          .zhrms-login-card {
            width: min(100%, 590px);
          }
        }

        @media (max-width: 460px) {
          .zhrms-left {
            padding: 22px 17px 23px;
          }

          .zhrms-brand-title {
            font-size: 21px;
          }

          .zhrms-features {
            grid-template-columns: 1fr;
          }

          .zhrms-bottom-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .zhrms-bottom-stat:nth-child(3),
          .zhrms-bottom-stat:nth-child(4) {
            border-top: 1px solid rgba(255,255,255,.2);
          }

          .zhrms-bottom-stat:nth-child(3) {
            border-left: 0;
          }

          .zhrms-login-card {
            padding: 22px 15px 18px;
          }

          .zhrms-role-grid {
            gap: 6px;
          }

          .zhrms-role {
            padding: 10px 7px;
          }

          .zhrms-admin-box {
            gap: 8px;
            padding: 9px;
          }

          .zhrms-admin-desc {
            font-size: 8px;
          }

          .zhrms-admin-button {
            padding: 0 7px;
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .zhrms-login * {
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>

      <section className="zhrms-left">
        <header className="zhrms-topbar">
          <div className="zhrms-brand">
            <div className="zhrms-brand-mark">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="zhrms-brand-title">ZERMII</div>
              <div className="zhrms-brand-sub">HRMS</div>
            </div>
          </div>

          <div className="zhrms-top-pills">
            <span>People <b>•</b></span>
            <span>Process <b>•</b></span>
            <span>Progress</span>
          </div>
        </header>

        <div className="zhrms-left-content">
          <div className="zhrms-eyebrow">
            Welcome to ZERMII HRMS
          </div>

          <h1 className="zhrms-headline">
            A Smarter Way
            <span>to Manage</span>
            <span>Your People</span>
          </h1>

          <p className="zhrms-intro">
            Simplify HR operations, empower your teams, and build a more
            productive workplace with ZERMII HRMS.
          </p>

          <div className="zhrms-features">
            {FEATURES.map(({ title, description, icon: Icon }) => (
              <div className="zhrms-feature" key={title}>
                <div className="zhrms-feature-icon">
                  <Icon size={21} />
                </div>
                <div>
                  <div className="zhrms-feature-title">{title}</div>
                  <div className="zhrms-feature-desc">{description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="zhrms-bottom-stats">
          <div className="zhrms-bottom-stat">
            <Users size={20} />
            <div>
              <div className="zhrms-bottom-value">500+</div>
              <div className="zhrms-bottom-label">Employees</div>
            </div>
          </div>

          <div className="zhrms-bottom-stat">
            <Building2 size={20} />
            <div>
              <div className="zhrms-bottom-value">25+</div>
              <div className="zhrms-bottom-label">Branches</div>
            </div>
          </div>

          <div className="zhrms-bottom-stat">
            <Folder size={20} />
            <div>
              <div className="zhrms-bottom-value">10+</div>
              <div className="zhrms-bottom-label">Departments</div>
            </div>
          </div>

          <div className="zhrms-bottom-stat">
            <TrendingUp size={20} />
            <div>
              <div className="zhrms-bottom-value">99%</div>
              <div className="zhrms-bottom-label">Uptime</div>
            </div>
          </div>
        </div>

        <footer className="zhrms-left-footer">
          <span>© {new Date().getFullYear()} ZERMII HRMS</span>
          <span>People · Process · Progress</span>
        </footer>
      </section>

      <section className="zhrms-right">
        <div className="zhrms-login-card">
          <div className="zhrms-card-top">
            <div className="zhrms-card-brand">
              <div className="zhrms-brand-mark">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="zhrms-brand-title">ZERMII</div>
                <div className="zhrms-brand-sub">HRMS</div>
              </div>
            </div>

            <label className="zhrms-language" title="Select language">
              <Globe size={16} />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                aria-label="Language"
              >
                <option>English</option>
                <option>Hindi</option>
              </select>
              <ChevronDown size={13} />
            </label>
          </div>

          <div className="zhrms-card-heading">
            <h2>
              Sign in to your <span>workspace</span>
            </h2>
            <p>
              Choose your access role and enter your credentials to
              continue to ZERMII HRMS.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <span className="zhrms-label">Choose your role</span>

            <div
              className="zhrms-role-grid"
              role="group"
              aria-label="Choose your role"
            >
              {ROLE_OPTIONS.map(
                ({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className="zhrms-role"
                    aria-pressed={selectedRole === value}
                    onClick={() => {
                      setSelectedRole(value);
                      setError("");
                      setNotice("");
                    }}
                    disabled={loading}
                  >
                    <span className="zhrms-role-icon">
                      <Icon size={20} />
                    </span>
                    <span className="zhrms-role-title">{label}</span>
                    <span className="zhrms-role-desc">
                      {description}
                    </span>
                    <span className="zhrms-role-check">
                      <CheckCircle2 size={16} />
                    </span>
                  </button>
                )
              )}
            </div>

            <label className="zhrms-label" htmlFor="zhrms-email">
              Work email address
            </label>

            <div className="zhrms-field">
              <Mail className="zhrms-input-icon" size={19} />
              <input
                id="zhrms-email"
                className="zhrms-input"
                type="email"
                autoComplete="username"
                placeholder="Enter your work email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
              />
            </div>

            <label className="zhrms-label" htmlFor="zhrms-password">
              Password
            </label>

            <div className="zhrms-field">
              <LockKeyhole className="zhrms-input-icon" size={19} />
              <input
                id="zhrms-password"
                className="zhrms-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
                style={{ paddingRight: 48 }}
              />

              <button
                type="button"
                className="zhrms-password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <div className="zhrms-options">
              <label className="zhrms-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(event.target.checked)
                  }
                  disabled={loading}
                />
                Remember me
              </label>

              <button
                type="button"
                className="zhrms-forgot"
                onClick={handleForgotPassword}
                disabled={resetLoading || loading}
              >
                {resetLoading
                  ? "Sending reset email..."
                  : "Forgot password?"}
              </button>
            </div>

            {error && (
              <div className="zhrms-alert error" role="alert">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            {notice && (
              <div className="zhrms-alert success" role="status">
                <CheckCircle2 size={17} />
                <span>{notice}</span>
              </div>
            )}

            <button
              type="submit"
              className="zhrms-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="zhrms-spinner" />
                  Signing you in...
                </>
              ) : (
                <>
                  Sign in to workspace
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="zhrms-divider">OR ACCESS ADMINISTRATION</div>

          <div className="zhrms-admin-box">
            <div className="zhrms-admin-icon">
              <Crown size={22} />
            </div>

            <div className="zhrms-admin-copy">
              <div className="zhrms-admin-title">
                Super Admin Portal
              </div>
              <div className="zhrms-admin-desc">
                Manage your HRMS platform and administration.
              </div>
            </div>

            <button
              type="button"
              className="zhrms-admin-button"
              onClick={openSuperAdminLogin}
            >
              Admin Login
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="zhrms-card-footer">
            <span>
              <ShieldCheck size={13} />
              Secure authentication
            </span>
            <span>•</span>
            <span>© {new Date().getFullYear()} ZERMII HRMS</span>
          </div>
        </div>
      </section>
    </main>
  );
}
