// client/src/features/auth/pages/SignUpPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupApi } from "../api/auth.api";
import { useAuthStore } from "../../../store/auth.store";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { getPasswordStrength } from "../../../utils/passwordStrength";
import { FirebaseError } from "firebase/app";

function parseDob(dobStr: string): Date | null {
  // Expecting dd/mm/yyyy
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dobStr.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]); // 1–12
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);

  // Basic validity check (JS Date will auto-correct invalid dates otherwise)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isAtLeast12YearsOld(dob: Date): boolean {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 12;
}

function formatDobToIso(dob: Date): string {
  const year = dob.getFullYear();
  const month = String(dob.getMonth() + 1).padStart(2, "0");
  const day = String(dob.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // "YYYY-MM-DD"
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const doLogin = useAuthStore((s) => s.login);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState(""); // dd/mm/yyyy

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedDobInput = dob.trim();
    const trimmedEmail = email.trim();

    if (trimmedFirstName.length < 2) {
      return setError("Please enter your first name.");
    }

    if (trimmedLastName.length < 2) {
      return setError("Please enter your last name.");
    }

    if (!trimmedDobInput) {
      return setError("Please enter your date of birth.");
    }

    const parsedDob = parseDob(trimmedDobInput);
    if (!parsedDob) {
      return setError("Please enter a valid date of birth in dd/mm/yyyy format.");
    }

    if (!isAtLeast12YearsOld(parsedDob)) {
      return setError("You must be at least 12 years old to sign up.");
    }

    const dobIso = formatDobToIso(parsedDob); // "YYYY-MM-DD" for the backend

    if (!trimmedEmail.includes("@")) {
      return setError("Enter a valid email.");
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    if (strength.score < 2) {
      return setError("Please choose a stronger password.");
    }

    try {
      setLoading(true);

      const res = await signupApi(
        trimmedFirstName,
        trimmedLastName,
        dobIso, // send ISO to backend
        trimmedEmail,
        password
      );

      // res.user is now { id, name, email } which matches auth.store
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
          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">First name</label>
              <input
                className="w-full rounded-lg border p-2 outline-none focus:ring"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Last name</label>
              <input
                className="w-full rounded-lg border p-2 outline-none focus:ring"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm mb-1">Date of birth</label>
            <input
              className="w-full rounded-lg border p-2 outline-none focus:ring"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              placeholder="dd/mm/yyyy"
              inputMode="numeric"
              maxLength={10}
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
