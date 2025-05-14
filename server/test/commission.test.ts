// Simple test file for the commission calculator

import { calculateCommission, checkEligibility } from '../utils/commission.ts';

// Test cases for different price tiers
console.log('=== Commission Calculator Tests ===');

// Test Tier 1: €50 – €99.99 → 50% commission
const tier1Test = calculateCommission(75, 'cash');
console.log('Tier 1 Test (€75):');
console.log('- Commission Rate:', tier1Test.commissionRate + '%');
console.log('- Commission Amount:', tier1Test.commissionAmount?.toFixed(2) + '€');
console.log('- Payout Amount:', tier1Test.payoutAmount?.toFixed(2) + '€');
console.log('');

// Test Tier 2: €100 – €199.99 → 40% commission
const tier2Test = calculateCommission(150, 'cash');
console.log('Tier 2 Test (€150):');
console.log('- Commission Rate:', tier2Test.commissionRate + '%');
console.log('- Commission Amount:', tier2Test.commissionAmount?.toFixed(2) + '€');
console.log('- Payout Amount:', tier2Test.payoutAmount?.toFixed(2) + '€');
console.log('');

// Test Tier 3: €200 – €499.99 → 30% commission
const tier3Test = calculateCommission(300, 'cash');
console.log('Tier 3 Test (€300):');
console.log('- Commission Rate:', tier3Test.commissionRate + '%');
console.log('- Commission Amount:', tier3Test.commissionAmount?.toFixed(2) + '€');
console.log('- Payout Amount:', tier3Test.payoutAmount?.toFixed(2) + '€');
console.log('');

// Test Tier 4: €500+ → 20% commission
const tier4Test = calculateCommission(750, 'cash');
console.log('Tier 4 Test (€750):');
console.log('- Commission Rate:', tier4Test.commissionRate + '%');
console.log('- Commission Amount:', tier4Test.commissionAmount?.toFixed(2) + '€');
console.log('- Payout Amount:', tier4Test.payoutAmount?.toFixed(2) + '€');
console.log('');

// Test store credit bonus: add 10% to payout
const creditTest = calculateCommission(300, 'storecredit');
console.log('Store Credit Test (€300):');
console.log('- Commission Rate:', creditTest.commissionRate + '%');
console.log('- Commission Amount:', creditTest.commissionAmount?.toFixed(2) + '€');
console.log('- Payout Amount:', creditTest.payoutAmount?.toFixed(2) + '€');
console.log('- Cash equivalent:', tier3Test.payoutAmount?.toFixed(2) + '€');
console.log('- Bonus value:', (creditTest.payoutAmount! - tier3Test.payoutAmount!).toFixed(2) + '€');
console.log('');

// Test ineligible item
const ineligibleTest = calculateCommission(40, 'cash');
console.log('Ineligible Item Test (€40):');
console.log('- Eligible:', ineligibleTest.eligible);
console.log('- Message:', ineligibleTest.message);
console.log('');

// Test eligibility check
const eligibilityPass = checkEligibility(50);
console.log('Eligibility Check (€50):');
console.log('- Eligible:', eligibilityPass.eligible);
console.log('');

const eligibilityFail = checkEligibility(45);
console.log('Eligibility Check (€45):');
console.log('- Eligible:', eligibilityFail.eligible);
console.log('- Message:', eligibilityFail.message);
console.log('- Reason:', eligibilityFail.reason);
console.log('');

console.log('=== Tests Complete ===');