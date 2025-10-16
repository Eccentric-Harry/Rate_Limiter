const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:4000/protected';
const DEFAULT_REQUESTS = 100;
const DEFAULT_CONCURRENCY = 1;


/**
 * Send a burst of requests to test rate limiting
 * @param {string} apiKey - The API key to use for requests
 * @param {number} numRequests - Number of requests to send
 * @param {number} concurrency - How many parallel requests to send
 */
async function burst(apiKey, numRequests = DEFAULT_REQUESTS, concurrency = DEFAULT_CONCURRENCY) {
  if (!apiKey) {
    console.error('Error: API key is required');
    console.log('Usage: node burst.js <api-key> [requests] [concurrency]');
    process.exit(1);
  }

  console.log(`\n🚀 Starting burst test with API key: ${apiKey}`);
  console.log(`📊 Sending ${numRequests} requests with concurrency of ${concurrency}`);
  console.log('---------------------------------------------------');

  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0,
    requests: []
  };

  // Create batches based on concurrency
  const batches = [];
  for (let i = 0; i < numRequests; i += concurrency) {
    const batch = [];
    for (let j = 0; j < concurrency && i + j < numRequests; j++) {
      batch.push(i + j);
    }
    batches.push(batch);
  }

  // Process batches sequentially
  for (const batch of batches) {
    const batchRequests = batch.map(index => {
      return makeRequest(apiKey, index)
        .then(response => {
          results.requests.push({
            index,
            status: response.status,
            data: response.data
          });

          if (response.status === 200) {
            results.success++;
            console.log(`✅ [${index + 1}/${numRequests}] Status: ${response.status}, Usage: ${JSON.stringify(response.data.usage)}`);
          } else {
            results.rateLimited++;
            console.log(`🛑 [${index + 1}/${numRequests}] Status: ${response.status}, Error: ${response.data.error}`);
          }
        })
        .catch(error => {
          results.errors++;
          const status = error.response?.status || 'NETWORK ERROR';
          const errorMsg = error.response?.data?.error || error.message;
          
          results.requests.push({
            index,
            status,
            error: errorMsg
          });
          
          console.log(`❌ [${index + 1}/${numRequests}] Error: ${status}, Message: ${errorMsg}`);
        });
    });

    await Promise.all(batchRequests);
  }

  // Print summary
  console.log('\n---------------------------------------------------');
  console.log('📋 SUMMARY:');
  console.log(`✅ Successful requests: ${results.success}`);
  console.log(`🛑 Rate limited (429): ${results.rateLimited}`);
  console.log(`❌ Other errors: ${results.errors}`);
  console.log('---------------------------------------------------\n');

  return results;
}

/**
 * Make a single request to the protected endpoint
 */
async function makeRequest(apiKey, index) {
  const response = await axios.get(API_URL, {
    headers: {
      'x-api-key': apiKey
    }
  });
  
  return response;
}

/**
 * Main function when running script directly
 */
async function main() {
  // Parse command line arguments
  const apiKey = process.argv[2];
  const numRequests = parseInt(process.argv[3]) || DEFAULT_REQUESTS;
  const concurrency = parseInt(process.argv[4]) || DEFAULT_CONCURRENCY;

  await burst(apiKey, numRequests, concurrency);
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error in burst test:', error.message);
    process.exit(1);
  });
}

module.exports = { burst };
