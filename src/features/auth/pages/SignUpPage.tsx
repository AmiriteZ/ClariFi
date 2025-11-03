import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupApi } from "../api/auth.api";
import { useAuthStore } from "../../../store/auth.store";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { getPasswordStrength } from "../../../utils/passwordStrength";
import { FirebaseError } from "firebase/app";

export default function SignUpPage() {
  const navigate = useNavigate();
  const doLogin = useAuthStore((s) => s.login);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(getPasswordStrength(""));

  const barColor =
    strength.score <= 1
      ? "bg-red-500"
      : strength.score === 2
      ? "bg-yellow-500"
      : strength.score === 3
      ? "bg-green-500"
      : "bg-emerald-600";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");
    if (strength.score < 2)
      return setError("Please choose a stronger password.");

    try {
      setLoading(true);
      const res = await signupApi(name.trim(), email, password);
      doLogin({ user: res.user, token: res.token });
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      if (e instanceof FirebaseError) {
        if (e.code === "auth/email-already-in-use") {
          setError("This email is already registered. Please log in instead.");
        } else {
          setError(e.message || "Sign up failed");
        }
      } else if (e instanceof Error) {
        setError(e.message || "Sign up failed");
      } else {
        setError("Sign up failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen grid place-items-center overflow-hidden p-4">
      <div
        className="
          absolute inset-0 -z-10
          bg-[linear-gradient(120deg,#065f46,#10b981,#34d399)]
          bg-[length:300%_300%]
          animate-gradient
        "
        aria-hidden
      />

      <div className="w-full max-w-sm rounded-2xl shadow-xl bg-white/95 backdrop-blur-sm p-8">
        <h1 className="text-2xl font-semibold mb-6">Create your account</h1>

        <form className="space-y-4" onSubmit={onSubmit}>
          {/* Name */}
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              className="w-full rounded-lg border p-2 outline-none focus:ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded-lg border p-2 outline-none focus:ring"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm mb-1">Password</label>
            <div className="relative flex items-center">
              <input
                className="w-full rounded-lg border p-2 pr-10 outline-none focus:ring"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  const val = e.target.value;
                  setPassword(val);
                  setStrength(getPasswordStrength(val));
                }}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>

            {/* Strength Meter */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>Password strength:</span>
                <span
                  className={
                    strength.score <= 1
                      ? "text-red-600"
                      : strength.score === 2
                      ? "text-yellow-600"
                      : "text-green-700"
                  }
                  aria-live="polite"
                >
                  {strength.label}
                </span>
              </div>
              <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${barColor}`}
                  style={{
                    width:
                      strength.score === 0
                        ? "10%"
                        : strength.score === 1
                        ? "25%"
                        : strength.score === 2
                        ? "50%"
                        : strength.score === 3
                        ? "75%"
                        : "100%",
                  }}
                />
              </div>
              <ul className="mt-2 text-xs text-slate-600 space-y-1">
                <li className={/[a-z]/.test(password) ? "text-green-700" : ""}>
                  • lowercase letter
                </li>
                <li className={/[A-Z]/.test(password) ? "text-green-700" : ""}>
                  • uppercase letter
                </li>
                <li className={/[0-9]/.test(password) ? "text-green-700" : ""}>
                  • number
                </li>
                <li
                  className={
                    /[^A-Za-z0-9]/.test(password) ? "text-green-700" : ""
                  }
                >
                  • symbol
                </li>
                <li className={password.length >= 12 ? "text-green-700" : ""}>
                  • 12+ characters
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm mb-1">Confirm Password</label>
            <div className="relative flex items-center">
              <input
                className="w-full rounded-lg border p-2 pr-10 outline-none focus:ring"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute right-3 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <FiEyeOff size={20} />
                ) : (
                  <FiEye size={20} />
                )}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 mt-2 shadow-md disabled:opacity-60 transition-colors"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
