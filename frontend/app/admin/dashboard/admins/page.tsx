"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Mail,
  Clock,
} from "lucide-react";
import { adminFetch } from "@/src/lib/admin/api";

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // The currently logged-in admin — used to disable "delete self".
  const [selfId, setSelfId] = useState<string | null>(null);

  const flash = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [list, me] = await Promise.all([
        adminFetch<AdminUser[]>("/admin/admins"),
        adminFetch<AdminUser>("/admin/me").catch(() => null),
      ]);
      setAdmins(list);
      if (me) setSelfId(me.user_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      flash("All fields are required", "error");
      return;
    }
    try {
      setSaving(true);
      await adminFetch("/admin/admins", { method: "POST", body: form });
      setShowCreate(false);
      setForm({ full_name: "", email: "", password: "" });
      flash("Admin created successfully", "success");
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to create admin", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: AdminUser) => {
    if (!confirm(`Delete admin "${a.full_name}" (${a.email})? This cannot be undone.`)) return;
    try {
      setDeletingId(a.user_id);
      await adminFetch(`/admin/admins/${a.user_id}`, { method: "DELETE" });
      flash("Admin deleted", "success");
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to delete admin", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Admins</h1>
              <p className="text-slate-500">Manage superadmin accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Admin
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button onClick={load} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Try Again
            </button>
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No admins</h3>
            <p className="text-slate-500">Add your first superadmin account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((a) => (
              <div
                key={a.user_id}
                className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {a.full_name?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{a.full_name}</h3>
                      {a.user_id === selfId && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">You</span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                          a.mfa_enabled ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {a.mfa_enabled ? "2FA on" : "2FA pending"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {a.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Last login: {fmt(a.last_login_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={a.user_id === selfId || deletingId === a.user_id}
                  title={a.user_id === selfId ? "You cannot delete your own account" : "Delete admin"}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-semibold text-slate-800">Add Admin</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Full name</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Temporary password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="At least 8 characters"
                />
                <p className="text-xs text-slate-400 mt-1">
                  The new admin sets up 2FA on first login.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
              toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
