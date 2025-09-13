const mongoose = require('mongoose');

const dailyAttendanceSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  date: { 
    type: Date, 
    required: true,
    index: true
  },
  
  // Start Day Information
  startDayTime: { 
    type: Date,
    index: true
  },
  startDayLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number
  },
  startDayDevice: {
    userAgent: String,
    ipAddress: String,
    deviceType: String
  },
  
  // End Day Information
  endDayTime: { 
    type: Date 
  },
  endDayLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number
  },
  endDayDevice: {
    userAgent: String,
    ipAddress: String,
    deviceType: String
  },
  
  // Biometric Data (from Excel uploads)
  biometricTimeIn: { 
    type: Date,
    index: true
  },
  biometricTimeOut: { 
    type: Date 
  },
  biometricDeviceId: String,
  biometricLocation: String,
  
  // Calculated Working Hours
  totalHoursWorked: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 24
  },
  regularHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 8
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  breakTime: {
    type: Number,
    default: 0, // in minutes
    min: 0
  },
  
  // Status and Verification
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half Day', 'Late', 'On Leave', 'Holiday'],
    default: 'Absent',
    index: true
  },
  isPresent: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  verificationMethod: {
    type: String,
    enum: ['StartDay', 'Biometric', 'Both', 'Manual', 'Leave'],
    default: 'Manual'
  },
  
  // Discrepancies
  hasDiscrepancy: {
    type: Boolean,
    default: false,
    index: true
  },
  discrepancyType: {
    type: String,
    enum: ['Time Mismatch', 'Location Mismatch', 'Missing Data', 'Late Entry', 'Early Exit'],
    index: true
  },
  discrepancyDetails: {
    timeDifference: Number, // in minutes
    locationDistance: Number, // in meters
    description: String
  },
  
  // Leave Information
  isLeave: {
    type: Boolean,
    default: false,
    index: true
  },
  leaveType: {
    type: String,
    enum: ['Sick', 'Vacation', 'Personal', 'Emergency', 'Maternity', 'Paternity', 'Holiday']
  },
  leaveReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Leave'
  },
  
  // Productivity and Performance
  productivityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  meetingsAttended: {
    type: Number,
    default: 0
  },
  
  // Salary Calculation Data
  dailyWage: {
    type: Number,
    default: 0
  },
  earnedAmount: {
    type: Number,
    default: 0
  },
  bonusAmount: {
    type: Number,
    default: 0
  },
  deductionAmount: {
    type: Number,
    default: 0
  },
  
  // Auto-end day tracking
  autoEnded: {
    type: Boolean,
    default: false
  },
  maxWorkingHours: {
    type: Number,
    default: 8
  },
  
  // Aim Completion Tracking
  dailyAimCompleted: {
    type: Boolean,
    default: false
  },
  aimCompletionStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'MVP Achieved', 'Not Set'],
    default: 'Not Set'
  },
  aimCompletionComment: {
    type: String,
    maxlength: 500
  },
  
  // Work Location Type
  workLocationType: {
    type: String,
    enum: ['Office', 'Home', 'Remote'],
    default: 'Office'
  },
  
  // Progress Completion Tracking
  dailyProgressCompleted: {
    type: Boolean,
    default: false
  },
  
  // Approval workflow
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Auto-Approved'],
    default: 'Pending',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  
  // Notes and comments
  employeeNotes: {
    type: String,
    maxlength: 500
  },
  managerNotes: {
    type: String,
    maxlength: 500
  },
  systemNotes: {
    type: String,
    maxlength: 300
  },
  
  // Metadata
  source: { 
    type: String, 
    enum: ['StartDay', 'Biometric', 'Both', 'Manual', 'Leave', 'Holiday'], 
    required: true,
    index: true
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate hours and detect discrepancies
dailyAttendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total hours worked
  let startTime = null;
  let endTime = null;
  
  // Prioritize biometric data if available
  if (this.biometricTimeIn && this.biometricTimeOut) {
    startTime = this.biometricTimeIn;
    endTime = this.biometricTimeOut;
    this.verificationMethod = this.startDayTime ? 'Both' : 'Biometric';
  } else if (this.startDayTime && this.endDayTime) {
    startTime = this.startDayTime;
    endTime = this.endDayTime;
    this.verificationMethod = this.biometricTimeIn ? 'Both' : 'StartDay';
  }
  
  if (startTime && endTime) {
    const timeDiff = endTime.getTime() - startTime.getTime();
    const totalHours = Math.max(0, (timeDiff / (1000 * 60 * 60)) - (this.breakTime / 60));
    
    this.totalHoursWorked = Math.round(totalHours * 100) / 100;
    this.regularHours = Math.min(totalHours, 8);
    this.overtimeHours = Math.max(0, totalHours - 8);
    
    // Set presence status
    this.isPresent = true;
    this.isVerified = true;
    
    // Determine status based on hours worked
    if (totalHours >= 8) {
      this.status = 'Present';
    } else if (totalHours >= 4) {
      this.status = 'Half Day';
    } else if (totalHours > 0) {
      this.status = 'Present'; // Short day but present
    }
  }
  
  // Detect discrepancies between biometric and start day data
  if (this.biometricTimeIn && this.startDayTime) {
    const timeDiff = Math.abs(this.biometricTimeIn.getTime() - this.startDayTime.getTime());
    const timeDiffMinutes = timeDiff / (1000 * 60);
    
    if (timeDiffMinutes > 15) { // 15 minutes threshold
      this.hasDiscrepancy = true;
      this.discrepancyType = 'Time Mismatch';
      this.discrepancyDetails.timeDifference = timeDiffMinutes;
      this.discrepancyDetails.description = `Time difference of ${Math.round(timeDiffMinutes)} minutes between biometric and start day data`;
    }
  }
  
  // Calculate daily wage if not set
  if (!this.dailyWage && this.totalHoursWorked > 0) {
    // This should be calculated based on user's salary information
    // For now, using a default calculation
    this.dailyWage = 258; // Default daily wage
    this.earnedAmount = (this.totalHoursWorked / 8) * this.dailyWage;
  }
  
  // Set leave status
  if (this.isLeave) {
    this.status = 'On Leave';
    this.isPresent = false;
    this.isVerified = true;
    this.verificationMethod = 'Leave';
  }
  
  next();
});

// Compound indexes for efficient queries
dailyAttendanceSchema.index({ user: 1, date: -1 });
dailyAttendanceSchema.index({ date: 1, isPresent: 1 });
dailyAttendanceSchema.index({ user: 1, isVerified: 1, date: -1 });
dailyAttendanceSchema.index({ hasDiscrepancy: 1, date: -1 });
dailyAttendanceSchema.index({ approvalStatus: 1, date: -1 });

// Virtual for status display
dailyAttendanceSchema.virtual('statusDisplay').get(function() {
  if (this.isLeave) return 'On Leave';
  if (this.isPresent && this.isVerified) return 'Present';
  if (this.isPresent && !this.isVerified) return 'Present (Unverified)';
  if (this.hasDiscrepancy) return 'Discrepancy';
  return 'Absent';
});

// Virtual for status color
dailyAttendanceSchema.virtual('statusColor').get(function() {
  if (this.isLeave) return '#8b5cf6';
  if (this.isPresent && this.isVerified) return '#10b981';
  if (this.isPresent && !this.isVerified) return '#f59e0b';
  if (this.hasDiscrepancy) return '#ef4444';
  return '#6b7280';
});

// Static method to get attendance statistics
dailyAttendanceSchema.statics.getAttendanceStats = async function(startDate, endDate, userId = null) {
  const matchCondition = {
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID format');
    }
    matchCondition.user = new mongoose.Types.ObjectId(userId);
  }
  
  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: { $sum: { $cond: ['$isPresent', 1, 0] } },
        verifiedDays: { $sum: { $cond: ['$isVerified', 1, 0] } },
        leaveDays: { $sum: { $cond: ['$isLeave', 1, 0] } },
        discrepancies: { $sum: { $cond: ['$hasDiscrepancy', 1, 0] } },
        totalHours: { $sum: '$totalHoursWorked' },
        overtimeHours: { $sum: '$overtimeHours' },
        totalEarnings: { $sum: '$earnedAmount' }
      }
    },
    {
      $project: {
        totalDays: 1,
        presentDays: 1,
        verifiedDays: 1,
        leaveDays: 1,
        discrepancies: 1,
        absentDays: { $subtract: ['$totalDays', '$presentDays'] },
        attendanceRate: { 
          $multiply: [
            { $divide: ['$presentDays', '$totalDays'] }, 
            100
          ] 
        },
        verificationRate: {
          $multiply: [
            { $divide: ['$verifiedDays', '$presentDays'] },
            100
          ]
        },
        avgHoursPerDay: { $divide: ['$totalHours', '$presentDays'] },
        totalHours: 1,
        overtimeHours: 1,
        totalEarnings: 1
      }
    }
  ]);
  
  return stats[0] || {};
};

// Method to calculate monthly salary
dailyAttendanceSchema.statics.calculateMonthlySalary = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const attendanceRecords = await this.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(record => record.isPresent).length;
  const totalHours = attendanceRecords.reduce((sum, record) => sum + record.totalHoursWorked, 0);
  const totalEarnings = attendanceRecords.reduce((sum, record) => sum + record.earnedAmount, 0);
  const overtimeHours = attendanceRecords.reduce((sum, record) => sum + record.overtimeHours, 0);
  
  return {
    period: { year, month, startDate, endDate },
    attendance: {
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0
    },
    hours: {
      totalHours: Math.round(totalHours * 100) / 100,
      regularHours: Math.round((totalHours - overtimeHours) * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      avgHoursPerDay: presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0
    },
    salary: {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      regularPay: Math.round((totalEarnings - (overtimeHours * 32.25 * 1.5)) * 100) / 100,
      overtimePay: Math.round(overtimeHours * 32.25 * 1.5 * 100) / 100
    }
  };
};

module.exports = mongoose.model('DailyAttendance', dailyAttendanceSchema);