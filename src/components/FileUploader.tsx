// FileUploader.tsx
// React component for uploading CSV/Excel files via drag-and-drop or file input.
import React, { useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

function FileUploader({ onFilesSelected, isLoading }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    if (isLoading) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx'));
    if (files.length) {
      onFilesSelected(files);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isLoading) return;
    const files = e.target.files ? Array.from(e.target.files).filter(f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx')) : [];
    if (files.length) {
      onFilesSelected(files);
    }
  }

  return (
    <Card 
      className={`border-2 border-dashed transition-all duration-200 cursor-pointer ${
        isDragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-primary/50'
      } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
      onDragLeave={e => { e.preventDefault(); setIsDragActive(false); }}
      onDrop={handleDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
    >
      <CardContent className="p-8">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-full bg-primary/10">
            {isDragActive ? (
              <Upload className="w-8 h-8 text-primary" />
            ) : (
              <FileText className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragActive ? 'Drop files here' : 'Drag CSV/Excel files here'}
            </h3>
            <p className="text-sm text-muted-foreground">
              or click to choose files
            </p>
            <p className="text-xs text-muted-foreground">
              (Multiple files supported)
            </p>
          </div>
          <Button variant="outline" size="sm" disabled={isLoading}>
            Choose Files
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default FileUploader; 