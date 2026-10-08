import apiClient from "./apiClient";

export const getCart = async () => {
  const response = await apiClient.get("/cart");

  return response.data;
};

export const addCartItem = async (productId, quantity = 1) => {
  const response = await apiClient.post("/cart/items", {
    productId,
    quantity,
  });

  return response.data;
};

export const updateCartItem = async (productId, quantity) => {
  const response = await apiClient.put(`/cart/items/${productId}`, {
    quantity,
  });

  return response.data;
};

export const removeCartItem = async (productId) => {
  const response = await apiClient.delete(`/cart/items/${productId}`);

  return response.data;
};

export const clearCart = async () => {
  const response = await apiClient.delete("/cart");

  return response.data;
};

export const checkoutCart = async () => {
  const response = await apiClient.post("/cart/checkout");

  return response.data;
};
