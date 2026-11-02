/**
 * Formats integer paise into a human-readable Indian Rupee string (₹).
 * Example: 850000 paise -> "₹8,500"
 * Example: 850050 paise -> "₹8,500.50"
 */
export const formatINR = (paise: number): string => {
  const safePaise = typeof paise === 'number' && !isNaN(paise) ? paise : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: safePaise % 100 === 0 ? 0 : 2,
  }).format(safePaise / 100);
};

/**
 * Formats integer paise into compact Lakhs (L) format if >= ₹1,00,000.
 * Example: 21800000 paise (₹2,18,000) -> "₹2.18L"
 */
export const formatINRCompact = (paise: number): string => {
  const safePaise = typeof paise === 'number' && !isNaN(paise) ? paise : 0;
  const rupees = safePaise / 100;
  if (Math.abs(rupees) >= 100000) {
    const formattedLakhs = (rupees / 100000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${formattedLakhs}L`;
  }
  return formatINR(safePaise);
};

/**
 * Converts whole rupees into integer paise.
 * Example: 8500 -> 850000
 */
export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};
