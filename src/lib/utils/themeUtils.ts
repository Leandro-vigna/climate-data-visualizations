import { Theme } from '../types/theme';

export function getDataVizColor(index: number, theme: Theme): string {
  const dataVizColors = theme.colors.dataViz;
  if (!dataVizColors) return '#000000'; // Fallback color

  // Get the color at the specified index, cycling through the available colors
  const colorIndex = (index % 12) + 1;
  return dataVizColors[`color${colorIndex}` as keyof typeof dataVizColors] || '#000000';
}

export function getThemeStyles(theme: Theme) {
  return {
    fontFamily: theme.typography.fontFamily.primary,
    fontSize: {
      small: theme.typography.fontSize.small,
      medium: theme.typography.fontSize.medium,
      large: theme.typography.fontSize.large,
      xlarge: theme.typography.fontSize.xlarge,
    },
    fontWeight: theme.typography.fontWeight,
    colors: theme.colors,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,
  };
} 