import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import lectureRoutes from './routes/lectureRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';

dotenv.config();

// Fix for Windows / Node.js SRV lookup issues with MongoDB Atlas (ECONNREFUSED querySrv)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Custom DNS setup notice:', e.message);
}

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lectureloop';

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/subjects', subjectRoutes);

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LectureLoop API Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start Express HTTP server
app.listen(PORT, () => {
  console.log(`LectureLoop server running on port ${PORT}`);
});

// Connection to MongoDB
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  .then(() => console.log('Successfully connected to MongoDB database!'))
  .catch((err) => {
    console.error(`MongoDB connection notice: ${err.message}`);
    console.warn('Notice: In-memory fallback will be used until MongoDB is reachable.');
  });
