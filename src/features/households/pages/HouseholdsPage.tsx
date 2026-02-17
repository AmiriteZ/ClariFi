import React, { useEffect, useState } from "react";
import {
  Plus,
  Home,
  Users,
  Key,
  LogOut,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  createHousehold,
  joinHousehold,
  getHouseholdDetails,
  manageMember,
  type Household,
  type HouseholdDetail,
} from "../api/households.api";
import { useHousehold } from "../../../store/household.context";
import { useAuthStore } from "../../../store/auth.store";

export default function HouseholdsPage() {
  const {
    userHouseholds,
    refreshHouseholds,
    setActiveHousehold,
    activeHousehold,
  } = useHousehold();
  const { user } = useAuthStore();

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(
    null,
  );
  const [detailData, setDetailData] = useState<HouseholdDetail | null>(null);

  // Load details when expanding a household
  useEffect(() => {
    if (selectedHouseholdId) {
      getHouseholdDetails(selectedHouseholdId)
        .then(setDetailData)
        .catch((err) => console.error(err));
    } else {
      setDetailData(null);
    }
  }, [selectedHouseholdId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await createHousehold(newName);
      setSuccess("Household created!");
      setNewName("");
      setIsCreating(false);
      refreshHouseholds();
    } catch (err: any) {
      setError(err.message || "Failed to create household");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await joinHousehold(joinCode);
      setSuccess("Request sent! Status: " + res.message);
      setJoinCode("");
      setIsJoining(false);
      refreshHouseholds();
    } catch (err: any) {
      setError(err.message || "Failed to join");
    }
  };

  const handleMemberAction = async (
    targetId: string,
    action: "approve" | "reject" | "kick",
  ) => {
    if (!detailData) return;
    try {
      await manageMember(detailData.id, targetId, action);
      // Refresh detail data
      const updated = await getHouseholdDetails(detailData.id);
      setDetailData(updated);
    } catch (err: any) {
      alert("Action failed: " + err.message);
    }
  };

  const handleSelectActive = (h: Household) => {
    setActiveHousehold(h);
    // Ask if they want to switch view immediately?
    // For now just set it as active choice for "Household View"
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Home className="w-8 h-8 text-primary" />
            Households
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your shared financial spaces.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setIsCreating(true);
              setIsJoining(false);
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
          <button
            onClick={() => {
              setIsJoining(true);
              setIsCreating(false);
            }}
            className="flex items-center gap-2 bg-card border border-input text-foreground px-4 py-2 rounded-lg hover:bg-muted transition"
          >
            <Key className="w-4 h-4" />
            Join with Code
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 text-green-600 p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {success}
        </div>
      )}

      {/* Forms */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="bg-card p-6 rounded-xl shadow-sm border border-border flex flex-col md:flex-row gap-4 md:items-end"
        >
          <div className="w-full md:flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">
              Household Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-input bg-background rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g. Our Family, The Smiths"
              required
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              type="submit"
              className="flex-1 md:flex-none bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 justify-center"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="flex-1 md:flex-none text-muted-foreground px-4 py-2 hover:text-foreground text-center"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isJoining && (
        <form
          onSubmit={handleJoin}
          className="bg-card p-6 rounded-xl shadow-sm border border-border flex flex-col md:flex-row gap-4 md:items-end"
        >
          <div className="w-full md:flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">
              Invite Code (6 characters)
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full border border-input bg-background rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary uppercase tracking-widest"
              placeholder="A1B2C3"
              maxLength={6}
              required
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              type="submit"
              className="flex-1 md:flex-none bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 justify-center"
            >
              Join Request
            </button>
            <button
              type="button"
              onClick={() => setIsJoining(false)}
              className="flex-1 md:flex-none text-muted-foreground px-4 py-2 hover:text-foreground text-center"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="grid gap-4">
        {userHouseholds.length === 0 && !isCreating && !isJoining && (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
            <Home className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              You don't belong to any households yet.
            </p>
            <p className="text-muted-foreground/80 text-sm">
              Create one or join an existing one to get started.
            </p>
          </div>
        )}

        {userHouseholds.map((h) => (
          <div
            key={h.id}
            className={`bg-card rounded-xl shadow-sm border transition-shadow ${selectedHouseholdId === h.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
          >
            <div
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() =>
                setSelectedHouseholdId(
                  selectedHouseholdId === h.id ? null : h.id,
                )
              }
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-full ${h.status === "active" ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-600"}`}
                >
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {h.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {h.member_count} members
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        h.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {h.status === "pending_approval"
                        ? "Pending Approval"
                        : h.role === "owner"
                          ? "Owner"
                          : "Member"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Quick Action: Set as active context */}
                {h.status === "active" && activeHousehold?.id !== h.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectActive(h);
                    }}
                    className="text-sm bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition"
                  >
                    Select
                  </button>
                )}
                {activeHousehold?.id === h.id && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* EXPANDED DETAILS */}
            {selectedHouseholdId === h.id && (
              <div className="border-t border-border p-4 bg-muted/30 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-300">
                {!detailData ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner text-primary">
                      Loading...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Invite Code Section for Owners */}
                    {detailData.currentUserRole === "owner" && (
                      <div className="bg-card p-4 rounded-lg border border-border">
                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <Key className="w-4 h-4 text-muted-foreground" />
                          Invite Code
                        </h4>
                        <div className="flex items-center gap-3">
                          <code className="bg-muted text-foreground px-3 py-1.5 rounded text-lg font-mono tracking-widest border border-border">
                            {detailData.invite_code}
                          </code>
                          <span className="text-sm text-muted-foreground">
                            Share this code with family members to let them
                            join.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Members List */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        Members
                      </h4>
                      <div className="space-y-2">
                        {detailData.members && detailData.members.length > 0 ? (
                          detailData.members.map((m) => (
                            <div
                              key={m.id}
                              className="flex justify-between items-center bg-card p-3 rounded-lg border border-border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-border">
                                  {m.photoUrl ? (
                                    <img
                                      src={m.photoUrl}
                                      alt={m.display_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    (m.display_name || "?")
                                      .charAt(0)
                                      .toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {m.display_name || "Unknown Member"}{" "}
                                    {m.id === user?.id ? "(You)" : ""}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {m.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    m.status === "active"
                                      ? "bg-green-500/10 text-green-600"
                                      : m.status === "pending_approval"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {m.status
                                    ? m.status.replace("_", " ")
                                    : "Unknown"}
                                </span>

                                {/* Admin Actions */}
                                {detailData.currentUserRole === "owner" &&
                                  m.id !==
                                    detailData.currentUserRole /* cant kick self logic? detailData doesnt have User ID to check against. Skip for now or relying on backend check. Actually we need to check if m.id is NOT current user. We dont have current user ID easily available here except from auth store. */ &&
                                  user?.id !== m.id && (
                                    <div className="flex gap-2">
                                      {m.status === "pending_approval" && (
                                        <>
                                          <button
                                            onClick={() =>
                                              handleMemberAction(
                                                m.id,
                                                "approve",
                                              )
                                            }
                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                            title="Approve"
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleMemberAction(m.id, "reject")
                                            }
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                            title="Reject"
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                      {m.status === "active" && (
                                        <button
                                          onClick={() =>
                                            handleMemberAction(m.id, "kick")
                                          }
                                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                          title="Remove Member"
                                        >
                                          <LogOut className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No members found.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
