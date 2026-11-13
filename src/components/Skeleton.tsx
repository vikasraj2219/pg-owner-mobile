import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, StyleProp, DimensionValue } from 'react-native';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * Reusable animated pulsing Skeleton block with 60fps native driver animation.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  className,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity: pulseAnim,
        },
        style,
      ]}
      className={className}
    />
  );
};

/**
 * High-fidelity Skeleton loader matching Pulse Dashboard's exact layout.
 * Eliminates visual jumps, layout shifts, and blinks on app launch.
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <View className="flex-1 px-5 pt-3">
      {/* Top PG Selector and Notification Bell */}
      <View className="flex-row items-center justify-between gap-3 mb-4">
        <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl px-4 py-3.5 flex-row items-center justify-between shadow-xs">
          <Skeleton width="65%" height={20} borderRadius={6} />
          <Skeleton width={18} height={18} borderRadius={9} />
        </View>
        <View className="w-13 h-13 bg-white border border-slate-200/80 rounded-2xl items-center justify-center p-3 shadow-xs">
          <Skeleton width={20} height={20} borderRadius={10} />
        </View>
      </View>

      {/* Month & Trial Pill Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Skeleton width={120} height={18} borderRadius={6} />
        <Skeleton width={110} height={24} borderRadius={12} />
      </View>

      {/* Main Card: Collected This Month */}
      <View className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-4 shadow-xs">
        <Skeleton width={140} height={14} borderRadius={6} className="mb-3" />
        <View className="flex-row items-baseline mb-4">
          <Skeleton width={180} height={32} borderRadius={8} />
          <Skeleton width={90} height={16} borderRadius={6} style={{ marginLeft: 8 }} />
        </View>
        {/* Progress bar skeleton */}
        <Skeleton width="100%" height={10} borderRadius={5} className="mb-3" />
        <Skeleton width="60%" height={14} borderRadius={6} />
      </View>

      {/* Pilot Quick-Access Bar (3 buttons) */}
      <View className="flex-row gap-2.5 mb-4">
        <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-3 items-center justify-center shadow-xs">
          <Skeleton width={40} height={40} borderRadius={20} className="mb-2" />
          <Skeleton width={50} height={12} borderRadius={4} />
        </View>
        <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-3 items-center justify-center shadow-xs">
          <Skeleton width={40} height={40} borderRadius={20} className="mb-2" />
          <Skeleton width={40} height={12} borderRadius={4} />
        </View>
        <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-3 items-center justify-center shadow-xs">
          <Skeleton width={40} height={40} borderRadius={20} className="mb-2" />
          <Skeleton width={60} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Two-Column Stats: Occupancy & Net Profit */}
      <View className="flex-row gap-3.5 mb-4">
        <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs min-h-[120px] justify-between">
          <View>
            <Skeleton width={70} height={12} borderRadius={4} className="mb-2" />
            <Skeleton width={90} height={24} borderRadius={6} />
          </View>
          <Skeleton width="75%" height={14} borderRadius={4} className="mt-4" />
        </View>
        <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs min-h-[120px] justify-between">
          <View>
            <Skeleton width={70} height={12} borderRadius={4} className="mb-2" />
            <Skeleton width={100} height={24} borderRadius={6} />
          </View>
          <Skeleton width="80%" height={14} borderRadius={4} className="mt-4" />
        </View>
      </View>

      {/* Bed Inventory Breakdown (4 items) */}
      <View className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-4 shadow-xs">
        <View className="flex-row items-center justify-between mb-3">
          <Skeleton width={110} height={14} borderRadius={4} />
          <Skeleton width={90} height={14} borderRadius={4} />
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 items-center">
            <Skeleton width={45} height={12} borderRadius={4} className="mb-1.5" />
            <Skeleton width={25} height={18} borderRadius={4} />
          </View>
          <View className="flex-1 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 items-center">
            <Skeleton width={45} height={12} borderRadius={4} className="mb-1.5" />
            <Skeleton width={25} height={18} borderRadius={4} />
          </View>
          <View className="flex-1 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 items-center">
            <Skeleton width={45} height={12} borderRadius={4} className="mb-1.5" />
            <Skeleton width={25} height={18} borderRadius={4} />
          </View>
          <View className="flex-1 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 items-center">
            <Skeleton width={45} height={12} borderRadius={4} className="mb-1.5" />
            <Skeleton width={25} height={18} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
};

/**
 * High-fidelity Skeleton loader matching Login Screen layout.
 */
export const LoginSkeleton: React.FC = () => {
  return (
    <View className="flex-1 px-6 py-8 justify-between">
      <View>
        {/* Top Logo */}
        <View className="mb-6">
          <Skeleton width={46} height={46} borderRadius={14} />
        </View>

        {/* Heading & Subtitle */}
        <Skeleton width={220} height={32} borderRadius={8} className="mb-2" />
        <Skeleton width={260} height={16} borderRadius={6} className="mb-8" />

        {/* Input Field 1 (Phone or Email) */}
        <View className="mb-4">
          <Skeleton width={120} height={14} borderRadius={4} className="mb-2" />
          <Skeleton width="100%" height={56} borderRadius={16} />
        </View>

        {/* Input Field 2 (Password) */}
        <View className="mb-4">
          <Skeleton width={80} height={14} borderRadius={4} className="mb-2" />
          <Skeleton width="100%" height={56} borderRadius={16} />
        </View>

        {/* Forgot password */}
        <View className="items-end mb-6">
          <Skeleton width={110} height={14} borderRadius={4} />
        </View>

        {/* Submit button */}
        <Skeleton width="100%" height={56} borderRadius={16} className="mb-4" />

        {/* Biometric button */}
        <Skeleton width="100%" height={52} borderRadius={16} />
      </View>

      {/* Footer */}
      <View className="items-center py-4">
        <Skeleton width={200} height={16} borderRadius={6} />
      </View>
    </View>
  );
};
