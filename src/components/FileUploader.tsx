// FileUploader.tsx
// React component for uploading CSV/Excel files via drag-and-drop or file input.
import React, { useRef, useState } from 'react';

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
    <div
      className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
      onDragLeave={e => { e.preventDefault(); setIsDragActive(false); }}
      onDrop={handleDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
      style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      <div className="flex flex-col items-center">
        <span className="text-lg font-medium mb-2">Drag CSV/Excel files here</span>
        <span className="text-gray-500 text-sm mb-4">or click to choose files</span>
        <span className="text-xs text-gray-400">(Multiple files supported)</span>
      </div>
    </div>
  );
}

export default FileUploader; 