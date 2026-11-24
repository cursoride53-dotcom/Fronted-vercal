
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Mail,
  LoaderCircle,
  AlertCircle,
  Sun,
  LockKeyhole,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

import { authApi } from '../services/api';
import { signInWithBackendCustomToken } from '../services/firebase';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expiresIn, setExpiresIn] = useState(300);
  const [remaining, setRemaining] = useState(300);
  const [resendAvailable, setResendAvailable] = useState(false);

  useEffect(() => {
    if (step !== 'otp' || remaining <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [step, remaining]);

  const formattedTime = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(
    remaining % 60
  ).padStart(2, '0')}`;

  async function sendOtp(event, isResend = false) {
    event?.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isResend) setResending(true);
    else setLoading(true);

    try {
      const response = await authApi.sendOtp(normalizedEmail);
      const data = response.data;

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to send verification code.');
      }

      setEmail(normalizedEmail);
      setOtp('');
      setStep('otp');

      const expiry = Number(data?.expiresIn) || 300;
      setExpiresIn(expiry);
      setRemaining(expiry);
      setResendAvailable(false);

      setMessage(
        data?.message || `Verification code sent to ${normalizedEmail}.`
      );

      window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
      setResending(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (remaining <= 0) {
      setError('Your verification code has expired. Request a new code.');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter all six digits of your verification code.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.verifyOtp(
        email.trim().toLowerCase(),
        otp
      );

      const data = response.data;

      if (data?.success === false) {
        throw new Error(data.message || 'OTP verification failed.');
      }

      if (!data?.firebaseToken) {
        throw new Error(
          'The backend did not return firebaseToken. Check your OTP verification controller response.'
        );
      }

      await signInWithBackendCustomToken(data.firebaseToken);

      navigate('/super-admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function updateOtp(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);

    setOtp((previous) => {
      const digits = previous.padEnd(6, ' ').split('');
      digits[index] = digit || ' ';
      return digits.join('').replace(/ /g, '');
    });

    setError('');

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, event) {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(event) {
    event.preventDefault();

    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    setOtp(pasted);
    setError('');
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f5ff] text-slate-800">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-violet-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-purple-200/50 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-2">
        {/* Brand section */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#24104f] via-[#4c1d95] to-[#7c3aed] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-14">
          <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 top-36 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-800 shadow-xl shadow-black/10">
              <Sun size={28} strokeWidth={2.5} />
            </div>

            <div>
              <p className="text-2xl font-extrabold tracking-tight">ZERMII</p>
              <p className="text-[10px] font-semibold tracking-[0.25em] text-violet-200">
                PEOPLE · PROCESS · PERFORMANCE
              </p>
            </div>
          </div>

          <div className="relative my-12 max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-violet-100 backdrop-blur">
              <Sparkles size={15} />
              HRMS ADMINISTRATION PLATFORM
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.15] tracking-tight xl:text-6xl">
              Your people.
              <span className="mt-2 block text-violet-300">
                One powerful
              </span>
              workspace.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-violet-100/80 xl:text-lg">
              A smarter way to manage your workforce, oversee
              operations, and keep your organization connected.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5 backdrop-blur-sm">
                <ShieldCheck size={25} className="mb-4 text-violet-200" />
                <p className="font-bold">Secure access</p>
                <p className="mt-2 text-xs leading-5 text-violet-200">
                  Authentication for authorized administrators.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5 backdrop-blur-sm">
                <LockKeyhole size={25} className="mb-4 text-violet-200" />
                <p className="font-bold">Email OTP</p>
                <p className="mt-2 text-xs leading-5 text-violet-200">
                  A verification step before dashboard access.
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-4 text-xs text-violet-200/80">
            <span>© {new Date().getFullYear()} ZERMII HRMS</span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={15} />
              Secure administrator portal
            </span>
          </div>
        </section>

        {/* Login section */}
        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-[460px]">
            {/* Mobile brand */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-700 text-white shadow-lg shadow-violet-200">
                <Sun size={25} />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight">ZERMII</p>
                <p className="text-[10px] font-bold tracking-[0.2em] text-violet-700">
                  HRMS WORKSPACE
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-white bg-white/90 p-6 shadow-2xl shadow-violet-200/40 backdrop-blur-xl sm:p-9">
              <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 ring-1 ring-violet-100">
                {step === 'email' ? (
                  <ShieldCheck size={29} />
                ) : (
                  <Mail size={28} />
                )}
              </div>

              <div className="mb-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-700">
                  ZERMII · HRMS
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[34px]">
                  {step === 'email'
                    ? 'Super Admin Login'
                    : 'Verify your email'}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {step === 'email'
                    ? 'Welcome back. Enter your registered administrator email to receive a secure login code.'
                    : `We sent a six-digit verification code to ${email}. Enter it below to continue.`}
                </p>
              </div>

              {/* Progress */}
              <div className="mb-7 flex items-center gap-3">
                <div
                  className={`h-1.5 flex-1 rounded-full ${
                    step === 'email' || step === 'otp'
                      ? 'bg-violet-600'
                      : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-1.5 flex-1 rounded-full ${
                    step === 'otp' ? 'bg-violet-600' : 'bg-slate-200'
                  }`}
                />
              </div>

              {step === 'email' ? (
                <form onSubmit={sendOtp} className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Administrator email
                    </span>

                    <span className="relative block">
                      <Mail
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setError('');
                          setMessage('');
                        }}
                        placeholder="admin@yourcompany.com"
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-4 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
                      />
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-4 font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-800 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <LoaderCircle size={20} className="animate-spin" />
                    ) : (
                      <ArrowRight size={20} />
                    )}
                    {loading ? 'Sending verification code...' : 'Send verification code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <label className="text-sm font-bold text-slate-700">
                        Verification code
                      </label>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <LockKeyhole size={14} />
                        Secure OTP
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:gap-3">
                      {Array.from({ length: 6 }, (_, index) => (
                        <input
                          key={index}
                          ref={(element) => {
                            otpRefs.current[index] = element;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={index === 0 ? 'one-time-code' : 'off'}
                          maxLength={1}
                          value={otp[index] || ''}
                          disabled={loading}
                          aria-label={`OTP digit ${index + 1}`}
                          onChange={(event) =>
                            updateOtp(index, event.target.value)
                          }
                          onKeyDown={(event) =>
                            handleOtpKeyDown(index, event)
                          }
                          onPaste={index === 0 ? handleOtpPaste : undefined}
                          className="h-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-extrabold text-violet-800 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 sm:h-14"
                        />
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">
                        {remaining > 0
                          ? 'Code expires in'
                          : 'Verification code expired'}
                      </span>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          remaining > 0
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {formattedTime}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6 || remaining <= 0}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-4 font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-800 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <LoaderCircle size={20} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={20} />
                    )}
                    {loading ? 'Verifying...' : 'Verify and sign in'}
                  </button>

                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-slate-500">
                      Didn't receive the code?
                    </p>

                    <button
                      type="button"
                      disabled={loading || resending}
                      onClick={() => sendOtp(undefined, true)}
                      className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 transition hover:text-violet-900 disabled:opacity-50"
                    >
                      {resending ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      {resending ? 'Requesting new code...' : 'Resend verification code'}
                    </button>

                    <button
                      type="button"
                      disabled={loading || resending}
                      onClick={() => {
                        setStep('email');
                        setOtp('');
                        setError('');
                        setMessage('');
                        setRemaining(300);
                      }}
                      className="mt-1 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      <ArrowLeft size={16} />
                      Change email address
                    </button>
                  </div>
                </form>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-700"
                >
                  <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-5 text-emerald-800"
                >
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                  <p>{message}</p>
                </div>
              )}

              <div className="mt-7 flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-4">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-violet-700" />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Your account, protected
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Never share your verification code. Only authorized
                    administrators can access the HRMS portal.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} ZERMII HRMS · Secure access
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
