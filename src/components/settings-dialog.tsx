import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/react-tabs";
import { Settings, Trash2, Plus, KeyRound, User, Palette, Cpu, Check } from "lucide-react";
import { useAvailableModels } from "@/hooks/use-threads";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_BASE_URLS,
  PROVIDER_LABELS,
  type ModelProvider,
} from "@/lib/models";

const ACCENT_COLORS = [
  { name: "Default (Indigo)", value: "indigo", colorClass: "bg-indigo-500" },
  { name: "Emerald", value: "emerald", colorClass: "bg-emerald-500" },
  { name: "Violet", value: "violet", colorClass: "bg-violet-500" },
  { name: "Rose", value: "rose", colorClass: "bg-rose-500" },
  { name: "Amber", value: "amber", colorClass: "bg-amber-500" },
];

export function SettingsDialog() {
  const { models, addModel, removeModel } = useAvailableModels();
  const { user, updateProfile, changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("models");

  // Model state
  const [label, setLabel] = useState("");
  const [id, setId] = useState("");
  const [provider, setProvider] = useState<ModelProvider>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Profile state
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [passStatus, setPassStatus] = useState<string | null>(null);
  const [accent, setAccent] = useState(() => localStorage.getItem("mena_accent_color") || "indigo");

  const canAdd = !!id.trim() && !!label.trim() && !!apiKey.trim();

  const handleAdd = () => {
    if (!canAdd) return;
    addModel({
      id: id.trim(),
      label: label.trim(),
      provider,
      baseUrl: baseUrl.trim() || undefined,
      apiKey: apiKey.trim(),
    });
    setId("");
    setLabel("");
    setProvider("openai");
    setBaseUrl("");
    setApiKey("");
  };

  const handleUpdateProfile = async () => {
    try {
      setProfileStatus(null);
      await updateProfile(profileName);
      setProfileStatus("Profile updated successfully!");
    } catch (err: any) {
      setProfileStatus(err.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    try {
      setPassStatus(null);
      await changePassword(newPass, currentPass);
      setPassStatus("Password changed successfully!");
      setCurrentPass("");
      setNewPass("");
    } catch (err: any) {
      setPassStatus(err.message || "Failed to change password");
    }
  };

  const handleAccentChange = (val: string) => {
    setAccent(val);
    localStorage.setItem("mena_accent_color", val);
    document.documentElement.setAttribute("data-accent", val);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage AI models, user account profile, and app preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b pb-2">
          <div className="flex gap-2 text-sm font-medium">
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${activeTab === "models" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setActiveTab("models")}
            >
              <Cpu className="h-4 w-4" /> Models
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${activeTab === "account" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setActiveTab("account")}
            >
              <User className="h-4 w-4" /> Account & Profile
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${activeTab === "appearance" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setActiveTab("appearance")}
            >
              <Palette className="h-4 w-4" /> Appearance
            </button>
          </div>
        </div>

        {activeTab === "models" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2 max-h-56 overflow-auto scrollbar-thin pr-1">
              {models.filter((m) => !m.builtin).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{m.label}</span>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {PROVIDER_LABELS[m.provider ?? "openai"]}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.id}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.baseUrl ?? DEFAULT_BASE_URLS[m.provider ?? "openai"]}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <KeyRound className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.apiKey ? maskKey(m.apiKey) : "No API key"}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeModel(m.id)}
                    aria-label={`Remove ${m.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {models.filter((m) => !m.builtin).length === 0 && (
                <p className="text-xs text-muted-foreground">Mena default model loaded. Add custom models below if needed.</p>
              )}
            </div>

            <div className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="model-label">Display name</Label>
                  <Input id="model-label" placeholder="Gemini 3 Flash" value={label} onChange={(e) => setLabel(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="model-id">Model ID</Label>
                  <Input id="model-id" placeholder="gpt-4o" value={id} onChange={(e) => setId(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="model-provider">API type</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as ModelProvider)}>
                    <SelectTrigger id="model-provider" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PROVIDER_LABELS) as ModelProvider[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PROVIDER_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="model-key">API key</Label>
                  <Input
                    id="model-key"
                    type="password"
                    autoComplete="off"
                    placeholder="sk-…"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleAdd} disabled={!canAdd}>
                <Plus className="mr-1 h-4 w-4" /> Add model
              </Button>
            </DialogFooter>
          </div>
        )}

        {activeTab === "account" && (
          <div className="space-y-4 pt-2">
            {user ? (
              <>
                <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Logged in account:</p>
                  <p className="font-semibold text-foreground">{user.email}</p>
                </div>

                <div className="space-y-3 rounded-xl border p-3">
                  <p className="text-sm font-semibold">Update Profile</p>
                  <div className="space-y-1">
                    <Label htmlFor="profile-name">Display Name</Label>
                    <Input id="profile-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                  </div>
                  {profileStatus && <p className="text-xs font-medium text-emerald-500">{profileStatus}</p>}
                  <Button size="sm" onClick={handleUpdateProfile}>Save Name</Button>
                </div>

                <div className="space-y-3 rounded-xl border p-3">
                  <p className="text-sm font-semibold">Change Password</p>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="current-pass">Current Password</Label>
                      <Input id="current-pass" type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-pass">New Password</Label>
                      <Input id="new-pass" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                    </div>
                  </div>
                  {passStatus && <p className="text-xs font-medium text-emerald-500">{passStatus}</p>}
                  <Button size="sm" onClick={handleChangePassword} disabled={!newPass}>Update Password</Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                You are currently browsing as a guest. Log in to manage account settings and saved preferences.
              </div>
            )}
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Theme Accent Color</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    className={`flex items-center justify-between rounded-xl border p-3 text-sm transition ${accent === c.value ? "border-primary bg-muted/60 font-semibold" : "hover:bg-muted/30"}`}
                    onClick={() => handleAccentChange(c.value)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-4 w-4 rounded-full ${c.colorClass}`} />
                      <span>{c.name}</span>
                    </div>
                    {accent === c.value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function maskKey(key: string) {
  if (key.length <= 4) return "••••";
  return `••••${key.slice(-4)}`;
}
