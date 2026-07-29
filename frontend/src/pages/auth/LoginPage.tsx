import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAppDispatch } from "../../store";
import { loginSuccess } from "../../store/slices/authSlice";
import { authService } from "../../services/authService";
import { useToast } from "../../store/slices/toastSlice";
// ── Types ─────────────────────────────────────────────────
type ActiveTab = "login" | "register" | "forgot" | "reset";

// ── Reusable Field ────────────────────────────────────────
function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  rightSlot,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-white/60 text-xs font-semibold tracking-widest uppercase mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="w-full px-4 py-3 rounded-lg text-white text-sm placeholder:text-white/25 outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
          }
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Submit Button ─────────────────────────────────────────
function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-lg text-white text-sm font-bold tracking-widest uppercase transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-white/10 active:scale-[0.99] mt-2"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Please wait...
        </span>
      ) : (
        label
      )}
    </button>
  );
}

// ── Error Banner ──────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 px-4 py-3 rounded-lg mb-5 text-sm"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.4)",
      }}
    >
      <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
      <span className="text-red-300">{message}</span>
    </div>
  );
}

// ── Success Banner ────────────────────────────────────────
function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 px-4 py-3 rounded-lg mb-5 text-sm"
      style={{
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.4)",
      }}
    >
      <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
      <span className="text-green-300">{message}</span>
    </div>
  );
}

// ── Google Icon ───────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// ╔══════════════════════════════════════════════════════════╗
// ║                    LOGIN FORM                            ║
// ╚══════════════════════════════════════════════════════════╝
function LoginForm({ onSwitchTab }: { onSwitchTab: (tab: ActiveTab) => void }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  if (!email.trim() || !password.trim()) {
    const msg = "Email and password are required.";
    setError(msg);
    toast.error(msg);
    return;
  }
  setLoading(true);
 
  try {
    const result = await authService.login({ email, password });
 
    await dispatch(
      loginSuccess({
        access_token: result.access_token,
        user: {
          id:         result.user.id,          
          email:      result.user.email,
          first_name: result.user.first_name,
          last_name:  result.user.last_name,
          phone:      result.user.phone ?? null,
          roles:      result.user.roles,        
          is_active:  result.user.is_active ?? true,
        },
      })
    );
 
    toast.success("Welcome back!");
    navigate("/admin/dashboard", { replace: true }); // ← updated path
 
  } catch (err: any) {
    const msg =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message ||
      "Invalid email or password. Please try again.";
    setError(msg);
    toast.error(msg);
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-white text-2xl font-bold mb-1 tracking-tight">
          Welcome back 👋
        </h1>
        <p className="text-white/40 text-sm">Sign in to your account</p>
      </div>

      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          type={showPass ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="text-white/30 hover:text-white/60 transition-colors"
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
        />
        <div className="flex justify-end -mt-1">
          <button
            type="button"
            onClick={() => onSwitchTab("forgot")}
            className="text-violet-400 text-xs hover:text-violet-300 transition-colors font-medium"
          >
            Forgot password?
          </button>
        </div>
        <SubmitButton loading={loading} label="Sign In" />
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-xs">or continue with</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <a
        href={`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"}/auth/google`}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-lg text-white text-sm font-semibold transition-all duration-200 hover:bg-white/10 active:scale-[0.99]"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <GoogleIcon />
        Sign in with Google
      </a>

      <p className="text-center text-white/35 text-sm mt-5">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitchTab("register")}
          className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
        >
          Create one
        </button>
      </p>
    </>
  );
}

// ╔══════════════════════════════════════════════════════════╗
// ║                  REGISTER FORM                           ║
// ╚══════════════════════════════════════════════════════════╝
function RegisterForm({ onSwitchTab }: { onSwitchTab: (tab: ActiveTab) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!firstName.trim()) return setError("First name is required");
    if (!lastName.trim()) return setError("Last name is required");
    if (!email.trim()) return setError("Email is required");
    if (!password.trim()) return setError("Password is required");

    if (password.length < 8) {
      return setError("Password must be at least 8 characters");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError("Enter a valid email address");
    }

    setLoading(true);

    try {
      const result = await authService.register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        ...(phone ? { phone } : {}),
      });
      const msg = result.message ?? "Account created! Check your email.";
      setSuccess(msg);
      toast.success(msg);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.detail ??
        err?.message ??
        "Registration failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-white text-2xl font-bold mb-1 tracking-tight">
          Create account
        </h1>
        <p className="text-white/40 text-sm">Join the Smart Cart command center</p>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" autoComplete="given-name" />
            <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Last name" autoComplete="family-name" />
          </div>
          <Field label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          <Field
            label="Password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="text-white/30 hover:text-white/60 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          <Field label="Phone (optional)" type="tel" value={phone} onChange={setPhone} placeholder="+91 98765 43210" autoComplete="tel" required={false} />
          <SubmitButton loading={loading} label="Create your account" />
        </form>
      )}

      <p className="text-center text-white/35 text-sm mt-5">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitchTab("login")}
          className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
        >
          Sign in
        </button>
      </p>
    </>
  );
}

// ╔══════════════════════════════════════════════════════════╗
// ║              FORGOT PASSWORD FORM                        ║
// ╚══════════════════════════════════════════════════════════╝
function ForgotPasswordForm({ onSwitchTab }: { onSwitchTab: (tab: ActiveTab) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim()) {
      return setError("Email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError("Enter a valid email address");
    }
    setLoading(true);

    try {
      const result = await authService.forgotPassword(email);
      const msg = result.message ?? "If an account exists, reset link has been sent.";
      setSuccess(msg);
      toast.success(msg);
    } catch (err: any) {
      // 4xx → show generic success (prevents email enumeration)
      if (err?.response?.status >= 400 && err?.response?.status < 500) {
        setSuccess("If an account exists with that email, a reset link has been sent.");
      } else {
        setError(err?.message ?? "Something went wrong. Please try again.");
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-white text-2xl font-bold mb-1 tracking-tight">
          Forgot password?
        </h1>
        <p className="text-white/40 text-sm">We'll send a reset link to your inbox</p>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          <SubmitButton loading={loading} label="Send Reset Link" />
        </form>
      )}

      <p className="text-center text-white/35 text-sm mt-5">
        Remember it?{" "}
        <button
          type="button"
          onClick={() => onSwitchTab("login")}
          className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
        >
          Back to login
        </button>
      </p>
    </>
  );
}

// ╔══════════════════════════════════════════════════════════╗
// ║              RESET PASSWORD FORM                         ║
// ╚══════════════════════════════════════════════════════════╝
function ResetPasswordForm({ onSwitchTab }: { onSwitchTab: (tab: ActiveTab) => void }) {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) return setError("Reset token is required");

    if (!newPassword.trim()) return setError("New password is required");
    if (!confirmPassword.trim()) return setError("Confirm password is required");

    if (newPassword.length < 8) {
      return setError("Password must be at least 8 characters");
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await authService.resetPassword({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(result.message ?? "Password reset successfully. You can now log in.");
      toast.success("Password reset! You can now log in.");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.detail ??
        err?.message ??
        "Reset failed. Token may be invalid or expired.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-white text-2xl font-bold mb-1 tracking-tight">
          Reset password
        </h1>
        <p className="text-white/40 text-sm">Paste the token from your email</p>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Reset Token" value={token} onChange={setToken} placeholder="Enter reset token" autoComplete="off" />
          <Field
            label="New Password"
            type={showPass ? "text" : "password"}
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="text-white/30 hover:text-white/60 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          <Field
            label="Confirm Password"
            type={showPass ? "text" : "password"}
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repeat new password"
            autoComplete="new-password"
          />
          <SubmitButton loading={loading} label="Reset Password" />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => onSwitchTab("login")}
          className="w-full py-3 rounded-lg text-white text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:bg-white/10 mt-2"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          Go to Login
        </button>
      )}

      <p className="text-center text-white/35 text-sm mt-5">
        <button
          type="button"
          onClick={() => onSwitchTab("login")}
          className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
        >
          Back to login
        </button>
      </p>
    </>
  );
}

// ╔══════════════════════════════════════════════════════════╗
// ║                    PAGE SHELL                            ║
// ╚══════════════════════════════════════════════════════════╝
export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("login");

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "login", label: "Login" },
    { key: "register", label: "Register" },
    { key: "forgot", label: "Forgot Password" },
    { key: "reset", label: "Reset Password" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{
        background: "radial-gradient(ellipse at 60% 10%, #1a1f3a 0%, #0d0f1e 55%, #0a0c18 100%)",
      }}
    >
      <nav className="flex gap-3 mb-8 flex-wrap justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-full border text-sm font-semibold tracking-wide transition-all duration-200 ${
              activeTab === tab.key
                ? "border-violet-400 text-white bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.35)]"
                : "border-white/20 text-white/60 hover:border-white/40 hover:text-white/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        className="w-full max-w-md rounded-2xl p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
              boxShadow: "0 4px 15px rgba(124,58,237,0.4)",
            }}
          >
            <ShoppingCart size={20} className="text-white" />
          </div>
          <div className="flex items-baseline gap-0.5">
            {/* <span className="text-white/50 text-sm font-mono tracking-tight">shopping_</span> */}
            <span className="text-white text-xl font-bold tracking-tight">Smart Cart</span>
          </div>
        </div>

        {activeTab === "login" && <LoginForm onSwitchTab={setActiveTab} />}
        {activeTab === "register" && <RegisterForm onSwitchTab={setActiveTab} />}
        {activeTab === "forgot" && <ForgotPasswordForm onSwitchTab={setActiveTab} />}
        {activeTab === "reset" && <ResetPasswordForm onSwitchTab={setActiveTab} />}
      </div>
    </div>
  );
}