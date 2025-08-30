// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createRateLimit } from './middleware/rateLimit.js';
import { db } from './db/mongodb.js';
import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import roleRoutes from './routes/roles.js';
import permissionRoutes from './routes/permissions.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

if (!process.env.PORT) {
  throw new Error('PORT is required in environment variables');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required in environment variables');
}

const PORT = process.env.PORT;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL
}));
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size

// Rate limiting
app.use(createRateLimit(60000, 300)); // 300 requests per minute per IP


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join channel
  socket.on('join-channel', (channelId: string) => {
    socket.join(`channel-${channelId}`);
    console.log(`📍 User ${socket.id} joined channel ${channelId}`);
  });

  // Leave channel
  socket.on('leave-channel', (channelId: string) => {
    socket.leave(`channel-${channelId}`);
    console.log(`🚪 User ${socket.id} left channel ${channelId}`);
  });

  // Handle new message broadcasting
  socket.on('new-message', (message) => {
    socket.to(`channel-${message.channelId}`).emit('message-received', message);
    console.log(`💬 Message broadcast to channel ${message.channelId}`);
  });

  // Handle message deletion broadcasting
  socket.on('message-deleted', (data) => {
    socket.broadcast.emit('message-deleted', data);
    console.log(`🗑️ Message deletion broadcast:`, data.messageId);
  });

  // Handle message pinning broadcasting
  socket.on('message-pinned', (data) => {
    socket.broadcast.emit('message-pinned', data);
    console.log(`📌 Message pin status broadcast:`, data);
  });

  // Handle channel creation broadcasting
  socket.on('channel-created', (channel) => {
    socket.broadcast.emit('channel-created', channel);
    console.log(`🆕 Channel creation broadcast:`, channel.name);
  });

  // Handle channel deletion broadcasting
  socket.on('channel-deleted', (data) => {
    socket.broadcast.emit('channel-deleted', data);
    console.log(`🗑️ Channel deletion broadcast:`, data.channelId);
  });

  // Handle user updates broadcasting
  socket.on('user-updated', (user) => {
    socket.broadcast.emit('user-updated', user);
    console.log(`👤 User update broadcast:`, user.id);
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Connect to MongoDB and start server
async function startServer() {
  try {
    await db.connect(process.env.MONGODB_URI!);
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 API: http://localhost:${PORT}/api`);
      console.log(`⚡ WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();