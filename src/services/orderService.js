import apiClient from "./apiClient";

export const getOrdersByUserId = async (userId) => {
  const response = await apiClient.get(`/orders/user/${userId}`);
  return response.data;
};

export const getOrderStatus = async (orderId) => {
  const response = await apiClient.get(`/orders/${orderId}/status`);
  return response.data;
};

export const retryOrderPayment = async (orderId) => {
  const response = await apiClient.post(`/orders/${orderId}/retry-payment`);
  return response.data;
};
