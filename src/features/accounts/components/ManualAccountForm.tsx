import { useState } from "react";
import {
  createManualConnection,
  type ManualAccountInput,
} from "../api/bankConnections.api";

interface ManualAccountFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ManualAccountForm({
  onSuccess,
  onCancel,
}: ManualAccountFormProps) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("current");
  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [startingBalance, setStartingBalance] = useState("");
  const [maskedRef, setMaskedRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: ManualAccountInput = {
        name,
        accountType,
        currencyCode,
        startingBalance: startingBalance ? parseFloat(startingBalance) : 0,
        maskedRef: maskedRef || undefined,
      };

      await createManualConnection(data);
      onSuccess();
    } catch (err) {
      console.error("Failed to create manual account:", err);
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Account Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="e.g. Personal Checking"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Account Type *
        </label>
        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="current">Current Account</option>
          <option value="savings">Savings Account</option>
          <option value="cash">Cash</option>
          <option value="wallet">Wallet</option>
          <option value="investment">Investment</option>
          <option value="credit_card">Credit Card</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Currency *
        </label>
        <select
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Starting Balance
        </label>
        <input
          type="number"
          value={startingBalance}
          onChange={(e) => setStartingBalance(e.target.value)}
          step="0.01"
          min="0"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Masked Reference (Optional)
        </label>
        <input
          type="text"
          value={maskedRef}
          onChange={(e) => setMaskedRef(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="e.g. ****1234"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>
    </form>
  );
}
