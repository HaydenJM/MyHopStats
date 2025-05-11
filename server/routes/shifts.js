// routes/shifts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const moment = require('moment');

const User = require('../models/User');
const Shift = require('../models/Shift');

// @route   GET api/shifts
// @desc    Get all shifts for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const shifts = await Shift.find({ user: req.user.id }).sort({ date: -1 });
    res.json(shifts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/shifts
// @desc    Add new shift
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('date', 'Date is required').not().isEmpty(),
      check('hoursWorked', 'Hours worked is required').isNumeric(),
      check('cashTips', 'Cash tips must be a number').isNumeric(),
      check('cardTips', 'Card tips must be a number').isNumeric()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, hoursWorked, cashTips, cardTips } = req.body;

    try {
      // Handle date properly to avoid UTC issues
      const formattedDate = moment(date).startOf('day').toDate();
      
      const newShift = new Shift({
        user: req.user.id,
        date: formattedDate,
        hoursWorked,
        cashTips,
        cardTips
      });

      const shift = await newShift.save();
      res.json(shift);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/shifts/:id
// @desc    Update shift
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { date, hoursWorked, cashTips, cardTips } = req.body;

  // Build shift object
  const shiftFields = {};
  if (date) {
    // Handle date properly to avoid UTC issues
    shiftFields.date = moment(date).startOf('day').toDate();
  }
  if (hoursWorked) shiftFields.hoursWorked = hoursWorked;
  if (cashTips !== undefined) shiftFields.cashTips = cashTips;
  if (cardTips !== undefined) shiftFields.cardTips = cardTips;

  try {
    let shift = await Shift.findById(req.params.id);

    if (!shift) return res.status(404).json({ msg: 'Shift not found' });

    // Make sure user owns shift
    if (shift.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { $set: shiftFields },
      { new: true }
    );

    // Manually recalculate derived fields
    const user = await User.findById(req.user.id);
    shift.totalTips = shift.cashTips + shift.cardTips;
    shift.baseIncome = shift.hoursWorked * user.hourlyRate;
    shift.totalIncome = shift.baseIncome + shift.totalTips;
    shift.adjustedHourlyRate = shift.totalIncome / shift.hoursWorked;
    
    await shift.save();
    res.json(shift);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/shifts/:id
// @desc    Delete shift
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    let shift = await Shift.findById(req.params.id);

    if (!shift) return res.status(404).json({ msg: 'Shift not found' });

    // Make sure user owns shift
    if (shift.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Shift.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Shift removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shifts/stats
// @desc    Get shift statistics for a user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const shifts = await Shift.find({ user: req.user.id });
    const user = await User.findById(req.user.id);
    
    // Calculate statistics
    const stats = {
      totalShifts: shifts.length,
      totalIncome: 0,
      totalCashTips: 0,
      totalCardTips: 0,
      totalCombinedTips: 0,
      averageHourlyRate: 0,
      averageCashTipsPerShift: 0,
      averageCardTipsPerShift: 0,
      highestCashTips: { amount: 0, date: null },
      highestCardTips: { amount: 0, date: null },
      totalIncomeAfterTax: 0,
      totalHoursWorked: 0
    };
    
    if (shifts.length > 0) {
      shifts.forEach(shift => {
        stats.totalIncome += shift.totalIncome;
        stats.totalCashTips += shift.cashTips;
        stats.totalCardTips += shift.cardTips;
        stats.totalHoursWorked += shift.hoursWorked;
        
        // Track highest tips
        if (shift.cashTips > stats.highestCashTips.amount) {
          stats.highestCashTips.amount = shift.cashTips;
          stats.highestCashTips.date = shift.date;
        }
        
        if (shift.cardTips > stats.highestCardTips.amount) {
          stats.highestCardTips.amount = shift.cardTips;
          stats.highestCardTips.date = shift.date;
        }
      });
      
      stats.totalCombinedTips = stats.totalCashTips + stats.totalCardTips;
      stats.averageCashTipsPerShift = stats.totalCashTips / stats.totalShifts;
      stats.averageCardTipsPerShift = stats.totalCardTips / stats.totalShifts;
      stats.averageHourlyRate = (stats.totalIncome / stats.totalHoursWorked);
      stats.totalIncomeAfterTax = stats.totalIncome * 0.92; // 8% tax
    }
    
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
