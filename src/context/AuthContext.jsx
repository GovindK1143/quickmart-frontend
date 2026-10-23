import { useEffect, useState } from "react";
import { login as loginApi, getCurrentUser } from "../services/authService";
import { storage } from "../utils/storage";
import { AuthContext } from "./authContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getUser());
  const [loading, setLoading] = useState(true);
  const [logoutInProgress, setLogoutInProgress] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = storage.getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await getCurrentUser();

        const storedUser = storage.getUser();

        if (storedUser) {
          setUser(storedUser);
        } else {
          storage.clear();
          setUser(null);
        }
      } catch {
        storage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    const loginResponse = await loginApi(username, password);

    storage.setToken(loginResponse.token);

    const loggedInUser = {
      userId: loginResponse.userId,
      name: loginResponse.name,
      email: loginResponse.email,
      mobile: loginResponse.mobile,
      role: loginResponse.role,
    };

    storage.setUser(loggedInUser);
    setLogoutInProgress(false);
    setUser(loggedInUser);

    return loggedInUser;
  };

  const logout = () => {
    setLogoutInProgress(true);
    storage.clear();
    setUser(null);
  };

  const updateUser = (updates) => {
    if (!user) {
      return null;
    }

    const updatedUser = {
      ...user,
      ...updates,
    };

    storage.setUser(updatedUser);
    setUser(updatedUser);

    return updatedUser;
  };

  const value = {
    user,
    loading,
    logoutInProgress,
    isAuthenticated: Boolean(user && storage.getToken()),
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
