import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type User = {
  id: number;
  email: string;
  name: string;
  googleId?: string | null;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, name: string, password: string) => Promise<User>;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<User>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/auth/user", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data.user as User | null;
      })
      .then((currentUser) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetch("/auth/signin", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: "Sign in failed" }));
      throw new Error(body.message || "Sign in failed");
    }
    const data = await res.json();
    setUser(data.user as User);
    return data.user as User;
  };

  const signUp = async (email: string, name: string, password: string) => {
    const res = await fetch("/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: "Sign up failed" }));
      throw new Error(body.message || "Sign up failed");
    }
    const data = await res.json();
    setUser(data.user as User);
    return data.user as User;
  };

  const signOut = async () => {
    await fetch("/auth/signout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  const updateProfile = async (name: string) => {
    const res = await fetch("/auth/update-profile", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: "Update failed" }));
      throw new Error(body.message || "Failed to update profile");
    }
    const data = await res.json();
    setUser(data.user as User);
    return data.user as User;
  };

  const changePassword = async (newPassword: string, currentPassword?: string) => {
    const res = await fetch("/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: "Failed to change password" }));
      throw new Error(body.message || "Failed to change password");
    }
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch("/auth/forgot-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data as { resetToken?: string };
  };

  const resetPassword = async (token: string, newPassword: string) => {
    const res = await fetch("/auth/reset-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: "Failed to reset password" }));
      throw new Error(body.message || "Failed to reset password");
    }
  };

  const signInWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      prompt: "select_account",
      nonce: crypto.randomUUID(),
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInWithGoogle, signOut, updateProfile, changePassword, forgotPassword, resetPassword }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
