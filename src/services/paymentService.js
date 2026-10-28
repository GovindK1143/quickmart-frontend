import apiClient from "./apiClient";

export const getAllAdminPayments = async () => {
  const response = await apiClient.get("/payments/admin/all");
  return response.data;
};

export const getAdminPaymentSummary = async () => {
  const response = await apiClient.get("/payments/admin/summary");
  return response.data;
};
