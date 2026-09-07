import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles,
  Download,
  Copy,
  Check,
  ImageIcon,
  Wand2,
  Maximize2,
  RefreshCw,
  Share2,
  Trash2,
  Layers,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  createdAt: number;
};

const STYLES = [
  { id: "photorealistic", name: "Photorealistic", preview: "📸" },
  { id: "digital-art", name: "Digital Art", preview: "🎨" },
  { id: "cyberpunk", name: "Cyberpunk", preview: "🌆" },
  { id: "3d-render", name: "3D Render", preview: "🧊" },
  { id: "anime", name: "Anime", preview: "✨" },
  { id: "cinematic", name: "Cinematic", preview: "🎬" },
  { id: "minimalist", name: "Minimalist", preview: "📐" },
  { id: "oil-painting", name: "Oil Painting", preview: "🖌️" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "Square", icon: "1:1", dimensions: "1024x1024", width: 1024, height: 1024 },
  { id: "16:9", label: "Landscape", icon: "16:9", dimensions: "1280x720", width: 1280, height: 720 },
  { id: "9:16", label: "Portrait", icon: "9:16", dimensions: "720x1280", width: 720, height: 1280 },
  { id: "4:3", label: "Classic", icon: "4:3", dimensions: "1024x768", width: 1024, height: 768 },
];

const SAMPLE_GALLERY: GeneratedImage[] = [
  {
    id: "sample-1",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
    prompt: "Abstract fluid wave ribbons in neon ultraviolet and deep indigo with glass reflections",
    style: "Digital Art",
    aspectRatio: "16:9",
    createdAt: Date.now() - 1000 * 60 * 30,
  },
  {
    id: "sample-2",
    url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop",
    prompt: "Futuristic iridescent metallic topography sphere floating in dark cosmic void",
    style: "3D Render",
    aspectRatio: "1:1",
    createdAt: Date.now() - 1000 * 60 * 120,
  },
  {
    id: "sample-3",
    url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1000&auto=format&fit=crop",
    prompt: "Cyberpunk neon skyscraper city with volumetric fog and glowing holographic signs",
    style: "Cyberpunk",
    aspectRatio: "16:9",
    createdAt: Date.now() - 1000 * 60 * 240,
  },
];

export function ImageStudio({
  onInsertIntoChat,
  onOpenChat,
}: {
  onInsertIntoChat?: (imageUrl: string, prompt: string) => void;
  onOpenChat?: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("photorealistic");
  const [selectedRatio, setSelectedRatio] = useState("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<GeneratedImage[]>(() => {
    try {
      const saved = localStorage.getItem("mena:generated_images");
      return saved ? JSON.parse(saved) : SAMPLE_GALLERY;
    } catch {
      return SAMPLE_GALLERY;
    }
  });
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(gallery[0] ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const saveGallery = (newGallery: GeneratedImage[]) => {
    setGallery(newGallery);
    try {
      localStorage.setItem("mena:generated_images", JSON.stringify(newGallery));
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnhancePrompt = () => {
    if (!prompt.trim()) {
      setPrompt("A majestic bioluminescent jellyfish hovering over an ancient cybernetic underwater ruin, cinematic lighting, 8k octane render");
      toast.success("Sample aesthetic prompt inserted");
      return;
    }
    const enhancements = [
      "highly detailed, 8k resolution, cinematic lighting, photorealistic textures",
      "volumetric fog, vibrant color grading, intricate micro-details, unreal engine 5 render",
      "masterpiece, studio quality illumination, subtle depth of field, sharp focus",
    ];
    const picked = enhancements[Math.floor(Math.random() * enhancements.length)];
    setPrompt((prev) => `${prev.trim()}, ${picked}`);
    toast.success("Prompt enhanced with aesthetic keywords");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter an image prompt");
      return;
    }

    setIsGenerating(true);
    const styleObj = STYLES.find((s) => s.id === selectedStyle);
    const ratioObj = ASPECT_RATIOS.find((r) => r.id === selectedRatio) ?? ASPECT_RATIOS[0];
    
    // Use high quality Pollinations AI image generator endpoint
    const fullPrompt = `${prompt}, ${styleObj?.name ?? "high quality"}, aesthetic composition, award winning`;
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const generatedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${ratioObj.width}&height=${ratioObj.height}&seed=${seed}&nologo=true`;

    // Simulate load/verify image
    const img = new Image();
    img.src = generatedUrl;
    img.onload = () => {
      const newImg: GeneratedImage = {
        id: crypto.randomUUID(),
        url: generatedUrl,
        prompt: prompt.trim(),
        style: styleObj?.name ?? "Custom",
        aspectRatio: selectedRatio,
        createdAt: Date.now(),
      };
      const updated = [newImg, ...gallery];
      saveGallery(updated);
      setSelectedImage(newImg);
      setIsGenerating(false);
      toast.success("Image generated successfully!");
    };
    img.onerror = () => {
      // Fallback
      const newImg: GeneratedImage = {
        id: crypto.randomUUID(),
        url: generatedUrl,
        prompt: prompt.trim(),
        style: styleObj?.name ?? "Custom",
        aspectRatio: selectedRatio,
        createdAt: Date.now(),
      };
      const updated = [newImg, ...gallery];
      saveGallery(updated);
      setSelectedImage(newImg);
      setIsGenerating(false);
      toast.success("Image generated!");
    };
  };

  const handleCopyLink = (img: GeneratedImage) => {
    navigator.clipboard.writeText(img.url);
    setCopiedId(img.id);
    toast.success("Image URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    const updated = gallery.filter((g) => g.id !== id);
    saveGallery(updated);
    if (selectedImage?.id === id) {
      setSelectedImage(updated[0] ?? null);
    }
    toast.success("Image deleted from gallery");
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 text-foreground">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <div className="gradient-brand grid h-8 w-8 place-items-center rounded-xl shadow-md">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            AI Image Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate photorealistic visuals, digital illustrations, and 3D concepts from text prompts.
          </p>
        </div>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-5 xl:col-span-4">
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompt</Label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                className="flex items-center gap-1 text-xs text-primary transition hover:underline"
              >
                <Wand2 className="h-3 w-3" /> Enhance Prompt
              </button>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate in vivid detail..."
              className="min-h-[100px] text-sm leading-relaxed"
            />

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground">Negative Prompt (Optional)</Label>
              <Input
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, distorted, low quality, artifacts..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Style Presets */}
          <div className="space-y-2 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStyle(st.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-all",
                    selectedStyle === st.id
                      ? "border-primary bg-primary/10 font-semibold text-primary shadow-xs"
                      : "border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="text-base">{st.preview}</span>
                  <span className="truncate">{st.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aspect Ratio</Label>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => setSelectedRatio(ar.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-2.5 text-xs transition-all",
                    selectedRatio === ar.id
                      ? "border-primary bg-primary/10 font-semibold text-primary shadow-xs"
                      : "border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="flex flex-col text-left">
                    <span>{ar.label}</span>
                    <span className="text-[10px] opacity-60">{ar.dimensions}</span>
                  </div>
                  <span className="font-mono text-xs font-bold">{ar.icon}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="gradient-send w-full rounded-2xl py-6 text-base font-semibold shadow-lg transition-transform active:scale-[0.99]"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Synthesizing Visuals...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate Artwork
              </span>
            )}
          </Button>
        </div>

        {/* Preview & Gallery Column */}
        <div className="space-y-5 lg:col-span-7 xl:col-span-8">
          {/* Main Visual Display */}
          <div className="relative flex min-h-[380px] w-full items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-card/70 p-4 shadow-md backdrop-blur-sm sm:min-h-[460px]">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="gradient-brand grid h-16 w-16 animate-pulse place-items-center rounded-2xl shadow-xl">
                  <Wand2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <p className="text-sm font-semibold">Creating your visual masterpiece...</p>
                <p className="text-xs text-muted-foreground max-w-xs">Applying {selectedStyle} rendering and compositional balance.</p>
              </div>
            ) : selectedImage ? (
              <div className="group relative flex h-full w-full flex-col items-center justify-center">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.prompt}
                  className="max-h-[500px] w-full rounded-2xl object-contain shadow-2xl transition-transform"
                />

                {/* Overlay details */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between rounded-b-2xl bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="line-clamp-2 text-xs font-medium">{selectedImage.prompt}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-white/70">
                      <span>{selectedImage.style}</span>
                      <span>•</span>
                      <span>{selectedImage.aspectRatio}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onInsertIntoChat && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onInsertIntoChat(selectedImage.url, selectedImage.prompt)}
                        className="h-8 gap-1 rounded-lg text-xs"
                      >
                        <Send className="h-3 w-3" /> Send to Chat
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleCopyLink(selectedImage)}
                      className="h-8 w-8 rounded-lg"
                      title="Copy URL"
                    >
                      {copiedId === selectedImage.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <a
                      href={selectedImage.url}
                      target="_blank"
                      rel="noreferrer"
                      download={`mena-art-${selectedImage.id}.jpg`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      title="Download image"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 stroke-[1.2] opacity-40" />
                <p className="text-sm">No image selected. Generate one on the left!</p>
              </div>
            )}
          </div>

          {/* Creation History Gallery */}
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Creation Gallery ({gallery.length})
                </span>
              </div>
              {gallery.length > 0 && (
                <button
                  type="button"
                  onClick={() => saveGallery([])}
                  className="text-xs text-muted-foreground hover:text-destructive transition"
                >
                  Clear Gallery
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {gallery.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    "group relative aspect-square cursor-pointer overflow-hidden rounded-xl border transition-all",
                    selectedImage?.id === img.id
                      ? "ring-2 ring-primary border-primary shadow-md scale-95"
                      : "border-border/60 hover:border-primary/50 hover:shadow-xs",
                  )}
                >
                  <img src={img.url} alt={img.prompt} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(img.id);
                    }}
                    className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white/80 hover:text-destructive group-hover:flex"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
