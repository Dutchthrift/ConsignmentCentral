/**
 * Pricing utility functions
 */

// Calculate commission based on item value
export function calculateCommission(itemValue: number): {
  commissionRate: number;
  commissionAmount: number;
  sellerPayout: number;
} {
  // Default commission rate is 30%
  const commissionRate = 30;
  const commissionAmount = Math.round(itemValue * (commissionRate / 100));
  const sellerPayout = itemValue - commissionAmount;
  
  return {
    commissionRate,
    commissionAmount,
    sellerPayout
  };
}

// Check item eligibility for consignment
export function checkEligibility(itemValue: number): {
  eligible: boolean;
  reason?: string;
} {
  // Minimum item value for consignment is €20
  if (itemValue < 2000) { // €20.00 in cents
    return {
      eligible: false,
      reason: "Item value is below our minimum threshold of €20.00"
    };
  }
  
  return {
    eligible: true
  };
}