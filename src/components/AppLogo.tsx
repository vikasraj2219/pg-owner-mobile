import React from 'react';
import { View, Image, Text } from 'react-native';
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
        <Text
          style={{
            color: '#4F5330',
            fontSize: Math.round(size * 0.58),
            fontWeight: '900',
            fontStyle: 'italic',
            transform: [{ skewX: '-6deg' }],
            marginTop: -Math.round(size * 0.04),
          }}
        >
          N
        </Text>
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
