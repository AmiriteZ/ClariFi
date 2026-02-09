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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Home className="w-8 h-8 text-brand-600" />
            Households
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your shared financial spaces.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setIsCreating(true);
              setIsJoining(false);
            }}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
          <button
            onClick={() => {
              setIsJoining(true);
              setIsCreating(false);
            }}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            <Key className="w-4 h-4" />
            Join with Code
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {success}
        </div>
      )}

      {/* Forms */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Household Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="e.g. Our Family, The Smiths"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="text-gray-500 px-4 py-2 hover:text-gray-700"
          >
            Cancel
          </button>
        </form>
      )}

      {isJoining && (
        <form
          onSubmit={handleJoin}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite Code (6 characters)
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 uppercase tracking-widest"
              placeholder="A1B2C3"
              maxLength={6}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700"
          >
            Join Request
          </button>
          <button
            type="button"
            onClick={() => setIsJoining(false)}
            className="text-gray-500 px-4 py-2 hover:text-gray-700"
          >
            Cancel
          </button>
        </form>
      )}

      {/* List */}
      <div className="grid gap-4">
        {userHouseholds.length === 0 && !isCreating && !isJoining && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              You don't belong to any households yet.
            </p>
            <p className="text-gray-400 text-sm">
              Create one or join an existing one to get started.
            </p>
          </div>
        )}

        {userHouseholds.map((h) => (
          <div
            key={h.id}
            className={`bg-white rounded-xl shadow-sm border transition-shadow ${selectedHouseholdId === h.id ? "border-brand-300 ring-2 ring-brand-50" : "border-gray-200 hover:border-brand-200"}`}
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
                  className={`p-3 rounded-full ${h.status === "active" ? "bg-brand-50 text-brand-600" : "bg-amber-50 text-amber-600"}`}
                >
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {h.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
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
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
                  >
                    Select
                  </button>
                )}
                {activeHousehold?.id === h.id && (
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* EXPANDED DETAILS */}
            {selectedHouseholdId === h.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-300">
                {!detailData ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner text-brand-600">
                      Loading...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Invite Code Section for Owners */}
                    {detailData.currentUserRole === "owner" && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Key className="w-4 h-4 text-gray-400" />
                          Invite Code
                        </h4>
                        <div className="flex items-center gap-3">
                          <code className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded text-lg font-mono tracking-widest border border-gray-200">
                            {detailData.invite_code}
                          </code>
                          <span className="text-sm text-gray-500">
                            Share this code with family members to let them
                            join.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Members List */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        Members
                      </h4>
                      <div className="space-y-2">
                        {detailData.members && detailData.members.length > 0 ? (
                          detailData.members.map((m) => (
                            <div
                              key={m.id}
                              className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                                  {(m.display_name || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {m.display_name || "Unknown Member"}{" "}
                                    {m.id === user?.id ? "(You)" : ""}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {m.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    m.status === "active"
                                      ? "bg-green-100 text-green-700"
                                      : m.status === "pending_approval"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-gray-100 text-gray-600"
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
                                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
                          <p className="text-sm text-gray-500 italic">
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
