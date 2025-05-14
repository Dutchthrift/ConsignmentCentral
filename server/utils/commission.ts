/**
 * Calculates commission and payout amount based on a sliding scale approach
 * 
 * Uses linear interpolation between these anchor points:
 * - At €50 → 50% commission
 * - At €100 → 40% commission
 * - At €200 → 30% commission
 * - At €500 and above → 20% commission
 * 
 * Between these points, commission decreases linearly per euro.
 * For example:
 * - €75 → commission ~45%
 * - €350 → commission ~25%
 * 
 * If payoutType is "storecredit", add 10% bonus to net payout
 * 
 * @param salePrice - The sale price in EUR
 * @param payoutType - Either "cash" or "storecredit"
 * @returns Object containing commission rate, commission amount, and payout amount
 */
export function calculateCommission(salePrice: number, payoutType: string = "cash"): {
  eligible: boolean;
  commissionRate?: number;
  commissionAmount?: number;
  payoutAmount?: number;
  payoutType?: string;
  message?: string;
} {
  // Validate inputs
  if (typeof salePrice !== 'number' || salePrice < 0) {
    throw new Error('Sale price must be a positive number');
  }
  
  if (payoutType !== 'cash' && payoutType !== 'storecredit') {
    throw new Error('Payout type must be either "cash" or "storecredit"');
  }
  
  // Items below €50 are not eligible for consignment
  if (salePrice < 50) {
    return {
      eligible: false,
      message: "Items with an expected resale price below €50 are not eligible for consignment."
    };
  }
  
  // Define the commission tiers with sliding scale anchors
  const tiers = [
    { min: 50, max: 99.99, from: 0.50, to: 0.40 },
    { min: 100, max: 199.99, from: 0.40, to: 0.30 },
    { min: 200, max: 499.99, from: 0.30, to: 0.20 },
    { min: 500, max: Infinity, from: 0.20, to: 0.20 } // flat rate above €500
  ];
  
  // Determine commission rate based on sliding scale
  let commissionRate: number;
  
  // Find the applicable tier
  const tier = tiers.find(t => salePrice >= t.min && salePrice <= t.max);
  
  if (!tier) {
    // This should never happen given our tier definitions, but just in case
    commissionRate = 0.20; // Default to lowest rate
  } else {
    if (tier.min === tier.max || tier.from === tier.to) {
      // Flat rate tier (like the €500+ tier)
      commissionRate = tier.from;
    } else {
      // Calculate linear interpolation between the tier boundaries
      const position = (salePrice - tier.min) / (tier.max - tier.min);
      commissionRate = tier.from - position * (tier.from - tier.to);
    }
  }
  
  // Calculate commission amount
  const commissionAmount = salePrice * commissionRate;
  
  // Calculate initial payout (sale price minus commission)
  let payoutAmount = salePrice - commissionAmount;
  
  // Apply store credit bonus if applicable
  if (payoutType === 'storecredit') {
    // Add 10% bonus to the payout amount
    const bonusAmount = payoutAmount * 0.10;
    payoutAmount += bonusAmount;
  }
  
  return {
    eligible: true,
    commissionRate: Number((commissionRate * 100).toFixed(1)), // Convert to percentage with 1 decimal point
    commissionAmount,
    payoutAmount,
    payoutType
  };
}

/**
 * Check if an item is eligible for consignment based on estimated resale value
 * 
 * @param estimatedResaleValue - The estimated resale value in EUR
 * @returns Object indicating eligibility and reason
 */
export function checkEligibility(estimatedResaleValue: number): {
  eligible: boolean;
  message?: string;
  reason?: string;
} {
  if (typeof estimatedResaleValue !== 'number' || estimatedResaleValue < 0) {
    throw new Error('Estimated resale value must be a positive number');
  }
  
  if (estimatedResaleValue < 50) {
    return {
      eligible: false,
      message: "Items with an expected resale price below €50 are not eligible for consignment.",
      reason: "Due to handling costs, margin requirements, and resale risk, we can only accept items with a resale value of €50 or more."
    };
  }
  
  return {
    eligible: true
  };
}