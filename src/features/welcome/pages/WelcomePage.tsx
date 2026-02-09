import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TextType from "../../../components/TextType";
import ColorBends from "../../../components/ColorBends";
import LoginForm from "../../auth/components/LoginForm";
import SignUpForm from "../../auth/components/SignUpForm";

type AuthView = "selection" | "login" | "signup";

export default function WelcomePage() {
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>("selection");

  const handleSuccess = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Section (1/3 width on desktop) */}
      <div className="md:w-1/3 w-full bg-white text-brand-600 flex flex-col justify-center items-center p-8 z-10 relative">
        {view === "selection" && (
          <div className="flex flex-col items-center w-full max-w-md animate-in fade-in slide-in-from-left-4 duration-500">
            <h1 className="text-4xl font-bold mb-4">Welcome to ClariFi</h1>
            <p className="text-gray-800 text-md text-center font-semibold mb-10">
              Are you ready to take control of your finances and achieve your
              financial goals?
            </p>
            <br />
            <br />

            <div className="flex flex-col w-full max-w-xs shadow-md rounded-xl mb-8 overflow-hidden border border-slate-100">
              <div className="bg-slate-50 p-4 border-b border-slate-100">
                <p className="text-gray-700 text-center font-medium">
                  Already Have an Account?
                </p>
              </div>
              <button
                onClick={() => setView("login")}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 transition-colors"
              >
                Log In
              </button>
            </div>

            <div className="flex flex-col w-full max-w-xs shadow-md rounded-xl overflow-hidden border border-slate-100">
              <div className="bg-slate-50 p-4 border-b border-slate-100">
                <p className="text-gray-700 text-center font-medium">
                  Need to Sign Up?
                </p>
              </div>
              <button
                onClick={() => setView("signup")}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {view === "login" && (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToSignup={() => setView("signup")}
            onBack={() => setView("selection")}
          />
        )}

        {view === "signup" && (
          <SignUpForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setView("login")}
            onBack={() => setView("selection")}
          />
        )}
      </div>

      {/* Right Section (2/3 width on desktop) */}
      <div className="relative md:w-2/3 w-full flex justify-center items-center overflow-hidden min-h-[300px] md:min-h-screen">
        {/* 👇 ColorBends background */}
        <div className="absolute inset-0 -z-10">
          <ColorBends
            colors={["#10b981", "#34d399", "#059669"]}
            rotation={40}
            speed={0.3}
            scale={1.2}
            frequency={2}
            warpStrength={1.2}
            mouseInfluence={0}
            parallax={0.6}
            noise={0}
            transparent={false}
          />
        </div>

        {/* Foreground content */}
        <div className="max-w-lg w-full text-center p-4">
          <TextType
            text={[
              "Gain Financial Clarity.",
              "Track Your Expenses Effortlessly.",
              "Achieve Your Saving Goals.",
              "Make Informed Financial Decisions.",
            ]}
            typingSpeed={100}
            pauseDuration={2000}
            loop
            className="text-4xl md:text-7xl text-white text-center font-semibold drop-shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
