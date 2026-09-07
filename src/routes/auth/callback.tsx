import { useEffect } from "react";
import { useNavigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");
    if (!idToken) {
      navigate({ to: "/auth" });
      return;
    }

    fetch("/auth/oauth-callback", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("OAuth callback failed");
        return res.json();
      })
      .then(() => {
        navigate({ to: "/" });
      })
      .catch(() => {
        navigate({ to: "/auth" });
      });
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xl text-center">
        <p>Signing you in...</p>
      </div>
    </div>
  );
}
