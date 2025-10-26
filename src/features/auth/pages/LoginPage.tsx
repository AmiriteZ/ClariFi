import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { z } from "zod";
console.log("Rendering LoginPage");

const schema = z.object({
  email: z.string().email("Enter a valid Email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export default function LoginPage() {
  // React State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); // Error state for displaying error messages when login fails
  const [loading, setLoading] = useState(false); // Loading state to indicate login process
  const [show, setShow] = useState(false); // State to toggle password visibility

  //submit handler
  async function onSubmit(event: React.FormEvent) {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4"> {/* Container div for centering the form */}
      <div className="w-full max-w-sm rounded-2xl shadow-lg bg-white p-6"> {/* Form container with styling */}
      {/*Header*/}
        <div className="mb-6">
        <h1 className ="text-2xl font-semibold">Sign in to ClariFi</h1>
        <p className="text-sm text-slate-600 mt-1">
          Demo: <code>demo@clarifi.app</code> / <code>Demo1234!</code>
        </p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm mb-1">Email: </label>
            <input
              className="w-full rounded-lg border p-2 outline-none focus:ring"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              />
          </div>
          <div>
            <label className="block text-sm mb-1">Password: </label>
            <div className="relative">
              <input
              className="w-full rounded-lg border p-2 pr-20 outline-none focus:ring"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) =>!s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"

              >
                {show ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>} {/* Display error message if any */}
          <button
            type="submit"
            disabled={loading} // Disable button when loading
            className="w-full rounded-lg bg-slate-500 text-white py-2 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}