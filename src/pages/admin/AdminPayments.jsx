import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Eye,
  RefreshCw,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  getAllAdminPayments,
  getAdminPaymentSummary,
} from "../../services/paymentService";

import "../../styles/admin-payments.css";

const PAGE_SIZE = 10;

const EMPTY_SUMMARY = {
  totalPayments: 0,
  successfulPayments: 0,
  pendingPayments: 0,
  failedPayments: 0,
  successfulRevenue: 0,
};

const unwrapArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  return [];
};

const normalizeStatus = (value) =>
  String(value || "UNKNOWN")
    .trim()
    .toUpperCase();

const statusClass = (value) =>
  String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getApiErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (error?.response?.status === 401) {
    return "Your session may have expired. Sign in again.";
  }

  if (error?.response?.status === 403) {
    return "Administrator permission is required to view payments.";
  }

  return "Unable to load payment data. Check Payment Service and try again.";
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    let active = true;

    const loadPayments = async () => {
      const [paymentsResult, summaryResult] = await Promise.allSettled([
        getAllAdminPayments(),
        getAdminPaymentSummary(),
      ]);

      if (!active) return;

      if (paymentsResult.status === "fulfilled") {
        setPayments(unwrapArray(paymentsResult.value));
        setPaymentsError("");
      } else {
        setPaymentsError(getApiErrorMessage(paymentsResult.reason));
      }

      if (summaryResult.status === "fulfilled") {
        setSummary({
          ...EMPTY_SUMMARY,
          ...summaryResult.value,
        });
        setSummaryError("");
      } else {
        setSummaryError(getApiErrorMessage(summaryResult.reason));
      }

      setLoading(false);
    };

    loadPayments();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((previous) => previous + 1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setDateFilter("ALL");
    setPage(1);
  };

  const filteredPayments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const now = new Date();
    const startDate = new Date(now);

    if (dateFilter === "TODAY") {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === "7_DAYS") {
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === "30_DAYS") {
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    }

    return payments
      .filter((payment) => {
        if (
          statusFilter !== "ALL" &&
          normalizeStatus(payment.paymentStatus) !== statusFilter
        ) {
          return false;
        }

        if (dateFilter !== "ALL") {
          const paymentDate = new Date(payment.paymentDate);

          if (
            Number.isNaN(paymentDate.getTime()) ||
            paymentDate < startDate ||
            paymentDate > now
          ) {
            return false;
          }
        }

        if (query) {
          const searchableText = [
            payment.id,
            payment.orderId,
            payment.userId,
            payment.transactionId,
            payment.paymentStatus,
            payment.amount,
            payment.paymentDate,
          ]
            .filter((value) => value !== null && value !== undefined)
            .join(" ")
            .toLowerCase();

          if (!searchableText.includes(query)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.paymentDate).getTime();
        const dateB = new Date(b.paymentDate).getTime();

        if (Number.isNaN(dateA) && Number.isNaN(dateB)) {
          return Number(b.id || 0) - Number(a.id || 0);
        }

        if (Number.isNaN(dateA)) return 1;
        if (Number.isNaN(dateB)) return -1;

        return dateB - dateA;
      });
  }, [payments, searchTerm, statusFilter, dateFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const visiblePayments = filteredPayments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const exportCsv = () => {
    const headers = [
      "Payment ID",
      "Order ID",
      "Customer ID",
      "Amount",
      "Payment Status",
      "Transaction ID",
      "Payment Date",
    ];

    const rows = filteredPayments.map((payment) => [
      payment.id,
      payment.orderId,
      payment.userId,
      payment.amount,
      payment.paymentStatus,
      payment.transactionId,
      payment.paymentDate,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `quickmart-payments-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="qm-payments-page">
      <section className="qm-payments-heading">
        <div>
          <span className="qm-payments-eyebrow">PAYMENT MANAGEMENT</span>
          <h3>Payments</h3>
          <p>
            Monitor payment outcomes, review transactions and inspect payment
            records.
          </p>
        </div>

        <div className="qm-payments-heading-actions">
          <button
            type="button"
            className="qm-payments-button secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "qm-payments-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="qm-payments-button primary"
            onClick={exportCsv}
            disabled={
              loading || paymentsError !== "" || filteredPayments.length === 0
            }
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </section>

      {/* Summary cards */}
      <section className="qm-payments-summary">
        <article>
          <span className="qm-payments-summary-icon green">
            <CreditCard size={20} />
          </span>
          <div>
            <span>Total payments</span>
            <strong>
              {loading && payments.length === 0
                ? "…"
                : summaryError
                  ? "—"
                  : Number(summary.totalPayments).toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article>
          <span className="qm-payments-summary-icon blue">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <span>Successful</span>
            <strong>
              {loading && payments.length === 0
                ? "…"
                : summaryError
                  ? "—"
                  : Number(summary.successfulPayments).toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article>
          <span className="qm-payments-summary-icon orange">
            <Clock3 size={20} />
          </span>
          <div>
            <span>Pending</span>
            <strong>
              {loading && payments.length === 0
                ? "…"
                : summaryError
                  ? "—"
                  : Number(summary.pendingPayments).toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article>
          <span className="qm-payments-summary-icon red">
            <XCircle size={20} />
          </span>
          <div>
            <span>Failed</span>
            <strong>
              {loading && payments.length === 0
                ? "…"
                : summaryError
                  ? "—"
                  : Number(summary.failedPayments).toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article>
          <span className="qm-payments-summary-icon green">
            <span className="qm-payments-rupee">₹</span>
          </span>
          <div>
            <span>Successful revenue</span>
            <strong className="qm-payments-revenue">
              {summaryError
                ? "—"
                : loading && payments.length === 0
                  ? "…"
                  : formatCurrency(summary.successfulRevenue)}
            </strong>
          </div>
        </article>
      </section>

      {paymentsError && (
        <div className="qm-payments-notice error" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Unable to load payment records</strong>
            <p>{paymentsError}</p>
          </div>
          <button
            type="button"
            className="qm-payments-button secondary"
            onClick={handleRefresh}
          >
            Try again
          </button>
        </div>
      )}

      {summaryError && !paymentsError && (
        <div className="qm-payments-notice warning" role="status">
          <AlertCircle size={18} />
          <div>
            <strong>Payment summary is unavailable</strong>
            <p>{summaryError}</p>
          </div>
        </div>
      )}

      {/* Search, status and date filters */}
      <section className="qm-payments-panel">
        <div className="qm-payments-toolbar">
          <label className="qm-payments-search">
            <Search size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search payment, order, customer or transaction ID..."
              aria-label="Search payments"
            />

            {searchTerm && (
              <button
                type="button"
                aria-label="Clear payment search"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
              >
                <X size={16} />
              </button>
            )}
          </label>

          <div className="qm-payments-filters">
            <label>
              <span>Payment status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All payments</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </label>

            <label>
              <span>Date range</span>
              <select
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All dates</option>
                <option value="TODAY">Today</option>
                <option value="7_DAYS">Last 7 days</option>
                <option value="30_DAYS">Last 30 days</option>
              </select>
            </label>

            <button
              type="button"
              className="qm-payments-clear-button"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="qm-payments-table-wrap">
          <table className="qm-payments-table">
            <thead>
              <tr>
                <th>Payment</th>
                <th>Order ID</th>
                <th>Customer ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Transaction ID</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="qm-payments-table-message">
                    <RefreshCw size={19} className="qm-payments-spin" />
                    <span>Loading payments...</span>
                  </td>
                </tr>
              ) : paymentsError && payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="qm-payments-table-message">
                    Payment data is unavailable.
                  </td>
                </tr>
              ) : visiblePayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="qm-payments-table-message">
                    <CreditCard size={25} />
                    <strong>No matching payments found</strong>
                    <span>Try a different search term or filter.</span>
                  </td>
                </tr>
              ) : (
                visiblePayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="qm-payments-id">#{payment.id}</td>

                    <td>
                      <strong>#{payment.orderId ?? "—"}</strong>
                    </td>

                    <td>
                      <span className="qm-payments-customer">
                        <UserRound size={14} />
                        {payment.userId ?? "—"}
                      </span>
                    </td>

                    <td className="qm-payments-date">
                      {formatDate(payment.paymentDate)}
                    </td>

                    <td className="qm-payments-amount">
                      {formatCurrency(payment.amount)}
                    </td>

                    <td>
                      <span
                        className={`qm-payments-status ${statusClass(
                          payment.paymentStatus,
                        )}`}
                      >
                        {payment.paymentStatus || "Unknown"}
                      </span>
                    </td>

                    <td className="qm-payments-transaction">
                      {payment.transactionId || "—"}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="qm-payments-view-button"
                        onClick={() => setSelectedPayment(payment)}
                        aria-label={`View payment ${payment.id}`}
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !paymentsError && filteredPayments.length > 0 && (
          <div className="qm-payments-pagination">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredPayments.length)} of{" "}
              {filteredPayments.length} payments
            </span>

            <div>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((previous) => Math.min(totalPages, previous + 1))
                }
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Read-only payment detail modal */}
      {selectedPayment && (
        <div className="qm-payments-modal-overlay">
          <section
            className="qm-payments-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qm-payments-modal-title"
          >
            <header className="qm-payments-modal-header">
              <div>
                <span className="qm-payments-eyebrow">PAYMENT DETAILS</span>
                <h3 id="qm-payments-modal-title">
                  Payment #{selectedPayment.id}
                </h3>
                <p>{formatDate(selectedPayment.paymentDate)}</p>
              </div>

              <button
                type="button"
                className="qm-payments-modal-close"
                aria-label="Close payment details"
                onClick={() => setSelectedPayment(null)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="qm-payments-modal-body">
              <div className="qm-payments-detail-amount">
                <span>Payment amount</span>
                <strong>{formatCurrency(selectedPayment.amount)}</strong>
                <span
                  className={`qm-payments-status ${statusClass(
                    selectedPayment.paymentStatus,
                  )}`}
                >
                  {selectedPayment.paymentStatus || "Unknown"}
                </span>
              </div>

              <section className="qm-payments-detail-section">
                <h4>Payment information</h4>

                <div className="qm-payments-info-row">
                  <span>Payment ID</span>
                  <strong>{selectedPayment.id ?? "—"}</strong>
                </div>

                <div className="qm-payments-info-row">
                  <span>Order ID</span>
                  <strong>{selectedPayment.orderId ?? "—"}</strong>
                </div>

                <div className="qm-payments-info-row">
                  <span>Customer ID</span>
                  <strong>{selectedPayment.userId ?? "—"}</strong>
                </div>

                <div className="qm-payments-info-row">
                  <span>Payment status</span>
                  <strong>{selectedPayment.paymentStatus || "Unknown"}</strong>
                </div>

                <div className="qm-payments-info-row">
                  <span>Transaction ID</span>
                  <strong className="qm-payments-detail-transaction">
                    {selectedPayment.transactionId || "Not assigned"}
                  </strong>
                </div>

                <div className="qm-payments-info-row">
                  <span>Payment date</span>
                  <strong>{formatDate(selectedPayment.paymentDate)}</strong>
                </div>
              </section>

              {normalizeStatus(selectedPayment.paymentStatus) === "FAILED" && (
                <div className="qm-payments-failed-note">
                  <AlertCircle size={17} />
                  <p>
                    This payment is recorded as failed. This screen is
                    read-only; it does not retry or modify the payment.
                  </p>
                </div>
              )}
            </div>

            <footer className="qm-payments-modal-footer">
              <button
                type="button"
                className="qm-payments-button primary"
                onClick={() => setSelectedPayment(null)}
              >
                Close details
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminPayments;
