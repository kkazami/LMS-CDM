"use client";

import { useState } from "react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import type { InstituteTheme } from "@/lib/theme";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/common/Toast";

export function ContactSupportModal({
  theme,
  onClose,
  onSubmitted,
  initialMessage = '',
}: {
  theme: InstituteTheme;
  onClose: () => void;
  onSubmitted: () => void;
  initialMessage?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [category, setCategory] = useState("GENERAL");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(initialMessage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, category }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit ticket.");
      }

      setIsSuccess(true);
      toast.success("Ticket Submitted", "Your support ticket has been received.");
      onSubmitted();
    } catch (err) {
      toast.error("Submission Error", err instanceof Error ? err.message : "Failed to submit your ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Contact Support">
      <div className="p-1">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16" style={{ color: theme.colors.primary }} />
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Message sent</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Check My tickets for a reply.</p>
            </div>
            <Button type="button" theme={theme} onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              Send a message to the LMS support team.
            </p>
            <div>
              <label htmlFor="support-category" className="block text-xs font-semibold text-slate-700 dark:text-[#8B92A5] mb-1.5">
                Category
              </label>
              <select
                id="support-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3.5 py-2.5 text-base sm:text-sm text-slate-900 dark:text-[#F0F2F8] focus:outline-none transition-all disabled:opacity-50"
              >
                <option value="GENERAL">General Inquiry</option>
                <option value="TECHNICAL">Technical Issue</option>
                <option value="ACCOUNT">Account & Access</option>
                <option value="COURSE">Course & Academics</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Input
                id="support-subject"
                label="Subject"
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Briefly describe your issue"
                required
                disabled={isSubmitting}
                theme={theme}
              />
            </div>
            <div>
              <label htmlFor="support-message" className="block text-xs font-semibold text-slate-700 dark:text-[#8B92A5] mb-1.5">
                Message
              </label>
              <textarea
                id="support-message"
                maxLength={8000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3.5 py-2.5 text-base sm:text-sm text-slate-900 dark:text-[#F0F2F8] focus:outline-none transition-all disabled:opacity-50"
                style={{ 
                  boxShadow: "none"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.boxShadow = "none";
                }}
                placeholder="Provide as much detail as possible..."
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end pt-4 space-x-3 border-t border-slate-100 dark:border-white/10">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} theme={theme} className="dark:text-white dark:hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !subject.trim() || !message.trim()} theme={theme}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Submit Ticket"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
