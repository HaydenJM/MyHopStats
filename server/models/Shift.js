// models/Shift.js
const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  hoursWorked: {
    type: Number,
    required: true
  },
  cashTips: {
    type: Number,
    required: true,
    default: 0
  },
  cardTips: {
    type: Number,
    required: true,
    default: 0
  },
  // Calculated fields
  totalTips: {
    type: Number
  },
  baseIncome: {
    type: Number
  },
  totalIncome: {
    type: Number
  },
  adjustedHourlyRate: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate the derived fields
ShiftSchema.pre('save', async function(next) {
  try {
    // Get the user to calculate base income
    const User = mongoose.model('user');
    const user = await User.findById(this.user);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Calculate fields
    this.totalTips = this.cashTips + this.cardTips;
    this.baseIncome = this.hoursWorked * user.hourlyRate;
    this.totalIncome = this.baseIncome + this.totalTips;
    this.adjustedHourlyRate = this.totalIncome / this.hoursWorked;
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('shift', ShiftSchema);
