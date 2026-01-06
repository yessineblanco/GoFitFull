import { useThemeStore } from "@/store/themeStore";
import { lightColors, darkColors } from "@/theme/colors";

export const useThemeColors = () => {
  const isDark = useThemeStore((s) => s.isDark);
  return isDark ? darkColors : lightColors;
};
