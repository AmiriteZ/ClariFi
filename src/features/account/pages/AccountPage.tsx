import { useState, useRef } from "react";
import { useAuthStore } from "../../../store/auth.store";
import { updateUser } from "../../auth/api/auth.api";
import { Camera, Save, Loader2, User as UserIcon } from "lucide-react";

export default function AccountPage() {
  const { user, token, login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(user?.name.split(" ")[0] || "");
  const [lastName, setLastName] = useState(
    user?.name.split(" ").slice(1).join(" ") || "",
  );
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    user?.photoUrl || null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoBase64(base64);
      setPreviewUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await updateUser(token, {
        firstName,
        lastName,
        photoBase64: photoBase64 || undefined,
      });

      login({ user: updatedUser, token });
      setSuccess("Profile updated successfully");
      setPhotoBase64(null); // Clear base64 after upload to avoid re-uploading
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500">Manage your profile information</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Profile Picture */}
          <div className="flex flex-col items-center sm:flex-row gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <UserIcon className="w-10 h-10" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors text-slate-600"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-medium text-slate-900">Profile Picture</h3>
              <p className="text-sm text-slate-500 mt-1">
                Upload a new profile picture. Max size 5MB.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">
              Email cannot be changed directly.
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
