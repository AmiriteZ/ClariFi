import { X, AlertTriangle } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  loading?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  loading = false,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Delete Transactions
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete {count} selected transaction
            {count !== 1 ? "s" : ""}? This action cannot be undone.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 px-4 border border-input rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2 px-4 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
