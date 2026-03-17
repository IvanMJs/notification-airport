import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "highlight-flash": "highlight-flash 2s ease-out",
        "fade-in-up": "fade-in-up 0.35s ease-out both",
      },
      keyframes: {
        "highlight-flash": {
          "0%": { boxShadow: "0 0 0 0 rgba(59, 130, 246, 0.7), 0 0 20px rgba(59, 130, 246, 0.5)" },
          "30%": { boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.4), 0 0 30px rgba(59, 130, 246, 0.3)" },
          "100%": { boxShadow: "0 0 0 0 rgba(59, 130, 246, 0), 0 0 0 rgba(59, 130, 246, 0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
