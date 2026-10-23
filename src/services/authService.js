import apiClient from "./apiClient";

export const login = async (username, password) => {
  const response = await apiClient.post("/auth/login", {
    username,
    password,
  });

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");

  return response.data;
};

export async function registerUser(registrationData) {
  const response = await apiClient.post("/auth/register", registrationData);

  return response.data;
}

export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await apiClient.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });

  return response.data;
};
