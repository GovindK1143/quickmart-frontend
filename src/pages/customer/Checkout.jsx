import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
  Truck,
  CheckCircle2,
  MapPin,
} from "lucide-react";

import { useCart } from "../../context/useCart";
import QuickMartHeader from "../../components/layout/QuickMartHeader";
import { getMyAddresses } from "../../services/userService";
import "../../styles/checkout-address.css";

function getCheckoutError(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Unable to place your order. Please try again."
  );
}

function formatAddress(address) {
  return [
    address.houseFlat,
    address.streetArea,
    address.city,
    address.state,
    address.pincode ? `PIN ${address.pincode}` : "",
    address.landmark ? `Near ${address.landmark}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function Checkout() {
  const { cart, loading, placeOrder } = useCart();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressLoadError, setAddressLoadError] = useState("");
  const [addressRetry, setAddressRetry] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderResult, setOrderResult] = useState(null);

  const paymentStatus = String(orderResult?.paymentStatus ?? "").toUpperCase();

  const orderId = orderResult?.orderId ?? orderResult?.id;

  const paymentPending =
    orderResult !== null &&
    paymentStatus !== "SUCCESS" &&
    paymentStatus !== "FAILED";

  const selectedAddress = savedAddresses.find(
    (address) => String(address.id) === selectedAddressId,
  );

  // Load saved delivery addresses and prefer the default address.
  useEffect(() => {
    let cancelled = false;

    async function loadAddresses() {
      setAddressesLoading(true);
      setAddressLoadError("");

      try {
        const response = await getMyAddresses();
        const addresses = Array.isArray(response) ? response : [];

        if (cancelled) return;

        setSavedAddresses(addresses);

        const preferredAddress =
          addresses.find((address) => address.defaultAddress) ?? addresses[0];

        setSelectedAddressId(
          preferredAddress ? String(preferredAddress.id) : "",
        );
      } catch (error) {
        if (!cancelled) {
          setAddressLoadError(
            error.response?.status === 401
              ? "Your session may have expired. Please sign in again."
              : error.response?.data?.message ||
                  "Unable to load saved addresses. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setAddressesLoading(false);
        }
      }
    }

    void loadAddresses();

    return () => {
      cancelled = true;
    };
  }, [addressRetry]);

  const handlePlaceOrder = async () => {
    if (placingOrder || !cart.items?.length || paymentPending) {
      return;
    }

    setCheckoutError("");

    if (addressesLoading) {
      setCheckoutError("Please wait while your addresses are loading.");
      return;
    }

    if (addressLoadError) {
      setCheckoutError(
        "Unable to verify your saved delivery address. Please retry loading addresses.",
      );
      return;
    }

    if (!selectedAddress) {
      setCheckoutError(
        "Please select a saved delivery address before placing your order.",
      );
      return;
    }

    setPlacingOrder(true);
    setOrderResult(null);

    try {
      const response = await placeOrder(Number(selectedAddress.id));

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
          <p>Review your delivery address and order before placing it.</p>
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

              <section
                className="checkout-delivery-card"
                aria-labelledby="delivery-address-heading"
              >
                <div className="checkout-delivery-heading">
                  <div>
                    <p className="section-eyebrow">DELIVERY ADDRESS</p>
                    <h2 id="delivery-address-heading">
                      Where should we deliver?
                    </h2>
                    <p>Select a saved address for this order.</p>
                  </div>

                  <Link to="/profile" className="checkout-manage-address-link">
                    Manage addresses
                  </Link>
                </div>

                {addressesLoading ? (
                  <p className="checkout-address-status" role="status">
                    Loading your saved addresses...
                  </p>
                ) : addressLoadError ? (
                  <div className="checkout-address-error" role="alert">
                    <p>{addressLoadError}</p>
                    <button
                      type="button"
                      className="checkout-address-retry"
                      onClick={() =>
                        setAddressRetry((previous) => previous + 1)
                      }
                    >
                      Retry
                    </button>
                  </div>
                ) : savedAddresses.length === 0 ? (
                  <div className="checkout-no-addresses">
                    <MapPin size={25} />
                    <strong>No saved delivery addresses</strong>
                    <p>
                      Add a delivery address in My Profile before placing your
                      order.
                    </p>
                    <Link
                      to="/profile"
                      className="checkout-manage-address-link"
                    >
                      Open My Profile
                    </Link>
                  </div>
                ) : (
                  <div className="checkout-address-list">
                    {savedAddresses.map((address) => {
                      const selected = selectedAddressId === String(address.id);

                      return (
                        <label
                          key={address.id}
                          className={`checkout-address-option ${
                            selected ? "selected" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryAddress"
                            value={address.id}
                            checked={selected}
                            disabled={placingOrder || paymentPending}
                            onChange={(event) =>
                              setSelectedAddressId(event.target.value)
                            }
                          />

                          <span className="checkout-address-option-content">
                            <span className="checkout-address-label-row">
                              <span className="checkout-address-label">
                                <MapPin size={15} />
                                {address.label}
                              </span>

                              {address.defaultAddress && (
                                <span className="checkout-default-badge">
                                  <CheckCircle2 size={14} />
                                  Default
                                </span>
                              )}

                              {selected && (
                                <span className="checkout-selected-badge">
                                  Selected
                                </span>
                              )}
                            </span>

                            <strong>{address.recipientName}</strong>
                            <span className="checkout-address-mobile">
                              {address.mobile}
                            </span>
                            <span className="checkout-address-full">
                              {formatAddress(address)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>

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
                <p className="checkout-error-message" role="alert">
                  {checkoutError}
                </p>
              )}

              {paymentPending && (
                <div className="checkout-pending-message" role="status">
                  Your order was submitted, but payment is still pending. Check
                  My Orders for its current status before attempting another
                  order.
                  {orderId != null && (
                    <p>
                      Order number: <strong>#{orderId}</strong>
                    </p>
                  )}
                  <Link to="/orders">View My Orders</Link>
                </div>
              )}

              <button
                type="button"
                className="place-order-button"
                onClick={handlePlaceOrder}
                disabled={
                  placingOrder ||
                  cart.items.length === 0 ||
                  paymentPending ||
                  addressesLoading ||
                  Boolean(addressLoadError) ||
                  !selectedAddress
                }
              >
                <LockKeyhole size={18} />
                {placingOrder
                  ? "Placing Order..."
                  : paymentPending
                    ? "Payment Pending"
                    : addressesLoading
                      ? "Loading Addresses..."
                      : !selectedAddress
                        ? "Select an Address"
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
