# Rate Limiter & Monitoring Service Design

## Architecture Diagram

```
+----------------+     +-------------------+     +---------------------+
| React Frontend |<--->| Express API       |<--->| MongoDB Collections |
| - Key List     |     | - Rate Limiter    |     | - api_keys          |
| - Usage Charts |     | - Key Management  |     | - usage_windows     |
| - Real-time    |     | - Protected Routes|     | - access_logs       |
+----------------+     +---------^---------+     +---------------------+
                                |
                      +---------v---------+
                      | Socket.io         |
                      | - Usage Updates   |
                      +-------------------+
```

## Data Models

### 1. api_keys
```javascript
{
  _id: ObjectId("..."),
  name: "Service A",
  key: "ak_abcd1234...", // Generated API key
  perMinute: 50,         // Rate limit per minute
  perDay: 1000,          // Rate limit per day
  active: true,          // Whether key is active
  createdAt: ISODate("2025-10-15T00:00:00Z")
}
```

### 2. usage_windows
```javascript
{
  _id: ObjectId("..."),
  key: "ak_abcd1234...",  // API key reference
  type: "minute",         // Window type: "minute" or "day"
  windowId: "20251015-1423", // Format: YYYYMMDD-HHMM for minute, YYYYMMDD for day
  count: 42,              // Current count in this window
  expiresAt: ISODate("2025-10-15T14:24:00Z") // TTL for auto-cleanup
}
```

### 3. access_logs
```javascript
{
  _id: ObjectId("..."),
  key: "ak_abcd1234...",
  endpoint: "/protected",
  status: 200,           // HTTP status (200 or 429)
  timestamp: ISODate("2025-10-15T14:23:17Z"),
  minuteCount: 42,       // Current minute count when this request was processed
  dayCount: 732          // Current day count when this request was processed
}
```

## Rate-Limiting Algorithm: Fixed Window

This implementation uses a fixed window algorithm for both minute and day-based rate limiting:

1. **Minute Window**: Every request increments a counter for the current minute window (YYYYMMDD-HHMM)
2. **Day Window**: Every request also increments a counter for the current day window (YYYYMMDD)

**Trade-offs**:
- **Pros**: Simple to implement, easy to understand, efficient for MongoDB atomic operations
- **Cons**: Edge case of double-limit requests at window boundaries (e.g., 2x traffic allowed between 1:59:59 and 2:00:59)

## Realtime Mechanism

Socket.io is used to broadcast usage updates to connected clients:
- When middleware successfully processes a request, it emits a 'usage.update' event
- Event payload includes: `{ key, minute, day }` to allow frontend to update in real-time
- This enables responsive dashboards without constant polling

## API Endpoints

### Admin Routes
- `POST /admin/keys` - Create new API key
  - Body: `{ name: "Service A", perMinute: 50, perDay: 1000 }`
  - Response: `{ key: "ak_abcd1234...", name: "Service A", ... }`

- `GET /admin/keys` - List all API keys
  - Response: `[{ _id: "...", name: "Service A", key: "ak_abcd1234...", ... }, ...]`

- `PUT /admin/keys/:id` - Update API key limits or disable
  - Body: `{ perMinute: 100, perDay: 2000, active: true }`
  - Response: Updated key object

### Metrics Routes
- `GET /metrics/keys/:id` - Get current usage for an API key
  - Response: `{ minute: 42, day: 732, perMinute: 50, perDay: 1000 }`

### Protected Routes
- `GET /protected` - Demo endpoint using rateLimiter middleware
  - Headers: `x-api-key: ak_abcd1234...`
  - Success Response: `{ message: "Protected resource accessed successfully" }`
  - Rate Limit Response: `{ error: "Too Many Requests", limit: 50 }`

## MongoDB vs Redis for Rate Limiting

MongoDB was chosen for this demo for two main reasons:
1. To demonstrate a complete MERN stack integration with a single database
2. To show how atomic operations can work with upserts even in a document database

In production, Redis would be a better choice because:
- Redis provides O(1) operations for increments and TTL-based expirations
- Lower latency for high-frequency rate limiting
- Built-in atomic operations like INCR and EXPIRE are perfect for this use case

To adapt this code for Redis, replace MongoDB upsert operations with Redis INCR and EXPIRE commands in the rate limiter middleware.
