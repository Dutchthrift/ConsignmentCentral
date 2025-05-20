/**
 * Test API Integration for Consignment Intake
 * 
 * This script sends a test request to the API to verify the intake flow
 * without needing to directly connect to the database.
 */

import fetch from 'node-fetch';

// Generate a sample item for testing
function generateTestItem() {
  return {
    title: `Test Item - ${new Date().toISOString()}`,
    description: 'This is an automatically generated test item',
    // Simple 1x1 pixel transparent image in base64
    imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  };
}

// Function to simulate user login and get a session cookie
async function loginAsConsignor() {
  console.log('Logging in as test consignor...');
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'theooenema@hotmail.com',
      password: 'password123'
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to login: ${response.status} ${errorText}`);
  }
  
  const cookies = response.headers.get('set-cookie');
  console.log('Login successful, retrieved session cookie');
  return cookies;
}

// Function to submit a test item through the API
async function submitTestItem(sessionCookie) {
  const testItem = generateTestItem();
  console.log(`Submitting test item: ${testItem.title}`);
  
  const response = await fetch('http://localhost:3000/api/dashboard/intake', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify(testItem)
  });
  
  const responseBody = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to submit item: ${response.status} ${JSON.stringify(responseBody)}`);
  }
  
  console.log('Item submission successful!');
  return responseBody;
}

// Run the integration test
async function runApiIntegrationTest() {
  try {
    console.log('STARTING API INTEGRATION TEST');
    console.log('--------------------------');
    
    // Step 1: Login as test consignor
    const sessionCookie = await loginAsConsignor();
    
    // Step 2: Submit a test item
    const submissionResult = await submitTestItem(sessionCookie);
    
    console.log('\n✅ Test completed successfully!');
    console.log('Result:', JSON.stringify(submissionResult, null, 2));
    
    return {
      success: true,
      result: submissionResult
    };
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the test
runApiIntegrationTest()
  .then(result => {
    console.log('\nTest Summary:', result.success ? 'SUCCESS' : 'FAILURE');
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected test failure:', error);
    process.exit(1);
  });