import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Ticket, QrCode as QrIcon } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

export interface RentPaymentPassCardProps {
  propertyName: string;
  tenantName: string;
  bedNo: string;
  invoiceNo: string;
  amountFormatted: string;
  upiVpa: string;
  upiPayload: string;
  overdueText?: string;
}

export function RentPaymentPassCard({
  propertyName,
  tenantName,
  bedNo,
  invoiceNo,
  amountFormatted,
  upiVpa,
  upiPayload,
  overdueText,
}: RentPaymentPassCardProps) {
  const shortInvoice = useMemo(() => {
    if (!invoiceNo) return 'RENT';
    return invoiceNo.replace(/^INV-|^RCP-/, '');
  }, [invoiceNo]);

  return (
    <View className="w-full rounded-3xl bg-[#1D64F2] overflow-hidden shadow-lg border border-blue-600/40">
      {/* Top Header Section matching Fresh Bus */}
      <View className="px-5 pt-5 pb-4">
        <View className="flex-row items-center justify-between mb-2">
          {/* Brand / PG Property Name */}
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-8 h-8 rounded-xl bg-white/20 items-center justify-center mr-2.5 border border-white/30">
              <QrIcon size={18} color="#FFFFFF" strokeWidth={2.3} />
            </View>
            <Text className="text-xl font-black text-white tracking-tight flex-1" numberOfLines={1}>
              {propertyName}
            </Text>
          </View>

          {/* Right Badge: RENT PASS */}
          <View className="flex-row items-center bg-black/25 px-3 py-1 rounded-full border border-white/20">
            <Ticket size={13} color="#FDE047" strokeWidth={2.5} />
            <Text className="text-[11px] font-black text-[#FDE047] tracking-wider ml-1.5 uppercase">
              RENT PASS
            </Text>
          </View>
        </View>

        {/* Subheader Route/Bed line matching Fresh Bus */}
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-sm font-bold text-[#E2E8F0] flex-1" numberOfLines={1}>
            {bedNo} <Text className="text-[#93C5FD]"> → </Text> {tenantName}
          </Text>
          <Text className="text-xs font-semibold text-[#93C5FD] ml-2">ID: {shortInvoice}</Text>
        </View>
      </View>

      {/* Ticket Cutout Notches & Dashed Tear Line */}
      <View className="relative flex-row items-center justify-between my-1">
        {/* Left Semicircle Notch */}
        <View className="-ml-3 w-6 h-6 rounded-r-full bg-[#F8F9FA]" />

        {/* Dashed Line */}
        <View className="flex-1 mx-2 border-b border-dashed border-white/40" />

        {/* Right Semicircle Notch */}
        <View className="-mr-3 w-6 h-6 rounded-l-full bg-[#F8F9FA]" />
      </View>

      {/* Middle Section: Instruction + QR Card */}
      <View className="px-5 pt-3 pb-6 items-center">
        {/* Instruction label matching Fresh Bus */}
        <View className="flex-row items-center mb-3">
          <QrIcon size={14} color="#BFDBFE" strokeWidth={2.5} />
          <Text className="text-xs font-bold text-white ml-1.5 tracking-wide">
            {overdueText
              ? `Pay dues (${overdueText}) via UPI`
              : 'Show / Scan this QR to pay rent via UPI'}
          </Text>
        </View>

        {/* Center QR White Card with rounded corners */}
        <View className="bg-white rounded-3xl p-4 items-center justify-center shadow-md border border-white/60">
          <QRCode value={upiPayload} size={180} backgroundColor="#FFFFFF" quietZone={10} />
        </View>

        {/* Lower Section matching Fresh Bus bottom access code */}
        <View className="w-full items-center mt-4">
          <Text className="text-[11px] font-black text-[#BFDBFE] tracking-widest uppercase">
            TOTAL AMOUNT TO PAY
          </Text>

          {/* Large Bold Gold Amount like Fresh Bus 109952 */}
          <Text className="text-3xl font-black text-[#FDE047] tracking-tight mt-1">
            {amountFormatted}
          </Text>

          <Text className="text-xs font-bold text-white mt-1">UPI: {upiVpa}</Text>

          <Text className="text-[11px] font-semibold text-[#BFDBFE] mt-1">
            Google Pay · PhonePe · Paytm · BHIM
          </Text>
        </View>
      </View>
    </View>
  );
}
