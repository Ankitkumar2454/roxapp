import { Dimensions, Platform, StyleSheet } from 'react-native';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Simplified Theme-aware color system
export const getThemeColors = (isDark: boolean) => ({
  // Primary Brand Colors - Theme-aware for consistent visual weight
  primary: isDark ? '#161F32' : '#2A3447',
  primaryDark: isDark ? '#0F141F' : '#1A2332',
  primaryLight: isDark ? '#2A3447' : '#3D4A5C',
  
  // Secondary Colors
  secondary: '#667eea',
  secondaryDark: '#764ba2',
  
  // Status Colors (consistent across themes)
  success: '#4CAF50',
  error: '#FF3B30',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Background Colors
  background: isDark ? '#121212' : '#FFFFFF',
  surface: isDark ? '#1E1E1E' : '#F8F9FA',
  
  // Text Colors
  textPrimary: isDark ? '#FFFFFF' : '#1A1A1A',
  textSecondary: isDark ? '#B0B0B0' : '#6B7280',
  textLight: isDark ? '#808080' : '#9CA3AF',
  
  // Border Colors
  border: isDark ? '#404040' : '#E8E9EA',
  borderLight: isDark ? '#303030' : '#F0F0F0',
  
  // Utility Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Simplified Gray Scale
  gray: {
    50: isDark ? '#2A2A2A' : '#FAFAFA',
    100: isDark ? '#333333' : '#F5F5F5',
    200: isDark ? '#404040' : '#EEEEEE',
    300: isDark ? '#4A4A4A' : '#E0E0E0',
    400: isDark ? '#606060' : '#BDBDBD',
    500: isDark ? '#808080' : '#9E9E9E',
    600: isDark ? '#A0A0A0' : '#757575',
    700: isDark ? '#C0C0C0' : '#616161',
    800: isDark ? '#E0E0E0' : '#424242',
    900: isDark ? '#FFFFFF' : '#212121',
  },
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // WhatsApp Colors
  whatsapp: '#25D366',
  
  // File Type Colors
  fileTypes: {
    pdf: '#FF5722',
    image: '#2196F3',
    document: '#4CAF50',
    audio: '#FF9800',
    default: '#9E9E9E',
    archive: '#795548',
    video: '#E91E63',
    other: '#9C27B0'
  }
});

// Default colors (light theme)
export const Colors = getThemeColors(false);

// Simplified Typography System
export const Typography = {
  // Font Families
  fontFamily: {
    regular: 'Muli-Regular',
    light: 'Muli-Light',
    italic: 'Muli-Italic',
    lightItalic: 'Muli-LightItalic',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// Simplified Spacing System
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

// Simplified Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Simplified Theme-aware Shadows
export const getThemeShadows = (isDark: boolean) => ({
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.5 : 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.6 : 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
});

// Legacy shadows for backward compatibility
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
};

// Screen Dimensions
export const ScreenDimensions = {
  width: screenWidth,
  height: screenHeight,
  isSmallScreen: screenWidth < 375,
  isMediumScreen: screenWidth >= 375 && screenWidth < 414,
  isLargeScreen: screenWidth >= 414,
};

// Simplified Common Styles
export const CommonStyles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  
  // Text Styles
  text: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  
  textSmall: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  textLarge: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  
  textTitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  
  textSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
  },
  
  textCaption: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textLight,
  },
  
  // Button Styles
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  
  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  
  buttonText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    fontWeight: '500' as const,
  },
  
  // Input Styles
  input: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
  },
  
  // Card Styles
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  
  // Header Styles
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadows.md,
  },
  
  headerTitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xl,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  
  // List Styles
  listItem: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  // Avatar Styles
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[300],
  },
  
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray[300],
  },
  
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray[300],
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing['3xl'],
  },
  
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: '600' as const,
  },
  
  emptySubtext: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
    marginBottom: Spacing['3xl'],
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    maxHeight: '80%',
    minHeight: '50%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  modalTitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['3xl'],
    paddingHorizontal: Spacing.lg,
    height: 50,
    ...Shadows.sm,
  },
  
  searchInput: {
    flex: 1,
    marginLeft: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  
  // Message Styles
  messageBubble: {
    maxWidth: '75%',
    borderRadius: BorderRadius['3xl'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.sm,
  },
  
  messageBubbleSent: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  
  messageBubbleReceived: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  
  messageText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  
  messageTextSent: {
    color: Colors.white,
  },
  
  messageTextReceived: {
    color: Colors.textPrimary,
  },
  
  messageTime: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  
  messageTimeSent: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  messageTimeReceived: {
    color: Colors.textLight,
  },
  
  // Tab Bar Styles
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    ...Shadows.lg,
  },
  
  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: 110,
    right: Spacing.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xl,
  },
});

// Utility Functions
export const getFontFamily = (weight: 'regular' | 'light' | 'italic' | 'lightItalic' = 'regular') => {
  return Typography.fontFamily[weight];
};

export const getFontSize = (size: keyof typeof Typography.fontSize = 'base') => {
  return Typography.fontSize[size];
};

export const getSpacing = (size: keyof typeof Spacing = 'md') => {
  return Spacing[size];
};

export const getBorderRadius = (size: keyof typeof BorderRadius = 'md') => {
  return BorderRadius[size];
};

export const getShadow = (size: 'sm' | 'md' | 'lg' | 'xl' = 'sm') => {
  return Shadows[size];
};

// Responsive Helpers
export const isSmallScreen = () => ScreenDimensions.isSmallScreen;
export const isMediumScreen = () => ScreenDimensions.isMediumScreen;
export const isLargeScreen = () => ScreenDimensions.isLargeScreen;

// Platform Helpers
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
