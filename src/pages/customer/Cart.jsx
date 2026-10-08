import { Link, Navigate, useNavigate } from "react-router-dom";
import QuickMartHeader from "../../components/layout/QuickMartHeader";
import { ArrowLeft, ShieldCheck, Truck } from "lucide-react";
import CartItem from "../../components/cart/CartItem";
import CartSummary from "../../components/cart/CartSummary";
import { useAuth } from "../../context/useAuth";
import { useCart } from "../../context/useCart";

function Cart() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { cart, loading, error, updateItem, removeItem, clearCart } = useCart();

  if (authLoading) {
    return (
      <div className="qm-page">
        <QuickMartHeader />

        <div className="qm-loading">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  const handleCheckout = () => {
    if (user?.role === "CUSTOMER") {
      navigate("/checkout");
      return;
    }

    navigate("/login", {
      state: {
        from: {
          pathname: "/checkout",
        },
      },
    });
  };

  const handleUpdate = async (productId, quantity) => {
    try {
      await updateItem(productId, quantity);
    } catch {
      // CartContext already stores the error.
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeItem(productId);
    } catch {
      // CartContext already stores the error.
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
    } catch {
      // CartContext already stores the error.
    }
  };

  return (
    <div className="qm-page">
      <QuickMartHeader />

      <main className="cart-page">
        <div className="cart-page-top">
          <div>
            <Link to="/home" className="back-shopping-link">
              <ArrowLeft size={18} />
              Continue Shopping
            </Link>

            <p className="section-eyebrow">QUICKMART</p>

            <h1>Your Shopping Cart</h1>

            <p>
              {cart.totalItems > 0
                ? `${cart.totalItems} item${
                    cart.totalItems > 1 ? "s" : ""
                  } in your cart`
                : "Your cart is ready for your next shopping trip"}
            </p>
          </div>

          {cart.totalItems > 0 && (
            <button
              type="button"
              className="clear-cart-button"
              onClick={handleClear}
              disabled={loading}
            >
              Clear Cart
            </button>
          )}
        </div>

        {error && <div className="cart-error">{error}</div>}

        {loading ? (
          <div className="qm-message-card">
            <p>Loading your cart...</p>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="cart-empty">
            <div className="empty-cart-icon">🛒</div>

            <h2>Your cart is empty</h2>

            <p>Add products from QuickMart and they will appear here.</p>

            <Link to="/home" className="continue-shopping-button">
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-layout">
              <section className="cart-items-section">
                <div className="cart-section-heading">
                  <h2>Cart Items</h2>
                  <span>{cart.totalItems} items</span>
                </div>

                <div className="cart-items">
                  {cart.items.map((item) => (
                    <CartItem
                      key={item.productId}
                      item={item}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      disabled={loading}
                    />
                  ))}
                </div>

                <div className="cart-benefits">
                  <div>
                    <Truck size={22} />
                    <span>
                      <strong>Fast Delivery</strong>
                      <small>Delivered to your doorstep</small>
                    </span>
                  </div>

                  <div>
                    <ShieldCheck size={22} />
                    <span>
                      <strong>Secure Shopping</strong>
                      <small>Your order is safe with us</small>
                    </span>
                  </div>
                </div>
              </section>

              <CartSummary
                cart={cart}
                onCheckout={handleCheckout}
                checkoutDisabled={loading}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Cart;
