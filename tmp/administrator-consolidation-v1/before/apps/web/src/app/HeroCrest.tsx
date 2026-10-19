"use client";

import { useState } from "react";
import Image from "next/image";

interface HeroCrestProps {
  goldColor: string;
}

/**
 * Hero crest logo badge.
 * Loads /images/cdm-logo.png inside a circular gold-bordered container.
 * Uses object-contain so the flat vector logo isn't cropped or stretched.
 * Falls back to a branded SVG placeholder if the image fails to load.
 */
export default function HeroCrest({ goldColor }: HeroCrestProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const containerClasses =
    "relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-2xl flex items-center justify-center";

  const containerStyle = {
    boxShadow: `0 0 0 3px ${goldColor}, 0 0 40px rgba(245,196,0,0.25), 0 20px 60px rgba(0,0,0,0.5)`,
    backgroundColor: "#FFFFFF",
  };

  if (imgFailed) {
    return (
      <div
        className={containerClasses}
        style={{
          ...containerStyle,
          background: "linear-gradient(145deg, #1B2838 0%, #0F1724 100%)",
        }}
      >
        {/* SVG fallback crest */}
        <svg
          viewBox="0 0 120 120"
          className="w-24 h-24 sm:w-30 sm:h-30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Colegio de Montalban school seal"
        >
          <circle cx="60" cy="60" r="56" stroke={goldColor} strokeWidth="3" fill="none" />
          <circle cx="60" cy="60" r="50" stroke={goldColor} strokeWidth="1" fill="none" opacity="0.4" />
          <path
            d="M40 35 h40 v30 q0 20 -20 30 q-20 -10 -20 -30 z"
            fill="url(#shieldGrad)"
            stroke={goldColor}
            strokeWidth="1.5"
          />
          <line x1="60" y1="35" x2="60" y2="88" stroke={goldColor} strokeWidth="0.8" opacity="0.5" />
          <line x1="40" y1="55" x2="80" y2="55" stroke={goldColor} strokeWidth="0.8" opacity="0.5" />
          <path d="M57 42 q3 -6 6 0 q-3 4 -6 0z" fill="#F5C400" opacity="0.9" />
          <rect x="59" y="42" width="2" height="8" rx="1" fill={goldColor} opacity="0.7" />
          <circle cx="32" cy="60" r="2" fill={goldColor} opacity="0.6" />
          <circle cx="88" cy="60" r="2" fill={goldColor} opacity="0.6" />
          <defs>
            <path id="topArc" d="M20 60 A40 40 0 0 1 100 60" />
            <path id="bottomArc" d="M25 68 A38 38 0 0 0 95 68" />
            <linearGradient id="shieldGrad" x1="40" y1="35" x2="80" y2="95">
              <stop offset="0%" stopColor="#8B1A1A" />
              <stop offset="50%" stopColor="#1B5E20" />
              <stop offset="100%" stopColor="#0D47A1" />
            </linearGradient>
          </defs>
          <text fill={goldColor} fontSize="7.5" fontWeight="700" letterSpacing="1.5" fontFamily="system-ui, sans-serif">
            <textPath href="#topArc" startOffset="50%" textAnchor="middle">COLEGIO DE MONTALBAN</textPath>
          </text>
          <text fill={goldColor} fontSize="6.5" fontWeight="600" letterSpacing="1" fontFamily="system-ui, sans-serif">
            <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">RODRIGUEZ, RIZAL</textPath>
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className={containerClasses} style={containerStyle}>
      <Image
        src="/images/cdm-logo.png"
        alt="Colegio de Montalban school seal — COLEGIO DE MONTALBAN, RODRIGUEZ, RIZAL"
        fill
        className="object-contain p-1"
        priority
        sizes="(max-width: 640px) 128px, 160px"
        onError={() => setImgFailed(true)}
      />
    </div>
  );
}
