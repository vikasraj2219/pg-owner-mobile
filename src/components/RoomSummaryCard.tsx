import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle, Ellipse, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BedDouble } from 'lucide-react-native';
import { formatINR } from '../utils/currency';

interface RoomSummaryCardProps {
  bedsCount: number;
  rentPerBedNumeric: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 3D Isometric Bed Illustration matching User Reference Design
 */
const BedIllustration: React.FC = () => {
  return (
    <Svg width={96} height={62} viewBox="0 0 110 70" fill="none">
      <Defs>
        <LinearGradient id="quiltGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#22D3EE" />
          <Stop offset="60%" stopColor="#06B6D4" />
          <Stop offset="100%" stopColor="#0891B2" />
        </LinearGradient>
        <LinearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#D99B59" />
          <Stop offset="100%" stopColor="#A4642C" />
        </LinearGradient>
        <LinearGradient id="woodDark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#A4642C" />
          <Stop offset="100%" stopColor="#7E4518" />
        </LinearGradient>
      </Defs>

      {/* Soft Ground Shadow */}
      <Ellipse cx="58" cy="62" rx="46" ry="6" fill="#0F766E" fillOpacity={0.12} />

      {/* Bed Headboard (Back Left) */}
      <G>
        {/* Headboard wooden frame */}
        <Path d="M20 18 L38 8 C40 7 43 7 45 8 L48 10 L48 30 L20 38 Z" fill="url(#woodGrad)" />
        {/* Headboard teal cushion accent */}
        <Path
          d="M23 20 L38 12 C39.5 11.2 41.5 11.2 43 12 L45 13 L45 28 L23 34 Z"
          fill="#0891B2"
          fillOpacity={0.9}
        />
        <Path
          d="M23 20 L38 12 C39.5 11.2 41.5 11.2 43 12 L45 13"
          stroke="#155E75"
          strokeWidth={0.8}
        />
      </G>

      {/* White Pillows */}
      <G>
        {/* Left Pillow */}
        <Path
          d="M27 25 L36 20 C37 19.5 39 20 40 21 L38 27 C37 28 35 28 34 27 Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth={0.7}
        />
        {/* Right Pillow */}
        <Path
          d="M39 22 L47 17 C48.5 16.5 50.5 17 51.5 18 L49 24 C48 25 46 25 45 24 Z"
          fill="#F8FAFC"
          stroke="#CBD5E1"
          strokeWidth={0.7}
        />
      </G>

      {/* Bed Mattress & Sheet Fold */}
      <G>
        {/* Mattress Base */}
        <Path d="M22 36 L48 23 L82 41 L56 54 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth={0.8} />
        {/* Quilt / Duvet (Turquoise) */}
        <Path d="M29 39 L51 28 L82 44 L60 55 Z" fill="url(#quiltGrad)" />
        {/* Quilt top fold highlight */}
        <Path d="M29 39 L51 28" stroke="#E0F2FE" strokeWidth={1.5} />
        {/* Quilt side drape */}
        <Path d="M29 39 L60 55 L60 57 L29 42 Z" fill="#0E7490" />
      </G>

      {/* Bed Wooden Frame & Footboard (Front Right) */}
      <G>
        {/* Front Wooden Rail */}
        <Path d="M22 37 L56 54 L56 59 L22 42 Z" fill="url(#woodGrad)" />
        {/* Footboard / Right Frame */}
        <Path d="M56 54 L84 40 L84 45 L56 59 Z" fill="url(#woodDark)" />
        {/* Front-center leg */}
        <Rect x="54" y="55" width="4" height="6.5" rx="1" fill="#7E4518" />
        {/* Left leg */}
        <Rect x="21" y="40" width="3.5" height="5" rx="1" fill="#7E4518" />
        {/* Right corner post */}
        <Rect x="83" y="38" width="3.5" height="9" rx="1" fill="#7E4518" />
      </G>

      {/* Bedside Nightstand & Plant (Right) */}
      <G>
        {/* Nightstand Shadow */}
        <Ellipse cx="96" cy="58" rx="8" ry="2.5" fill="#0F766E" fillOpacity={0.12} />
        {/* Nightstand Body */}
        <Path d="M90 44 L98 39 L104 42 L96 47 Z" fill="#D99B59" />
        <Path d="M90 44 L96 47 L96 57 L90 53 Z" fill="#BF854B" />
        <Path d="M96 47 L104 42 L104 52 L96 57 Z" fill="#945826" />
        {/* Drawer knob */}
        <Circle cx="93" cy="49" r="1.1" fill="#FEF08A" />
        <Circle cx="93" cy="53" r="1.1" fill="#FEF08A" />

        {/* Small Terracotta Pot on Nightstand */}
        <Path d="M96.5 42 L98.5 41 L100 42 L98 43.5 Z" fill="#EA580C" />
        {/* Green Succulent Plant Leaves */}
        <Circle cx="98" cy="38.5" r="2.2" fill="#16A34A" />
        <Path d="M97 39 C96 36 99 35 98 33 C99 35 101 37 99 39 Z" fill="#22C55E" />
      </G>
    </Svg>
  );
};

export const RoomSummaryCard: React.FC<RoomSummaryCardProps> = ({
  bedsCount,
  rentPerBedNumeric,
  style,
}) => {
  const safeCount = Math.max(1, bedsCount || 1);
  const safeRent = Math.max(0, rentPerBedNumeric || 0);
  const totalMonthly = safeCount * safeRent;

  return (
    <View
      style={[
        {
          backgroundColor: '#E6F7F2',
          borderWidth: 1,
          borderColor: '#BCECE0',
          borderRadius: 22,
          paddingLeft: 16,
          paddingRight: 8,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          shadowColor: '#0A6C50',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        },
        style,
      ]}
    >
      {/* Left Column: Icon + Text */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 6 }}>
        {/* Teal Bed Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#D1F2EA',
            borderWidth: 1,
            borderColor: '#A7E8D8',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <BedDouble size={22} color="#0D9488" strokeWidth={2.4} />
        </View>

        {/* Texts */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: '#0C192B',
              letterSpacing: -0.2,
            }}
          >
            Room Summary
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '600',
              color: '#334155',
              marginTop: 3,
              lineHeight: 18,
            }}
          >
            {safeCount} {safeCount === 1 ? 'Bed' : 'Beds'} • {formatINR(safeRent * 100)} each •{' '}
            <Text style={{ fontWeight: '800', color: '#0C192B' }}>
              {formatINR(totalMonthly * 100)}
            </Text>{' '}
            / month
          </Text>
        </View>
      </View>

      {/* Right Column: Isometric 3D Bed Graphic */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <BedIllustration />
      </View>
    </View>
  );
};
