import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import { socketHandler } from './socket/socketHandler.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend build in production
if (process.env.NODE_ENV === 'production') {
  import('path').then(path => {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const frontendBuildPath = path.resolve(__dirname, '../dist');
    
    app.use(express.static(frontendBuildPath));
    
    app.get('*', (req, res) => {
      // Serve index.html for all other routes
      console.log('Serving index.html for:', req.path);
      if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
        res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
      }
    });
    
    console.log(`Serving frontend from ${frontendBuildPath}`);
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
// Health check endpoint
app.get('/api', (req, res) => {
  res.send('Server is healthy');
});

// Initialize socket handlers
socketHandler(io);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/secure-chat');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  await connectDB();
  console.log(`Server running on port ${PORT}`);
});