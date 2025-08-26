import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createRateLimit } from './middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import roleRoutes from './routes/roles.js';
import permissionRoutes from './routes/permissions.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size
app.use(express.static(path.join(__dirname, '../dist')));

// Rate limiting
app.use(createRateLimit(60000, 100)); // 100 requests per minute per IP

// Serve DB files statically for client tester
app.use('/db', express.static(path.join(__dirname, 'db')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-channel', (channelId: string) => {
    socket.join(`channel-${channelId}`);
    console.log(`User ${socket.id} joined channel ${channelId}`);
  });

  socket.on('leave-channel', (channelId: string) => {
    socket.leave(`channel-${channelId}`);
    console.log(`User ${socket.id} left channel ${channelId}`);
  });

  socket.on('new-message', (data) => {
    // Broadcast message to all users in the channel
    socket.to(`channel-${data.channelId}`).emit('message-received', data);
  });

  socket.on('message-deleted', (data) => {
    socket.to(`channel-${data.channelId}`).emit('message-deleted', data);
  });

  socket.on('message-pinned', (data) => {
    socket.to(`channel-${data.channelId}`).emit('message-pinned', data);
  });

  socket.on('channel-created', (data) => {
    socket.broadcast.emit('channel-created', data);
  });

  socket.on('channel-deleted', (data) => {
    socket.broadcast.emit('channel-deleted', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:5173`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`🔥 WebSocket: ws://localhost:${PORT}`);
});