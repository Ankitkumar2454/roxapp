import { getThemeColors, getThemeShadows } from '@/src/styles/commonStyles';
import { useColorScheme } from 'react-native';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return {
    isDark,
    colors: getThemeColors(isDark),
    shadows: getThemeShadows(isDark),
  };
};

export default useTheme;
