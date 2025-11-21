import { AlertTriangle } from "lucide-react";

interface ConfirmCancelModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmCancelModal({
  isOpen,
  onConfirm,
  onCancel,
}: ConfirmCancelModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Cancel Budget Setup?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This will delete the budget. Any unsaved changes will be lost. This
            action cannot be undone.
          </p>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Keep Editing
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete Budget
          </button>
        </div>
      </div>
    </div>
  );
}
