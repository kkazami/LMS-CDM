"use client";

import React, { useState, ChangeEvent } from "react";

interface KxMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export function KxMentionInput({
  value,
  onChange,
  placeholder = "Write a comment or response... Use @ to mention someone",
  className = "",
  rows = 3,
  disabled = false,
}: KxMentionInputProps) {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative w-full">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-y ${className}`}
      />
    </div>
  );
}
