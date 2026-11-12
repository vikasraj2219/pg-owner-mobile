import React, { useMemo } from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Line,
  G,
  Path,
  Text,
} from 'react-native-svg';
import { generateQrSvgPath } from '../utils/qrPath';

export interface RentPaymentPassSvgProps {
  propertyName: string;
  tenantName: string;
  bedNo: string;
  invoiceNo: string;
  amountFormatted: string;
  upiVpa: string;
  upiPayload: string;
  overdueText?: string;
  getRef?: (ref: Svg | null) => void;
}

export function RentPaymentPassSvg({
  propertyName,
  tenantName,
  bedNo,
  invoiceNo,
  amountFormatted,
  upiVpa,
  upiPayload,
  overdueText,
  getRef,
}: RentPaymentPassSvgProps) {
  const shortInvoice = useMemo(() => {
    if (!invoiceNo) return 'RENT';
    return invoiceNo.replace(/^INV-|^RCP-/, '');
  }, [invoiceNo]);

  // Size of QR inside the white card
  const qrResult = useMemo(() => {
    return generateQrSvgPath(upiPayload, 220);
  }, [upiPayload]);

  return (
    <Svg ref={getRef} width={420} height={580} viewBox="0 0 420 580">
      <Defs>
        <LinearGradient id="passBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1D64F2" />
          <Stop offset="100%" stopColor="#1856D1" />
        </LinearGradient>
      </Defs>

      {/* Main Ticket Card Background */}
      <Rect width={420} height={580} rx={32} fill="url(#passBg)" />

      {/* Top Header */}
      <Text x={30} y={48} fill="#FFFFFF" fontSize={22} fontWeight="900">
        {propertyName}
      </Text>

      <Text
        x={390}
        y={48}
        textAnchor="end"
        fill="#FDE047"
        fontSize={11}
        fontWeight="800"
        letterSpacing="1.5"
      >
        RENT PASS
      </Text>

      <Text x={30} y={80} fill="#E2E8F0" fontSize={13} fontWeight="600">
        {`${bedNo}  →  ${tenantName}  ·  ID: ${shortInvoice}`}
      </Text>

      {/* Semicircular Ticket Cutout Notches */}
      <Circle cx={0} cy={110} r={16} fill="#F8F9FA" />
      <Circle cx={420} cy={110} r={16} fill="#F8F9FA" />

      {/* Dashed Line */}
      <Line
        x1={24}
        y1={110}
        x2={396}
        y2={110}
        stroke="#FFFFFF"
        strokeOpacity={0.35}
        strokeWidth={2}
        strokeDasharray="6, 6"
      />

      {/* Instruction */}
      <Text x={210} y={145} textAnchor="middle" fill="#FFFFFF" fontSize={13} fontWeight="700">
        {overdueText
          ? `Pay dues (${overdueText}) via UPI`
          : 'Show / Scan this QR to pay rent via UPI'}
      </Text>

      {/* Center White Rounded Card for QR Code */}
      <Rect x={70} y={165} width={280} height={280} rx={28} fill="#FFFFFF" />

      {/* QR Code Matrix */}
      {qrResult.path ? (
        <G transform="translate(100, 195)">
          <Path d={qrResult.path} stroke="#000000" strokeWidth={qrResult.cellSize} />
        </G>
      ) : null}

      {/* Lower Section matching Fresh Bus */}
      <Text
        x={210}
        y={480}
        textAnchor="middle"
        fill="#A7F3D0"
        fontSize={11}
        fontWeight="800"
        letterSpacing="1.5"
      >
        TOTAL AMOUNT TO PAY
      </Text>

      <Text x={210} y={518} textAnchor="middle" fill="#FDE047" fontSize={34} fontWeight="900">
        {amountFormatted}
      </Text>

      <Text x={210} y={544} textAnchor="middle" fill="#FFFFFF" fontSize={13} fontWeight="700">
        {`UPI: ${upiVpa}`}
      </Text>

      <Text x={210} y={564} textAnchor="middle" fill="#A7F3D0" fontSize={11} fontWeight="600">
        Google Pay · PhonePe · Paytm · BHIM
      </Text>
    </Svg>
  );
}
