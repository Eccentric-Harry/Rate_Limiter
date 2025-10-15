# Rate Limiter Simulation Tools

This directory contains scripts to simulate and test the Rate Limiter service.

## Scripts

### burst.js

Sends a burst of requests to the protected endpoint to test rate limiting.

```bash
node burst.js <api-key> [number-of-requests] [concurrency]
```

Example:
```bash
node burst.js ak_abcd1234 100 5
```

Parameters:
- `api-key`: Required. The API key to use for testing
- `number-of-requests`: Optional. Number of requests to send (default: 100)
- `concurrency`: Optional. How many parallel requests to send (default: 1)

### assertions.js

Runs a burst test and verifies that rate limiting works as expected.

```bash
node assertions.js <api-key>
```

or with environment variable:

```bash
API_KEY=ak_abcd1234 node assertions.js
```

The script will assert that:
1. Some requests succeed (200)
2. Some requests are rate limited (429)
3. The transition from success to rate limiting is observable

## Example Output

A successful test run will show requests succeeding until hitting the rate limit:

```
✅ [1/100] Status: 200, Usage: {"minute":1,"day":1}
✅ [2/100] Status: 200, Usage: {"minute":2,"day":2}
...
✅ [50/100] Status: 200, Usage: {"minute":50,"day":50}
🛑 [51/100] Status: 429, Error: Too Many Requests
🛑 [52/100] Status: 429, Error: Too Many Requests
...
```

And a summary showing the overall results:

```
📋 SUMMARY:
✅ Successful requests: 50
🛑 Rate limited (429): 50
❌ Other errors: 0
```
