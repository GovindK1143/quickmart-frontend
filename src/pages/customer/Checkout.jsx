import { Link } from "react-router-dom";
import { ArrowLeft, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "../../context/useCart";
import QuickMartHeader from "../../components/layout/QuickMartHeader";
function Checkout() {
  const { cart, loading } = useCart();

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

        {cart.items.length === 0 ? (
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

              <button type="button" className="place-order-button" disabled>
                <LockKeyhole size={18} />
                Place Order
              </button>

              <p className="checkout-note">
                Payment and order placement will be implemented in the next
                checkout phase.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default Checkout;
