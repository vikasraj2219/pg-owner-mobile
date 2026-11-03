import React from 'react';
import { View, Image } from 'react-native';
import nilaayaLogoWhite from '../../assets/nilaaya-logo-white.png';

interface AppLogoProps {
  size?: number; // size in px, default 44
  variant?: 'green' | 'white'; // green squircle with white logo, or white logo on transparent
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 44, variant = 'green' }) => {
  const isWhite = variant === 'white';
  const borderRadius = Math.round(size * 0.28);

  if (isWhite) {
    // Pure white Nilaaya logo on transparent background
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={nilaayaLogoWhite}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Emerald squircle (#0A6C50) with white Nilaaya logo inside
  const iconSize = Math.round(size * 0.72);
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: '#0A6C50',
        borderRadius,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Image
        source={nilaayaLogoWhite}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
    </View>
  );
};
