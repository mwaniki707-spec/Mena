import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HardDrive, FolderOpen, FileText, Upload as UploadIcon, RefreshCw, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleDriveFile {
  id: string;
  name: string;
  type: "file" | "folder";
  mimeType?: string;
  size?: number;
}

interface GoogleDriveProps {
  onFileSelect: (file: GoogleDriveFile) => void;
  className?: string;
}

export function GoogleDrive({ onFileSelect, className }: GoogleDriveProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [apiKey, setApiKey] = useState("");

  const connectToDrive = async () => {
    if (!apiKey.trim()) {
      alert("Please enter your Google API key");
      return;
    }
    setIsLoading(true);
    // Simulate connection - in real implementation, use Google Drive API
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
      // Mock files
      setFiles([
        { id: "1", name: "Documents", type: "folder" },
        { id: "2", name: "Images", type: "folder" },
        { id: "3", name: "report.pdf", type: "file", mimeType: "application/pdf", size: 1024000 },
        { id: "4", name: "presentation.pptx", type: "file", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", size: 2048000 },
        { id: "5", name: "data.csv", type: "file", mimeType: "text/csv", size: 51200 },
      ]);
    }, 1000);
  };

  const disconnect = () => {
    setIsConnected(false);
    setFiles([]);
    setCurrentPath("");
  };

  const refreshFiles = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const handleFileClick = (file: GoogleDriveFile) => {
    if (file.type === "folder") {
      setCurrentPath(file.name);
      // In real implementation, fetch folder contents
    } else {
      onFileSelect(file);
      setIsOpen(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <HardDrive className="h-4 w-4" />
          Google Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Google Drive
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isConnected ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Google API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your Google API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from Google Cloud Console
                </p>
              </div>
              <Button
                onClick={connectToDrive}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <HardDrive className="h-4 w-4 mr-2" />
                    Connect to Drive
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  {currentPath || "My Drive"}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshFiles}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnect}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-2">
                  {files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No files found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => handleFileClick(file)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        >
                          {file.type === "folder" ? (
                            <FolderOpen className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.type === "folder" ? "Folder" : formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Button variant="outline" className="w-full gap-2">
                <UploadIcon className="h-4 w-4" />
                Upload File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GoogleDrive;

