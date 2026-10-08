import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import {
  addCartItem,
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

  const value = {
    cart,
    loading,
    error,
    addProduct,
    updateItem,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
