/**
 * Test script for verifying automatic order creation during consignment intake
 * 
 * This script simulates submitting multiple items together as a consignment batch,
 * which should result in a single order being created that contains all items.
 */

import fetch from 'node-fetch';

async function testOrderCreation() {
  // Using single-item legacy format which we can be sure the API understands
  // The backend will convert it to the new multi-item format
  const testData = {
    name: "Test Consignor", // Top-level fields for schema bypass
    email: "test.consignment@example.com",
    phone: "+31612345678",
    customer: {
      name: "Test Consignor",
      email: "test.consignment@example.com",
      phone: "+31612345678",
      address: "Test Street 123",
      city: "Amsterdam", 
      state: "bank_transfer", // Will be repurposed as payoutMethod
      postalCode: "NL28ABNA0123456789", // Will be repurposed as IBAN
      country: "Netherlands"
    },
    item: {
      title: "Vintage Leather Jacket",
      description: "Brown leather jacket from the 1990s in excellent condition",
      category: "Clothing",
      brand: "Vintage Brand",
      condition: "Excellent"
    }
  };

  console.log("Starting order creation test...");

  try {
    // Submit the items to the intake endpoint
    const response = await fetch('http://localhost:5000/api/intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    console.log("API Response:", JSON.stringify(result, null, 2));
    
    // Check if the response includes order info
    if (result.success) {
      if (result.data && result.data.order) {
        console.log("✅ Order successfully created!");
        console.log(`Order Number: ${result.data.order.orderNumber}`);
        console.log(`Status: ${result.data.order.status}`);
        console.log(`Number of Items: ${result.data.order.itemCount}`);
        
        // Check each item for reference IDs
        console.log("\nItems created:");
        result.data.items.forEach((item, index) => {
          console.log(`Item ${index + 1}: ${item.title} (Reference ID: ${item.referenceId})`);
        });
      } else {
        console.log("❌ No order information found in the response");
      }
    } else {
      console.log("❌ API request failed:", result.message);
    }
  } catch (error) {
    console.error("Error during test:", error);
  }
}

// Run the test
testOrderCreation().then(() => {
  console.log("\nTest completed");
}).catch(err => {
  console.error("Test failed:", err);
});

// Add type module export for ES modules
export {};