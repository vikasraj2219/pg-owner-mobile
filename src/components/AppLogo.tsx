import React from 'react';
import { View } from 'react-native';

interface AppLogoProps {
  size?: number; // size in px, default 44
  variant?: 'green' | 'white'; // green bg with white dots, or white bg with green dots
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 44, variant = 'green' }) => {
  const isWhite = variant === 'white';
  const bgColor = isWhite ? '#FFFFFF' : '#0A6C50';
  const dotColor = isWhite ? '#0A6C50' : '#FFFFFF';

  // Proportional sizing
  const borderRadius = Math.round(size * 0.28);
  const padding = Math.round(size * 0.22);
  const gap = Math.round(size * 0.12);
  const dotRadius = Math.max(2, Math.round(size * 0.08));

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        borderRadius,
        padding,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            flex: 1,
            marginBottom: gap,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: dotColor,
              borderRadius: dotRadius,
              marginRight: gap,
            }}
          />
          <View
            style={{
              flex: 1,
              backgroundColor: dotColor,
              borderRadius: dotRadius,
            }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            flex: 1,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: dotColor,
              borderRadius: dotRadius,
              marginRight: gap,
            }}
          />
          <View
            style={{
              flex: 1,
              backgroundColor: dotColor,
              borderRadius: dotRadius,
            }}
          />
        </View>
      </View>
    </View>
  );
};
