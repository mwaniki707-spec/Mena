import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth-form";

export function AuthModal() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {user ? "Account" : "Login (optional)"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="sr-only">
          <DialogTitle>{user ? `Account Settings` : "Authentication"}</DialogTitle>
        </DialogHeader>

        {user ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Signed in as <strong className="text-foreground">{user.email}</strong>
            </div>
            <Button variant="outline" onClick={signOut} className="w-full rounded-xl">
              Sign out
            </Button>
          </div>
        ) : (
          <AuthForm onSuccess={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
