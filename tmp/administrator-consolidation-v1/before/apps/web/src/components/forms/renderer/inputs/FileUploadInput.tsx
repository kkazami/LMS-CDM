"use client";

import { useState } from "react";
import { UploadCloud, File, X, Loader2, CheckCircle2 } from "lucide-react";
import type { FileUploadConfig } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface FileUploadInputProps {
  config?: FileUploadConfig;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  onChange: (fileData: { fileUrl: string; fileName: string; fileSizeBytes: number } | null) => void;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function FileUploadInput({
  config,
  fileUrl,
  fileName,
  fileSizeBytes,
  onChange,
  disabled = false,
  theme,
}: FileUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const maxMb = config?.maxMb ?? 10;
  const maxBytes = maxMb * 1024 * 1024;
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxBytes) {
      setUploadError(`File exceeds maximum size of ${maxMb} MB.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      onChange({
        fileUrl: data.url || data.fileUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
      });
    } catch (err) {
      console.error(err);
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="pt-2 space-y-2">
      {fileUrl ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 max-w-md">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <File className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                {fileName || "Uploaded File"}
              </p>
              <p className="text-[10px] text-slate-400">{formatSize(fileSizeBytes)}</p>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="max-w-md">
          <label
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
              disabled
                ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-white/10"
                : "border-slate-300 dark:border-white/20 hover:border-primary bg-slate-50/50 dark:bg-white/[0.02]"
            }`}
          >
            <input
              type="file"
              disabled={disabled || isUploading}
              onChange={handleFileChange}
              className="sr-only"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-semibold">Uploading to secure storage...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-slate-500 dark:text-[#8B92A5]">
                <div className="p-3 rounded-full bg-slate-100 dark:bg-white/5">
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Click to select file
                  </span>{" "}
                  <span className="text-xs">or drag and drop</span>
                </div>
                <span className="text-[10px] text-slate-400">Max size: {maxMb} MB</span>
              </div>
            )}
          </label>
        </div>
      )}

      {uploadError && <p className="text-xs text-rose-500">{uploadError}</p>}
    </div>
  );
}
