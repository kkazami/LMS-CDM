"use client";

import Image from "next/image";
import type { ComponentType } from "react";

export interface LogoProps {
  size?: number;
  className?: string;
}

const LOGO_ASSETS: Record<string, string> = {
  html: "html-transparent",
  sql: "sql-transparent",
};

function LanguageLogo({
  language,
  label,
  size = 24,
  className = "",
}: LogoProps & { language: string; label: string }) {
  return (
    <Image
      src={`/images/codelab/${LOGO_ASSETS[language] ?? language}.png`}
      alt={label}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

export function PythonLogo(props: LogoProps) {
  return <LanguageLogo {...props} language="python" label="Python" />;
}

export function CppLogo(props: LogoProps) {
  return <LanguageLogo {...props} language="cpp" label="C++" />;
}

export function CSharpLogo(props: LogoProps) {
  return <LanguageLogo {...props} language="csharp" label="C#" />;
}

export function JavaLogo({ size = 24, className = "" }: LogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {/* The supplied Java artwork has wide transparent margins. */}
      <LanguageLogo size={size} language="java" label="Java" className="scale-[2.1]" />
    </span>
  );
}

export function JavaScriptLogo(props: LogoProps) {
  return <LanguageLogo {...props} language="javascript" label="JavaScript" />;
}

export function SqlLogo(props: LogoProps) {
  return <LanguageLogo {...props} language="sql" label="SQL" />;
}

export function HtmlLogo(props: LogoProps) {
  return <LanguageLogo {...props} language="html" label="HTML5" />;
}

export function CssLogo(props: LogoProps) {
  return <LanguageLogo {...props} language="css" label="CSS3" />;
}

export const LANGUAGE_LOGO_MAP: Record<string, ComponentType<LogoProps>> = {
  python: PythonLogo,
  cpp: CppLogo,
  csharp: CSharpLogo,
  java: JavaLogo,
  javascript: JavaScriptLogo,
  sql: SqlLogo,
  html: HtmlLogo,
  css: CssLogo,
};
