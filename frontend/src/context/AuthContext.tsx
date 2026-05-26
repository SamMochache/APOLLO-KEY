import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { authService } from "../services/authService";
import { jwtDecode } from "jwt-decode";

type User = Record<string, any> | null;

interface AuthContextType {
  user: User;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    password2: string,
    role?: string
  ) => Promise<any>;
  logout: () => void;
  loading: boolean;
  fetchUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(() => {
    try {
      const token = localStorage.getItem("access_token");
      return token ? (jwtDecode(token) as User) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUserProfile = async () => {
    try {
      const data = await authService.getCurrentUser();
      setUser(data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    password2: string,
    role?: string
  ) => {
    setLoading(true);
    try {
      const resolvedRole = (role ?? 'parent') as any;
      const data = await authService.register({ email, username, password, password2, role: resolvedRole });
      return data;
    } catch (err: any) {
      throw err.response?.data || err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      const { access, refresh } = res;
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      await fetchUserProfile();
    } catch (err: any) {
      console.error("Login failed:", err);
      throw err.response?.data || err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await authService.refresh(refresh);
          const newAccess = res.access;
          localStorage.setItem("access_token", newAccess);

          await fetchUserProfile();
        } catch (err) {
          console.warn("Auto refresh failed:", err);
          logout();
        }
      }
    }, 1000 * 60 * 25);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      fetchUserProfile();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
        fetchUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export default AuthProvider;
