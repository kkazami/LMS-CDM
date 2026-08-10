"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, X, ZoomIn, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAvatar } from "@/lib/avatar-context";
import { toast } from "@/components/common/Toast";
import type { InstituteTheme } from "@/lib/theme";

interface AvatarUploadModalProps {
  open: boolean;
  onClose: () => void;
  theme: InstituteTheme;
  currentAvatarUrl: string | null;
}

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const CANVAS_SIZE = 300;
const OUTPUT_SIZE = 400;

export default function AvatarUploadModal({
  open,
  onClose,
  theme,
  currentAvatarUrl,
}: AvatarUploadModalProps) {
  const { setAvatarUrl } = useAvatar();

  // Phases: "select" | "crop" | "uploading"
  const [phase, setPhase] = useState<"select" | "crop" | "uploading">("select");
  const [fileError, setFileError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Crop state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offsetAtDragStart, setOffsetAtDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Modal visibility animation
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
        resetState();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function resetState() {
    setPhase("select");
    setFileError(null);
    setImageSrc(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }

  // ─── File Validation ───
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return "Only JPG, PNG, and WEBP images are supported.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Image is too large. Maximum size is 5 MB.";
    }
    return null;
  }

  function handleFileSelected(file: File) {
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);

      const img = new window.Image();
      img.onload = () => {
        imageRef.current = img;

        // Calculate initial scale to fit the image in the canvas
        const fitScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
        setScale(fitScale);
        setOffset({ x: 0, y: 0 });
        setPhase("crop");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  }

  // ─── Drag and Drop ───
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  }

  // ─── Canvas Drawing ───
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const img = imageRef.current;
    const scaledW = img.naturalWidth * scale;
    const scaledH = img.naturalHeight * scale;
    const x = (CANVAS_SIZE - scaledW) / 2 + offset.x;
    const y = (CANVAS_SIZE - scaledH) / 2 + offset.y;

    ctx.drawImage(img, x, y, scaledW, scaledH);

    // Draw dimmed overlay outside circle
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw white circle border
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [scale, offset]);

  useEffect(() => {
    if (phase === "crop") draw();
  }, [phase, draw]);

  // ─── Mouse/Touch Drag for Canvas ───
  function handleCanvasMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setOffsetAtDragStart({ x: offset.x, y: offset.y });
  }

  function handleCanvasTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setOffsetAtDragStart({ x: offset.x, y: offset.y });
  }

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      setOffset({
        x: offsetAtDragStart.x + (e.clientX - dragStart.x),
        y: offsetAtDragStart.y + (e.clientY - dragStart.y),
      });
    }

    function handleTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      setOffset({
        x: offsetAtDragStart.x + (touch.clientX - dragStart.x),
        y: offsetAtDragStart.y + (touch.clientY - dragStart.y),
      });
    }

    function handleEnd() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragStart, offsetAtDragStart]);

  // ─── Export Crop ───
  async function exportCrop(): Promise<Blob> {
    const offscreen = document.createElement("canvas");
    offscreen.width = OUTPUT_SIZE;
    offscreen.height = OUTPUT_SIZE;
    const ctx = offscreen.getContext("2d");
    if (!ctx || !imageRef.current) throw new Error("Canvas not ready");

    const img = imageRef.current;
    const ratio = OUTPUT_SIZE / CANVAS_SIZE;
    const scaledW = img.naturalWidth * scale * ratio;
    const scaledH = img.naturalHeight * scale * ratio;
    const x = (OUTPUT_SIZE - scaledW) / 2 + offset.x * ratio;
    const y = (OUTPUT_SIZE - scaledH) / 2 + offset.y * ratio;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, scaledW, scaledH);

    return new Promise((resolve, reject) => {
      offscreen.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to export canvas"));
        },
        "image/png",
        0.95
      );
    });
  }

  // ─── Upload & Save ───
  async function handleSave() {
    setPhase("uploading");
    try {
      const blob = await exportCrop();
      const formData = new FormData();
      formData.append("file", blob, "avatar.png");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const { url } = (await uploadRes.json()) as { url: string };

      const avatarRes = await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (!avatarRes.ok) throw new Error("Failed to update avatar");

      setAvatarUrl(url);
      toast.success("Profile photo updated!");
      onClose();
    } catch {
      toast.error("Failed to upload photo. Please try again.");
      setPhase("crop");
    }
  }

  // ─── Remove Photo ───
  async function handleRemovePhoto() {
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      if (!res.ok) throw new Error("Failed to remove avatar");

      setAvatarUrl(null);
      toast.success("Photo removed.");
      onClose();
    } catch {
      toast.error("Failed to remove photo. Please try again.");
    }
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl transition-all duration-200 ease-out",
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {phase === "select" ? "Upload Profile Photo" : "Crop your profile photo"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Phase 1: File Selection */}
        {phase === "select" && (
          <div>
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:border-gray-400 hover:bg-gray-100"
            >
              <div
                className="mb-3 rounded-full p-3"
                style={{ backgroundColor: `${theme.colors.primary}1A` }}
              >
                <Upload className="h-6 w-6" style={{ color: theme.colors.primary }} />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Drag & drop your photo here
              </p>
              <p className="mt-1 text-xs text-gray-400">— or —</p>
              <button
                type="button"
                className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Choose File
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              className="hidden"
            />

            {fileError && (
              <p className="mt-3 text-sm text-red-600 text-center">{fileError}</p>
            )}

            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <p>✅ Accepted formats: JPG, PNG, WEBP</p>
              <p>✅ Maximum file size: 5 MB</p>
              <p>✅ Minimum dimensions: 100 × 100 px</p>
            </div>

            {currentAvatarUrl && (
              <button
                onClick={handleRemovePhoto}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove current photo
              </button>
            )}
          </div>
        )}

        {/* Phase 2: Crop/Zoom Editor */}
        {(phase === "crop" || phase === "uploading") && (
          <div>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={cn(
                  "rounded-xl cursor-grab active:cursor-grabbing",
                  isDragging && "cursor-grabbing"
                )}
                style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
                onMouseDown={handleCanvasMouseDown}
                onTouchStart={handleCanvasTouchStart}
              />
            </div>

            {/* Zoom slider */}
            <div className="mt-4 flex items-center gap-3 px-2">
              <ZoomIn className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
                style={{ accentColor: theme.colors.primary }}
                disabled={phase === "uploading"}
              />
            </div>

            <p className="mt-2 text-center text-xs text-gray-400">
              Drag the image to reposition it
            </p>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setPhase("select");
                  setImageSrc(null);
                  imageRef.current = null;
                  setScale(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                disabled={phase === "uploading"}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={phase === "uploading"}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {phase === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
