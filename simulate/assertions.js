const { burst } = require('./burst');

/**
 * Run assertions to verify rate limiting behavior
 */
async function runAssertions() {
  console.log('🧪 Starting rate limiter assertions test...');
  
  // Get API key from command line or environment variables
  const apiKey = process.argv[2] || process.env.API_KEY;
  
  if (!apiKey) {
    console.error('Error: API key is required');
    console.log('Usage: node assertions.js <api-key>');
    console.log('       or set API_KEY environment variable');
    process.exit(1);
  }

  try {
    // Run burst test with 100 requests
    const results = await burst(apiKey, 100, 5);
    
    console.log('\n📝 ASSERTIONS:');
    
    // Assert that we got at least one 429 response
    const hasRateLimiting = results.rateLimited > 0;
    console.log(`✓ Rate limiting occurred: ${hasRateLimiting ? 'PASS' : 'FAIL'}`);
    
    // Assert that we got some successful responses
    const hasSuccessfulRequests = results.success > 0;
    console.log(`✓ Successful requests before rate limiting: ${hasSuccessfulRequests ? 'PASS' : 'FAIL'}`);
    
    // Assert that success + rateLimited equals the total requests (no other errors)
    const allRequestsAccountedFor = (results.success + results.rateLimited === 100);
    console.log(`✓ All requests properly tracked: ${allRequestsAccountedFor ? 'PASS' : 'FAIL'}`);
    
    // Verify the sequential nature - first requests should be 200, later ones 429
    let firstRateLimitIndex = -1;
    for (const req of results.requests.sort((a, b) => a.index - b.index)) {
      if (req.status === 429) {
        firstRateLimitIndex = req.index;
        break;
      }
    }
    
    if (firstRateLimitIndex >= 0) {
      console.log(`✓ First rate limit occurred at request #${firstRateLimitIndex + 1}`);
      console.log(`✓ Requests before limit: ${firstRateLimitIndex}`);
      console.log(`✓ Requests after limit: ${100 - firstRateLimitIndex}`);
    } else {
      console.log('⚠️ No rate limiting detected - try with a key that has lower limits');
    }
    
    // Overall test result
    const testPassed = hasRateLimiting && hasSuccessfulRequests;
    console.log('\n🏁 OVERALL TEST RESULT:', testPassed ? 'PASS ✅' : 'FAIL ❌');
    
    return testPassed;
  } catch (error) {
    console.error('Error during assertions:', error);
    return false;
  }
}

// Run assertions if executed directly
if (require.main === module) {
  runAssertions()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAssertions };
