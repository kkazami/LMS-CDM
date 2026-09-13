"use client";

import React from "react";

export interface ToggleRowProps {
  title: string;
  isOn: boolean;
  onToggle: (newState: boolean) => void;
  isDisabled?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  title,
  isOn,
  onToggle,
  isDisabled = false,
}) => {
  return (
    <div
      className={`flex items-center justify-between py-4 ${
        isDisabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <span className="text-sm font-semibold text-slate-700 dark:text-[#F0F2F8]">
        {title}
      </span>
      <button
        type="button"
        onClick={() => onToggle(!isOn)}
        disabled={isDisabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isOn ? "bg-[#1E88E5]" : "bg-slate-200 dark:bg-slate-700"
        }`}
        role="switch"
        aria-checked={isOn}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            isOn ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};
