"use client";

import React from "react";

export interface LogoProps {
  size?: number;
  className?: string;
}

// ─── Python Logo (Official Dual Snake with Eyes) ─────────────────────
export function PythonLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-label="Python"
    >
      <defs>
        <linearGradient id="py-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#387EB8" />
          <stop offset="100%" stopColor="#366994" />
        </linearGradient>
        <linearGradient id="py-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE873" />
          <stop offset="100%" stopColor="#FFD43B" />
        </linearGradient>
      </defs>
      {/* Top / Blue Snake */}
      <path
        d="M63.08 6.42c-27.7 0-26.04 12.01-26.04 12.01l.03 12.44h26.54v3.77H26.33S7.78 32.55 7.78 60.19c0 27.64 16.14 26.6 16.14 26.6l9.63-.01v-13.52s-.52-16.14 15.89-16.14h25.43s15.37.26 15.37-14.86V21.84s1.82-15.42-27.16-15.42zm-14.7 9.47a4.99 4.99 0 1 1 .01 9.98 4.99 4.99 0 0 1-.01-9.98z"
        fill="url(#py-blue)"
      />
      {/* Bottom / Yellow Snake */}
      <path
        d="M64.92 121.58c27.7 0 26.04-12.01 26.04-12.01l-.03-12.44H64.39v-3.77h37.28s18.55 2.09 18.55-25.55c0-27.64-16.14-26.6-16.14-26.6l-9.63.01v13.52s.52 16.14-15.89 16.14H53.13s-15.37-.26-15.37 14.86v20.42s-1.82 15.42 27.16 15.42zm14.7-9.47a4.99 4.99 0 1 1-.01-9.98 4.99 4.99 0 0 1 .01 9.98z"
        fill="url(#py-yellow)"
      />
    </svg>
  );
}

// ─── C++ Logo (Official Hexagon with 3D Facets & C++) ───────────────
export function CppLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-label="C++"
    >
      {/* Left/Top Hexagon Facet */}
      <path d="M64 4L12 34v60l52 30 52-30V34L64 4z" fill="#00599C" />
      {/* 3D Dark Shading on bottom right facet */}
      <path d="M64 64l52-30v60l-52 30V64z" fill="#004482" />
      {/* 3D Light Shading on top left facet */}
      <path d="M64 4L12 34l52 30 52-30L64 4z" fill="#659AD2" opacity="0.35" />
      
      {/* Large White C */}
      <path
        d="M64 32c-17.67 0-32 14.33-32 32s14.33 32 32 32c10.87 0 20.48-5.42 26.24-13.72l-12.8-7.39C83.82 79.5 74.45 83.2 64 83.2c-10.6 0-19.2-8.6-19.2-19.2s8.6-19.2 19.2-19.2c10.45 0 19.82 3.7 23.44 8.31l12.8-7.39C94.48 37.42 84.87 32 64 32z"
        fill="#FFFFFF"
      />
      {/* Right Wedge ++ Container */}
      <path d="M84 46l36 18-36 18V46z" fill="#00599C" />
      {/* First + */}
      <path d="M93 59h3v-3h3v3h3v3h-3v3h-3v-3h-3v-3z" fill="#FFFFFF" />
      {/* Second + */}
      <path d="M106 59h3v-3h3v3h3v3h-3v3h-3v-3h-3v-3z" fill="#FFFFFF" />
    </svg>
  );
}

// ─── C# Logo (Official .NET Purple Hexagon with C#) ─────────────────
export function CSharpLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-label="C#"
    >
      {/* Purple Hexagon */}
      <path d="M64 4L12 34v60l52 30 52-30V34L64 4z" fill="#68217A" />
      {/* 3D Dark Shading */}
      <path d="M64 64l52-30v60l-52 30V64z" fill="#4B1259" />
      {/* 3D Light Top Shading */}
      <path d="M64 4L12 34l52 30 52-30L64 4z" fill="#9B4F96" opacity="0.4" />

      {/* Large White C */}
      <path
        d="M64 32c-17.67 0-32 14.33-32 32s14.33 32 32 32c10.87 0 20.48-5.42 26.24-13.72l-12.8-7.39C83.82 79.5 74.45 83.2 64 83.2c-10.6 0-19.2-8.6-19.2-19.2s8.6-19.2 19.2-19.2c10.45 0 19.82 3.7 23.44 8.31l12.8-7.39C94.48 37.42 84.87 32 64 32z"
        fill="#FFFFFF"
      />
      {/* Right Wedge # Container */}
      <path d="M84 46l36 18-36 18V46z" fill="#68217A" />
      {/* # Symbol */}
      <path
        d="M96 55h2.5l-.8 3h3.5l.8-3H104l-.8 3h2v2.5h-2.7l-.7 2.8h3v2.5h-3.7l-.8 3.2H98.8l.8-3.2h-3.5l-.8 3.2h-2.5l.8-3.2h-2V63.3h2.7l.7-2.8h-3V58h3.7l.8-3zm3 5.5l-.7 2.8h3.5l.7-2.8H99z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// ─── Java Logo (Official Oracle Java Dual Flame Coffee Cup) ─────────
export function JavaLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-label="Java"
    >
      {/* Orange Rising Flame (Center-Right) */}
      <path
        d="M58.8 8.2c6.4 7.6 3.8 14.5-3.6 22.8-9.4 10.6-5.8 18.2-1.2 26.6-7.8-8.2-9.2-16.6-2.2-24.8 8.8-10.2 10.6-16.8 7-24.6z"
        fill="#E76F00"
      />
      {/* Red/Orange Rising Flame (Left) */}
      <path
        d="M48.2 22.4c3.8 4.8 2.2 9.2-2.2 14.6-6.2 7.6-3.8 12.2-.4 17.6-5.2-5.4-6.4-11.2-1.4-16.8 6-7 7.2-11.4 4-15.4z"
        fill="#EA2D2E"
      />
      
      {/* Top Cup Rim (Blue Arc) */}
      <path
        d="M34 56.4c18.2-4.2 46.4-4.2 64.6 0 5.4 1.2 8.4 3.2 8.4 5.2 0 4.2-13.6 7.4-38.4 7.4s-38.4-3.2-38.4-7.4c0-2 3.8-4 13.8-5.2z"
        fill="#5382A1"
      />
      {/* Handle */}
      <path
        d="M87.2 59.4c7.6.8 15.6 3.6 15.6 10.8 0 7.8-9.6 11.4-19.4 12.8l2.2-4.4c6.2-.8 11.8-2.8 11.8-7.6 0-4.4-6.4-6.8-13-7.6l2.8-4z"
        fill="#5382A1"
      />
      {/* Mid Cup Layer */}
      <path
        d="M41.8 71.6c14.2-2.6 36.2-2.6 50.4 0 4.2.8 6.4 2.2 6.4 3.8 0 3.2-10.8 5.6-30.6 5.6s-30.6-2.4-30.6-5.6c0-1.6 1.8-3 4.4-3.8z"
        fill="#5382A1"
      />
      {/* Lower Cup Body */}
      <path
        d="M45.6 84.4c12.2-2 31.2-2 43.4 0 3.6.6 5.4 1.8 5.4 3.2 0 2.6-9.4 4.8-26.4 4.8s-26.4-2.2-26.4-4.8c0-1.4 1.6-2.6 4-3.2z"
        fill="#5382A1"
      />
      {/* Saucer Base Plate */}
      <path
        d="M26.4 97.2c22.6-4.8 57.6-4.8 80.2 0 6.6 1.4 10.4 3.8 10.4 6.2 0 5-16.8 9-47.4 9s-47.4-4-47.4-9c0-2.4 4.8-4.8 14.2-6.2z"
        fill="#5382A1"
      />
      {/* Java Text Base Accent */}
      <text
        x="64"
        y="122"
        textAnchor="middle"
        fontSize="18"
        fontWeight="900"
        fontFamily="sans-serif"
        fill="#E76F00"
      >
        Java
      </text>
    </svg>
  );
}

// ─── JavaScript Logo (Official Yellow Shield with Bold JS) ──────────
export function JavaScriptLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-label="JavaScript"
    >
      <rect width="128" height="128" rx="8" fill="#F7DF1E" />
      {/* Official JS Typography Vector */}
      <path
        d="M71.74 85.39c2.08 3.54 4.85 6.23 9.77 6.23 4.93 0 8.08-2.46 8.08-5.85 0-4.08-3.23-5.54-8.62-7.85l-2.93-1.23c-8.47-3.62-14.09-8.16-14.09-17.94 0-8.93 6.85-15.7 17.4-15.7 7.62 0 13.09 2.69 16.93 9.47l-7.93 5.08c-1.77-3.16-3.7-4.39-7.77-4.39-3.7 0-6.16 2.31-6.16 5.23 0 3.62 2.46 5.08 7.39 7.24l2.93 1.23c10.16 4.39 15.55 8.85 15.55 18.78 0 10.62-8.31 16.63-19.71 16.63-11.01 0-18.09-5.47-21.32-12.86l8.47-4.08zM31.25 86.32c1.7 2.93 3.93 5.39 7.93 5.39 4.08 0 6.69-1.62 6.69-7.85V43.59h11.09v40.34c0 12.09-7.08 17.32-17.4 17.32-8.77 0-14.01-4.54-16.78-10.93l8.47-4z"
        fill="#000000"
      />
    </svg>
  );
}

// ─── SQL Logo (3-Tier Relational Cylinder Database) ─────────────────
export function SqlLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-label="SQL"
    >
      {/* Cylinder 1 (Top) */}
      <path
        d="M24 28v22c0 12 18 20 40 20s40-8 40-20V28"
        fill="#0284C7"
      />
      <ellipse cx="64" cy="28" rx="40" ry="16" fill="#38BDF8" />

      {/* Cylinder 2 (Middle) */}
      <path
        d="M24 60v22c0 12 18 20 40 20s40-8 40-20V60"
        fill="#0369A1"
      />
      <ellipse cx="64" cy="60" rx="40" ry="14" fill="#0EA5E9" />

      {/* Cylinder 3 (Bottom) */}
      <path
        d="M24 92v22c0 12 18 20 40 20s40-8 40-20V92"
        fill="#075985"
      />
      <ellipse cx="64" cy="92" rx="40" ry="14" fill="#0284C7" />
    </svg>
  );
}

// ─── HTML5 Logo (Official W3C HTML5 Shield with "5") ────────────────
export function HtmlLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-label="HTML5"
    >
      {/* Outer Shield Left (Darker Orange) */}
      <path d="M19.2 11.2l9.04 101.44 35.68 9.92.08-.02V11.2H19.2z" fill="#E44D26" />
      {/* Outer Shield Right (Lighter Orange) */}
      <path d="M64 122.54l35.68-9.92 9.04-101.42H64v111.34z" fill="#F16529" />
      
      {/* Inner Figure 5 - Left Side (White) */}
      <path
        d="M64 54.34H48.42l-1.08-12.16H64V27.8H33.86l3.22 36.14H64v-9.6zm0 33.72l-.16.04-13.4-3.62-.86-9.62H35.16l1.7 18.98 27.14 7.54V88.06z"
        fill="#EBEBEB"
      />
      {/* Inner Figure 5 - Right Side (Light Silver) */}
      <path
        d="M64 27.8v14.38h27.86l-.76 8.56H64v9.6h17.9l-1.68 18.94L64 83.74v14.92l27.18-7.54 3.74-41.94.78-8.78.96-10.74L64 27.8z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// ─── CSS3 Logo (Official W3C CSS3 Shield with "3") ──────────────────
export function CssLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-label="CSS3"
    >
      {/* Outer Shield Left (Darker Blue) */}
      <path d="M19.2 11.2l9.04 101.44 35.68 9.92.08-.02V11.2H19.2z" fill="#1572B6" />
      {/* Outer Shield Right (Lighter Blue) */}
      <path d="M64 122.54l35.68-9.92 9.04-101.42H64v111.34z" fill="#33A9DC" />

      {/* Inner Figure 3 - Left Side (Light Silver) */}
      <path
        d="M64 54.34H48.42l-1.08-12.16H64V27.8H33.86l3.22 36.14H64v-9.6zm0 33.72l-.16.04-13.4-3.62-.86-9.62H35.16l1.7 18.98 27.14 7.54V88.06z"
        fill="#EBEBEB"
      />
      {/* Inner Figure 3 - Right Side (White) */}
      <path
        d="M64 27.8v14.38h27.86l-.76 8.56H64v9.6h17.9l-1.68 18.94L64 83.74v14.92l27.18-7.54 3.74-41.94.78-8.78.96-10.74L64 27.8z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// ─── Convenience Map ────────────────────────────────────────────────
export const LANGUAGE_LOGO_MAP: Record<string, React.ComponentType<LogoProps>> = {
  python: PythonLogo,
  cpp: CppLogo,
  csharp: CSharpLogo,
  java: JavaLogo,
  javascript: JavaScriptLogo,
  sql: SqlLogo,
  html: HtmlLogo,
  css: CssLogo,
};
