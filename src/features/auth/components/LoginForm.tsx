import React, { useState } from "react";
import { loginApi } from "../api/auth.api";
import { useAuthStore } from "../../../store/auth.store";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
  onBack: () => void;
}

export default function LoginForm({
  onSuccess,
  onSwitchToSignup,
  onBack,
}: LoginFormProps) {
  const doLogin = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.includes("@"))
      return setError("Please enter a valid email address.");
    if (password.length < 12)
      return setError("Password must be at least 12 characters long.");

    try {
      setLoading(true);
      const res = await loginApi(email, password);
      doLogin({ user: res.user, token: res.token });
      onSuccess();
    } catch (e) {
      if (e instanceof Error) setError(e.message || "Login failed");
      else setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl shadow-xl bg-white/95 backdrop-blur-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          Back
        </button>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            className="w-full rounded-lg border p-2 outline-none focus:ring"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
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
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-brand-600 underline font-medium"
            >
              Create an account
            </button>
          </p>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 mt-2 shadow-md disabled:opacity-60 transition-colors"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
