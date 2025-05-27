// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Log connection attempt (but not the full URI for security)
    console.log('Connecting to MongoDB...');
    
    // Ensure we have a connection string
    if (!process.env.MONGO_URI) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    // Connect with updated options for Mongoose 6+
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;