import apiClient from "./apiClient";

export const getAllProducts = async () => {
  const response = await apiClient.get("/products/all");

  return response.data;
};

export const getProductsByCategory = async (category) => {
  const response = await apiClient.get(
    `/products/category/${encodeURIComponent(category)}`,
  );

  return response.data;
};

export const getProductById = async (productId) => {
  const response = await apiClient.get(`/products/id/${productId}`);

  return response.data;
};

export const searchProducts = async (keyword) => {
  const response = await apiClient.get("/products/search", {
    params: {
      keyword,
    },
  });

  return response.data;
};
