import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QuickMartHeader from "../../components/layout/QuickMartHeader";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import {
  getOrdersByUserId,
  getOrderStatus,
  retryOrderPayment,
} from "../../services/orderService";
import "../../styles/orders.css";

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
    error.response?.data?.message || error.response?.data?.error || fallback
  );
}

function Orders() {
  const { user, loading: authLoading } = useAuth();

  // The login response can use userId; id is retained as a fallback.
  const userId = user?.userId ?? user?.id;
  const isCustomer = String(user?.role || "").toUpperCase() === "CUSTOMER";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [retryingOrderId, setRetryingOrderId] = useState(null);

  const loadOrders = useCallback(
    async (showLoader = true) => {
      if (userId == null || userId === "") {
        setOrders([]);
        setError("Your account ID could not be found. Please sign in again.");
        setLoading(false);
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setError("");

      try {
        const response = await getOrdersByUserId(userId);
        const orderList = Array.isArray(response) ? response : [];

        // Fetch current statuses as well, so asynchronous Kafka updates
        // are reflected even if the history list was cached earlier.
        const refreshedOrders = await Promise.all(
          orderList.map(async (order) => {
            try {
              const latestStatus = await getOrderStatus(order.orderId);
              return { ...order, ...latestStatus };
            } catch {
              // Keep the history entry visible if a status request fails.
              return order;
            }
          }),
        );

        setOrders(
          refreshedOrders.sort(
            (a, b) =>
              new Date(b.orderDate || 0).getTime() -
              new Date(a.orderDate || 0).getTime(),
          ),
        );
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Unable to load your orders. Please try again.",
          ),
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [userId],
  );

  useEffect(() => {
    if (authLoading || !user || !isCustomer) {
      return;
    }

    let active = true;

    Promise.resolve().then(() => {
      if (active) {
        void loadOrders();
      }
    });

    return () => {
      active = false;
    };
  }, [authLoading, user, isCustomer, loadOrders]);

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

  if (authLoading || (loading && user && isCustomer)) {
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
              onClick={() => loadOrders()}
              disabled={loading || retryingOrderId != null}
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
                onClick={() => loadOrders()}
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
                          className={`qm-order-badge ${getOrderStatusClass(order.orderStatus)}`}
                        >
                          {getOrderStatusLabel(order.orderStatus)}
                        </span>
                        <span
                          className={`qm-order-badge ${getPaymentStatusClass(order.paymentStatus)}`}
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
