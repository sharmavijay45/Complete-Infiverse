const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Progress = require("../models/Progress");
const Task = require("../models/Task");
const User = require("../models/User");
const { check, validationResult } = require("express-validator");

// @route   GET api/progress/task/:taskId
// @desc    Get all progress updates for a task
// @access  Private
router.get("/task/:taskId", auth, async (req, res) => {
  try {
    const progress = await Progress.find({ task: req.params.taskId })
      .sort({ date: -1 })
      .populate({
        path: "user",
        select: "name email stillExist",
        match: { stillExist: 1 } // Only populate active users
      });

    // Filter out progress entries where user didn't populate (inactive users)
    const activeProgress = progress.filter(p => p.user);

    res.json(activeProgress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/progress/user/:userId
// @desc    Get all progress updates by a user
// @access  Private
router.get("/user/:userId", auth, async (req, res) => {
  try {
    // Check if user is active
    const user = await User.findOne({ _id: req.params.userId, stillExist: 1 });
    if (!user) {
      return res.status(404).json({ error: "User not found or no longer active" });
    }

    const progress = await Progress.find({ user: req.params.userId })
      .sort({ date: -1 })
      .populate("task", "title description dueDate");

    res.json(progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/progress/all
// @desc    Get all progress updates for admin view
// @access  Admin only
router.get("/all", auth, async (req, res) => {
  try {
    const { date, user } = req.query;
    console.log('Progress all query params:', { date, user });
    
    // Build filter object
    const filter = {};
    if (user) {
      // Check if specific user is active
      const userDoc = await User.findOne({ _id: user, stillExist: 1 });
      if (!userDoc) {
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
      filter.user = user;
    }
    
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(queryDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      filter.date = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
    
    console.log('Progress filter:', filter);
    
    const progress = await Progress.find(filter)
      .populate({
        path: "user",
        select: "name email department stillExist",
        match: { stillExist: 1 }, // Only populate active users
        populate: {
          path: "department",
          select: "name color"
        }
      })
      .populate("task", "title description")
      .sort({ date: -1 });

    // Filter out progress entries where user didn't populate (inactive users)
    const activeProgress = progress.filter(p => p.user);
      
    console.log(`Found ${activeProgress.length} progress entries for active users`);
    
    res.json({
      success: true,
      count: activeProgress.length,
      data: activeProgress
    });
  } catch (error) {
    console.error("Error fetching progress entries:", error);
    res.status(500).json({ 
      success: false,
      error: "Server error",
      details: error.message 
    });
  }
});

// @route   POST api/progress
// @desc    Create a progress update
// @access  Private
router.post(
  "/",
  auth,
  [
    check("task", "Task ID is required").not().isEmpty(),
    check("progressPercentage", "Progress percentage is required").isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { user, task, progressPercentage, notes, blockers, achievements, date } = req.body;

      // Check if user is active
      const userDoc = await User.findOne({ _id: user, stillExist: 1 });
      if (!userDoc) {
        return res.status(404).json({ error: "User not found or no longer active" });
      }

      // Check if task exists and belongs to user
      const taskDoc = await Task.findById(task);
      if (!taskDoc) {
        return res.status(404).json({ msg: "Task not found" });
      }

      // Create new progress
      const newProgress = new Progress({
        task,
        user,
        progressPercentage,
        notes,
        blockers,
        achievements,
        date: date || new Date(),
      });

      const progress = await newProgress.save();

      // Update task progress
      taskDoc.progress = progressPercentage;
      await taskDoc.save();

      // Update today's aim with progress information
      const Aim = require("../models/Aim");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAim = await Aim.findOne({
        user: user,
        date: {
          $gte: today,
          $lt: tomorrow
        }
      });

      if (todayAim) {
        // Update aim with progress information
        todayAim.progressPercentage = progressPercentage;
        todayAim.progressNotes = notes;
        todayAim.achievements = achievements;
        todayAim.blockers = blockers;
        await todayAim.save();

        console.log(`📊 Updated aim progress for user ${user}: ${progressPercentage}%`);
      }

      // Notify via Socket.IO
      if (req.io) {
        req.io.to(`task-${task}`).emit("progress-update", {
          task,
          progress: progressPercentage,
          user
        });

        // Emit aim update if aim was updated
        if (todayAim) {
          req.io.emit("aim-updated", {
            aim: todayAim,
            user: { id: user }
          });
        }
      }

      res.json(progress);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   PUT api/progress/:id
// @desc    Update a progress entry
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { progressPercentage, notes, blockers, achievements } = req.body;

    // Find progress by ID
    let progress = await Progress.findById(req.params.id);
    if (!progress) {
      return res.status(404).json({ msg: "Progress entry not found" });
    }

    // Check if user owns the progress entry
    if (progress.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // Check if user is still active
    const user = await User.findOne({ _id: progress.user, stillExist: 1 });
    if (!user) {
      return res.status(404).json({ error: "User not found or no longer active" });
    }

    // Update fields
    if (progressPercentage) progress.progressPercentage = progressPercentage;
    if (notes) progress.notes = notes;
    if (blockers !== undefined) progress.blockers = blockers;
    if (achievements !== undefined) progress.achievements = achievements;
    progress.updatedAt = Date.now();

    await progress.save();

    // Update task progress
    const task = await Task.findById(progress.task);
    if (task) {
      task.progress = progressPercentage;
      await task.save();

      // Notify via Socket.IO
      if (req.io) {
        req.io.to(`task-${task._id}`).emit("progress-update", {
          task: task._id,
          progress: progressPercentage,
          user: req.user.id,
        });
      }
    }

    res.json(progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/progress/:id
// @desc    Delete a progress entry
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const progress = await Progress.findById(req.params.id);
    if (!progress) {
      return res.status(404).json({ msg: "Progress entry not found" });
    }

    // Check if user owns the progress entry or is admin
    if (progress.user.toString() !== req.user.id && req.user.role !== "Admin") {
      return res.status(401).json({ msg: "Not authorized" });
    }

    await progress.remove();
    res.json({ msg: "Progress entry removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;