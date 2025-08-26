import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRateLimit } from './middleware/rateLimit.js';

// Load environment variables
dotenv.config();

import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import roleRoutes from './routes/roles.js';
import permissionRoutes from './routes/permissions.js';

const app = express();

const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size

// Rate limiting
app.use(createRateLimit(60000, 100)); // 100 requests per minute per IP


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
});