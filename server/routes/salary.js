const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Salary = require('../models/Salary');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const UserTag = require('../models/UserTag');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Set base salary and joining date
router.post('/set/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      baseSalary,
      currency,
      salaryType,
      payGrade,
      joiningDate,
      allowances,
      deductions,
      bankDetails,
      probationPeriod
    } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if salary record already exists
    let salaryRecord = await Salary.findOne({ user: userId });

    if (salaryRecord) {
      // Update existing record
      const previousSalary = salaryRecord.baseSalary;
      
      salaryRecord.baseSalary = baseSalary;
      salaryRecord.currency = currency || 'USD';
      salaryRecord.salaryType = salaryType || 'Monthly';
      salaryRecord.payGrade = payGrade;
      salaryRecord.joiningDate = new Date(joiningDate);
      
      if (allowances) {
        salaryRecord.allowances = { ...salaryRecord.allowances, ...allowances };
      }
      
      if (deductions) {
        salaryRecord.deductions = { ...salaryRecord.deductions, ...deductions };
      }
      
      if (bankDetails) {
        salaryRecord.bankDetails = { ...salaryRecord.bankDetails, ...bankDetails };
      }
      
      if (probationPeriod) {
        salaryRecord.probationPeriod = { ...salaryRecord.probationPeriod, ...probationPeriod };
      }

      // Add to salary history if base salary changed
      if (previousSalary !== baseSalary) {
        const changePercentage = ((baseSalary - previousSalary) / previousSalary) * 100;
        salaryRecord.salaryHistory.push({
          previousSalary,
          newSalary: baseSalary,
          effectiveDate: new Date(),
          reason: 'Salary adjustment',
          approvedBy: req.user.id,
          changePercentage: Math.round(changePercentage * 100) / 100
        });
      }

      await salaryRecord.save();
    } else {
      // Create new salary record
      salaryRecord = new Salary({
        user: userId,
        baseSalary,
        currency: currency || 'USD',
        salaryType: salaryType || 'Monthly',
        payGrade,
        joiningDate: new Date(joiningDate),
        allowances: allowances || {},
        deductions: deductions || {},
        bankDetails: bankDetails || {},
        probationPeriod: probationPeriod || { duration: 3 }
      });

      await salaryRecord.save();
    }

    // Populate user data for response
    await salaryRecord.populate('user', 'name email');

    // Emit socket event
    if (req.io) {
      req.io.emit('salary:updated', {
        userId,
        userName: user.name,
        baseSalary,
        payGrade,
        updatedBy: req.user.name
      });
    }

    res.json({
      success: true,
      message: 'Salary information updated successfully',
      data: salaryRecord
    });

  } catch (error) {
    console.error('Set salary error:', error);
    res.status(500).json({ error: 'Failed to set salary information' });
  }
});

// Add salary adjustment
router.put('/adjust/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      type,
      amount,
      percentage,
      reason,
      isRecurring,
      frequency,
      effectiveDate,
      expiryDate
    } = req.body;

    const salaryRecord = await Salary.findOne({ user: userId });
    if (!salaryRecord) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    // Calculate amount if percentage is provided
    let adjustmentAmount = amount;
    if (percentage && !amount) {
      adjustmentAmount = (salaryRecord.baseSalary * percentage) / 100;
    }

    const adjustment = {
      type,
      amount: adjustmentAmount,
      percentage,
      reason,
      isRecurring: isRecurring || false,
      frequency: frequency || 'One-time',
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      approvedBy: req.user.id,
      isActive: true
    };

    salaryRecord.adjustments.push(adjustment);
    await salaryRecord.save();

    // Populate user data
    await salaryRecord.populate('user', 'name email');

    // Emit socket event
    if (req.io) {
      req.io.emit('salary:adjustment-added', {
        userId,
        userName: salaryRecord.user.name,
        adjustment: {
          type,
          amount: adjustmentAmount,
          reason
        },
        addedBy: req.user.name
      });
    }

    res.json({
      success: true,
      message: 'Salary adjustment added successfully',
      data: salaryRecord
    });

  } catch (error) {
    console.error('Salary adjustment error:', error);
    res.status(500).json({ error: 'Failed to add salary adjustment' });
  }
});

// Get user's salary details
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('Get salary for userId:', userId, 'type:', typeof userId);

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Verify authorization
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const salaryRecord = await Salary.findOne({ user: userId })
      .populate('user', 'name email avatar')
      .populate('adjustments.approvedBy', 'name')
      .populate('salaryHistory.approvedBy', 'name');

    if (!salaryRecord) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    // Get user tag information
    const userTag = await UserTag.findOne({ user: userId });

    // Calculate current month salary
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const attendanceStats = await Attendance.getAttendanceStats(startOfMonth, endOfMonth, userId);
    const workingDays = 22; // Default working days, should be configurable
    const attendedDays = attendanceStats.presentDays || 0;

    const monthlySalary = salaryRecord.calculateMonthlySalary(workingDays, attendedDays);

    res.json({
      success: true,
      data: {
        ...salaryRecord.toObject(),
        userTag: userTag ? userTag.tag : 'Employee',
        currentMonth: {
          ...monthlySalary,
          month: currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
        },
        virtualFields: {
          totalAllowances: salaryRecord.totalAllowances,
          totalDeductions: salaryRecord.totalDeductions,
          grossSalary: salaryRecord.grossSalary,
          netSalary: salaryRecord.netSalary
        }
      }
    });

  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({ error: 'Failed to fetch salary details' });
  }
});

// Calculate monthly salary for a user
router.get('/calculate/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year, workingDays = 22 } = req.query;

    console.log('Calculate salary for userId:', userId, 'type:', typeof userId);

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Verify authorization
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const salaryRecord = await Salary.findOne({ user: userId })
      .populate('user', 'name email avatar');

    if (!salaryRecord) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    // Calculate date range
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    // Get attendance data
    const attendanceStats = await Attendance.getAttendanceStats(startOfMonth, endOfMonth, userId);
    const attendedDays = attendanceStats.presentDays || 0;

    // Get overtime and bonus adjustments for the month
    const monthlyAdjustments = await Attendance.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalOvertimeHours: { $sum: '$overtimeHours' },
          avgProductivityScore: { $avg: '$productivityScore' }
        }
      }
    ]);

    const overtimeHours = monthlyAdjustments[0]?.totalOvertimeHours || 0;
    const productivityScore = monthlyAdjustments[0]?.avgProductivityScore || 0;

    // Calculate overtime pay (assuming 1.5x hourly rate)
    const hourlyRate = salaryRecord.baseSalary / (parseInt(workingDays) * 8);
    const overtimePay = overtimeHours * hourlyRate * 1.5;

    // Performance bonus based on productivity score
    const performanceBonus = productivityScore > 80 ? salaryRecord.baseSalary * 0.05 : 0;

    const externalAdjustments = [
      { type: 'Overtime', amount: overtimePay },
      { type: 'Performance Bonus', amount: performanceBonus }
    ];

    const calculatedSalary = salaryRecord.calculateMonthlySalary(
      parseInt(workingDays), 
      attendedDays, 
      externalAdjustments
    );

    res.json({
      success: true,
      data: {
        user: salaryRecord.user,
        period: {
          month: startOfMonth.toLocaleString('default', { month: 'long' }),
          year: targetYear,
          startDate: startOfMonth,
          endDate: endOfMonth
        },
        attendance: {
          workingDays: parseInt(workingDays),
          attendedDays,
          leaveDays: attendanceStats.leaveDays || 0,
          absentDays: attendanceStats.absentDays || 0,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          productivityScore: Math.round(productivityScore * 100) / 100
        },
        salary: calculatedSalary,
        breakdown: {
          baseSalary: salaryRecord.baseSalary,
          allowances: salaryRecord.totalAllowances,
          deductions: salaryRecord.totalDeductions,
          overtimePay: Math.round(overtimePay * 100) / 100,
          performanceBonus: Math.round(performanceBonus * 100) / 100
        }
      }
    });

  } catch (error) {
    console.error('Calculate salary error:', error);
    res.status(500).json({ error: 'Failed to calculate salary' });
  }
});

// Generate salary cards for all users
router.get('/calculate/all', adminAuth, async (req, res) => {
  try {
    const { month, year, workingDays = 22, department, tag } = req.query;

    console.log('Calculate all salaries - Query params:', { month, year, workingDays, department, tag });

    // Calculate date range
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    // Build user filter
    let userFilter = { isActive: true };
    if (department) {
      userFilter.department = department;
    }

    // Get users based on tag filter
    let userIds = [];
    if (tag) {
      const taggedUsers = await UserTag.find({ tag, isActive: true }).select('user');
      userIds = taggedUsers.map(t => t.user);
      userFilter._id = { $in: userIds };
    }

    const users = await User.find(userFilter).select('_id name email avatar department');

    const salaryCards = [];

    for (const user of users) {
      try {
        const salaryRecord = await Salary.findOne({ user: user._id, isActive: true });

        if (!salaryRecord) {
          // Create a default salary card for users without salary records
          salaryCards.push({
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              department: user.department
            },
            salary: {
              baseSalary: 0,
              calculated: {
                grossPay: 0,
                netPay: 0,
                totalAllowances: 0,
                totalDeductions: 0
              }
            },
            attendance: {
              attendedDays: 0,
              totalDays: parseInt(workingDays),
              attendanceRate: 0
            },
            message: 'No salary record configured',
            status: 'warning'
          });
          continue;
        }

        // Get attendance stats
        const attendanceStats = await Attendance.getAttendanceStats(startOfMonth, endOfMonth, user._id);
        const attendedDays = attendanceStats.presentDays || 0;

        // Get user tag
        const userTag = await UserTag.findOne({ user: user._id });

        // Calculate salary
        const calculatedSalary = salaryRecord.calculateMonthlySalary(
          parseInt(workingDays),
          attendedDays
        );

        salaryCards.push({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            tag: userTag?.tag || 'Employee'
          },
          salary: {
            base: salaryRecord.baseSalary,
            calculated: calculatedSalary,
            currency: salaryRecord.currency,
            payGrade: salaryRecord.payGrade
          },
          attendance: {
            workingDays: parseInt(workingDays),
            attendedDays,
            attendanceRate: calculatedSalary.attendancePercentage
          },
          status: 'success'
        });

      } catch (userError) {
        console.error(`Error calculating salary for user ${user._id}:`, userError);
        salaryCards.push({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
          },
          error: userError.message,
          status: 'error'
        });
      }
    }

    // Calculate summary statistics
    const successfulCards = salaryCards.filter(card => card.status === 'success');
    const totalPayroll = successfulCards.reduce((sum, card) => sum + card.salary.calculated.netPay, 0);
    const avgSalary = successfulCards.length > 0 ? totalPayroll / successfulCards.length : 0;
    const avgAttendance = successfulCards.reduce((sum, card) => sum + card.attendance.attendanceRate, 0) / successfulCards.length;

    res.json({
      success: true,
      data: {
        period: {
          month: startOfMonth.toLocaleString('default', { month: 'long' }),
          year: targetYear,
          workingDays: parseInt(workingDays)
        },
        summary: {
          totalEmployees: salaryCards.length,
          successfulCalculations: successfulCards.length,
          totalPayroll: Math.round(totalPayroll * 100) / 100,
          averageSalary: Math.round(avgSalary * 100) / 100,
          averageAttendance: Math.round(avgAttendance * 100) / 100
        },
        salaryCards
      }
    });

  } catch (error) {
    console.error('Calculate all salaries error:', error);
    res.status(500).json({ error: 'Failed to calculate salaries for all users' });
  }
});

// Create or update salary record
router.post('/', adminAuth, async (req, res) => {
  try {
    const { user: userId, baseSalary, currency, salaryType, payGrade, allowances, deductions } = req.body;

    console.log('Creating/updating salary for user:', userId);

    // Validate required fields
    if (!userId || !baseSalary) {
      return res.status(400).json({ error: 'User ID and base salary are required' });
    }

    // Check if salary record already exists
    let salaryRecord = await Salary.findOne({ user: userId });

    if (salaryRecord) {
      // Update existing record
      salaryRecord.baseSalary = baseSalary;
      salaryRecord.currency = currency || 'INR';
      salaryRecord.salaryType = salaryType || 'Monthly';
      salaryRecord.payGrade = payGrade || 'B1';

      if (allowances) salaryRecord.allowances = allowances;
      if (deductions) salaryRecord.deductions = deductions;

      salaryRecord.updatedAt = new Date();
      salaryRecord.updatedBy = req.user.id;

      await salaryRecord.save();
      console.log('Updated salary record:', salaryRecord._id);
    } else {
      // Create new record
      salaryRecord = new Salary({
        user: userId,
        baseSalary,
        currency: currency || 'INR',
        salaryType: salaryType || 'Monthly',
        payGrade: payGrade || 'B1',
        allowances: allowances || [
          {
            type: 'Basic',
            amount: baseSalary,
            percentage: 100,
            description: 'Base salary',
            isRecurring: true
          }
        ],
        deductions: deductions || [
          {
            type: 'Tax',
            amount: baseSalary * 0.1,
            percentage: 10,
            description: 'Income tax',
            isRecurring: true
          }
        ],
        effectiveDate: new Date(),
        isActive: true,
        createdBy: req.user.id,
        approvedBy: req.user.id,
        approvalDate: new Date(),
        approvalStatus: 'Approved'
      });

      await salaryRecord.save();
      console.log('Created new salary record:', salaryRecord._id);
    }

    res.json({
      success: true,
      message: 'Salary record saved successfully',
      data: salaryRecord
    });

  } catch (error) {
    console.error('Create/update salary error:', error);
    res.status(500).json({ error: 'Failed to save salary record' });
  }
});

// Set monthly working days
router.post('/working-days', adminAuth, async (req, res) => {
  try {
    const { workingDays, month, year, holidays } = req.body;

    // This could be stored in a separate WorkingDays model
    // For now, we'll return the configuration
    const config = {
      workingDays: parseInt(workingDays),
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
      holidays: holidays || [],
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    // In a real implementation, you'd save this to a database
    // await WorkingDays.findOneAndUpdate(
    //   { month: config.month, year: config.year },
    //   config,
    //   { upsert: true }
    // );

    res.json({
      success: true,
      message: 'Working days configuration updated',
      data: config
    });

  } catch (error) {
    console.error('Set working days error:', error);
    res.status(500).json({ error: 'Failed to set working days' });
  }
});

// Get salary analytics
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const { department, year = new Date().getFullYear() } = req.query;

    // Build match condition
    const matchCondition = { isActive: true };
    if (department) {
      const departmentUsers = await User.find({ department }).select('_id');
      matchCondition.user = { $in: departmentUsers.map(u => u._id) };
    }

    // Overall salary statistics
    const overallStats = await Salary.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          avgBaseSalary: { $avg: '$baseSalary' },
          minSalary: { $min: '$baseSalary' },
          maxSalary: { $max: '$baseSalary' },
          totalPayroll: { $sum: '$baseSalary' }
        }
      }
    ]);

    // Salary distribution by pay grade
    const payGradeStats = await Salary.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$payGrade',
          count: { $sum: 1 },
          avgSalary: { $avg: '$baseSalary' },
          minSalary: { $min: '$baseSalary' },
          maxSalary: { $max: '$baseSalary' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Salary trends (if historical data exists)
    const salaryTrends = await Salary.aggregate([
      { $match: matchCondition },
      { $unwind: '$salaryHistory' },
      {
        $group: {
          _id: {
            month: { $month: '$salaryHistory.effectiveDate' },
            year: { $year: '$salaryHistory.effectiveDate' }
          },
          avgIncrease: { $avg: '$salaryHistory.changePercentage' },
          totalAdjustments: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || {},
        payGrades: payGradeStats,
        trends: salaryTrends,
        year: parseInt(year)
      }
    });

  } catch (error) {
    console.error('Salary analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch salary analytics' });
  }
});

// Create sample salary data (for testing)
router.post('/create-sample-data', adminAuth, async (req, res) => {
  try {
    // Get all users
    const users = await User.find({}).limit(10);

    if (users.length === 0) {
      return res.status(400).json({ error: 'No users found to create sample data' });
    }

    const sampleSalaries = [];

    for (const user of users) {
      // Check if salary record already exists
      const existingSalary = await Salary.findOne({ user: user._id });

      if (!existingSalary) {
        const baseSalary = Math.floor(Math.random() * 50000) + 40000; // 40k-90k

        const salaryData = {
          user: user._id,
          baseSalary: baseSalary,
          currency: 'USD',
          salaryType: 'Monthly',
          payGrade: `L${Math.floor(Math.random() * 5) + 1}`,
          joiningDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          allowances: {
            housing: Math.floor(baseSalary * 0.1),
            transport: Math.floor(baseSalary * 0.05),
            medical: Math.floor(baseSalary * 0.08),
            other: Math.floor(baseSalary * 0.02)
          },
          bankDetails: {
            accountNumber: `ACC${Math.floor(Math.random() * 1000000000)}`,
            bankName: ['Chase Bank', 'Wells Fargo', 'Bank of America', 'Citibank'][Math.floor(Math.random() * 4)],
            routingNumber: `${Math.floor(Math.random() * 900000000) + 100000000}`
          },
          probationPeriod: {
            duration: 3,
            isCompleted: Math.random() > 0.3
          }
        };

        const salary = new Salary(salaryData);
        await salary.save();
        sampleSalaries.push(salary);
      }
    }

    res.json({
      success: true,
      message: `Created ${sampleSalaries.length} sample salary records`,
      data: sampleSalaries
    });

  } catch (error) {
    console.error('Create sample data error:', error);
    res.status(500).json({ error: 'Failed to create sample data' });
  }
});

module.exports = router;
