import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import QuickMartHeader from "../../components/layout/QuickMartHeader";
import { useAuth } from "../../context/useAuth";
import {
  getOrdersByUserId,
  getOrderStatus,
  retryOrderPayment,
} from "../../services/orderService";
import "../../styles/orders.css";

const STATUS_REFRESH_INTERVAL = 10000;
const ORDER_HISTORY_REFRESH_INTERVAL = 30000;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatDeliveryAddress = (order) => {
  const landmark = String(order.deliveryLandmark ?? "")
    .trim()
    .replace(/^near\s+/i, "");

  const parts = [
    [order.deliveryHouseFlat, order.deliveryStreetArea]
      .filter(Boolean)
      .join(", "),
    [order.deliveryCity, order.deliveryState].filter(Boolean).join(", "),
    order.deliveryPincode ? `PIN ${order.deliveryPincode}` : "",
    landmark ? `Near ${landmark}` : "",
  ];

  return parts.filter(Boolean).join(", ");
};

const hasDeliveryAddress = (order) =>
  order.deliveryAddressId != null ||
  [
    order.deliveryAddressLabel,
    order.deliveryRecipientName,
    order.deliveryMobile,
    order.deliveryHouseFlat,
    order.deliveryStreetArea,
    order.deliveryCity,
    order.deliveryState,
    order.deliveryPincode,
    order.deliveryLandmark,
  ].some((value) => typeof value === "string" && value.trim() !== "");

const normalizeStatus = (value) =>
  String(value || "PENDING")
    .trim()
    .toUpperCase();

const getOrderStatusLabel = (status) => {
  switch (normalizeStatus(status)) {
    case "CONFIRMED":
      return "Confirmed";
    case "CANCELLED":
      return "Cancelled";
    case "DELIVERED":
      return "Delivered";
    case "SHIPPED":
      return "Shipped";
    default:
      return "Processing";
  }
};

const getOrderStatusClass = (status) => {
  switch (normalizeStatus(status)) {
    case "CONFIRMED":
    case "DELIVERED":
      return "success";
    case "CANCELLED":
      return "danger";
    default:
      return "pending";
  }
};

const getPaymentStatusClass = (status) => {
  switch (normalizeStatus(status)) {
    case "SUCCESS":
      return "success";
    case "FAILED":
      return "danger";
    default:
      return "pending";
  }
};

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

function Orders() {
  const { user, loading: authLoading } = useAuth();

  const userId = user?.userId ?? user?.id;
  const isCustomer = String(user?.role || "").toUpperCase() === "CUSTOMER";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [retryingOrderId, setRetryingOrderId] = useState(null);

  // Prevent overlapping API requests.
  const ordersRequestInFlightRef = useRef(false);
  const orderStatusRefreshInFlightRef = useRef(false);

  // Lets background polling access the latest order list without
  // recreating its interval after every React render.
  const ordersRef = useRef([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  /**
   * Refresh statuses independently of the order-history request.
   * A slow status endpoint will not delay rendering the order cards.
   */
  const refreshOrderStatuses = useCallback(async (orderList) => {
    if (
      !Array.isArray(orderList) ||
      orderList.length === 0 ||
      orderStatusRefreshInFlightRef.current
    ) {
      return;
    }

    orderStatusRefreshInFlightRef.current = true;

    try {
      const results = await Promise.all(
        orderList.map(async (order) => {
          if (order?.orderId == null) {
            return null;
          }

          try {
            const latestStatus = await getOrderStatus(order.orderId);

            return {
              orderId: String(order.orderId),
              status: latestStatus,
            };
          } catch {
            // Keep the current status if an individual request fails.
            return null;
          }
        }),
      );

      const statusByOrderId = new Map(
        results
          .filter((result) => result?.status)
          .map((result) => [result.orderId, result.status]),
      );

      setOrders((currentOrders) =>
        currentOrders.map((order) => {
          const latestStatus = statusByOrderId.get(String(order.orderId));

          return latestStatus ? { ...order, ...latestStatus } : order;
        }),
      );
    } catch (refreshError) {
      console.warn("Unable to refresh order statuses:", refreshError);
    } finally {
      orderStatusRefreshInFlightRef.current = false;
    }
  }, []);

  /**
   * Load order history first and render it immediately.
   * Status requests run asynchronously in the background.
   */
  const loadOrders = useCallback(
    async (showLoader = true) => {
      if (userId == null || userId === "") {
        setOrders([]);
        ordersRef.current = [];
        setError("Your account ID could not be found. Please sign in again.");
        setLoading(false);
        return;
      }

      if (ordersRequestInFlightRef.current) {
        return;
      }

      ordersRequestInFlightRef.current = true;

      if (showLoader) {
        setLoading(true);
      }

      setError("");

      try {
        const response = await getOrdersByUserId(userId);

        const orderList = Array.isArray(response) ? response : [];

        const sortedOrders = [...orderList].sort(
          (a, b) =>
            new Date(b.orderDate || 0).getTime() -
            new Date(a.orderDate || 0).getTime(),
        );

        // Update the page immediately; do not wait for status APIs.
        ordersRef.current = sortedOrders;
        setOrders(sortedOrders);

        // Refresh payment/order statuses without blocking the UI.
        void refreshOrderStatuses(sortedOrders);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Unable to load your orders. Please try again.",
          ),
        );
      } finally {
        ordersRequestInFlightRef.current = false;
        setLoading(false);
      }
    },
    [userId, refreshOrderStatuses],
  );

  // Initial order-history load.

  useEffect(() => {
    if (authLoading || !user || !isCustomer) {
      return undefined;
    }

    let cancelled = false;

    // Defer the initial load so state updates don't occur
    // synchronously inside the effect.
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        void loadOrders(true);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [authLoading, user, isCustomer, loadOrders]);

  // Poll statuses every 10 seconds and refresh order history every 30.
  useEffect(() => {
    if (authLoading || !user || !isCustomer || userId == null) {
      return undefined;
    }

    const isPageVisible = () => document.visibilityState === "visible";

    const refreshStatuses = () => {
      if (isPageVisible()) {
        void refreshOrderStatuses(ordersRef.current);
      }
    };

    const refreshHistory = () => {
      if (isPageVisible()) {
        void loadOrders(false);
      }
    };

    const statusIntervalId = window.setInterval(
      refreshStatuses,
      STATUS_REFRESH_INTERVAL,
    );

    const historyIntervalId = window.setInterval(
      refreshHistory,
      ORDER_HISTORY_REFRESH_INTERVAL,
    );

    const refreshWhenReturning = () => {
      if (isPageVisible()) {
        void loadOrders(false);
        void refreshOrderStatuses(ordersRef.current);
      }
    };

    window.addEventListener("focus", refreshWhenReturning);
    document.addEventListener("visibilitychange", refreshWhenReturning);

    return () => {
      window.clearInterval(statusIntervalId);
      window.clearInterval(historyIntervalId);

      window.removeEventListener("focus", refreshWhenReturning);

      document.removeEventListener("visibilitychange", refreshWhenReturning);
    };
  }, [authLoading, user, isCustomer, userId, loadOrders, refreshOrderStatuses]);

  const handleRetryPayment = async (order) => {
    if (retryingOrderId != null) return;

    setRetryingOrderId(order.orderId);
    setNotice(null);
    setError("");

    try {
      const result = await retryOrderPayment(order.orderId);
      const paymentStatus = normalizeStatus(result?.paymentStatus);

      if (paymentStatus === "SUCCESS") {
        setNotice({
          type: "success",
          message:
            `Payment for order #${order.orderId} succeeded. ` +
            "Your order status will update as inventory processing completes.",
        });
      } else if (paymentStatus === "FAILED") {
        setNotice({
          type: "error",
          message:
            `Payment for order #${order.orderId} failed. ` +
            "Please check the order status before trying again.",
        });
      } else {
        setNotice({
          type: "pending",
          message:
            `Payment for order #${order.orderId} is still pending. ` +
            "You can retry after the payment service becomes available.",
        });
      }

      await loadOrders(false);
      void refreshOrderStatuses(ordersRef.current);
    } catch (requestError) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          requestError,
          "Unable to retry payment. Please try again later.",
        ),
      });

      await loadOrders(false);
    } finally {
      setRetryingOrderId(null);
    }
  };

  // Show the full-page loader only while the initial history is loading.
  // Background refreshes must not hide already displayed orders.
  if (authLoading || (loading && orders.length === 0 && user && isCustomer)) {
    return (
      <>
        <QuickMartHeader />
        <main className="qm-orders-page">
          <div className="qm-orders-container">
            <div className="qm-orders-loading" role="status">
              <span className="qm-orders-spinner" />
              <p>Loading your orders...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <QuickMartHeader />
        <main className="qm-orders-page">
          <div className="qm-orders-container">
            <div className="qm-orders-message">
              <ShoppingBag size={42} />
              <h1>Sign in to view your orders</h1>
              <p>Your order history is available after you sign in.</p>
              <Link className="qm-orders-primary-btn" to="/home">
                Go to QuickMart <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!isCustomer) {
    return (
      <>
        <QuickMartHeader />
        <main className="qm-orders-page">
          <div className="qm-orders-container">
            <div className="qm-orders-message">
              <Package size={42} />
              <h1>My Orders</h1>
              <p>This page is available for customer accounts.</p>
              <Link className="qm-orders-primary-btn" to="/home">
                Back to Home <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <QuickMartHeader />

      <main className="qm-orders-page">
        <div className="qm-orders-container">
          <header className="qm-orders-header">
            <div>
              <p className="qm-orders-eyebrow">QUICKMART ACCOUNT</p>
              <h1>My Orders</h1>
              <p className="qm-orders-subtitle">
                View your purchases, payment status, and order progress.
              </p>
            </div>

            <button
              type="button"
              className="qm-orders-refresh-btn"
              onClick={() => void loadOrders(false)}
              disabled={retryingOrderId != null}
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </header>

          {notice && (
            <div className={`qm-orders-notice ${notice.type}`} role="status">
              {notice.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : notice.type === "pending" ? (
                <Clock3 size={20} />
              ) : (
                <AlertCircle size={20} />
              )}

              <p>{notice.message}</p>

              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice(null)}
              >
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="qm-orders-notice error" role="alert">
              <AlertCircle size={20} />
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadOrders(true)}
                disabled={loading}
              >
                Try again
              </button>
            </div>
          )}

          {!error && orders.length === 0 ? (
            <section className="qm-orders-message">
              <div className="qm-orders-empty-icon">
                <ShoppingBag size={35} />
              </div>
              <h2>No orders yet</h2>
              <p>When you place an order, you can follow its progress here.</p>
              <Link className="qm-orders-primary-btn" to="/home">
                Start shopping <ArrowRight size={17} />
              </Link>
            </section>
          ) : (
            <section className="qm-orders-list" aria-label="Order history">
              {orders.map((order) => {
                const items = Array.isArray(order.items) ? order.items : [];

                const paymentStatus = normalizeStatus(order.paymentStatus);

                const orderStatus = normalizeStatus(order.orderStatus);

                const canRetry =
                  (paymentStatus === "PENDING" && orderStatus === "PENDING") ||
                  (paymentStatus === "FAILED" && orderStatus === "CANCELLED");

                return (
                  <article className="qm-order-card" key={order.orderId}>
                    <div className="qm-order-card-header">
                      <div className="qm-order-identity">
                        <div className="qm-order-icon">
                          <Package size={22} />
                        </div>

                        <div>
                          <h2>Order #{order.orderId}</h2>
                          <p>
                            <CalendarDays size={15} />
                            {formatDate(order.orderDate)}
                          </p>
                        </div>
                      </div>

                      <div className="qm-order-badges">
                        <span
                          className={`qm-order-badge ${getOrderStatusClass(
                            orderStatus,
                          )}`}
                        >
                          {getOrderStatusLabel(orderStatus)}
                        </span>

                        <span
                          className={`qm-order-badge ${getPaymentStatusClass(
                            paymentStatus,
                          )}`}
                        >
                          Payment {paymentStatus.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <div className="qm-order-items">
                      {items.map((item, index) => (
                        <div
                          className="qm-order-item"
                          key={item.itemId ?? `${item.productId}-${index}`}
                        >
                          <div className="qm-order-item-icon">
                            <ShoppingBag size={19} />
                          </div>

                          <div className="qm-order-item-details">
                            <strong>
                              {item.productName || `Product #${item.productId}`}
                            </strong>

                            <span>
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </span>
                          </div>

                          <strong className="qm-order-item-subtotal">
                            {formatCurrency(item.subtotal)}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <section
                      className="qm-order-delivery"
                      aria-label={`Delivery address for order ${order.orderId}`}
                    >
                      <div className="qm-order-delivery-heading">
                        <MapPin size={18} />
                        <strong>Delivery address</strong>

                        {order.deliveryAddressLabel && (
                          <span className="qm-order-delivery-label">
                            {order.deliveryAddressLabel}
                          </span>
                        )}
                      </div>

                      {hasDeliveryAddress(order) ? (
                        <div className="qm-order-delivery-details">
                          {order.deliveryRecipientName && (
                            <strong>{order.deliveryRecipientName}</strong>
                          )}

                          {order.deliveryMobile && (
                            <span>{order.deliveryMobile}</span>
                          )}

                          <p>
                            {formatDeliveryAddress(order) ||
                              "Additional address details unavailable."}
                          </p>
                        </div>
                      ) : (
                        <p className="qm-order-delivery-unavailable">
                          Delivery address wasn't recorded for this order.
                        </p>
                      )}
                    </section>

                    <footer className="qm-order-card-footer">
                      <div className="qm-order-total">
                        <span>Total amount</span>
                        <strong>{formatCurrency(order.totalAmount)}</strong>
                      </div>

                      <div className="qm-order-actions">
                        {canRetry && (
                          <button
                            type="button"
                            className="qm-orders-retry-btn"
                            onClick={() => handleRetryPayment(order)}
                            disabled={retryingOrderId != null}
                          >
                            <RefreshCw
                              size={16}
                              className={
                                retryingOrderId === order.orderId
                                  ? "qm-orders-spinning"
                                  : ""
                              }
                            />

                            {retryingOrderId === order.orderId
                              ? "Retrying Payment..."
                              : "Retry Payment"}
                          </button>
                        )}

                        {paymentStatus === "SUCCESS" && (
                          <span className="qm-orders-payment-success">
                            <CheckCircle2 size={17} />
                            Payment received
                          </span>
                        )}

                        {paymentStatus === "FAILED" && (
                          <span className="qm-orders-payment-failed">
                            <XCircle size={17} />
                            Payment failed
                          </span>
                        )}
                      </div>
                    </footer>
                  </article>
                );
              })}
            </section>
          )}

          <div className="qm-orders-continue">
            <Link to="/home">
              Continue shopping <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default Orders;
