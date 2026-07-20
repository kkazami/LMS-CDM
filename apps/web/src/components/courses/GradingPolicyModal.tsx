"use client";

import { useState, useEffect } from "react";
import { X, Calculator, AlertCircle, Loader2 } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface GradingPolicyModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (weights: { category: string; weightPercentage: number }[]) => Promise<void>;
  theme: InstituteTheme;
  activeCategories: string[]; // e.g., ["ASSIGNMENT", "QUIZ", "Laboratory Work"]
  initialWeights?: { category: string; weightPercentage: number }[];
}

export default function GradingPolicyModal({
  open,
  onClose,
  onSave,
  theme,
  activeCategories,
  initialWeights,
}: GradingPolicyModalProps) {
  // Local state for weights, keyed by category
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Initialize state when modal opens
  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      
      // Seed with existing active categories
      activeCategories.forEach(cat => {
        initial[cat] = "0"; // default to 0
      });

      // Override with initialWeights if they exist
      if (initialWeights) {
        initialWeights.forEach(w => {
          initial[w.category] = w.weightPercentage.toString();
        });
      }
      
      setWeights(initial);
      setError("");
    }
  }, [open, activeCategories, initialWeights]);

  // Compute live total
  const currentTotal = Object.values(weights).reduce((acc, val) => {
    const num = parseFloat(val);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const isValidTotal = Math.abs(currentTotal - 100) < 0.01;

  if (!open) return null;

  async function handleSave() {
    if (!isValidTotal) return;

    setIsSaving(true);
    setError("");

    try {
      const parsedWeights = Object.entries(weights)
        .map(([category, val]) => ({
          category,
          weightPercentage: parseFloat(val) || 0,
        }))
        // Only save categories that have > 0 weight or are in activeCategories
        .filter(w => w.weightPercentage > 0 || activeCategories.includes(w.category));

      await onSave(parsedWeights);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save grading policy");
    } finally {
      setIsSaving(false);
    }
  }

  function formatCategoryName(category: string) {
    // Basic formatting for standard types
    if (category === "ASSIGNMENT") return "Assignments";
    if (category === "QUIZ") return "Quizzes";
    if (category === "ACTIVITY") return "Activities";
    if (category === "RECITATION") return "Recitation";
    if (category === "MIDTERM_EXAM") return "Midterm Exam";
    if (category === "FINAL_EXAM") return "Final Exam";
    return category; // custom categories stay as is
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-gray-500" style={{ color: theme.colors.primary }} />
            <h2 className="text-lg font-semibold text-gray-900">Grading Policy</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-gray-500 mb-6">
            Configure the percentage weight for each classwork category. The total must exactly equal 100%.
          </p>

          <div className="space-y-4">
            {Object.keys(weights).length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">
                No gradable categories found. Create assignments or quizzes first.
              </p>
            ) : (
              Object.keys(weights).sort().map((category) => (
                <div key={category} className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    {formatCategoryName(category)}
                  </label>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={weights[category]}
                      onChange={(e) => setWeights({ ...weights, [category]: e.target.value })}
                      className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-right text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-gray-400 text-sm font-medium w-4">%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Total Allocation</span>
            <div className={`text-lg font-bold flex items-center gap-1 transition-colors ${isValidTotal ? 'text-emerald-600' : 'text-red-600'}`}>
              {currentTotal.toFixed(1)}%
            </div>
          </div>

          {!isValidTotal && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Total weight allocation must equal exactly 100% to save.</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 text-center">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValidTotal || isSaving}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.colors.primary,
              }}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply Policy
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
