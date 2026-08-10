"use client";

import { useEffect, useState, useCallback } from "react";
import { FileWarning, RefreshCw, XCircle, ShieldAlert } from "lucide-react";
import { adminFetch } from "@/src/lib/admin/api";

interface AuditItem {
  log_id: string;
  action_type: string;
  target_table: string;
  target_id: string;
  description: string | null;
  created_at: string;
  admin: { user_id: string; full_name: string; email: string } | null;
}

interface AuditResponse {
  items: AuditItem[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 25;

// Color-code by action family so approvals/rejections/deletes stand out at a glance.
function actionBadge(action: string): string {
  if (/APPROVE/i.test(action)) return "bg-green-100 text-green-700";
  if (/REJECT|DELETE/i.test(action)) return "bg-red-100 text-red-700";
  if (/CREATE/i.test(action)) return "bg-blue-100 text-blue-700";
  if (/UPDATE|CHANGE|SETTINGS/i.test(action)) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function SecurityLogPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (offset: number) => {
    return adminFetch<AuditResponse>(`/admin/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchPage(0);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load security log");
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      const res = await fetchPage(items.length);
      setItems((prev) => [...prev, ...res.items]);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileWarning className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Security Log</h1>
              <p className="text-slate-500">Audit trail of administrative actions</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
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
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No activity yet</h3>
            <p className="text-slate-500">
              Administrative actions (approvals, admin changes, settings) will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-3 pr-4 font-medium">When</th>
                    <th className="py-3 pr-4 font-medium">Admin</th>
                    <th className="py-3 pr-4 font-medium">Action</th>
                    <th className="py-3 pr-4 font-medium">Target</th>
                    <th className="py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.log_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-3 pr-4 whitespace-nowrap text-slate-600">{fmt(it.created_at)}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {it.admin ? (
                          <div>
                            <p className="font-medium text-slate-800">{it.admin.full_name}</p>
                            <p className="text-xs text-slate-400">{it.admin.email}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionBadge(it.action_type)}`}>
                          {it.action_type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                        <span className="font-medium">{it.target_table}</span>
                        <span className="text-xs text-slate-400 block truncate max-w-[180px]">{it.target_id}</span>
                      </td>
                      <td className="py-3 text-slate-600">{it.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                Showing {items.length} of {total}
              </p>
              {items.length < total && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
