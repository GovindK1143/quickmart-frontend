import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import {
  addCartItem,
  checkoutCart,
  clearCart as clearServerCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../services/cartService";
import {
  addGuestCartItem,
  buildGuestCart,
  clearGuestCart,
  getGuestCartItems,
  removeGuestCartItem,
  updateGuestCartItem,
} from "../utils/guestCart";
import { CartContext } from "./cartContextValue";

const emptyCart = {
  cartId: null,
  userId: null,
  items: [],
  totalItems: 0,
  totalAmount: 0,
};

function getErrorMessage(error, fallbackMessage) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallbackMessage
  );
}

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();

  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadingRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  const refreshCart = useCallback(async () => {
    if (authLoading || user?.role !== "CUSTOMER") {
      return null;
    }

    // Avoid overlapping with initial loading or another refresh.
    if (loadingRef.current || refreshInFlightRef.current) {
      return null;
    }

    refreshInFlightRef.current = true;

    try {
      const latestCart = await getCart();

      // Updating shared context also updates the header badge
      // and the cart page.
      setCart(latestCart);

      return latestCart;
    } catch (refreshError) {
      // A background refresh failure should not hide the
      // currently displayed cart or interrupt shopping.
      console.warn("Unable to refresh cart from the server:", refreshError);

      return null;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || loadingRef.current) {
      return;
    }

    const loadCart = async () => {
      loadingRef.current = true;
      setLoading(true);
      setError("");

      try {
        if (user?.role === "CUSTOMER") {
          const guestItems = getGuestCartItems();

          if (guestItems.length > 0) {
            for (const item of guestItems) {
              await addCartItem(item.productId, item.quantity);
            }

            clearGuestCart();
          }

          const serverCart = await getCart();

          setCart(serverCart);
        } else if (!user) {
          setCart(buildGuestCart());
        } else {
          // ADMIN does not use the customer cart.
          setCart(emptyCart);
        }
      } catch (requestError) {
        console.error("Failed to load cart:", requestError);

        if (user?.role === "CUSTOMER") {
          setCart(buildGuestCart());
        } else if (!user) {
          setCart(buildGuestCart());
        } else {
          setCart(emptyCart);
        }

        setError(
          getErrorMessage(
            requestError,
            "Unable to load cart. Please try again.",
          ),
        );
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    loadCart();
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || user?.role !== "CUSTOMER") {
      return undefined;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshCart();
      }
    };

    // Keep the cart synchronized while the customer is shopping.
    const intervalId = window.setInterval(refreshWhenVisible, 10000);

    // Also refresh when the customer returns to the browser tab.
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [authLoading, user, refreshCart]);

  const addProduct = async (product) => {
    setError("");

    try {
      if (user?.role === "CUSTOMER") {
        const updatedCart = await addCartItem(product.id, 1);

        setCart(updatedCart);

        return updatedCart;
      }

      if (!user) {
        const updatedItems = addGuestCartItem(product);

        const updatedCart = buildGuestCart(updatedItems);

        setCart(updatedCart);

        return updatedCart;
      }

      throw new Error("Admin users do not have access to the customer cart.");
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Unable to add product to cart.",
      );

      setError(message);

      throw requestError;
    }
  };

  const updateItem = async (productId, quantity) => {
    setError("");

    try {
      if (user?.role === "CUSTOMER") {
        const updatedCart = await updateCartItem(productId, quantity);

        setCart(updatedCart);

        return updatedCart;
      }

      if (!user) {
        const updatedItems = updateGuestCartItem(productId, quantity);

        const updatedCart = buildGuestCart(updatedItems);

        setCart(updatedCart);

        return updatedCart;
      }

      throw new Error("Admin users do not have access to the customer cart.");
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Unable to update cart item.",
      );

      setError(message);

      throw requestError;
    }
  };

  const removeItem = async (productId) => {
    setError("");

    try {
      if (user?.role === "CUSTOMER") {
        const updatedCart = await removeCartItem(productId);

        setCart(updatedCart);

        return updatedCart;
      }

      if (!user) {
        const updatedItems = removeGuestCartItem(productId);

        const updatedCart = buildGuestCart(updatedItems);

        setCart(updatedCart);

        return updatedCart;
      }

      throw new Error("Admin users do not have access to the customer cart.");
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Unable to remove cart item.",
      );

      setError(message);

      throw requestError;
    }
  };

  const clearCart = async () => {
    setError("");

    try {
      if (user?.role === "CUSTOMER") {
        await clearServerCart();

        setCart(emptyCart);

        return;
      }

      if (!user) {
        clearGuestCart();

        setCart(emptyCart);

        return;
      }

      setCart(emptyCart);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Unable to clear cart.");

      setError(message);

      throw requestError;
    }
  };

  const placeOrder = async (addressId) => {
    setError("");

    // Only customer accounts can place orders.
    if (user?.role !== "CUSTOMER") {
      const requestError = new Error(
        "Please log in with a customer account to place an order.",
      );

      setError(requestError.message);
      throw requestError;
    }

    // A valid saved delivery address is required.
    if (!Number.isInteger(Number(addressId)) || Number(addressId) <= 0) {
      const requestError = new Error(
        "Please select a delivery address before placing the order.",
      );

      setError(requestError.message);
      throw requestError;
    }

    try {
      // Submit the existing server-side cart with the selected address.
      const orderResponse = await checkoutCart(Number(addressId));

      const paymentStatus = String(
        orderResponse?.paymentStatus ?? "PENDING",
      ).toUpperCase();

      if (paymentStatus === "SUCCESS") {
        // Preserve the existing successful-payment cart behavior.
        setCart(emptyCart);

        try {
          const latestCart = await getCart();
          setCart(latestCart);
        } catch (refreshError) {
          console.error(
            "Order succeeded, but refreshing the cart failed:",
            refreshError,
          );
        }
      } else {
        // Keep cart items for pending, failed or unknown payment status.
        try {
          const latestCart = await getCart();
          setCart(latestCart);
        } catch (refreshError) {
          console.error("Unable to refresh cart after checkout:", refreshError);
        }
      }

      return orderResponse;
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Unable to place the order. Please try again.",
      );

      setError(message);
      throw requestError;
    }
  };

  const value = {
    cart,
    loading,
    error,
    addProduct,
    updateItem,
    removeItem,
    clearCart,
    placeOrder,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
