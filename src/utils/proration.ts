export interface BedTransferProrationResult {
  fromRentPaise: number;
  toRentPaise: number;
  differencePaise: number;
  effectiveDate: Date;
  effectiveType: 'immediate' | 'next_month' | 'custom';
  totalDaysInMonth: number;
  remainingDaysInMonth: number;
  proratedAdjustmentPaise: number;
  isHigherRent: boolean;
  isLowerRent: boolean;
  isSameRent: boolean;
  explanation: string;
}

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

/**
 * Calculates rent proration and billing adjustment for owner-managed bed transfers.
 */
export const calculateBedTransferProration = (
  fromRentPaise: number,
  toRentPaise: number,
  effectiveDate: Date,
  effectiveType: 'immediate' | 'next_month' | 'custom',
): BedTransferProrationResult => {
  const isSameRent = fromRentPaise === toRentPaise;
  const isHigherRent = toRentPaise > fromRentPaise;
  const isLowerRent = toRentPaise < fromRentPaise;
  const differencePaise = toRentPaise - fromRentPaise;

  if (effectiveType === 'next_month' || isSameRent) {
    return {
      fromRentPaise,
      toRentPaise,
      differencePaise,
      effectiveDate,
      effectiveType,
      totalDaysInMonth: 0,
      remainingDaysInMonth: 0,
      proratedAdjustmentPaise: 0,
      isHigherRent,
      isLowerRent,
      isSameRent,
      explanation: isSameRent
        ? 'Same monthly rent. No proration adjustment needed.'
        : 'Transfer effective from next billing cycle. Current month rent remains unchanged; new rent applies from next month.',
    };
  }

  const year = effectiveDate.getFullYear();
  const month = effectiveDate.getMonth() + 1; // 1-12
  const effectiveDay = effectiveDate.getDate();
  const totalDays = getDaysInMonth(year, month);
  const remainingDays = Math.max(0, totalDays - effectiveDay + 1);

  // Prorated adjustment in integer paise = Math.round((differencePaise * remainingDays) / totalDays)
  const proratedAdjustmentPaise = Math.round((differencePaise * remainingDays) / totalDays);

  let explanation = '';
  if (isHigherRent) {
    explanation = `Rent increases by ₹${Math.round(differencePaise / 100).toLocaleString('en-IN')}/mo. Prorated adjustment for ${remainingDays} remaining days in current month is +₹${Math.round(proratedAdjustmentPaise / 100).toLocaleString('en-IN')}.`;
  } else if (isLowerRent) {
    explanation = `Rent reduces by ₹${Math.round(Math.abs(differencePaise) / 100).toLocaleString('en-IN')}/mo. Prorated credit for ${remainingDays} remaining days in current month is -₹${Math.round(Math.abs(proratedAdjustmentPaise) / 100).toLocaleString('en-IN')}.`;
  }

  return {
    fromRentPaise,
    toRentPaise,
    differencePaise,
    effectiveDate,
    effectiveType,
    totalDaysInMonth: totalDays,
    remainingDaysInMonth: remainingDays,
    proratedAdjustmentPaise,
    isHigherRent,
    isLowerRent,
    isSameRent,
    explanation,
  };
};
