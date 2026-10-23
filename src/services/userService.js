import apiClient from "./apiClient";

export async function getMyProfile() {
  const response = await apiClient.get("/users/me");
  return response.data;
}

export async function updateMyProfile(profileData) {
  const response = await apiClient.put("/users/me", profileData);
  return response.data;
}

export async function getMyAddresses() {
  const response = await apiClient.get("/users/me/addresses");
  return response.data;
}

export async function createMyAddress(addressData) {
  const response = await apiClient.post("/users/me/addresses", addressData);
  return response.data;
}

export async function updateMyAddress(addressId, addressData) {
  const response = await apiClient.put(
    `/users/me/addresses/${addressId}`,
    addressData,
  );
  return response.data;
}

export async function setMyDefaultAddress(addressId) {
  const response = await apiClient.put(
    `/users/me/addresses/${addressId}/default`,
  );
  return response.data;
}

export async function deleteMyAddress(addressId) {
  await apiClient.delete(`/users/me/addresses/${addressId}`);
}
