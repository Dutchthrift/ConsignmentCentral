/**
 * Utility functions for pricing calculations
 */

/**
 * Calculate commission and payout amounts based on the estimated value
 * @param estimatedValue - The estimated value in cents
 * @returns Object with commission rate, amount and payout amount
 */
export function calculateCommission(estimatedValue: number) {
  // Default commission rate is 30%
  const commissionRate = 30;
  
  // Calculate commission amount
  const commissionAmount = Math.round(estimatedValue * (commissionRate / 100));
  
  // Calculate payout amount (what the consignor receives)
  const payoutAmount = estimatedValue - commissionAmount;
  
  return {
    commissionRate,
    commissionAmount,
    payoutAmount
  };
}