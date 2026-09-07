import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, ExternalLink, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailData {
  to: string;
  subject: string;
  body: string;
  attachments: File[];
}

interface EmailToolProps {
  onSendEmail: (email: EmailData) => void;
  className?: string;
}

export function EmailTool({ onSendEmail, className }: EmailToolProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const oauthUrl = useMemo(() => {
    const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
    const redirectUri = (import.meta.env.VITE_GOOGLE_REDIRECT_URI || window.location.origin).trim();

    if (!clientId) {
      return null;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      access_type: "offline",
      prompt: "consent",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, []);

  const handleConnect = async () => {
    if (!oauthUrl) {
      alert("Google OAuth is not configured yet. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_REDIRECT_URI.");
      return;
    }

    setIsConnecting(true);

    const emailData: EmailData = {
      to: "gmail",
      subject: "Google OAuth requested",
      body: "User initiated Google account connection for email access.",
      attachments: [],
    };

    await new Promise((resolve) => setTimeout(resolve, 800));

    onSendEmail(emailData);
    setIsConnected(true);
    setIsConnecting(false);
    setIsOpen(false);

    window.open(oauthUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Mail className="h-4 w-4" />
          Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your Google account to use email features with Google OAuth.
          </p>

          {isConnected ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Email connected successfully.
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-accent/30 p-4 text-sm">
              <p className="font-medium">Connect your email</p>
              <p className="mt-1 text-muted-foreground">
                Use the button below to connect your Google account through OAuth.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>
              Close
            </Button>
            {!isConnected && (
              <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
                {isConnecting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Connect Email
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EmailTool;

