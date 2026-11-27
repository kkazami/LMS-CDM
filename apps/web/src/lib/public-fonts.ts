import localFont from "next/font/local";

export const publicDisplay = localFont({
  src: [
    { path: "../fonts/DMSerifDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/DMSerifDisplay-Italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  variable: "--font-public-display",
});
