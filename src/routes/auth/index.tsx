import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [{ title: "Mena — Login / Signup" }],
  }),
  component: AuthIndex,
});

function AuthIndex() {
  const navigate = useNavigate();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
        <AuthForm onSuccess={() => navigate({ to: "/" })} />
      </div>
    </main>
  );
}
