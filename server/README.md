# Rate Limiter Server

This is the backend server for the Rate Limiter & Monitoring Service.

## Requirements

- Node.js v16+
- MongoDB v5+

## Setup

1. Clone the repository
2. Install dependencies:

```bash
cd server
npm install
```

3. Create a `.env` file based on `.env.sample`:

```bash
cp .env.sample .env
```

4. Start MongoDB:

```bash
# If using local MongoDB installation
mongod --dbpath /path/to/data/db

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. Start the server:

```bash
npm run dev
```

The server will start on port 4000 and automatically seed two API keys if none exist.

## API Endpoints

### Admin Routes

- `POST /admin/keys` - Create new API key
  ```bash
  curl -X POST http://localhost:4000/admin/keys \
    -H "Content-Type: application/json" \
    -d '{"name": "My Service", "perMinute": 60, "perDay": 1000}'
  ```

- `GET /admin/keys` - List all API keys
  ```bash
  curl http://localhost:4000/admin/keys
  ```

- `PUT /admin/keys/:id` - Update API key limits or disable
  ```bash
  curl -X PUT http://localhost:4000/admin/keys/63f12b456789abcdef123456 \
    -H "Content-Type: application/json" \
    -d '{"perMinute": 100, "perDay": 2000, "active": true}'
  ```

### Protected Route

- `GET /protected` - Demo endpoint that uses rate limiting
  ```bash
  curl http://localhost:4000/protected \
    -H "x-api-key: ak_yourApiKeyHere"
  ```

### Testing Rate Limiting

To test rate limiting, run this command multiple times in quick succession:

```bash
for i in {1..60}; do curl -s http://localhost:4000/protected -H "x-api-key: ak_yourApiKeyHere"; echo ""; done
```

You should see successful responses initially, followed by "Too Many Requests" errors after exceeding the per-minute limit.

## Socket.io Events

The server emits 'usage.update' events when API requests are processed:

```javascript
{
  key: "ak_yourApiKeyHere",
  minute: 42,  // Current minute count
  day: 732,    // Current day count
  keyId: "63f12b456789abcdef123456"  // MongoDB ObjectId of the key
}
```
