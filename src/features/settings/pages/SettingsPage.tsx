import { useState, useRef } from "react";
import { useAuthStore } from "../../../store/auth.store";
import { updateUser, setOnboardingStatus } from "../../auth/api/auth.api";
import { Button } from "../../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import {
  User,
  Moon,
  Sun,
  Monitor,
  Camera,
  Save,
  Loader2,
  User as UserIcon,
  HelpCircle,
  RefreshCcw,
} from "lucide-react";
import { useTheme } from "../../../components/theme-provider";
import { ImageCropperModal } from "../components/ImageCropperModal";

export default function SettingsPage() {
  const { user, token, login } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Profile State
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(user?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(
    user?.name?.split(" ").slice(1).join(" ") || "",
  );
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    user?.photoUrl || null,
  );

  const [rawImage, setRawImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

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
      setRawImage(base64);
      setShowCropper(true);
      // Reset input so the same file triggers change again if clicked twice
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = (croppedDataUrl: string) => {
    setPhotoBase64(croppedDataUrl);
    setPreviewUrl(croppedDataUrl);
    setShowCropper(false);
    setRawImage(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setRawImage(null);
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
      setPhotoBase64(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Settings
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your account preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {/* Profile Picture */}
              <div className="flex flex-col items-center sm:flex-row gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <UserIcon className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-neutral-600 dark:text-neutral-400"
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
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Profile Picture
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Upload a new profile picture. Max size 5MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  defaultValue={user?.email || ""}
                  disabled
                  className="bg-neutral-50 dark:bg-neutral-900 text-neutral-500"
                />
                <p className="text-xs text-neutral-500">
                  Email cannot be changed directly.
                </p>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how ClariFi looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Theme</p>
                <p className="text-sm text-neutral-500">
                  Select your preferred theme
                </p>
              </div>
              <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme("light")}
                  className={`h-8 w-8 p-0 ${
                    theme === "light"
                      ? "bg-white dark:bg-neutral-700 shadow-sm text-brand-600 dark:text-brand-400"
                      : "text-neutral-500"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className={`h-8 w-8 p-0 ${
                    theme === "dark"
                      ? "bg-white dark:bg-neutral-700 shadow-sm text-brand-600 dark:text-brand-400"
                      : "text-neutral-500"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme("system")}
                  className={`h-8 w-8 p-0 ${
                    theme === "system"
                      ? "bg-white dark:bg-neutral-700 shadow-sm text-brand-600 dark:text-brand-400"
                      : "text-neutral-500"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Onboarding
            </CardTitle>
            <CardDescription>
              Need a refresher? Restart the interactive tour.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Interactive Guide</p>
                <p className="text-sm text-neutral-500">
                  Restart the tour of ClariFi's features
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (token && user) {
                    try {
                      setResetLoading(true);
                      setError(null);
                      setSuccess(null);
                      await setOnboardingStatus(token, false);
                      login({ user: { ...user, hasOnboarded: false }, token });
                      // Success message might not be seen as we navigate away,
                      // but it's good to have.
                      setSuccess("Onboarding guide has been reset");
                    } catch {
                      setError("Failed to reset onboarding guide");
                    } finally {
                      setResetLoading(false);
                    }
                  }
                }}
                disabled={resetLoading}
                className="gap-2"
              >
                {resetLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                Restart Tour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showCropper && rawImage && (
        <ImageCropperModal
          imageSrc={rawImage}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
