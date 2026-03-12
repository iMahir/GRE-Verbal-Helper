"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  _id: string;
  username: string;
  role: string;
  createdAt: string;
  createdBy?: string;
}

interface Snapshot {
  id: string;
  savedAt: string;
  createdAt: string;
  wordCount: number;
  learnedCount: number;
}

interface ProgressInfo {
  current: { wordCount: number; learnedCount: number; updatedAt: string } | null;
  snapshots: Snapshot[];
}

export default function SettingsPage() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<Record<string, ProgressInfo>>({});
  const [confirmAction, setConfirmAction] = useState<{ userId: string; type: "reset" | "revert"; snapshotId?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "admin") {
          router.push("/");
          return;
        }
        setUser(data.user);
        loadUsers();
      })
      .catch(() => router.push("/"));
  }, [router]);

  const loadUsers = async () => {
    const res = await fetch("/api/auth/register");
    const data = await res.json();
    if (data.users) setUsers(data.users);
  };

  const loadProgressInfo = async (userId: string) => {
    const res = await fetch(`/api/admin/progress?userId=${userId}`);
    const data = await res.json();
    setProgressInfo((prev) => ({ ...prev, [userId]: data }));
  };

  const toggleExpand = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!progressInfo[userId]) {
        loadProgressInfo(userId);
      }
    }
  };

  const handleReset = async (userId: string) => {
    setConfirmAction(null);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`/api/admin/progress?userId=${userId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to reset progress");
        return;
      }
      setMessage("Progress reset successfully (snapshot saved)");
      loadProgressInfo(userId);
    } catch {
      setError("Something went wrong");
    }
  };

  const handleRevert = async (userId: string, snapshotId: string) => {
    setConfirmAction(null);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, snapshotId }),
      });
      if (!res.ok) {
        setError("Failed to revert progress");
        return;
      }
      setMessage("Progress reverted successfully");
      loadProgressInfo(userId);
    } catch {
      setError("Something went wrong");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      setMessage(`User "${data.username}" created`);
      setNewUsername("");
      setNewPassword("");
      loadUsers();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        <h1 className="text-2xl font-light text-zinc-900 dark:text-zinc-100 mb-1">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Admin panel — manage user accounts &amp; data
        </p>

        {/* Global messages */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}
        {message && (
          <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 mb-4">
            {message}
          </div>
        )}

        {/* Create User Form */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">
            Create New Account
          </h2>

          <form onSubmit={handleCreateUser} className="space-y-3">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              placeholder="Username"
              required
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              placeholder="Password (min 6 chars)"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* Users List with Data Management */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">
            Accounts ({users.length})
          </h2>

          {users.length === 0 ? (
            <p className="text-sm text-zinc-500">No users found</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u._id} className="rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                  {/* User row */}
                  <button
                    onClick={() => toggleExpand(u._id)}
                    className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                        {u.username}
                      </span>
                      {u.role === "admin" && (
                        <span className="text-[10px] uppercase tracking-wider font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                          admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-zinc-400 transition-transform ${expandedUser === u._id ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded panel */}
                  <AnimatePresence>
                    {expandedUser === u._id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-2 space-y-3 border-t border-zinc-100 dark:border-zinc-800">
                          {/* Current progress info */}
                          {progressInfo[u._id]?.current ? (
                            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                              <span>{progressInfo[u._id].current!.wordCount} words tracked</span>
                              <span className="text-zinc-300 dark:text-zinc-600">·</span>
                              <span>{progressInfo[u._id].current!.learnedCount} learned</span>
                              <span className="text-zinc-300 dark:text-zinc-600">·</span>
                              <span>Updated {formatDate(progressInfo[u._id].current!.updatedAt)}</span>
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-400">No progress data</p>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmAction({ userId: u._id, type: "reset" })}
                              className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                            >
                              Reset Progress
                            </button>
                          </div>

                          {/* Snapshots / Revert */}
                          {progressInfo[u._id]?.snapshots?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-2">
                                Saved snapshots — click to revert
                              </p>
                              <div className="space-y-1.5">
                                {progressInfo[u._id].snapshots.map((snap) => (
                                  <div
                                    key={snap.id}
                                    className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-zinc-50 dark:bg-zinc-800/60 text-xs"
                                  >
                                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                      <span>{formatDate(snap.savedAt)}</span>
                                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                      <span>{snap.wordCount}w / {snap.learnedCount}l</span>
                                    </div>
                                    <button
                                      onClick={() => setConfirmAction({ userId: u._id, type: "revert", snapshotId: snap.id })}
                                      className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                    >
                                      Revert
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                {confirmAction.type === "reset" ? "Reset Progress?" : "Revert to Snapshot?"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                {confirmAction.type === "reset"
                  ? "This will clear all progress data. A snapshot will be saved so you can revert later."
                  : "This will replace the current progress with the selected snapshot. The current data will be saved as a snapshot first."}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmAction.type === "reset") {
                      handleReset(confirmAction.userId);
                    } else {
                      handleRevert(confirmAction.userId, confirmAction.snapshotId!);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors ${
                    confirmAction.type === "reset"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {confirmAction.type === "reset" ? "Reset" : "Revert"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
