"use client";

import { useState, useRef, useEffect } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Button from "@/components/common/Button";
import { X, Image as ImageIcon, Sparkles, Upload, Link as LinkIcon, Check, Loader2, Info } from "lucide-react";
import { updateCourseCoverImage } from "@/app/(dashboard)/[institute]/courses/actions";

interface CustomizeCourseModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  currentCoverImage?: string;
  theme: InstituteTheme;
  instituteCode: string;
  onSuccess?: (newCoverImage: string) => void;
}

const PRESET_BANNERS = [
  { id: "programming", title: "Programming", url: "/course-banners/programming.svg", bg: "#1E293B" },
  { id: "database", title: "Database Systems", url: "/course-banners/database.svg", bg: "#0F4C81" },
  { id: "networking", title: "Networking", url: "/course-banners/networking.svg", bg: "#1B4D3E" },
  { id: "webdev", title: "Web Development", url: "/course-banners/webdev.svg", bg: "#4C1D95" },
  { id: "cybersecurity", title: "Cybersecurity", url: "/course-banners/cybersecurity.svg", bg: "#0F2942" },
];

export default function CustomizeCourseModal({
  open,
  onClose,
  courseId,
  courseTitle,
  currentCoverImage = "",
  theme,
  instituteCode,
  onSuccess,
}: CustomizeCourseModalProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");
  const [selectedCover, setSelectedCover] = useState<string>(currentCoverImage);
  const [customImageUrl, setCustomImageUrl] = useState<string>("");
  const [imagePos, setImagePos] = useState<"center" | "top" | "bottom">("center");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedCover(currentCoverImage);
      setCustomImageUrl(currentCoverImage.startsWith("data:") || currentCoverImage.startsWith("http") ? currentCoverImage : "");
      setFeedback(null);
    }
  }, [open, currentCoverImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Please select a valid image file (PNG, JPG, SVG, WebP)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomImageUrl(dataUrl);
      setSelectedCover(dataUrl);
      setFeedback(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedCover) {
      setFeedback({ type: "error", message: "Please select a preset banner or insert an image." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const result = await updateCourseCoverImage(courseId, selectedCover, instituteCode);

    if (result.success) {
      onSuccess?.(selectedCover);
      onClose();
    } else {
      setFeedback({ type: "error", message: result.error || "Failed to update course card cover." });
    }

    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: `${theme.colors.primary}1A`,
                color: theme.colors.primary,
              }}
            >
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">Customize Course Card</h2>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5] line-clamp-1">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-[#F0F2F8] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Exact Dimensions Info Callout */}
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-3 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Recommended Dimensions:</span> <strong>800 × 250 pixels</strong> (Aspect ratio <strong>16:5</strong>). Images will automatically crop to fit the card header.
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            onClick={() => setActiveTab("presets")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors cursor-pointer"
            style={{
              color: activeTab === "presets" ? theme.colors.primary : undefined,
              borderBottom: activeTab === "presets" ? `2px solid ${theme.colors.primary}` : "2px solid transparent",
            }}
          >
            <Sparkles className="h-4 w-4" />
            Preset Banners
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors cursor-pointer"
            style={{
              color: activeTab === "custom" ? theme.colors.primary : undefined,
              borderBottom: activeTab === "custom" ? `2px solid ${theme.colors.primary}` : "2px solid transparent",
            }}
          >
            <Upload className="h-4 w-4" />
            Insert an Image / Crop
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 text-xs font-medium ${
                feedback.type === "success"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                  : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {activeTab === "presets" ? (
            /* ─── Preset Banners ─── */
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-[#F0F2F8] uppercase tracking-wider block">
                Select a Subject Banner
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_BANNERS.map((preset) => {
                  const isSelected = selectedCover === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedCover(preset.url)}
                      className={`group relative h-28 rounded-xl border-2 overflow-hidden cursor-pointer transition-all shadow-xs ${
                        isSelected
                          ? "border-orange-500 ring-2 ring-orange-500/20"
                          : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 flex flex-col justify-between">
                        <div className="flex justify-end">
                          {isSelected && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F97316] text-white shadow-md">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white drop-shadow-xs">
                          {preset.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ─── Custom Image Upload & Cropper Preview ─── */
            <div className="space-y-5">
              {/* Image Input Options */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-[#F0F2F8] uppercase tracking-wider block">
                  Choose Image File or URL
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-slate-400" />
                    <span>Upload Image File</span>
                  </button>

                  <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2">
                    <LinkIcon className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => {
                        const url = e.target.value;
                        setCustomImageUrl(url);
                        setSelectedCover(url);
                      }}
                      placeholder="Paste image URL (e.g. https://...)"
                      className="w-full text-xs outline-none bg-transparent text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* 16:5 Crop Preview */}
              {selectedCover ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-[#F0F2F8] uppercase tracking-wider block">
                      Card Header Preview (16:5 Crop)
                    </label>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#8B92A5]">
                      <span>Position:</span>
                      <button
                        type="button"
                        onClick={() => setImagePos("top")}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${imagePos === "top" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5]"}`}
                      >
                        Top
                      </button>
                      <button
                        type="button"
                        onClick={() => setImagePos("center")}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${imagePos === "center" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5]"}`}
                      >
                        Center
                      </button>
                      <button
                        type="button"
                        onClick={() => setImagePos("bottom")}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${imagePos === "bottom" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5]"}`}
                      >
                        Bottom
                      </button>
                    </div>
                  </div>

                  {/* Crop viewport box */}
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner bg-slate-900">
                    <img
                      src={selectedCover}
                      alt="Card cover preview"
                      className="h-full w-full object-cover transition-all"
                      style={{ objectPosition: imagePos }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 flex flex-col justify-end">
                      <span className="text-sm font-bold text-white drop-shadow-md">
                        {courseTitle}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 p-8 text-center bg-slate-50/50 dark:bg-white/[0.02]">
                  <ImageIcon className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                    Upload an image or paste a URL above to preview and crop your course banner.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 dark:border-white/10 px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <Button
            theme={theme}
            onClick={handleSave}
            disabled={!selectedCover || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Cover Card"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
