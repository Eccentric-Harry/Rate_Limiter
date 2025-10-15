require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Import routes and middleware
const adminRoutes = require('./routes/admin');
const protectedRoutes = require('./routes/protected');
const rateLimiter = require('./middleware/rateLimiter');
const seedApiKeys = require('./simulateKeys');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Setup routes
app.use('/admin', adminRoutes);
app.use('/metrics', adminRoutes); // Reuse admin routes for metrics
app.use('/protected', rateLimiter(io), protectedRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Rate Limiter API is running' });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rate-limiter';
const PORT = process.env.PORT || 4000;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Seed API keys if none exist
    await seedApiKeys();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
