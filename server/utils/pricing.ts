/**
 * Utilities for pricing calculations
 */

/**
 * Calculate commission and payout based on the estimated value
 * @param estimatedValue - Value in cents (integer)
 * @returns Object with commission rate, commission amount and payout amount
 */
export function calculateCommission(estimatedValue: number) {
  // Use 30% standard commission rate
  const commissionRate = 30;
  const commissionAmount = Math.round(estimatedValue * (commissionRate / 100));
  const payoutAmount = estimatedValue - commissionAmount;
  
  return {
    commissionRate,
    commissionAmount,
    payoutAmount
  };
}