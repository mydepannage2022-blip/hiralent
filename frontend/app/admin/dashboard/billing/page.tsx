"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    CreditCard,
    RefreshCw,
    XCircle,
    Receipt,
    Undo2,
    AlertTriangle,
    Search,
    ScanLine,
    FileCheck2,
} from "lucide-react";
import { adminFetch } from "@/src/lib/admin/api";

interface RefundEntry {
    refund_id: string;
    amount: number;
    reason: string | null;
    at: string;
}

interface Transaction {
    transaction_id: string;
    amount: number;
    currency: string;
    payment_gateway: string;
    gateway_payment_id: string | null;
    status: string;
    plan_id: string | null;
    billing_cycle: string | null;
    created_at: string;
    user: { user_id: string; full_name: string; email: string } | null;
    refunded_amount: number;
    // Server-computed: what is still returnable on this charge (0 when nothing is).
    refundable_amount: number;
    refunds: RefundEntry[];
}

interface Mismatch {
    transaction_id: string;
    user_id: string;
    gateway_payment_id: string | null;
    db_status: string;
    gateway_status: string;
    amount: string;
    currency: string;
    created_at: string;
    kind: "status_mismatch" | "unresolvable";
    note?: string;
}

interface ReconciliationReport {
    checked: number;
    skipped: number;
    mismatches: Mismatch[];
    started_at: string;
    finished_at: string;
    gateway_configured: boolean;
}

interface Receipt {
    receipt_id: string;
    receipt_number: string;
    transaction_id: string;
    amount: number;
    currency: string;
    status_at_issue: string;
    plan_name: string | null;
    billing_cycle: string | null;
    issued_at: string;
    payload: Record<string, unknown>;
}

interface TransactionsResponse {
    items: Transaction[];
    total: number;
    limit: number;
    offset: number;
}

const PAGE_SIZE = 25;

const STATUS_FILTERS = ["all", "succeeded", "pending", "refunded", "failed"] as const;

function statusBadge(status: string): string {
    switch (status) {
        case "succeeded":
            return "bg-green-100 text-green-700";
        case "refunded":
            return "bg-purple-100 text-purple-700";
        case "pending":
        case "processing":
            return "bg-amber-100 text-amber-700";
        case "failed":
        case "canceled":
            return "bg-red-100 text-red-700";
        default:
            return "bg-slate-100 text-slate-700";
    }
}

const money = (amount: number, currency: string) =>
    `${currency === "USD" ? "$" : ""}${amount.toFixed(2)}${currency === "USD" ? "" : ` ${currency}`}`;

const fmtDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

export default function AdminBillingPage() {
    const [items, setItems] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [status, setStatus] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");

    // Refund modal state
    const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
    const [refundAmount, setRefundAmount] = useState("");
    const [refundReason, setRefundReason] = useState("");
    const [refunding, setRefunding] = useState(false);
    const [refundError, setRefundError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // Reconciliation is an explicit action: every run calls out to Stripe.
    const [report, setReport] = useState<ReconciliationReport | null>(null);
    const [reconciling, setReconciling] = useState(false);
    const [reconcileError, setReconcileError] = useState<string | null>(null);

    // Receipt viewer for a single transaction.
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [receiptFor, setReceiptFor] = useState<string | null>(null);
    const [receiptError, setReceiptError] = useState<string | null>(null);

    const query = useCallback(
        (offset: number) => {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(offset),
            });
            if (status !== "all") params.set("status", status);
            if (appliedSearch) params.set("q", appliedSearch);
            return adminFetch<TransactionsResponse>(`/admin/transactions?${params.toString()}`);
        },
        [status, appliedSearch]
    );

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await query(0);
            setItems(res.items);
            setTotal(res.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load transactions");
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        load();
    }, [load]);

    const runReconciliation = async () => {
        try {
            setReconciling(true);
            setReconcileError(null);
            const res = await adminFetch<ReconciliationReport>("/admin/reconciliation/run", {
                method: "POST",
                // adminFetch serialises `body` itself — pass the object, not a JSON string.
                body: { since_days: 30, limit: 200 },
            });
            setReport(res);
        } catch (e) {
            setReconcileError(e instanceof Error ? e.message : "Reconciliation failed");
        } finally {
            setReconciling(false);
        }
    };

    const openReceipt = async (transactionId: string) => {
        try {
            setReceiptError(null);
            setReceiptFor(transactionId);
            const res = await adminFetch<{ items: Receipt[] }>(
                `/admin/receipts?transaction_id=${encodeURIComponent(transactionId)}`
            );
            if (!res.items.length) {
                setReceipt(null);
                setReceiptError("No receipt was issued for this transaction.");
                return;
            }
            setReceipt(res.items[0]);
        } catch (e) {
            setReceipt(null);
            setReceiptError(e instanceof Error ? e.message : "Failed to load receipt");
        }
    };

    const loadMore = async () => {
        try {
            setLoadingMore(true);
            const res = await query(items.length);
            setItems((prev) => [...prev, ...res.items]);
            setTotal(res.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load more");
        } finally {
            setLoadingMore(false);
        }
    };

    const openRefund = (txn: Transaction) => {
        setRefundTarget(txn);
        // Default to a full refund of whatever is still outstanding.
        setRefundAmount(txn.refundable_amount.toFixed(2));
        setRefundReason("");
        setRefundError(null);
    };

    const parsedAmount = useMemo(() => Number(refundAmount), [refundAmount]);
    const amountInvalid =
        !refundTarget ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        parsedAmount > refundTarget.refundable_amount;

    const submitRefund = async () => {
        if (!refundTarget || amountInvalid) return;
        try {
            setRefunding(true);
            setRefundError(null);

            const isFull = parsedAmount === refundTarget.refundable_amount;
            const res = await adminFetch<{ refund_id: string; amount: number }>(
                `/admin/transactions/${refundTarget.transaction_id}/refund`,
                {
                    method: "POST",
                    // Omit `amount` for a full refund so the server refunds the exact
                    // outstanding balance rather than a rounded client number.
                    body: {
                        ...(isFull ? {} : { amount: parsedAmount }),
                        ...(refundReason.trim() ? { reason: refundReason.trim() } : {}),
                    },
                }
            );

            setNotice(
                `Refunded ${money(parsedAmount, refundTarget.currency)} — refund id ${res.refund_id}`
            );
            setRefundTarget(null);
            await load();
        } catch (e) {
            setRefundError(e instanceof Error ? e.message : "Refund failed");
        } finally {
            setRefunding(false);
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
                            <p className="text-slate-500">Payment history and refunds</p>
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

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap mt-5">
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                        {STATUS_FILTERS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                                    status === s
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setAppliedSearch(search.trim());
                        }}
                        className="flex items-center gap-2 flex-1 min-w-[240px]"
                    >
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by customer name or email"
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
                        >
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* Success notice */}
            {notice && (
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <Receipt className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800 flex-1">{notice}</p>
                    <button
                        onClick={() => setNotice(null)}
                        className="text-green-700 text-sm hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Reconciliation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-100 rounded-xl">
                            <ScanLine className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-800">Gateway reconciliation</h2>
                            <p className="text-sm text-slate-500">
                                Compares the last 30 days of transactions against Stripe. Reports
                                disagreements only &mdash; nothing is changed automatically.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={runReconciliation}
                        disabled={reconciling}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                    >
                        <RefreshCw className={`w-4 h-4 ${reconciling ? "animate-spin" : ""}`} />
                        {reconciling ? "Checking..." : "Run check"}
                    </button>
                </div>

                {reconcileError && (
                    <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{reconcileError}</span>
                    </div>
                )}

                {report && !report.gateway_configured && (
                    <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                            Stripe is not configured, so nothing could be checked. This is not a clean
                            result &mdash; set STRIPE_SECRET_KEY to enable reconciliation.
                        </span>
                    </div>
                )}

                {report && report.gateway_configured && (
                    <div className="mt-4">
                        <p className="text-sm text-slate-600">
                            Checked <span className="font-semibold">{report.checked}</span> transaction(s) &middot;{" "}
                            <span className={report.mismatches.length ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
                                {report.mismatches.length} mismatch(es)
                            </span>
                        </p>

                        {report.mismatches.length > 0 && (
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-500 border-b border-slate-200">
                                            <th className="py-2 pr-4 font-medium">Transaction</th>
                                            <th className="py-2 pr-4 font-medium">Our status</th>
                                            <th className="py-2 pr-4 font-medium">Stripe says</th>
                                            <th className="py-2 pr-4 font-medium">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.mismatches.map((m) => (
                                            <tr key={m.transaction_id} className="border-b border-slate-100">
                                                <td className="py-2 pr-4 font-mono text-xs text-slate-600">
                                                    {m.transaction_id.slice(0, 8)}&hellip;
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(m.db_status)}`}>
                                                        {m.db_status}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                                        {m.gateway_status}
                                                    </span>
                                                    {m.note && (
                                                        <span className="block text-xs text-slate-400 mt-0.5">{m.note}</span>
                                                    )}
                                                </td>
                                                <td className="py-2 pr-4 text-slate-700">
                                                    {m.amount} {m.currency}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="mt-3 text-xs text-slate-500">
                                    Each mismatch is also recorded in the payment event log. Resolve them by
                                    hand &mdash; this page never rewrites payment state.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Receipt viewer */}
            {receiptFor && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-green-100 rounded-xl">
                                <FileCheck2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-800">
                                    {receipt ? `Receipt ${receipt.receipt_number}` : "Receipt"}
                                </h2>
                                <p className="text-xs text-slate-500 font-mono">{receiptFor}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setReceiptFor(null);
                                setReceipt(null);
                                setReceiptError(null);
                            }}
                            className="text-slate-500 text-sm hover:underline"
                        >
                            Close
                        </button>
                    </div>

                    {receiptError && <p className="mt-4 text-sm text-amber-700">{receiptError}</p>}

                    {receipt && (
                        <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm">
                            <div className="flex justify-between border-b border-slate-100 py-1">
                                <dt className="text-slate-500">Amount</dt>
                                <dd className="font-medium text-slate-800">{money(receipt.amount, receipt.currency)}</dd>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 py-1">
                                <dt className="text-slate-500">Status at issue</dt>
                                <dd className="font-medium text-slate-800">{receipt.status_at_issue}</dd>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 py-1">
                                <dt className="text-slate-500">Plan</dt>
                                <dd className="font-medium text-slate-800">{receipt.plan_name ?? "\u2014"}</dd>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 py-1">
                                <dt className="text-slate-500">Issued</dt>
                                <dd className="font-medium text-slate-800">{fmtDate(receipt.issued_at)}</dd>
                            </div>
                        </dl>
                    )}

                    <p className="mt-4 text-xs text-slate-500">
                        Receipts are append-only &mdash; the database rejects any attempt to edit or delete one.
                    </p>
                </div>
            )}

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
                        <button
                            onClick={load}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            Try Again
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Receipt className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">
                            No transactions
                        </h3>
                        <p className="text-slate-500">
                            Payments will appear here once customers complete checkout.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-slate-200">
                                        <th className="py-3 pr-4 font-medium">When</th>
                                        <th className="py-3 pr-4 font-medium">Customer</th>
                                        <th className="py-3 pr-4 font-medium">Amount</th>
                                        <th className="py-3 pr-4 font-medium">Status</th>
                                        <th className="py-3 pr-4 font-medium">Gateway</th>
                                        <th className="py-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((t) => (
                                        <tr
                                            key={t.transaction_id}
                                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                        >
                                            <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                                                {fmtDate(t.created_at)}
                                            </td>
                                            <td className="py-3 pr-4 whitespace-nowrap">
                                                {t.user ? (
                                                    <div>
                                                        <p className="font-medium text-slate-800">
                                                            {t.user.full_name}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {t.user.email}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 whitespace-nowrap">
                                                <p className="font-medium text-slate-800">
                                                    {money(t.amount, t.currency)}
                                                </p>
                                                {t.refunded_amount > 0 && (
                                                    <p className="text-xs text-purple-600">
                                                        {money(t.refunded_amount, t.currency)} refunded
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusBadge(
                                                        t.status
                                                    )}`}
                                                >
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                                                <span className="capitalize">{t.payment_gateway}</span>
                                                <span className="text-xs text-slate-400 block truncate max-w-[160px]">
                                                    {t.gateway_payment_id || "—"}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => openReceipt(t.transaction_id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 mr-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                                                >
                                                    <FileCheck2 className="w-3.5 h-3.5" />
                                                    Receipt
                                                </button>
                                                {t.refundable_amount > 0 ? (
                                                    <button
                                                        onClick={() => openRefund(t)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                                                    >
                                                        <Undo2 className="w-3.5 h-3.5" />
                                                        Refund
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">
                                                        {t.status === "refunded"
                                                            ? "Fully refunded"
                                                            : "Not refundable"}
                                                    </span>
                                                )}
                                            </td>
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

            {/* Refund modal */}
            {refundTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">
                                    Refund payment
                                </h3>
                                <p className="text-sm text-slate-500">
                                    This returns money to the customer through Stripe. It cannot be
                                    undone.
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Customer</span>
                                <span className="font-medium text-slate-800">
                                    {refundTarget.user?.email ?? "—"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Charge</span>
                                <span className="font-medium text-slate-800">
                                    {money(refundTarget.amount, refundTarget.currency)}
                                </span>
                            </div>
                            {refundTarget.refunded_amount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Already refunded</span>
                                    <span className="font-medium text-purple-700">
                                        {money(refundTarget.refunded_amount, refundTarget.currency)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-500">Refundable now</span>
                                <span className="font-medium text-slate-800">
                                    {money(refundTarget.refundable_amount, refundTarget.currency)}
                                </span>
                            </div>
                        </div>

                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Amount ({refundTarget.currency})
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={refundTarget.refundable_amount}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <p className="text-xs text-slate-400 mb-4">
                            Leave at the full amount for a complete refund, or lower it for a partial
                            one — the rest stays refundable.
                        </p>

                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Reason (optional)
                        </label>
                        <input
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            maxLength={500}
                            placeholder="e.g. duplicate charge"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />

                        {refundError && (
                            <p className="text-sm text-red-600 mb-4">{refundError}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRefundTarget(null)}
                                disabled={refunding}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRefund}
                                disabled={refunding || amountInvalid}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                            >
                                {refunding && <RefreshCw className="w-4 h-4 animate-spin" />}
                                {refunding ? "Refunding..." : "Refund"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
