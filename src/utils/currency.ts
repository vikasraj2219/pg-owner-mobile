/**
 * Formats integer paise into a human-readable Indian Rupee string (₹).
 * Example: 850000 paise -> "₹8,500.00"
 */
export const formatINR = (paise: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
};

/**
 * Converts whole rupees into integer paise.
 * Example: 8500 -> 850000
 */
export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};
