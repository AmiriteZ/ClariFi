import React, { useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../api/auth.api";
import { useAuthStore } from "../../../store/auth.store";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});

type FormState = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }
    try {
      setLoading(true);
      const res = await loginApi(form.email, form.password);
      login(res);
      navigate("/dashboard", { replace: true });
    } catch (e) {
        if (e instanceof Error) {
            setError(e.message || "Login failed");
        } else {
            setError("Login failed");
    }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl shadow-lg bg-white p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-slate-600">
            Use demo: demo@dashurl.app / Demo1234!
          </p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded-lg border p-2 outline-none focus:ring"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full rounded-lg border p-2 outline-none focus:ring"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
