import { useTheme } from '@/src/hooks/useTheme';
import { iconRegistry } from '@/src/utils/iconRegistry';
import { ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

interface SvgIconProps {
  name: keyof typeof iconRegistry;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const SvgIcon: React.FC<SvgIconProps> = ({ 
  name, 
  size = 24, 
  color, 
  style 
}) => {
  const { colors } = useTheme();
  const iconColor = color || colors.textPrimary;
  const svgData = iconRegistry[name];

  if (!svgData) {
    console.warn(`Icon "${name}" not found in registry`);
    return null;
  }

  return (
    <Svg width={size} height={size} viewBox={svgData.viewBox} style={style}>
      <G fill={svgData.stroke ? 'none' : iconColor} stroke={svgData.stroke ? iconColor : undefined} strokeWidth={svgData.stroke ? '2' : undefined}>
        {svgData.paths.map((path, index) => (
          <Path
            key={index}
            d={path}
            fill={svgData.stroke ? 'none' : iconColor}
            stroke={svgData.stroke ? iconColor : undefined}
            strokeWidth={svgData.stroke ? '2' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </G>
    </Svg>
  );
};

export default SvgIcon;
