/**
 * Formats integer paise into a human-readable Indian Rupee string (₹).
 * Uses pure JS Indian numbering system (e.g. ₹1,50,000 or ₹8,500.50)
 * Completely eliminates native Hermes Android Intl.NumberFormat crashes across OEM devices.
 *
 * Example: 850000 paise -> "₹8,500"
 * Example: 850050 paise -> "₹8,500.50"
 */
export const formatINR = (paise: number, forceDecimals = false): string => {
  try {
    const safePaise = typeof paise === 'number' && !isNaN(paise) ? paise : 0;
    const isNegative = safePaise < 0;
    const absPaise = Math.abs(safePaise);
    const rupees = absPaise / 100;

    const parts = rupees.toFixed(forceDecimals || absPaise % 100 !== 0 ? 2 : 0).split('.');
    let intPart = parts[0];
    const decPart = parts[1] ? `.${parts[1]}` : '';

    // Indian numbering format: last 3 digits, then groups of 2 digits
    if (intPart.length > 3) {
      const lastThree = intPart.substring(intPart.length - 3);
      const otherDigits = intPart.substring(0, intPart.length - 3);
      intPart = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }

    return `${isNegative ? '-' : ''}₹${intPart}${decPart}`;
  } catch (_err) {
    const fallback = typeof paise === 'number' && !isNaN(paise) ? Math.round(paise / 100) : 0;
    return `₹${fallback}`;
  }
};

/**
 * Formats integer paise into compact Lakhs (L) format if >= ₹1,00,000.
 * Example: 21800000 paise (₹2,18,000) -> "₹2.18L"
 */
export const formatINRCompact = (paise: number): string => {
  try {
    const safePaise = typeof paise === 'number' && !isNaN(paise) ? paise : 0;
    const isNegative = safePaise < 0;
    const rupees = Math.abs(safePaise) / 100;
    if (rupees >= 100000) {
      const formattedLakhs = (rupees / 100000).toFixed(2).replace(/\.?0+$/, '');
      return `${isNegative ? '-' : ''}₹${formattedLakhs}L`;
    }
    return formatINR(safePaise);
  } catch (_err) {
    return formatINR(paise);
  }
};

/**
 * Converts whole rupees into integer paise.
 * Example: 8500 -> 850000
 */
export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};
