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
          window.location.pathname,
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
    accountName: string,
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${accountName}"? This will also delete all associated transactions.`,
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
    <div className="w-full h-full px-4 py-6 md:px-10 md:py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Accounts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your linked bank accounts and connections.
            </p>
          </div>
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl bg-destructive/10 p-4 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={loadAccounts}
              className="text-xs font-medium text-destructive hover:underline mt-2"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading/Syncing State */}
        {(loading || syncing) && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-3 text-sm text-muted-foreground">
              {syncing
                ? "Syncing accounts from your bank..."
                : "Loading accounts..."}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && accounts.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              No accounts linked
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Link your bank accounts to automatically track your transactions
              and balances.
            </p>
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
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
                className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                      {getAccountIcon(account.accountType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {account.name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {account.institutionName} • {account.maskedRef}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {formatCurrency(
                          account.currentBalance,
                          account.currencyCode,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-1">
                        <RefreshCw className="w-3 h-3" />
                        Synced {formatDate(account.lastSyncedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteAccount(account.id, account.name)
                      }
                      className="ml-4 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
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
