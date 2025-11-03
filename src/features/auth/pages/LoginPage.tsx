import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../api/auth.api";
import { useAuthStore } from "../../../store/auth.store";
import { FiEye, FiEyeOff } from "react-icons/fi"; // 👈 from react-icons

export default function LoginPage() {
  const navigate = useNavigate();
  const doLogin = useAuthStore((s) => s.login);

  // Form/UI state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 👈 track toggle state

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.includes("@"))
      return setError("Please enter a valid email address.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters long.");

    try {
      setLoading(true);

      // 1️⃣ Call fake API
      const res = await loginApi(email, password);

      // 2️⃣ Save session to Zustand
      doLogin({ user: res.user, token: res.token });

      // 3️⃣ Navigate to dashboard
      navigate("/dashboard", { replace: true });
    } catch (e) {
      if (e instanceof Error) setError(e.message || "Login failed");
      else setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-blue-50 p-4">
      <div className="w-full max-w-sm rounded-2xl shadow-xl bg-white p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Sign in to ClariFi</h1>
          <p className="text-sm text-slate-600 mt-1">
            Demo: <code>demo@clarifi.app</code> / <code>Demo1234!</code>
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={onSubmit}>
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

          <div>
            <label className="block text-sm mb-1">Password</label>
            <div className="relative flex items-center">
              <input
                className="w-full rounded-lg border p-2 pr-10 outline-none focus:ring"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-4">
              New here?{" "}
              <a href="/signup" className="text-blue-700 underline">
                Create an account
              </a>
            </p>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 mt-2 shadow-md disabled:opacity-60 transition-colors"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
