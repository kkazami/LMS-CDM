"use client";

import { useMemo } from "react";

interface ArenaLobbyQrProps {
  url: string;
  size?: number;
}

/**
 * Renders a clean QR code image using a lightweight public SVG endpoint,
 * with high contrast and rounded corners.
 */
export default function ArenaLobbyQr({ url, size = 180 }: ArenaLobbyQrProps) {
  const qrSrc = useMemo(() => {
    const encoded = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=8&color=111827&bgcolor=FFFFFF`;
  }, [url, size]);

  return (
    <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-200 inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt="Scan to join Arena"
        width={size}
        height={size}
        className="rounded-xl block"
        loading="lazy"
      />
    </div>
  );
}
