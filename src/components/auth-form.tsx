import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getPasswordRequirementsStatus, validateEmail, validateName, validatePassword } from "@/lib/auth-validation";
import { Check, Eye, EyeOff, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type AuthFormProps = {
  defaultMode?: "signin" | "signup" | "forgot";
  onSuccess?: () => void;
  className?: string;
};

export function AuthForm({ defaultMode = "signin", onSuccess, className }: AuthFormProps) {
  const { signIn, signUp, signInWithGoogle, forgotPassword, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(defaultMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordStatus = getPasswordRequirementsStatus(password);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "forgot") {
        if (!resetToken) {
          const res = await forgotPassword(email);
          if (res.resetToken) {
            setResetToken(res.resetToken);
            setMessage(`Reset token generated: ${res.resetToken}. Enter your new password below.`);
          } else {
            setMessage("If an account exists, instructions token was sent.");
          }
        } else {
          await resetPassword(resetToken, newPassword);
          setMessage("Password reset successfully! You can now sign in.");
          setMode("signin");
          setPassword("");
        }
        return;
      }

      if (mode === "signup") {
        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) {
          setError(emailCheck.error || "Invalid email");
          return;
        }

        const nameCheck = validateName(name);
        if (!nameCheck.valid) {
          setError(nameCheck.error || "Invalid name");
          return;
        }

        const passCheck = validatePassword(password);
        if (!passCheck.valid) {
          setError(passCheck.error || "Password does not meet requirements");
          return;
        }

        await signUp(email, name, password);
        onSuccess?.();
      } else {
        await signIn(email, password);
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset Password"}
        </h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              mode === "signin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              mode === "signup" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
          >
            Sign up
          </button>
        </div>
      </div>

      {mode !== "forgot" && (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2 rounded-xl py-2.5 text-sm"
          onClick={signInWithGoogle}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </Button>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-border/80 bg-background/50 p-4">
          <div className="grid gap-1">
            <Label htmlFor="form-email" className="text-xs">Email</Label>
            <Input
              id="form-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {mode === "signup" && (
            <div className="grid gap-1">
              <Label htmlFor="form-name" className="text-xs">Name</Label>
              <Input
                id="form-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            </div>
          )}

          {mode !== "forgot" && (
            <div className="grid gap-1">
              <Label htmlFor="form-password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="form-password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === "forgot" && resetToken && (
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label htmlFor="form-reset-token" className="text-xs">Reset Token</Label>
                <Input id="form-reset-token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="form-reset-new-password" className="text-xs">New Password</Label>
                <Input
                  id="form-reset-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                />
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div className="mt-1 space-y-1.5 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
              <p className="font-medium text-foreground">Password requirements:</p>
              <div className="grid gap-1 text-muted-foreground">
                <div className={cn("flex items-center gap-1.5", passwordStatus.minLength ? "text-emerald-500 font-medium" : "")}>
                  {passwordStatus.minLength ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
                  <span>At least 8 characters long</span>
                </div>
                <div className={cn("flex items-center gap-1.5", passwordStatus.hasUppercase ? "text-emerald-500 font-medium" : "")}>
                  {passwordStatus.hasUppercase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
                  <span>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div className={cn("flex items-center gap-1.5", passwordStatus.hasLowercase ? "text-emerald-500 font-medium" : "")}>
                  {passwordStatus.hasLowercase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
                  <span>At least 1 lowercase letter (a-z)</span>
                </div>
                <div className={cn("flex items-center gap-1.5", passwordStatus.hasNumber ? "text-emerald-500 font-medium" : "")}>
                  {passwordStatus.hasNumber ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
                  <span>At least 1 number (0-9)</span>
                </div>
                <div className={cn("flex items-center gap-1.5", passwordStatus.hasSpecialChar ? "text-emerald-500 font-medium" : "")}>
                  {passwordStatus.hasSpecialChar ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
                  <span>At least 1 special character (!@#$%^&*)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {message && <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-foreground">{message}</div>}
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}

        <div className="flex flex-col gap-2.5">
          <Button type="submit" disabled={loading} className="w-full rounded-xl py-2.5">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : resetToken ? "Reset Password" : "Get Reset Token"}
          </Button>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <button
              type="button"
              className="underline-offset-4 hover:text-foreground"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setMessage(null);
              }}
            >
              {mode === "signin" ? "Create an account" : "Already have an account? Sign in"}
            </button>
            {mode === "signin" && (
              <button
                type="button"
                className="underline-offset-4 hover:text-foreground"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setMessage(null);
                }}
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
