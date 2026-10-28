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

export const getActiveCategories = async () => {
  const response = await apiClient.get("/products/categories");
  return response.data;
};

export const getFeaturedProducts = async () => {
  const response = await apiClient.get("/products/featured");
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

export const getAllAdminProducts = async () => {
  const response = await apiClient.get("/products/admin/all");
  return response.data;
};

export const createProduct = async (product) => {
  const response = await apiClient.post("/products/add", product);
  return response.data;
};

export const updateProduct = async (productId, product) => {
  const response = await apiClient.put(`/products/${productId}`, product);
  return response.data;
};

export const updateProductStatus = async (productId, active) => {
  const response = await apiClient.patch(
    `/products/${productId}/status`,
    null,
    {
      params: { active },
    },
  );

  return response.data;
};

export const createProductsBulk = async (products) => {
  const response = await apiClient.post("/products/add/bulk", products);
  return response.data;
};
