import localFont from "next/font/local";

// Self-hosted (OFL, see ./manrope/OFL.txt) rather than next/font/google, so
// builds never depend on reaching Google Fonts.
export const manrope = localFont({
  src: [
    { path: "./manrope/manrope-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./manrope/manrope-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./manrope/manrope-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./manrope/manrope-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./manrope/manrope-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-manrope",
});
