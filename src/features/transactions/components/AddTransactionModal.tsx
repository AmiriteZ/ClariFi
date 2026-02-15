import { useState } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { type Account } from "../../accounts/api/accounts.api";
import { type Category } from "../../categories/api/categories.api";
import { createTransaction } from "../api/transactions.api";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
}: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    direction: "debit" as "debit" | "credit",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    merchantName: "",
    accountId: "",
    categoryId: "",
    isHiddenFromHousehold: false,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.accountId) throw new Error("Please select an account");
      if (!formData.amount || parseFloat(formData.amount) <= 0)
        throw new Error("Please enter a valid amount");
      if (!formData.description) throw new Error("Please enter a description");

      await createTransaction({
        account_id: formData.accountId,
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description,
        direction: formData.direction,
        category_id: formData.categoryId || undefined,
        merchant_name: formData.merchantName || formData.description,
        currency_code: "EUR", // Default for now
        is_hidden_from_household: formData.isHiddenFromHousehold,
      });

      onSuccess();
      onClose();
      // Reset form
      setFormData({
        direction: "debit",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        merchantName: "",
        accountId: "",
        categoryId: "",
        isHiddenFromHousehold: false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create transaction",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                formData.direction === "debit"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setFormData({ ...formData, direction: "debit" })}
            >
              Expense
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                formData.direction === "credit"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setFormData({ ...formData, direction: "credit" })}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                €
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            {/* Account */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Account
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                value={formData.accountId}
                onChange={(e) =>
                  setFormData({ ...formData, accountId: e.target.value })
                }
                required
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. Weekly Groceries"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Category (Optional)
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({ ...formData, categoryId: e.target.value })
              }
            >
              <option value="">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isHiddenFromHousehold"
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={formData.isHiddenFromHousehold}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isHiddenFromHousehold: e.target.checked,
                })
              }
            />
            <label
              htmlFor="isHiddenFromHousehold"
              className="text-sm text-slate-600 select-none cursor-pointer"
            >
              Hide from household
            </label>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-emerald-600 rounded-lg text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
