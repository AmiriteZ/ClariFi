import { useState } from "react";
import ManualAccountForm from "./ManualAccountForm";
import InstitutionSelectionModal from "./InstitutionSelectionModal";
import { syncAccounts } from "../api/bankConnections.api";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: () => void;
}

type Step = "choice" | "manual" | "openBanking" | "syncing";

export default function AddAccountModal({
  isOpen,
  onClose,
  onAccountAdded,
}: AddAccountModalProps) {
  const [step, setStep] = useState<Step>("choice");

  const handleManualSuccess = () => {
    onAccountAdded();
    handleClose();
  };

  const handleOpenBankingConnectionCreated = async (connId: string) => {
    setStep("syncing");

    try {
      await syncAccounts(connId);
      onAccountAdded();
      handleClose();
    } catch (err) {
      console.error("Failed to sync accounts:", err);
      // Show error but still close modal
      handleClose();
    }
  };

  const handleClose = () => {
    setStep("choice");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {step === "choice" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Add Account
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose how you'd like to add an account
              </p>
            </div>

            <button
              onClick={() => setStep("openBanking")}
              className="w-full rounded-lg border-2 border-emerald-600 bg-emerald-50 px-6 py-4 text-left hover:bg-emerald-100"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-emerald-600 p-2">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    Connect a Bank
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Securely link your bank account using Open Banking
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep("manual")}
              className="w-full rounded-lg border-2 border-slate-300 px-6 py-4 text-left hover:bg-slate-50"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-slate-600 p-2">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    Create Manual Account
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Enter account details manually
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleClose}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}

        {step === "manual" && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Create Manual Account
            </h2>
            <ManualAccountForm
              onSuccess={handleManualSuccess}
              onCancel={() => setStep("choice")}
            />
          </div>
        )}

        {step === "openBanking" && (
          <InstitutionSelectionModal
            onSuccess={handleOpenBankingConnectionCreated}
            onCancel={() => setStep("choice")}
          />
        )}

        {step === "syncing" && (
          <div className="py-8 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="mt-4 text-sm text-slate-600">Syncing accounts...</p>
          </div>
        )}
      </div>
    </div>
  );
}
