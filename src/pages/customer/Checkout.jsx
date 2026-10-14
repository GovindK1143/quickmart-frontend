import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
  Truck,
  CheckCircle2,
} from "lucide-react";

import { useCart } from "../../context/useCart";
import QuickMartHeader from "../../components/layout/QuickMartHeader";

function getCheckoutError(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Unable to place your order. Please try again."
  );
}

function Checkout() {
  const { cart, loading, placeOrder } = useCart();

  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderResult, setOrderResult] = useState(null);

  const paymentStatus = String(orderResult?.paymentStatus ?? "").toUpperCase();

  const orderId = orderResult?.orderId ?? orderResult?.id;

  const paymentPending =
    orderResult !== null &&
    paymentStatus !== "SUCCESS" &&
    paymentStatus !== "FAILED";

  const handlePlaceOrder = async () => {
    if (placingOrder || !cart.items?.length || paymentPending) {
      return;
    }

    setPlacingOrder(true);
    setCheckoutError("");
    setOrderResult(null);

    try {
      const response = await placeOrder();

      setOrderResult(response);

      const status = String(response?.paymentStatus ?? "PENDING").toUpperCase();

      if (status === "FAILED") {
        setCheckoutError(
          "Payment failed. Your cart has been preserved. " +
            "You can review your items and try placing a new order.",
        );
      }
    } catch (error) {
      setCheckoutError(getCheckoutError(error));
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="qm-page">
        <QuickMartHeader />

        <div className="qm-loading">
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="qm-page">
      <QuickMartHeader />

      <main className="checkout-page">
        <Link to="/cart" className="back-shopping-link">
          <ArrowLeft size={18} />
          Back to Cart
        </Link>

        <div className="checkout-heading">
          <p className="section-eyebrow">QUICKMART CHECKOUT</p>
          <h1>Checkout</h1>
          <p>Review your order before placing it.</p>
        </div>

        {orderResult && paymentStatus === "SUCCESS" ? (
          <div className="cart-empty" role="status">
            <div className="empty-cart-icon">
              <CheckCircle2 size={42} />
            </div>

            <h2>Order placed successfully!</h2>

            {orderId != null && (
              <p>
                Your order number is <strong>#{orderId}</strong>.
              </p>
            )}

            <p>
              Payment was successful. You can view your order details and
              current order status in My Orders.
            </p>

            <Link to="/orders" className="continue-shopping-button">
              View My Orders
            </Link>

            <Link
              to="/home"
              className="back-shopping-link"
              style={{
                justifyContent: "center",
                marginTop: "16px",
              }}
            >
              Continue Shopping
            </Link>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="cart-empty">
            <div className="empty-cart-icon">🛒</div>

            <h2>Your cart is empty</h2>

            <p>Add products before continuing to checkout.</p>

            <Link to="/home" className="continue-shopping-button">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="checkout-layout">
            <section className="checkout-main-card">
              <div className="checkout-card-heading">
                <div>
                  <p className="section-eyebrow">ORDER</p>
                  <h2>Review your items</h2>
                </div>

                <span className="checkout-item-count">
                  {cart.totalItems} items
                </span>
              </div>

              <div className="checkout-items">
                {cart.items.map((item) => (
                  <div key={item.productId} className="checkout-item">
                    <div className="checkout-item-image">
                      <img src={item.imageUrl} alt={item.productName} />
                    </div>

                    <div className="checkout-item-details">
                      <strong>{item.productName}</strong>
                      <span>{item.brand}</span>
                      <small>
                        {item.unit} × {item.quantity}
                      </small>
                    </div>

                    <strong className="checkout-item-price">
                      ₹{item.subtotal}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="checkout-info-grid">
                <div>
                  <Truck size={21} />

                  <span>
                    <strong>Fast Delivery</strong>
                    <small>Delivery in 10 mins</small>
                  </span>
                </div>

                <div>
                  <ShieldCheck size={21} />

                  <span>
                    <strong>Secure Order</strong>
                    <small>Safe and reliable shopping</small>
                  </span>
                </div>
              </div>
            </section>

            <aside className="checkout-summary-card">
              <div className="checkout-summary-heading">
                <h2>Order Summary</h2>
              </div>

              <div className="checkout-summary-row">
                <span>Items</span>
                <span>{cart.totalItems}</span>
              </div>

              <div className="checkout-summary-row">
                <span>Subtotal</span>
                <span>₹{cart.totalAmount}</span>
              </div>

              <div className="checkout-summary-row">
                <span>Delivery</span>
                <strong className="free-delivery">FREE</strong>
              </div>

              <div className="checkout-summary-total">
                <span>Total</span>
                <strong>₹{cart.totalAmount}</strong>
              </div>

              {checkoutError && (
                <p
                  role="alert"
                  style={{
                    color: "#b42318",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    marginTop: "14px",
                  }}
                >
                  {checkoutError}
                </p>
              )}

              {paymentPending && (
                <div
                  role="status"
                  style={{
                    color: "#795500",
                    background: "#fff8e8",
                    padding: "12px",
                    borderRadius: "8px",
                    marginTop: "14px",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  Your order was submitted, but payment is still pending. Check
                  My Orders for its current status before attempting another
                  order.
                  {orderId != null && (
                    <p style={{ marginBottom: 0 }}>
                      Order number: <strong>#{orderId}</strong>
                    </p>
                  )}
                  <Link
                    to="/orders"
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      color: "#005442",
                      fontWeight: 700,
                    }}
                  >
                    View My Orders
                  </Link>
                </div>
              )}

              <button
                type="button"
                className="place-order-button"
                onClick={handlePlaceOrder}
                disabled={
                  placingOrder || cart.items.length === 0 || paymentPending
                }
              >
                <LockKeyhole size={18} />
                {placingOrder
                  ? "Placing Order..."
                  : paymentPending
                    ? "Payment Pending"
                    : "Place Order"}
              </button>

              <p className="checkout-note">
                {placingOrder
                  ? "Please wait while we submit your order. Do not refresh this page."
                  : "Your order and payment status will be confirmed by QuickMart."}
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default Checkout;
