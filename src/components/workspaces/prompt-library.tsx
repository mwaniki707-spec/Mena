import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Library,
  Search,
  Plus,
  Copy,
  Check,
  Send,
  Star,
  Tag,
  Code2,
  PenTool,
  TrendingUp,
  Lightbulb,
  Cpu,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PromptItem = {
  id: string;
  title: string;
  category: "coding" | "writing" | "marketing" | "productivity" | "brainstorming" | "custom";
  prompt: string;
  description?: string;
  tags: string[];
  favorite?: boolean;
  builtin?: boolean;
};

const DEFAULT_PROMPTS: PromptItem[] = [
  {
    id: "p1",
    title: "Senior Full-Stack Code Reviewer",
    category: "coding",
    description: "Deep dive code review focusing on security, performance, clean architecture, and type safety.",
    prompt: "Act as an expert Staff Software Engineer. Please review the following code thoroughly. Analyze: 1) Potential runtime bugs & edge cases, 2) Security vulnerabilities, 3) Performance bottlenecks & memory leaks, 4) Architecture & readability. Provide concrete refactored snippets for any suggestions.",
    tags: ["typescript", "architecture", "security"],
    builtin: true,
    favorite: true,
  },
  {
    id: "p2",
    title: "Executive Summary & Key Takeaways",
    category: "productivity",
    description: "Distill complex reports, documents, or logs into crisp executive insights.",
    prompt: "Please analyze the attached document/text and provide: 1) A 2-sentence Executive Summary, 2) The Top 5 Key Takeaways (bulleted with bold headers), 3) Action items and next steps with assigned priorities, 4) Potential risks or unresolved questions.",
    tags: ["summary", "business", "analysis"],
    builtin: true,
    favorite: true,
  },
  {
    id: "p3",
    title: "Engaging Product Launch Copy",
    category: "marketing",
    description: "Write compelling, high-converting product launch copy for Twitter/X, LinkedIn, and Email.",
    prompt: "I am launching a new product. Write a multi-channel launch campaign: 1) A viral Twitter/X announcement thread (hook, value proposition, feature highlights, call to action), 2) A professional LinkedIn post focusing on the problem solved, 3) A high-converting email newsletter announcement with subject line options.",
    tags: ["marketing", "copywriting", "growth"],
    builtin: true,
  },
  {
    id: "p4",
    title: "Regex & Pattern Architect",
    category: "coding",
    description: "Generate and explain complex regular expressions with test cases.",
    prompt: "Create a clean, efficient regular expression for the following pattern requirement. Include: 1) The complete regex pattern, 2) A breakdown explanation of each capture group and modifier, 3) 5 matching positive test cases, 4) 5 non-matching negative test cases.",
    tags: ["regex", "parsing", "developer"],
    builtin: true,
  },
  {
    id: "p5",
    title: "First-Principles Mental Model Tutor",
    category: "brainstorming",
    description: "Break down difficult concepts using Feynman technique and analogies.",
    prompt: "Explain the following concept using First Principles and the Feynman technique. Explain it as if I'm a beginner, then gradually build up to advanced nuances. Use a vivid real-world analogy and test my understanding with 2 thought-provoking questions at the end.",
    tags: ["learning", "philosophy", "education"],
    builtin: true,
  },
  {
    id: "p6",
    title: "API Design & OpenAPI Schema Specifier",
    category: "coding",
    description: "Design elegant RESTful and GraphQL API schemas with edge-case handling.",
    prompt: "Design a clean RESTful API specification for the following business domain. Include resource endpoints, HTTP methods, request payloads, response codes, error formats, and pagination/filtering strategies.",
    tags: ["api", "backend", "openapi"],
    builtin: true,
  },
];

const CATEGORIES = [
  { id: "all", label: "All Prompts", icon: Library },
  { id: "coding", label: "Engineering", icon: Code2 },
  { id: "writing", label: "Writing", icon: PenTool },
  { id: "marketing", label: "Marketing", icon: TrendingUp },
  { id: "productivity", label: "Productivity", icon: Cpu },
  { id: "brainstorming", label: "Ideation", icon: Lightbulb },
  { id: "custom", label: "My Custom", icon: Tag },
];

export function PromptLibrary({
  onUsePrompt,
  onSelectPrompt,
}: {
  onUsePrompt?: (promptText: string) => void;
  onSelectPrompt?: (promptText: string) => void;
}) {
  const handleUse = onSelectPrompt ?? onUsePrompt;
  const [prompts, setPrompts] = useState<PromptItem[]>(() => {
    try {
      const saved = localStorage.getItem("mena:prompt_library");
      return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
    } catch {
      return DEFAULT_PROMPTS;
    }
  });

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New/Edit Prompt dialog
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<PromptItem["category"]>("coding");
  const [formDescription, setFormDescription] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formTags, setFormTags] = useState("");

  const savePrompts = (newPrompts: PromptItem[]) => {
    setPrompts(newPrompts);
    try {
      localStorage.setItem("mena:prompt_library", JSON.stringify(newPrompts));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchesCategory = activeCategory === "all" || p.category === activeCategory;
      if (!matchesCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [prompts, activeCategory, search]);

  const handleCopy = (item: PromptItem) => {
    navigator.clipboard.writeText(item.prompt);
    setCopiedId(item.id);
    toast.success("Prompt copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleFavorite = (id: string) => {
    const updated = prompts.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p));
    savePrompts(updated);
  };

  const handleOpenAddDialog = () => {
    setEditingPrompt(null);
    setFormTitle("");
    setFormCategory("coding");
    setFormDescription("");
    setFormPrompt("");
    setFormTags("");
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (item: PromptItem) => {
    setEditingPrompt(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormDescription(item.description || "");
    setFormPrompt(item.prompt);
    setFormTags(item.tags.join(", "));
    setIsDialogOpen(true);
  };

  const handleSavePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPrompt.trim()) {
      toast.error("Please fill in Title and Prompt");
      return;
    }

    const tagsArray = formTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (editingPrompt) {
      const updated = prompts.map((p) =>
        p.id === editingPrompt.id
          ? {
              ...p,
              title: formTitle.trim(),
              category: formCategory,
              description: formDescription.trim(),
              prompt: formPrompt.trim(),
              tags: tagsArray,
            }
          : p,
      );
      savePrompts(updated);
      toast.success("Prompt updated!");
    } else {
      const newPrompt: PromptItem = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        category: formCategory,
        description: formDescription.trim(),
        prompt: formPrompt.trim(),
        tags: tagsArray,
        builtin: false,
      };
      savePrompts([newPrompt, ...prompts]);
      toast.success("New prompt saved to library!");
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = prompts.filter((p) => p.id !== id);
    savePrompts(updated);
    toast.success("Prompt removed from library");
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 text-foreground">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <div className="gradient-brand grid h-8 w-8 place-items-center rounded-xl shadow-md">
              <Library className="h-4 w-4 text-white" />
            </div>
            Prompt & Context Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Curated system prompts, cognitive frameworks, and custom user templates ready to deploy.
          </p>
        </div>

        <Button onClick={handleOpenAddDialog} className="gradient-send gap-1.5 rounded-xl shadow-sm">
          <Plus className="h-4 w-4" /> Create Prompt
        </Button>
      </div>

      {/* Filter Row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates & tags..."
            className="h-9 pl-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Grid of Prompts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPrompts.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground line-clamp-1">{item.title}</h2>
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(item.id)}
                  className="text-muted-foreground hover:text-amber-400 transition"
                  title="Favorite"
                >
                  <Star className={cn("h-4 w-4", item.favorite && "fill-amber-400 text-amber-400")} />
                </button>
              </div>

              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
              )}

              <div className="rounded-xl border border-border/50 bg-background/80 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
                {item.prompt}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 pt-1">
                {item.tags.map((t) => (
                  <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Action footer */}
            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
              <div className="flex items-center gap-1">
                {!item.builtin && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEditDialog(item)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(item)}
                  className="h-7 gap-1 px-2.5 text-xs rounded-lg"
                >
                  {copiedId === item.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copiedId === item.id ? "Copied" : "Copy"}
                </Button>
                {handleUse && (
                  <Button
                    size="sm"
                    onClick={() => handleUse(item.prompt)}
                    className="gradient-send h-7 gap-1 px-2.5 text-xs rounded-lg shadow-xs"
                  >
                    <Send className="h-3 w-3" /> Deploy
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? "Edit Prompt" : "Create New Prompt"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePrompt} className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="prompt-title">Title</Label>
              <Input
                id="prompt-title"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Python Async Code Generator"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prompt-cat">Category</Label>
              <select
                id="prompt-cat"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="coding">Engineering & Code</option>
                <option value="writing">Writing & Copy</option>
                <option value="marketing">Marketing & Growth</option>
                <option value="productivity">Productivity & Analysis</option>
                <option value="brainstorming">Ideation & Mental Models</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prompt-desc">Short Description (Optional)</Label>
              <Input
                id="prompt-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief summary of what this prompt accomplishes"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prompt-body">Prompt Content</Label>
              <Textarea
                id="prompt-body"
                required
                rows={5}
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="Act as an expert... Provide output in the following format:"
                className="text-sm font-mono leading-relaxed"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prompt-tags">Tags (comma-separated)</Label>
              <Input
                id="prompt-tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="python, async, backend"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save to Library</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
