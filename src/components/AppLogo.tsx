import React from 'react';
import { View, Image } from 'react-native';
import nilaayaLogoWhite from '../../assets/nilaaya-logo-white.png';

interface AppLogoProps {
  size?: number; // size in px, default 44
  variant?: 'green' | 'white' | 'nilaaya-card'; // green squircle with white logo, white logo on transparent, or white card with olive N
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 44, variant = 'green' }) => {
  const isWhite = variant === 'white';
  const isNilaayaCard = variant === 'nilaaya-card';
  const borderRadius = Math.round(size * 0.28);

  if (isNilaayaCard) {
    const iconSize = Math.round(size * 0.7);
    return (
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: '#FFFFFF',
          borderRadius,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Image
          source={nilaayaLogoWhite}
          style={{
            width: iconSize,
            height: iconSize,
            tintColor: '#4F5330',
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

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

  // Olive squircle (#4F5330) with white Nilaaya logo inside
  const iconSize = Math.round(size * 0.68);
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: '#4F5330',
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
