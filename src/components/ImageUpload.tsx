import React, { useState, useRef } from "react";
import { Image as ImageIcon, X, Upload } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
}

export default function ImageUpload({ onImageChange }: ImageUploadProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    onImageChange(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      {imagePreview ? (
        <Card className="relative w-full h-64 overflow-hidden">
          <CardContent className="p-0 h-full">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeImage}
              className="absolute top-2 right-2 h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full h-64 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
          <CardContent className="p-0 h-full">
            <label
              htmlFor="image"
              className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    PNG, JPG or GIF (MAX. 800x400px)
                  </Badge>
                </div>
              </div>
            </label>
          </CardContent>
        </Card>
      )}
      <input
        type="file"
        id="image"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
        ref={fileInputRef}
      />
    </div>
  );
}
