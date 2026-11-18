import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface DecorativeWaveFooterProps {
  height?: number;
  style?: ViewStyle;
}

/**
 * Signature bottom wave illustration matching design with cyan (#19D3E6)
 * and olive green (#4F5330) curved layers. Placed at the bottom of screens
 * and sheets where the bottom toolbar is not present.
 */
export const DecorativeWaveFooter: React.FC<DecorativeWaveFooterProps> = ({
  height = 36,
  style,
}) => {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: '100%',
          height,
          overflow: 'hidden',
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      <Svg width="100%" height={height} viewBox="0 0 360 36" preserveAspectRatio="none">
        {/* Cyan wave layer emerging from center-left and sweeping up to top-right */}
        <Path d="M0,36 L100,36 C160,35 220,18 360,4 L360,36 L0,36 Z" fill="#19D3E6" />
        {/* Olive green wave layer starting high on left, dipping in center, and tapering at bottom-right */}
        <Path d="M0,14 C60,26 140,33 220,30 C280,27 320,24 360,22 L360,36 L0,36 Z" fill="#4F5330" />
      </Svg>
    </View>
  );
};
