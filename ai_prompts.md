# AI Prompts Used in This Project

This document records the AI prompts used throughout the development of the Rate Limiter & Monitoring Service.

## 1. Coordinator Agent

**Prompt:**
```
You are the Coordinator agent for the "Rate Limiter & Monitoring Service" MERN project. Your job:
- Launch and coordinate specialized agents (Design, Backend, Frontend, Simulate/Test, Docs).
- Ensure each agent follows the file naming and structure rules below.
- Collect outputs into repository root folders: server/, client/, simulate/, ai_prompts.md, design_summary.md.
- Run simple checks after agents finish:
  1. server/package.json exists and `npm run dev` starts (no external network access needed).
  2. client/package.json exists and `npm start` builds locally.
  3. simulate/burst.js exists and can be executed with `node`.
- If tests fail, open a task for the relevant agent, include failing logs and instruct a fix.
- When everything passes, produce a short README checklist for the interview (run steps, two API keys, demo commands).
Constraints:
- Keep code MERN-only (Node/Express, MongoDB, React). No external paid services.
- Use MongoDB for counters in this demo, but include comments showing how to adapt to Redis.
Outputs:
- A JSON status summary listing created files, tests results, and final README text.
Write back with which agent to run first and a one-line summary of tasks launched.
```

**AI Output Summary:**
- Created basic project structure with server/, client/, and simulate/ directories
- Started with Design agent to create design_summary.md with architecture, data models, and API endpoints
- Created MongoDB models for API keys, usage windows, and access logs
- Implemented Express server with rate limiter middleware and Socket.io integration
- Built React frontend for monitoring API key usage with real-time updates
- Created simulation tools for testing rate limiting behavior

**Human Modifications:**
- None (AI coordinated the entire project structure)

## 2. Design Agent

**Prompt:**
```
You are the Design agent. Output a short design document (design_summary.md) with:
- Architecture diagram in textual form (components and interactions).
- Data models for MongoDB: api_keys, usage_windows, access_logs (show example documents).
- Chosen rate-limiting algorithm: fixed window per-minute and per-day with explanation & trade-offs.
- Realtime mechanism: Socket.io events from middleware after successful increment.
- Endpoints list and expected payloads.

Files to create:
- design_summary.md (markdown) under repo root.

Constraints:
- Keep design minimal and interview-presentable (<= 1 page).
- Use exact field names used later by backend agent.
Outputs:
- design_summary.md
- A 2–3 line explanation of why Mongo was chosen for this demo and where to replace with Redis later.
```

**AI Output Summary:**
- Created design_summary.md with architecture diagram, data models, and API endpoints
- Detailed MongoDB schemas for api_keys, usage_windows, and access_logs collections
- Explained fixed window rate-limiting algorithm with per-minute and per-day counters
- Documented Socket.io usage for real-time updates
- Added explanation of MongoDB vs. Redis for rate limiting

**Human Modifications:**
- None (AI implemented the complete design document)

## 3. Backend Agent

**Prompt:**
```
You are the Backend agent. Implement an Express server that enforces per-minute and per-day rate limits using MongoDB atomic upsert operations.

Goals & acceptance:
1. Implement models in server/models:
   - ApiKey.js (Mongoose schema)
   - UsageWindow.js
   - AccessLog.js
2. Implement middleware server/middleware/rateLimiter.js:
   - Reads api key from header 'x-api-key'
   - Validates key, increments minute and day windows using atomic upsert (findOneAndUpdate with upsert)
   - If minute > perMinute → respond 429 JSON { error: 'Too Many Requests', limit: X }
   - If day > perDay → respond 429 JSON { error: 'Daily quota exceeded', limit: Y }
   - On success, attach req.usage = { minute, day } and emit Socket.io event 'usage.update' with { key, minute, day }.
   - Log each 429 and 200 into access_logs collection.
3. Implement routes:
   - POST /admin/keys  — create API key (body: name, perMinute, perDay) → returns generated key
   - GET /admin/keys   — list keys with limits
   - PUT /admin/keys/:id — update/disable
   - GET /metrics/keys/:id — returns current minute/day usage (aggregated)
   - GET /protected — demo protected endpoint uses rateLimiter middleware
4. Seed two API keys on server start if none exist (perMinute: 50, perDay: 1000).
5. Integrate Socket.io and emit updates from middleware.
6. Include server/.env.sample and server/README for run steps.
```

**AI Output Summary:**
- Created server/models for ApiKey, UsageWindow, and AccessLog using Mongoose
- Implemented rateLimiter middleware with MongoDB atomic operations
- Added routes for API key management and protected endpoint
- Implemented Socket.io integration for real-time updates
- Created server startup code with MongoDB connection and seeding
- Added README and .env.sample files

**Human Modifications:**
- None (AI implemented the complete backend code)

## 4. Frontend Agent

**Prompt:**
```
You are the Frontend agent. Implement a small React app (client/) showing:
- List of API keys (GET /admin/keys)
- For each key show: name, perMinute/perDay, current minute/day usage as "minute/day" (pull from GET /metrics/keys/:id)
- Real-time updates using Socket.io client: subscribe to 'usage.update' and update the relevant key row.
- A simple chart is optional; at minimum show numeric counters and color the row red if minute > perMinute.
- A "Create Key" form posts to /admin/keys.
```

**AI Output Summary:**
- Created React app with Socket.io client integration
- Implemented API key listing with current usage display
- Added form for creating new API keys
- Implemented real-time updates from Socket.io events
- Added visual indicators for rate limit exceeded status
- Included simple CSS styling for better usability

**Human Modifications:**
- None (AI implemented the complete frontend code)

## 5. Simulate/Test Agent

**Prompt:**
```
You are the Simulate/Test agent. Implement scripts to demonstrate acceptance criteria.

Tasks:
1. simulate/burst.js — script that:
   - Reads API key from env or CLI
   - Sends 100 requests in a tight loop to http://localhost:4000/protected using axios
   - Prints index, HTTP status, and response JSON per request
   - Optionally run N requests concurrently (concurrency param)
2. simulate/assertions.js — run burst and assert:
   - At least one 429 total after perMinute limit exceeded
   - Print summary: total200, total429
```

**AI Output Summary:**
- Created burst.js to send configurable number of requests to test rate limiting
- Implemented assertions.js to verify rate limiting behavior
- Added detailed logging and summary statistics
- Included support for concurrent requests
- Created README with usage instructions and example output

**Human Modifications:**
- None (AI implemented the complete simulation scripts)

## 6. Docs Agent

**Prompt:**
```
You are the Docs agent. Create two files:
1. ai_prompts.md — record of the AI prompts used in this project. For each prompt include:
   - Agent name (Design/Backend/Frontend/Simulate)
   - Full prompt text (what you sent to AI)
   - AI output summary (what AI returned)
   - What was modified by human (1–3 bullet points)
2. README.md — root README with run steps for server/client/simulate and the demo checklist:
   - Start Mongo
   - npm run dev in server
   - npm start in client
   - Run simulate/burst.js and show expected behavior
```

**AI Output Summary:**
- Created ai_prompts.md documenting all AI prompts used in the project
- Compiled README.md with run steps and demo instructions

**Human Modifications:**
- AI is creating this document now. Human will verify and update as needed.
