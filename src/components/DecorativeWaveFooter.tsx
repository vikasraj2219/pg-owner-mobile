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
  height = 42,
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
      <Svg width="100%" height={height} viewBox="0 0 360 44" preserveAspectRatio="none">
        {/* Cyan wave layer emerging from center-left (~38% width) and sweeping up to top-right */}
        <Path d="M135,44 C190,42 260,20 360,6 L360,44 L135,44 Z" fill="#19D3E6" />
        {/* Olive green wave layer starting high on left, dipping in center-left (~38% width), and gently tapering at bottom-right */}
        <Path d="M0,16 C45,28 90,41 140,41 C210,41 290,36 360,30 L360,44 L0,44 Z" fill="#4F5330" />
      </Svg>
    </View>
  );
};
