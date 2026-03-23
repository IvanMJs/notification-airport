// Re-export from context so consumers can import from either:
//   @/hooks/useTheme  (conventional hooks location)
//   @/contexts/ThemeContext  (direct context import)
export { useTheme, ThemeProvider } from "@/contexts/ThemeContext";
export type { ThemePreference, ResolvedTheme } from "@/contexts/ThemeContext";
