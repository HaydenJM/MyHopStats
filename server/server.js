// server.js
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Handle IIS specific routing behavior
app.use((req, res, next) => {
  if (req.path.startsWith('/iisnode/')) {
    return next();
  }
  return next();
});

// Connect to Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Define Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shifts', require('./routes/shifts'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    // Ensure path is normalized for IIS
    res.sendFile(path.normalize(path.resolve(__dirname, '../client', 'build', 'index.html')));
  });
}

// Set port based on environment - allow IIS to override
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 8080 : 3333);

// Log server configuration
console.log(`Node environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`MongoDB URI: ${process.env.MONGO_URI ? 'configured' : 'missing'}`);
console.log(`Server root directory: ${__dirname}`);
console.log(`Client build path: ${path.resolve(__dirname, '../client', 'build')}`);

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});