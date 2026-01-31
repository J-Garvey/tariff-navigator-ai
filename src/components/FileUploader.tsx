import { useState, useCallback, forwardRef } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  description?: string;
}

export const FileUploader = forwardRef<HTMLDivElement, FileUploaderProps>(
  ({ onFileSelect, selectedFile, description }, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const removeFile = () => {
    onFileSelect(null);
    setError(null);
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/50 border border-primary/20">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {selectedFile.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={removeFile}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remove file"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    );
  }
  return (
    <div ref={ref} className="space-y-2">
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-accent/30",
          error && "border-destructive/50"
        )}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Upload PDF file"
        />
        
        <div className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-200",
          isDragging ? "bg-primary/20" : "bg-accent group-hover:bg-primary/10"
        )}>
          <Upload className={cn(
            "w-6 h-6 transition-all duration-200",
            isDragging ? "text-primary scale-110" : "text-muted-foreground group-hover:text-primary"
          )} />
        </div>
        
        <p className="text-base font-medium text-foreground mb-1">
          {isDragging ? "Drop your PDF here" : (description || "Drop PDF here or click to upload")}
        </p>
        <p className="text-sm text-muted-foreground">
          PDF files only, max 10MB
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

FileUploader.displayName = "FileUploader";
