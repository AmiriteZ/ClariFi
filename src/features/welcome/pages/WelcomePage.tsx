import React from "react";
import TextType from "../../../components/TextType";
import ColorBends from "../../../components/ColorBends";

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Section (1/3 width on desktop) */}
      <div className="md:w-1/3 w-full bg-white text-brand-600 flex flex-col justify-center items-center p-8 z-10 ">
        <h1 className="text-4xl font-bold mb-4">Welcome to ClariFi</h1>
        <p className="text-gray-800 text-md text-center font-semibold mb-10">
          Are you ready to take control of your finances and achieve your financial goals?
        </p>
        <br></br>
        <br></br>
        <div className="flex flex-col gap-4 w-2xs shadow-xl rounded-xl mb-15">
          <p className="text-gray-700 text-center font-semibold">
            Already Have an Account?
          </p>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            className="w-full rounded-b-lg bg-brand-600 hover:bg-brand-800 text-white font-semibold py-3 mt-2 transition-colors"
          >
            Log In
          </button>
        </div>
        <div className="flex flex-col gap-4 w-2xs shadow-xl rounded-xl mb-10">
          <p className="text-gray-700 text-center font-semibold">
            Need to Sign Up?
          </p>
          <button
            onClick={() => {
              window.location.href = "/signup";
            }}
            className="w-full rounded-b-lg bg-brand-600 hover:bg-brand-800 text-white font-semibold py-3 mt-2 transition-colors"
          >
            Sign Up
          </button>
        </div>

      </div>

      {/* Right Section (2/3 width on desktop) */}
      <div className="relative md:w-2/3 w-full flex justify-center items-center overflow-hidden">
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
        <div className="max-w-lg w-full text-center">
          <TextType
            text={[
              "Gain Financial Clarity.",
              "Track Your Expenses Effortlessly.",
              "Achieve Your Savings Goals.",
              "Make Informed Financial Decisions.",
            ]}
            typingSpeed={100}
            pauseDuration={2000}
            loop
            className="text-7xl text-white text-center font-semibold"
          />
        </div>
      </div>
    </div>
  );
}
