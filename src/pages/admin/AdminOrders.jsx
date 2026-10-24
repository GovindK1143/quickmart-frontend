import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";

import { getAllOrders } from "../../services/orderService";
import "../../styles/admin-orders.css";

const PAGE_SIZE = 10;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

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

const normalizeOrders = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  return [];
};

const normalizeStatus = (value) => String(value || "UNKNOWN").toUpperCase();

const statusClass = (value) =>
  String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

const getDeliveryAddress = (order) => {
  const addressParts = [
    order.deliveryHouseFlat,
    order.deliveryStreetArea,
    order.deliveryCity,
    order.deliveryState,
    order.deliveryPincode ? `PIN ${order.deliveryPincode}` : "",
    order.deliveryLandmark
      ? /^near\s/i.test(order.deliveryLandmark)
        ? order.deliveryLandmark
        : `Near ${order.deliveryLandmark}`
      : "",
  ].filter(Boolean);

  return addressParts.join(", ");
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState(null);

  // Load the real orders from the existing Order Service.
  useEffect(() => {
    let active = true;

    getAllOrders()
      .then((response) => {
        if (!active) return;

        setOrders(normalizeOrders(response));
        setError("");
      })
      .catch((apiError) => {
        if (!active) return;

        setError(
          apiError?.response?.data?.message ||
            "Unable to load orders. Check Order Service and administrator access.",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

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
    setOrderStatusFilter("ALL");
    setPaymentStatusFilter("ALL");
    setDateFilter("ALL");
    setPage(1);
  };

  const filteredOrders = useMemo(() => {
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

    return orders
      .filter((order) => {
        if (
          orderStatusFilter !== "ALL" &&
          normalizeStatus(order.orderStatus) !== orderStatusFilter
        ) {
          return false;
        }

        if (
          paymentStatusFilter !== "ALL" &&
          normalizeStatus(order.paymentStatus) !== paymentStatusFilter
        ) {
          return false;
        }

        if (dateFilter !== "ALL") {
          const orderDate = new Date(order.orderDate);

          if (
            Number.isNaN(orderDate.getTime()) ||
            orderDate < startDate ||
            orderDate > now
          ) {
            return false;
          }
        }

        if (query) {
          const searchableValues = [
            order.orderId,
            order.userId,
            order.orderStatus,
            order.paymentStatus,
            order.deliveryRecipientName,
            order.deliveryMobile,
            order.deliveryHouseFlat,
            order.deliveryStreetArea,
            order.deliveryCity,
            order.deliveryState,
            order.deliveryPincode,
            ...(order.items || []).map((item) => item.productName),
          ];

          const searchableText = searchableValues
            .filter((value) => value !== null && value !== undefined)
            .join(" ")
            .toLowerCase();

          if (!searchableText.includes(query)) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
      );
  }, [orders, searchTerm, orderStatusFilter, paymentStatusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const visibleOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const pendingCount = orders.filter(
    (order) => normalizeStatus(order.orderStatus) === "PENDING",
  ).length;

  const successfulPaymentCount = orders.filter(
    (order) => normalizeStatus(order.paymentStatus) === "SUCCESS",
  ).length;

  const cancelledCount = orders.filter(
    (order) => normalizeStatus(order.orderStatus) === "CANCELLED",
  ).length;

  const exportCsv = () => {
    const headers = [
      "Order ID",
      "Customer ID",
      "Order Date",
      "Item Types",
      "Total Quantity",
      "Total Amount",
      "Order Status",
      "Payment Status",
      "Recipient",
      "Mobile",
      "Delivery Address",
    ];

    const rows = filteredOrders.map((order) => [
      order.orderId,
      order.userId,
      order.orderDate,
      (order.items || []).length,
      (order.items || []).reduce(
        (total, item) => total + (Number(item.quantity) || 0),
        0,
      ),
      order.totalAmount,
      order.orderStatus,
      order.paymentStatus,
      order.deliveryRecipientName,
      order.deliveryMobile,
      getDeliveryAddress(order),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `quickmart-orders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="qm-orders-page">
      {/* Page heading */}
      <section className="qm-orders-heading">
        <div>
          <span className="qm-orders-eyebrow">ORDER MANAGEMENT</span>
          <h3>Orders</h3>
          <p>Search orders, inspect payments and review delivery details.</p>
        </div>

        <div className="qm-orders-heading-actions">
          <button
            type="button"
            className="qm-orders-button qm-orders-button-secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "qm-orders-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            className="qm-orders-button qm-orders-button-primary"
            onClick={exportCsv}
            disabled={loading || filteredOrders.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </section>

      {/* Summary cards */}
      <section className="qm-orders-summary-grid">
        <article className="qm-orders-summary-card">
          <span className="qm-orders-summary-icon green">
            <ShoppingCart size={20} />
          </span>
          <div>
            <span>Total orders</span>
            <strong>{loading ? "…" : orders.length}</strong>
          </div>
        </article>

        <article className="qm-orders-summary-card">
          <span className="qm-orders-summary-icon orange">
            <RefreshCw size={20} />
          </span>
          <div>
            <span>Pending orders</span>
            <strong>{loading ? "…" : pendingCount}</strong>
          </div>
        </article>

        <article className="qm-orders-summary-card">
          <span className="qm-orders-summary-icon blue">
            <CreditCard size={20} />
          </span>
          <div>
            <span>Successful payments</span>
            <strong>{loading ? "…" : successfulPaymentCount}</strong>
          </div>
        </article>

        <article className="qm-orders-summary-card">
          <span className="qm-orders-summary-icon red">
            <ShoppingCart size={20} />
          </span>
          <div>
            <span>Cancelled orders</span>
            <strong>{loading ? "…" : cancelledCount}</strong>
          </div>
        </article>
      </section>

      {/* Search and filters */}
      <section className="qm-orders-panel">
        <div className="qm-orders-toolbar">
          <label className="qm-orders-search">
            <Search size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search order, customer, product or recipient..."
              aria-label="Search orders"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>

          <div className="qm-orders-filters">
            <label>
              <span>Order status</span>
              <select
                value={orderStatusFilter}
                onChange={(event) => {
                  setOrderStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>

            <label>
              <span>Payment status</span>
              <select
                value={paymentStatusFilter}
                onChange={(event) => {
                  setPaymentStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All payments</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
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
              className="qm-orders-clear-button"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Orders table */}
        {error && (
          <div className="qm-orders-error" role="alert">
            <div>
              <strong>Could not load orders</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              className="qm-orders-button qm-orders-button-secondary"
              onClick={handleRefresh}
            >
              Try again
            </button>
          </div>
        )}

        <div className="qm-orders-table-wrap">
          <table className="qm-orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Order date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Order status</th>
                <th>Payment</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="qm-orders-table-message">
                    <RefreshCw size={19} className="qm-orders-spin" />
                    <span>Loading orders...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="qm-orders-table-message">
                    Order data is unavailable.
                  </td>
                </tr>
              ) : visibleOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="qm-orders-table-message">
                    <Package size={25} />
                    <strong>No matching orders found</strong>
                    <span>Try changing your search or filters.</span>
                  </td>
                </tr>
              ) : (
                visibleOrders.map((order) => {
                  const items = order.items || [];

                  const totalQuantity = items.reduce(
                    (total, item) => total + (Number(item.quantity) || 0),
                    0,
                  );

                  return (
                    <tr key={order.orderId}>
                      <td className="qm-orders-id">#{order.orderId}</td>

                      <td>
                        <div className="qm-orders-customer">
                          <strong>
                            {order.deliveryRecipientName ||
                              `Customer #${order.userId}`}
                          </strong>
                          <span>User ID: {order.userId ?? "—"}</span>
                        </div>
                      </td>

                      <td className="qm-orders-date">
                        {formatDate(order.orderDate)}
                      </td>

                      <td>
                        <strong>{totalQuantity}</strong>
                        <span className="qm-orders-muted-small"> units</span>
                      </td>

                      <td className="qm-orders-amount">
                        {formatCurrency(order.totalAmount)}
                      </td>

                      <td>
                        <span
                          className={`qm-orders-status ${statusClass(
                            order.orderStatus,
                          )}`}
                        >
                          {order.orderStatus || "Unknown"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`qm-orders-status ${statusClass(
                            order.paymentStatus,
                          )}`}
                        >
                          {order.paymentStatus || "Unknown"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="qm-orders-view-button"
                          onClick={() => setSelectedOrder(order)}
                          aria-label={`View order ${order.orderId}`}
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="qm-orders-pagination">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} of{" "}
              {filteredOrders.length} orders
            </span>

            <div>
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                <ChevronLeft size={17} />
                Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((previous) => Math.min(totalPages, previous + 1))
                }
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Order details modal */}
      {selectedOrder && (
        <div className="qm-orders-modal-overlay">
          <section
            className="qm-orders-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qm-orders-modal-title"
          >
            <header className="qm-orders-modal-header">
              <div>
                <span className="qm-orders-eyebrow">ORDER DETAILS</span>
                <h3 id="qm-orders-modal-title">
                  Order #{selectedOrder.orderId}
                </h3>
                <p>{formatDate(selectedOrder.orderDate)}</p>
              </div>

              <button
                type="button"
                className="qm-orders-modal-close"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                <X size={21} />
              </button>
            </header>

            <div className="qm-orders-modal-body">
              <div className="qm-orders-detail-statuses">
                <div>
                  <span>Order status</span>
                  <span
                    className={`qm-orders-status ${statusClass(
                      selectedOrder.orderStatus,
                    )}`}
                  >
                    {selectedOrder.orderStatus || "Unknown"}
                  </span>
                </div>

                <div>
                  <span>Payment status</span>
                  <span
                    className={`qm-orders-status ${statusClass(
                      selectedOrder.paymentStatus,
                    )}`}
                  >
                    {selectedOrder.paymentStatus || "Unknown"}
                  </span>
                </div>
              </div>

              <section className="qm-orders-detail-section">
                <h4>
                  <Package size={17} />
                  Items
                </h4>

                {(selectedOrder.items || []).length === 0 ? (
                  <p className="qm-orders-detail-empty">
                    No item details available.
                  </p>
                ) : (
                  <div className="qm-orders-item-list">
                    {selectedOrder.items.map((item) => (
                      <div
                        className="qm-orders-item-row"
                        key={item.itemId ?? item.productId}
                      >
                        <div>
                          <strong>{item.productName || "Product"}</strong>
                          <span>
                            {formatCurrency(item.unitPrice)} × {item.quantity}
                          </span>
                        </div>

                        <strong>
                          {formatCurrency(
                            item.subtotal ??
                              Number(item.unitPrice) * Number(item.quantity),
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="qm-orders-detail-total">
                  <span>Order total</span>
                  <strong>{formatCurrency(selectedOrder.totalAmount)}</strong>
                </div>
              </section>

              <section className="qm-orders-detail-section">
                <h4>
                  <UserRound size={17} />
                  Customer
                </h4>

                <div className="qm-orders-info-row">
                  <span>Customer ID</span>
                  <strong>{selectedOrder.userId ?? "—"}</strong>
                </div>

                <div className="qm-orders-info-row">
                  <span>Recipient</span>
                  <strong>
                    {selectedOrder.deliveryRecipientName || "Not provided"}
                  </strong>
                </div>

                <div className="qm-orders-info-row">
                  <span>Mobile</span>
                  <strong>
                    {selectedOrder.deliveryMobile || "Not provided"}
                  </strong>
                </div>
              </section>

              <section className="qm-orders-detail-section">
                <h4>
                  <MapPin size={17} />
                  Delivery address
                </h4>

                {getDeliveryAddress(selectedOrder) ? (
                  <>
                    {selectedOrder.deliveryAddressLabel && (
                      <span className="qm-orders-address-label">
                        {selectedOrder.deliveryAddressLabel}
                      </span>
                    )}

                    <p className="qm-orders-address">
                      {getDeliveryAddress(selectedOrder)}
                    </p>
                  </>
                ) : (
                  <p className="qm-orders-detail-empty">
                    No delivery address snapshot is available for this order.
                  </p>
                )}
              </section>

              <div className="qm-orders-info-row qm-orders-payment-info">
                <span>
                  <CreditCard size={16} />
                  Payment status
                </span>
                <strong>{selectedOrder.paymentStatus || "Unknown"}</strong>
              </div>
            </div>

            <footer className="qm-orders-modal-footer">
              <button
                type="button"
                className="qm-orders-button qm-orders-button-primary"
                onClick={() => setSelectedOrder(null)}
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

export default AdminOrders;
