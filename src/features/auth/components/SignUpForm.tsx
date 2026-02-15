// client/src/features/auth/components/SignUpForm.tsx
import React, { useState } from "react";
import { signupApi, loginWithGoogle } from "../api/auth.api";
import { useAuthStore } from "../../../store/auth.store";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { getPasswordStrength } from "../../../utils/passwordStrength";
import { FirebaseError } from "firebase/app";

// Helper functions (copied from SignUpPage.tsx since they aren't exported)
function parseDob(dobStr: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dobStr.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;
  return date;
}

function isAtLeast12YearsOld(dob: Date): boolean {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age >= 12;
}

function formatDobToIso(dob: Date): string {
  const year = dob.getFullYear();
  const month = String(dob.getMonth() + 1).padStart(2, "0");
  const day = String(dob.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface SignUpFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
}

export default function SignUpForm({
  onSuccess,
  onSwitchToLogin,
  onBack,
}: SignUpFormProps) {
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

    if (trimmedFirstName.length < 2)
      return setError("Please enter your first name.");
    if (trimmedLastName.length < 2)
      return setError("Please enter your last name.");
    if (!trimmedDobInput) return setError("Please enter your date of birth.");

    const parsedDob = parseDob(trimmedDobInput);
    if (!parsedDob)
      return setError(
        "Please enter a valid date of birth in dd/mm/yyyy format.",
      );
    if (!isAtLeast12YearsOld(parsedDob))
      return setError("You must be at least 12 years old to sign up.");

    const dobIso = formatDobToIso(parsedDob);

    if (!trimmedEmail.includes("@")) return setError("Enter a valid email.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");
    if (strength.score < 2)
      return setError("Please choose a stronger password.");

    try {
      setLoading(true);
      const res = await signupApi(
        trimmedFirstName,
        trimmedLastName,
        dobIso,
        trimmedEmail,
        password,
      );
      doLogin({ user: res.user, token: res.token });
      onSuccess();
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
    <div className="w-full max-w-sm rounded-2xl shadow-xl bg-white/95 backdrop-blur-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          Back
        </button>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
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
            >
              {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>

          <div className="mt-2">
            {/* Strength Meter Bars */}
            <div className="h-1 w-full rounded bg-slate-200 overflow-hidden mb-1">
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
            <p className="text-xs text-slate-500">{strength.label}</p>
          </div>
        </div>

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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">
              Or continue with
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              setLoading(true);
              const res = await loginWithGoogle();
              doLogin({ user: res.user, token: res.token });
              onSuccess();
            } catch (e) {
              if (e instanceof Error)
                setError(e.message || "Google login failed");
              else setError("Google login failed");
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 transition-colors"
        >
          <FcGoogle size={20} />
          Google
        </button>
      </form>

      <p className="text-sm text-slate-600 mt-4">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-brand-600 underline font-medium"
        >
          Log in
        </button>
      </p>
    </div>
  );
}
