import { ArrowRight, Truck } from "lucide-react";

function CartSummary({ cart, onCheckout, checkoutDisabled }) {
  return (
    <aside className="cart-summary">
      <div className="cart-summary-header">
        <div>
          <p className="section-eyebrow">YOUR ORDER</p>
          <h2>Order Summary</h2>
        </div>

        <span className="cart-summary-count">{cart.totalItems}</span>
      </div>

      <div className="cart-summary-items">
        {cart.items.map((item) => (
          <div key={item.productId} className="cart-summary-item">
            <div className="cart-summary-item-image">
              <img src={item.imageUrl} alt={item.productName} />
            </div>

            <div className="cart-summary-item-info">
              <strong>{item.productName}</strong>

              <span>
                {item.quantity} × ₹{item.sellingPrice}
              </span>

              <small>{item.unit}</small>
            </div>

            <strong className="cart-summary-item-price">
              ₹{item.subtotal}
            </strong>
          </div>
        ))}
      </div>

      <div className="cart-summary-divider" />

      <div className="cart-summary-row">
        <span>Items</span>
        <span>{cart.totalItems}</span>
      </div>

      <div className="cart-summary-row">
        <span>Subtotal</span>
        <span>₹{cart.totalAmount}</span>
      </div>

      <div className="cart-summary-row">
        <span>Delivery</span>
        <strong className="free-delivery">FREE</strong>
      </div>

      <div className="cart-summary-divider" />

      <div className="cart-summary-total">
        <span>Total</span>
        <strong>₹{cart.totalAmount}</strong>
      </div>

      <button
        type="button"
        className="cart-checkout-button"
        onClick={onCheckout}
        disabled={checkoutDisabled}
      >
        <span>Proceed to Checkout</span>
        <ArrowRight size={19} />
      </button>

      <div className="cart-summary-delivery">
        <Truck size={18} />

        <span>
          <strong>Fast delivery</strong>
          <small>Get your groceries delivered quickly</small>
        </span>
      </div>
    </aside>
  );
}

export default CartSummary;
