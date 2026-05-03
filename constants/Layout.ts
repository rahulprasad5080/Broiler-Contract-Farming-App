import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const isSmallDevice = width < 375;
const isTablet = width >= 768;

export const Layout = {
  window: {
    width,
    height,
  },
  isSmallDevice,
  isTablet,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    round: 999,
  },
  contentMaxWidth: isTablet ? 760 : width,
  formMaxWidth: isTablet ? 680 : width,
  screenPadding: isSmallDevice ? 16 : 24,
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
};
