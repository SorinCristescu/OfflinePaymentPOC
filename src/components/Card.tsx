/**
 * Card Component - Container with elevation and styling
 */

import React from 'react';
import {View, StyleSheet, StyleProp, ViewStyle} from 'react-native';
import {theme as staticTheme} from '../theme';
import {useTheme} from '../contexts/ThemeContext';
import {Colors} from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  padding?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  padding = true,
  style,
}) => {
  const {theme} = useTheme();
  const styles = createStyles(theme);

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        padding && styles.padding,
        style,
      ]}>
      {children}
    </View>
  );
};

const createStyles = (themeColors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: themeColors.surface.primary,
    borderRadius: staticTheme.borderRadius.lg,
    borderWidth: staticTheme.borderWidth.thin,
    borderColor: themeColors.border.light,
    ...staticTheme.componentShadows.card,
  },
  elevated: {
    ...staticTheme.componentShadows.cardElevated,
    borderWidth: 0,
  },
  padding: {
    padding: staticTheme.spacing.lg,
  },
});
