import { DM_Serif_Display } from "next/font/google";

export const publicDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-public-display",
});
