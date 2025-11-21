import { useEffect, useState } from "react";
import { getInstitutions, type Institution } from "../api/institutions.api";
import { initiateYapilyConnection } from "../api/bankConnections.api";

interface InstitutionSelectionModalProps {
  onSuccess: (connectionId: string) => void;
  onCancel: () => void;
}

export default function InstitutionSelectionModal({
  onSuccess,
  onCancel,
}: InstitutionSelectionModalProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      const data = await getInstitutions();
      setInstitutions(data);
    } catch (err) {
      console.error("Failed to load institutions:", err);
      setError("Failed to load banks");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstitution = async (institutionId: number) => {
    console.log("🏦 Starting connection for institution:", institutionId);
    setConnecting(true);
    setError(null);

    try {
      const result = await initiateYapilyConnection(institutionId);
      console.log("📋 Connection result:", result);

      if (result.consentUrl) {
        console.log("🔗 Got consent URL, redirecting to Yapily...");
        // Store connection ID for syncing after redirect
        if (result.connectionId) {
          console.log(
            "💾 Storing connection ID in localStorage:",
            result.connectionId
          );
          localStorage.setItem("pendingYapilyConnection", result.connectionId);
        }
        // Redirect to Yapily consent page
        console.log("➡️ Redirecting to:", result.consentUrl);
        window.location.href = result.consentUrl;
      } else if (result.connectionId) {
        console.log("✅ No consent URL, proceeding with direct sync");
        // If no consent URL, proceed with sync
        onSuccess(result.connectionId);
      }
    } catch (err) {
      console.error("❌ Connection failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to bank"
      );
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Select Your Bank
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Choose your financial institution to connect securely via Open
          Banking.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-slate-500">Loading banks...</p>
        </div>
      ) : institutions.length === 0 ? (
        <div className="rounded-lg bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">No banks available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {institutions.map((institution) => (
            <button
              key={institution.id}
              onClick={() => handleSelectInstitution(institution.id)}
              disabled={connecting}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {institution.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {institution.country_code}
                  </p>
                </div>
                <svg
                  className="h-5 w-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={connecting}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
