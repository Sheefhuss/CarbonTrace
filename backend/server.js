require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth_backend.js');
const userRoutes = require('./routes/users');
const emissionRoutes = require('./routes/emissions');
const activityRoutes = require('./routes/activities');
const dashboardRoutes = require('./routes/dashboard');
const creditsRoutes = require('./routes/credits');
const scopeRoutes = require('./routes/scopes');
const aiRoutes = require('./routes/aiTips.route');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/emissions', emissionRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/scopes', scopeRoutes);
app.use('/api/ai', aiRoutes);

app.use(errorHandler);

const activeUsers = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('AUTH_REQUIRED'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.id;
    next();
  } catch {
    next(new Error('AUTH_INVALID'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);

  socket.on('user_online', () => {
    activeUsers.set(socket.id, userId);
    io.emit('status_update', { userId, status: 'online' });
    socket.emit('sync_online_users', Array.from(new Set(activeUsers.values())));
  });

  socket.on('send_message', (messageData) => {
    if (!messageData || messageData.senderId !== userId || !messageData.receiverId) return;
    io.to(`user:${messageData.receiverId}`).emit('receive_message', messageData);
  });

  socket.on('delete_message', (messageId) => {
    io.emit('message_deleted', messageId);
  });

  socket.on('disconnect', () => {
    if (activeUsers.delete(socket.id)) {
      if (!Array.from(activeUsers.values()).includes(userId)) {
        io.emit('status_update', { userId, status: 'offline' });
      }
    }
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  }
};

startServer();
