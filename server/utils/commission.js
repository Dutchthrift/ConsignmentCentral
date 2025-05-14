/**
 * Calculates commission and payout amount based on tiered structure
 * 
 * Tier structure:
 * - €50 – €99.99 → 50% commission
 * - €100 – €199.99 → 40% commission
 * - €200 – €499.99 → 30% commission
 * - €500 and up → 20% commission
 * 
 * If payoutType is "storecredit", add 10% bonus to net payout
 * 
 * @param {number} salePrice - The sale price in EUR
 * @param {string} payoutType - Either "cash" or "storecredit"
 * @returns {Object} Object containing commission rate, commission amount, and payout amount
 */
function calculateCommission(salePrice, payoutType = "cash") {
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
  
  // Determine commission rate based on sale price tier
  let commissionRate;
  
  if (salePrice >= 50 && salePrice < 100) {
    commissionRate = 0.50; // 50%
  } else if (salePrice >= 100 && salePrice < 200) {
    commissionRate = 0.40; // 40%
  } else if (salePrice >= 200 && salePrice < 500) {
    commissionRate = 0.30; // 30%
  } else { // salePrice >= 500
    commissionRate = 0.20; // 20%
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
    commissionRate: commissionRate * 100, // Convert to percentage
    commissionAmount,
    payoutAmount,
    payoutType
  };
}

/**
 * Check if an item is eligible for consignment based on estimated resale value
 * 
 * @param {number} estimatedResaleValue - The estimated resale value in EUR
 * @returns {Object} Object indicating eligibility and reason
 */
function checkEligibility(estimatedResaleValue) {
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

module.exports = {
  calculateCommission,
  checkEligibility
};