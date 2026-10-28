import { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { getAllOrders } from "../../services/orderService";
import { getAllAdminPayments } from "../../services/paymentService";
import "../../styles/admin-reports.css";

const EMPTY_ARRAY = [];

const RANGE_OPTIONS = [
  { value: "7_DAYS", label: "Last 7 days" },
  { value: "30_DAYS", label: "Last 30 days" },
  { value: "90_DAYS", label: "Last 90 days" },
  { value: "ALL", label: "All time" },
];

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

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getLocalDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getRangeStart = (range, today) => {
  if (range === "ALL") return null;

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  const days = range === "7_DAYS" ? 6 : range === "30_DAYS" ? 29 : 89;

  start.setDate(start.getDate() - days);
  return start;
};

const inDateRange = (dateValue, start, now) => {
  if (!start) return true;

  const date = new Date(dateValue);

  return !Number.isNaN(date.getTime()) && date >= start && date <= now;
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const getProductSales = (orders, payments) => {
  const successfulOrderIds = new Set(
    payments
      .filter((payment) => normalizeStatus(payment.paymentStatus) === "SUCCESS")
      .map((payment) => String(payment.orderId)),
  );

  const salesByProduct = new Map();

  for (const order of orders) {
    const orderIsPaid =
      normalizeStatus(order.orderStatus) === "CONFIRMED" &&
      (normalizeStatus(order.paymentStatus) === "SUCCESS" ||
        successfulOrderIds.has(String(order.orderId)));

    if (!orderIsPaid) continue;

    for (const item of order.items || []) {
      const productName = String(item.productName || "").trim();

      if (!productName) continue;

      const quantity = Number(item.quantity) || 0;
      const lineRevenue =
        Number(item.subtotal) || (Number(item.unitPrice) || 0) * quantity;

      const current = salesByProduct.get(productName) || {
        name: productName,
        quantity: 0,
        revenue: 0,
      };

      current.quantity += quantity;
      current.revenue += lineRevenue;

      salesByProduct.set(productName, current);
    }
  }

  return [...salesByProduct.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);
};

const buildRevenueTrend = (payments, range, now) => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  let buckets = [];

  if (range === "ALL") {
    for (let offset = 11; offset >= 0; offset -= 1) {
      const date = new Date(
        startOfToday.getFullYear(),
        startOfToday.getMonth() - offset,
        1,
      );

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;

      buckets.push({
        key,
        label: date.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        revenue: 0,
      });
    }

    const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    payments.forEach((payment) => {
      if (normalizeStatus(payment.paymentStatus) !== "SUCCESS") return;

      const date = new Date(payment.paymentDate);

      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;

      const bucket = lookup.get(key);

      if (bucket) {
        bucket.revenue += Number(payment.amount) || 0;
      }
    });

    return buckets;
  }

  if (range === "90_DAYS") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 89);

    for (let index = 0; index < 13; index += 1) {
      const bucketStart = new Date(start);
      bucketStart.setDate(bucketStart.getDate() + index * 7);

      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketEnd.getDate() + 7);

      buckets.push({
        key: getLocalDateKey(bucketStart),
        label: bucketStart.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        start: bucketStart,
        end: bucketEnd,
        revenue: 0,
      });
    }

    payments.forEach((payment) => {
      if (normalizeStatus(payment.paymentStatus) !== "SUCCESS") return;

      const date = new Date(payment.paymentDate);

      if (Number.isNaN(date.getTime())) return;

      const bucket = buckets.find(
        (entry) => date >= entry.start && date < entry.end,
      );

      if (bucket) {
        bucket.revenue += Number(payment.amount) || 0;
      }
    });

    return buckets;
  }

  const dayCount = range === "7_DAYS" ? 7 : 30;

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() - offset);

    buckets.push({
      key: getLocalDateKey(date),
      label: date.toLocaleDateString("en-IN", {
        weekday: range === "7_DAYS" ? "short" : undefined,
        day: range === "30_DAYS" ? "2-digit" : undefined,
        month: range === "30_DAYS" ? "short" : undefined,
      }),
      revenue: 0,
    });
  }

  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  payments.forEach((payment) => {
    if (normalizeStatus(payment.paymentStatus) !== "SUCCESS") return;

    const key = getLocalDateKey(payment.paymentDate);
    const bucket = lookup.get(key);

    if (bucket) {
      bucket.revenue += Number(payment.amount) || 0;
    }
  });

  return buckets;
};

function AdminReports() {
  const [orders, setOrders] = useState(EMPTY_ARRAY);
  const [payments, setPayments] = useState(EMPTY_ARRAY);

  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [paymentsError, setPaymentsError] = useState("");

  const [range, setRange] = useState("7_DAYS");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      const [ordersResult, paymentsResult] = await Promise.allSettled([
        getAllOrders(),
        getAllAdminPayments(),
      ]);

      if (!active) return;

      if (ordersResult.status === "fulfilled") {
        setOrders(unwrapArray(ordersResult.value));
        setOrdersError("");
      } else {
        setOrdersError(
          ordersResult.reason?.response?.data?.message ||
            "Unable to load order reports.",
        );
      }

      if (paymentsResult.status === "fulfilled") {
        setPayments(unwrapArray(paymentsResult.value));
        setPaymentsError("");
      } else {
        setPaymentsError(
          paymentsResult.reason?.response?.data?.message ||
            "Unable to load payment reports.",
        );
      }

      setLoading(false);
    };

    loadReports();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const now = new Date();

  const rangeStart = getRangeStart(range, now);

  const rangeOrders = orders.filter((order) =>
    inDateRange(order.orderDate, rangeStart, now),
  );

  const rangePayments = payments.filter((payment) =>
    inDateRange(payment.paymentDate, rangeStart, now),
  );

  const successfulPayments = rangePayments.filter(
    (payment) => normalizeStatus(payment.paymentStatus) === "SUCCESS",
  );

  const pendingPayments = rangePayments.filter(
    (payment) => normalizeStatus(payment.paymentStatus) === "PENDING",
  );

  const failedPayments = rangePayments.filter(
    (payment) => normalizeStatus(payment.paymentStatus) === "FAILED",
  );

  const successfulRevenue = successfulPayments.reduce(
    (total, payment) => total + (Number(payment.amount) || 0),
    0,
  );

  const confirmedOrders = rangeOrders.filter(
    (order) => normalizeStatus(order.orderStatus) === "CONFIRMED",
  );

  const pendingOrders = rangeOrders.filter(
    (order) => normalizeStatus(order.orderStatus) === "PENDING",
  );

  const cancelledOrders = rangeOrders.filter(
    (order) => normalizeStatus(order.orderStatus) === "CANCELLED",
  );

  const revenueTrend = buildRevenueTrend(rangePayments, range, now);

  const maxTrendRevenue = Math.max(
    1,
    ...revenueTrend.map((bucket) => bucket.revenue),
  );

  const topProducts = getProductSales(rangeOrders, rangePayments);

  const statusBreakdown = [
    {
      label: "Confirmed",
      count: confirmedOrders.length,
      color: "green",
    },
    {
      label: "Pending",
      count: pendingOrders.length,
      color: "orange",
    },
    {
      label: "Cancelled",
      count: cancelledOrders.length,
      color: "red",
    },
  ];

  const hasErrors = Boolean(ordersError || paymentsError);

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

    const rows = rangePayments.map((payment) => [
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
    link.download = `quickmart-report-${range.toLowerCase()}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  const refresh = () => {
    setLoading(true);
    setRefreshKey((previous) => previous + 1);
  };

  const successfulRevenueLabel =
    range === "ALL"
      ? "All-time revenue"
      : range === "7_DAYS"
        ? "Revenue · Last 7 days"
        : range === "30_DAYS"
          ? "Revenue · Last 30 days"
          : "Revenue · Last 90 days";

  return (
    <div className="qm-reports-page">
      <section className="qm-reports-heading">
        <div>
          <span className="qm-reports-eyebrow">BUSINESS INTELLIGENCE</span>
          <h3>Reports &amp; Analytics</h3>
          <p>
            Understand sales performance, order activity and payment outcomes.
          </p>
        </div>

        <div className="qm-reports-heading-actions">
          <label className="qm-reports-range">
            <span>Reporting period</span>
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              {RANGE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="qm-reports-button secondary"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "qm-reports-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            className="qm-reports-button primary"
            onClick={exportCsv}
            disabled={
              loading || paymentsError !== "" || rangePayments.length === 0
            }
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </section>

      {hasErrors && (
        <div className="qm-reports-notice" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Some report data is unavailable</strong>
            {ordersError && <p>Orders: {ordersError}</p>}
            {paymentsError && <p>Payments: {paymentsError}</p>}
          </div>
        </div>
      )}

      <section className="qm-reports-metrics">
        <article>
          <span className="qm-reports-metric-icon green">
            <CreditCard size={20} />
          </span>
          <div>
            <span>{successfulRevenueLabel}</span>
            <strong>
              {paymentsError
                ? "—"
                : loading && payments.length === 0
                  ? "…"
                  : formatCurrency(successfulRevenue)}
            </strong>
          </div>
        </article>

        <article>
          <span className="qm-reports-metric-icon blue">
            <ShoppingCart size={20} />
          </span>
          <div>
            <span>Total orders</span>
            <strong>
              {ordersError
                ? "—"
                : loading && orders.length === 0
                  ? "…"
                  : rangeOrders.length.toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article>
          <span className="qm-reports-metric-icon green">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <span>Confirmed orders</span>
            <strong>
              {ordersError
                ? "—"
                : loading && orders.length === 0
                  ? "…"
                  : confirmedOrders.length.toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article>
          <span className="qm-reports-metric-icon orange">
            <Clock3 size={20} />
          </span>
          <div>
            <span>Pending orders</span>
            <strong>
              {ordersError
                ? "—"
                : loading && orders.length === 0
                  ? "…"
                  : pendingOrders.length.toLocaleString("en-IN")}
            </strong>
          </div>
        </article>

        <article>
          <span className="qm-reports-metric-icon red">
            <XCircle size={20} />
          </span>
          <div>
            <span>Failed payments</span>
            <strong>
              {paymentsError
                ? "—"
                : loading && payments.length === 0
                  ? "…"
                  : failedPayments.length.toLocaleString("en-IN")}
            </strong>
          </div>
        </article>
      </section>

      <section className="qm-reports-panel">
        <div className="qm-reports-panel-heading">
          <div>
            <h4>Revenue trend</h4>
            <p>
              Successful payments by payment date. Select a different reporting
              period to change the chart grouping.
            </p>
          </div>
          <span className="qm-reports-panel-icon">
            <TrendingUp size={21} />
          </span>
        </div>

        <div className="qm-reports-trend-summary">
          <span>{successfulRevenueLabel}</span>
          <strong>
            {paymentsError ? "—" : formatCurrency(successfulRevenue)}
          </strong>
        </div>

        {loading && payments.length === 0 ? (
          <div className="qm-reports-chart-message">
            <RefreshCw size={19} className="qm-reports-spin" />
            Loading revenue data...
          </div>
        ) : paymentsError ? (
          <div className="qm-reports-chart-message">
            Revenue trend is unavailable.
          </div>
        ) : (
          <div
            className={`qm-reports-chart ${
              range === "30_DAYS"
                ? "daily-30"
                : range === "90_DAYS"
                  ? "weekly-90"
                  : range === "ALL"
                    ? "monthly-all"
                    : "daily-7"
            }`}
          >
            {revenueTrend.map((bucket) => {
              const height =
                bucket.revenue > 0
                  ? Math.max((bucket.revenue / maxTrendRevenue) * 100, 5)
                  : 2;

              return (
                <div className="qm-reports-chart-column" key={bucket.key}>
                  <span className="qm-reports-chart-value">
                    {formatCurrency(bucket.revenue)}
                  </span>
                  <div className="qm-reports-chart-bar-area">
                    <div
                      className="qm-reports-chart-bar"
                      style={{ height: `${height}%` }}
                      title={`${bucket.label}: ${formatCurrency(bucket.revenue)}`}
                    />
                  </div>
                  <span className="qm-reports-chart-label">{bucket.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="qm-reports-lower-grid">
        <section className="qm-reports-panel">
          <div className="qm-reports-panel-heading">
            <div>
              <h4>Order status breakdown</h4>
              <p>Orders in the selected reporting period.</p>
            </div>
            <span className="qm-reports-panel-icon">
              <BarChart3 size={21} />
            </span>
          </div>

          {ordersError ? (
            <div className="qm-reports-simple-message">
              Order status data is unavailable.
            </div>
          ) : loading && orders.length === 0 ? (
            <div className="qm-reports-simple-message">Loading orders...</div>
          ) : (
            <div className="qm-reports-status-list">
              {statusBreakdown.map((item) => {
                const count = rangeOrders.length;
                const percentage = count > 0 ? (item.count / count) * 100 : 0;

                return (
                  <div className="qm-reports-status-row" key={item.label}>
                    <div className="qm-reports-status-text">
                      <span className={`qm-reports-status-dot ${item.color}`} />
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>

                    <div className="qm-reports-status-track">
                      <div
                        className={`qm-reports-status-fill ${item.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <span className="qm-reports-status-percentage">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="qm-reports-panel">
          <div className="qm-reports-panel-heading">
            <div>
              <h4>Payment outcomes</h4>
              <p>Payment records in the selected reporting period.</p>
            </div>
            <span className="qm-reports-panel-icon">
              <CreditCard size={21} />
            </span>
          </div>

          {paymentsError ? (
            <div className="qm-reports-simple-message">
              Payment status data is unavailable.
            </div>
          ) : loading && payments.length === 0 ? (
            <div className="qm-reports-simple-message">Loading payments...</div>
          ) : (
            <div className="qm-reports-outcome-grid">
              <div>
                <span className="qm-reports-outcome-number success">
                  {successfulPayments.length}
                </span>
                <span>Successful</span>
              </div>

              <div>
                <span className="qm-reports-outcome-number pending">
                  {pendingPayments.length}
                </span>
                <span>Pending</span>
              </div>

              <div>
                <span className="qm-reports-outcome-number failed">
                  {failedPayments.length}
                </span>
                <span>Failed</span>
              </div>
            </div>
          )}

          {!paymentsError && (
            <div className="qm-reports-payment-total">
              <span>Payment records</span>
              <strong>{rangePayments.length}</strong>
            </div>
          )}
        </section>
      </div>

      <section className="qm-reports-panel">
        <div className="qm-reports-panel-heading">
          <div>
            <h4>Top-selling products</h4>
            <p>
              Ranked by quantity in confirmed orders with successful payments.
            </p>
          </div>
          <span className="qm-reports-panel-icon">
            <Package size={21} />
          </span>
        </div>

        {ordersError ? (
          <div className="qm-reports-simple-message">
            Product sales are unavailable because order data could not be
            loaded.
          </div>
        ) : loading && orders.length === 0 ? (
          <div className="qm-reports-simple-message">
            Loading product sales...
          </div>
        ) : topProducts.length === 0 ? (
          <div className="qm-reports-simple-message">
            No qualifying product sales found for this period.
          </div>
        ) : (
          <div className="qm-reports-top-products">
            {topProducts.map((product, index) => (
              <div className="qm-reports-product-row" key={product.name}>
                <span className="qm-reports-product-rank">{index + 1}</span>

                <div className="qm-reports-product-info">
                  <strong>{product.name}</strong>
                  <span>{product.quantity} units sold</span>
                </div>

                <div className="qm-reports-product-revenue">
                  <strong>{formatCurrency(product.revenue)}</strong>
                  <span>Order line total</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="qm-reports-footnote">
        Revenue uses successful payment records. Order totals and product sales
        use orders dated within the selected period. Historical results depend
        on the records currently returned by the backend APIs.
      </p>
    </div>
  );
}

export default AdminReports;
