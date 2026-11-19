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
  height = 48,
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
      <Svg width="100%" height={height} viewBox="0 0 360 60" preserveAspectRatio="none">
        {/* Vibrant Cyan wave layer emerging from center-right (~52% width) and sweeping high up to top-right */}
        <Path d="M175,60 C240,44 300,18 360,2 L360,60 Z" fill="#19D3E6" />
        {/* Dark Olive Green wave layer spanning full width: crests on left (~20%), dips in center (~60%), and gently rises on right */}
        <Path d="M0,44 C50,24 120,28 180,40 C230,48 300,32 360,28 L360,60 L0,60 Z" fill="#4F5330" />
      </Svg>
    </View>
  );
};
