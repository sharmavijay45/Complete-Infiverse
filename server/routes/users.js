const express = require("express")
const router = express.Router()
const User = require("../models/User")
const Task = require("../models/Task")
const TaskSubmission = require("../models/TaskSubmission")
const auth = require("../middleware/auth")
const adminAuth = require("../middleware/adminAuth")
const auditLogService = require('../services/auditLogService');

// Search users - SHOW ALL ACTIVE USERS (for selection in dropdowns)
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const searchQuery = {
      $and: [
        { stillExist: 1 }, // Only show active users
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
            { role: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    };

    const users = await User.find(searchQuery)
      .select("-password")
      .populate("department", "name")
      .limit(10);

    // Calculate additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        try {
          const tasks = await Task.find({ assignee: user._id });
          const completedTasks = tasks.filter(task => task.status === 'Completed').length;
          const activeTasks = tasks.filter(task => task.status !== 'Completed').length;
          const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            joinDate: user.createdAt,
            completionRate,
            activeTasks,
            completedTasks,
            department: user.department,
            stillExist: user.stillExist,
            isActive: user.stillExist === 1
          };
        } catch (error) {
          console.error(`Error calculating stats for user ${user._id}:`, error);
          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            joinDate: user.createdAt,
            completionRate: 0,
            activeTasks: 0,
            completedTasks: 0,
            department: user.department,
            stillExist: user.stillExist,
            isActive: user.stillExist === 1
          };
        }
      })
    );

    res.json(usersWithStats);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all users - SHOW ALL ACTIVE USERS (for selection in dropdowns)
router.get("/", async (req, res) => {
  try {
    const { includeExited } = req.query;
    
    // Build filter - show all active users
    const filter = {};
    if (!includeExited || includeExited !== 'true') {
      filter.stillExist = 1;
    }

    const users = await User.find(filter).select("-password").populate("department", "name")
    
    // Add active indicator to each user
    const usersWithIndicators = users.map(user => ({
      ...user.toObject(),
      isActive: user.stillExist === 1
    }));

    res.json(usersWithIndicators)
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get user by ID - SHOW ALL USERS
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id,
      stillExist: 1 // Only return active users
    }).select("-password").populate("department", "name")

    if (!user) {
      return res.status(404).json({ error: "User not found or no longer active" })
    }

    await auditLogService.log(req.user.id, 'VIEW_USER', 'USER', user._id);

    const userObj = user.toObject();
    userObj.isActive = user.stillExist === 1;

    res.json(userObj)
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Update user
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Remove password from updates (use separate endpoint for password changes)
    if (updates.password) {
      delete updates.password
    }

    const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await auditLogService.log(req.user.id, 'UPDATE_USER', 'USER', user._id);

    res.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Update user status (admin only) - for setting stillExist
router.put("/:id/status", auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { stillExist } = req.body

    if (stillExist !== 0 && stillExist !== 1) {
      return res.status(400).json({ error: "stillExist must be 0 or 1" })
    }

    const user = await User.findByIdAndUpdate(
      id, 
      { $set: { stillExist } }, 
      { new: true }
    ).select("-password").populate("department", "name")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({
      success: true,
      message: stillExist === 1 ? "User reactivated successfully" : "User marked as exited successfully",
      user
    })
  } catch (error) {
    console.error("Error updating user status:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get all users including exited ones (admin only) - SHOW ALL USERS
router.get("/admin/all", auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).select("-password").populate("department", "name")
    
    // Add active indicator to each user
    const usersWithIndicators = users.map(user => ({
      ...user.toObject(),
      isActive: user.stillExist === 1
    }));

    res.json(usersWithIndicators)
  } catch (error) {
    console.error("Error fetching all users:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete user (admin only)
router.delete("/:id", auth, adminAuth, async (req, res) => {
  try {
    // Check if there are tasks assigned to this user
    const tasksCount = await Task.countDocuments({ assignee: req.params.id })

    if (tasksCount > 0) {
      return res.status(400).json({
        error: "Cannot delete user with assigned tasks. Consider marking as exited instead.",
      })
    }

    const user = await User.findByIdAndDelete(req.params.id)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get tasks assigned to user - SHOW ALL USERS
router.get("/:id/tasks", async (req, res) => {
  try {
    const { status } = req.query

    // First check if user is active
    const user = await User.findOne({ _id: req.params.id, stillExist: 1 })
    if (!user) {
      return res.status(404).json({ error: "User not found or no longer active" })
    }

    // Build filter object
    const filter = { assignee: req.params.id }
    if (status) filter.status = status

    const tasks = await Task.find(filter).populate("department", "name color").populate("dependencies", "title status")

    res.json(tasks)
  } catch (error) {
    console.error("Error fetching user tasks:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Change password - SHOW ALL USERS
router.put("/:id/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Current password and new password are required",
      })
    }

    const user = await User.findOne({ _id: req.params.id, stillExist: 1 })

    if (!user) {
      return res.status(404).json({ error: "User not found or no longer active" })
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword)

    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Error changing password:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get submissions by a user - SHOW ALL USERS
router.get("/:id/submissions", auth, async (req, res) => {
  try {
    // Check if user exists (allow both active and inactive for submissions history)
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Check if user is requesting their own submissions or if requester is admin
    if (req.user.id !== req.params.id && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized to access these submissions" })
    }

    // Try to find submissions, but handle the case where TaskSubmission model might not exist
    let submissions = []
    try {
      submissions = await TaskSubmission.find({ user: req.params.id })
        .populate("task", "title status")
        .sort({ createdAt: -1 })
    } catch (submissionError) {
      console.log("TaskSubmission model not found or error:", submissionError.message)
      // Return empty array if TaskSubmission model doesn't exist
      submissions = []
    }

    res.json(submissions)
  } catch (error) {
    console.error("Error fetching user submissions:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get user notifications - SHOW ALL USERS
router.get("/:id/notifications", auth, async (req, res) => {
  try {
    // First check if user is active
    const user = await User.findOne({ _id: req.params.id, stillExist: 1 })
    if (!user) {
      return res.status(404).json({ error: "User not found or no longer active" })
    }

    // Check if user is requesting their own notifications or if requester is admin
    if (req.user.id !== req.params.id && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized to access these notifications" })
    }

    // In a real app, you would fetch notifications from a database
    // For now, we'll return mock data
    const notifications = [
      {
        id: "1",
        type: "submission_approved",
        title: "Submission Approved",
        message: "Your task submission for 'Create Login Page' has been approved!",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        read: false,
        taskId: "task123",
      },
      {
        id: "2",
        type: "submission_rejected",
        title: "Submission Needs Revision",
        message: "Your task submission for 'API Integration' requires some changes.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        read: false,
        taskId: "task456",
      },
      {
        id: "3",
        type: "task_assigned",
        title: "New Task Assigned",
        message: "You have been assigned a new task: 'Database Schema Design'",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        read: true,
        taskId: "task789",
      },
    ]

    res.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Mark all notifications as read - SHOW ALL USERS
router.put("/:id/notifications/read-all", auth, async (req, res) => {
  try {
    // First check if user is active
    const user = await User.findOne({ _id: req.params.id, stillExist: 1 })
    if (!user) {
      return res.status(404).json({ error: "User not found or no longer active" })
    }

    // Check if user is requesting their own notifications or if requester is admin
    if (req.user.id !== req.params.id && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized to access these notifications" })
    }

    // In a real app, you would update notifications in the database
    // For now, we'll just return a success message
    res.json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// TEMPORARY ROUTE - Update all users to stillExist: 1
// @route   POST api/users/update-all-stillexist
// @desc    Set stillExist to 1 for all users (NO AUTH - TEMPORARY)
// @access  Public (TEMPORARY - REMOVE AFTER USE)
router.post("/update-all-stillexist", async (req, res) => {
  try {
    console.log("🔄 Starting bulk update of stillExist field for all users...");
    
    // Update all users to set stillExist: 1
    const result = await User.updateMany(
      {}, // All users
      { $set: { stillExist: 1 } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users with stillExist: 1`);
    
    // Get count of all users for verification
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ stillExist: 1 });
    const inactiveUsers = await User.countDocuments({ stillExist: 0 });
    
    res.json({
      success: true,
      message: "All users updated successfully",
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
    
  } catch (error) {
    console.error("❌ Error updating users stillExist field:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update users",
      details: error.message 
    });
  }
});

module.exports = router