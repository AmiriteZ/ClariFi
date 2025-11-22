import { useEffect, useState } from "react";
import { getAccounts, deleteAccount, type Account } from "../api/accounts.api";
import {
  Plus,
  RefreshCw,
  Building2,
  CreditCard,
  Wallet,
  Trash2,
} from "lucide-react";
import AddAccountModal from "../components/AddAccountModal";
import { syncAccounts } from "../api/bankConnections.api";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    console.log("🔄 AccountsPage mounted, checking for pending connections...");
    const init = async () => {
      // Check URL params for consent token (returned after Yapily redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const consentToken = urlParams.get("consent");
      const pendingId = localStorage.getItem("pendingYapilyConnection");

      if (pendingId && consentToken) {
        console.log("✅ Found pending connection:", pendingId);
        console.log("🔑 Found consent token from URL");
        localStorage.removeItem("pendingYapilyConnection");

        // Clear the URL params to clean up the address bar
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        setSyncing(true);
        try {
          console.log("🔄 Syncing accounts with consent token...");
          const syncResult = await syncAccounts(pendingId, consentToken);
          console.log("✅ Sync complete:", syncResult);
        } catch (err) {
          console.error("❌ Sync failed:", err);
        } finally {
          setSyncing(false);
        }
      } else if (pendingId && !consentToken) {
        console.log("⚠️ Found pending connection but no consent token in URL");
        localStorage.removeItem("pendingYapilyConnection");
      } else {
        console.log("ℹ️ No pending connection found");
      }

      console.log("🔄 Loading accounts...");
      await loadAccounts();
    };
    init();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    console.log("➡️ Calling getAccounts API...");
    try {
      const data = await getAccounts();
      console.log("✅ Accounts data received:", data);
      setAccounts(data.accounts);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load accounts";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (
    accountId: string,
    accountName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${accountName}"? This will also delete all associated transactions.`
      )
    ) {
      return;
    }

    try {
      await deleteAccount(accountId);
      await loadAccounts(); // Reload accounts after deletion
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account";
      setError(message);
    }
  };

  const getAccountIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("card")) return <CreditCard className="w-5 h-5" />;
    if (t.includes("cash") || t.includes("wallet"))
      return <Wallet className="w-5 h-5" />;
    return <Building2 className="w-5 h-5" />;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IE", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full h-full px-10 py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Accounts</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your linked bank accounts and connections.
            </p>
          </div>
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadAccounts}
              className="text-xs font-medium text-red-700 hover:underline mt-2"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading/Syncing State */}
        {(loading || syncing) && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="mt-3 text-sm text-slate-500">
              {syncing
                ? "Syncing accounts from your bank..."
                : "Loading accounts..."}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && accounts.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">
              No accounts linked
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Link your bank accounts to automatically track your transactions
              and balances.
            </p>
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Link an account
            </button>
          </div>
        )}

        {/* Accounts List */}
        {!loading && !error && accounts.length > 0 && (
          <div className="grid gap-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                      {getAccountIcon(account.accountType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {account.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        {account.institutionName} • {account.maskedRef}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(
                          account.currentBalance,
                          account.currencyCode
                        )}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-1">
                        <RefreshCw className="w-3 h-3" />
                        Synced {formatDate(account.lastSyncedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteAccount(account.id, account.name)
                      }
                      className="ml-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onAccountAdded={() => {
          setShowAddAccountModal(false);
          loadAccounts();
        }}
      />
    </div>
  );
}
