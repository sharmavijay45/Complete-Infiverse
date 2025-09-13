const express = require("express")
const router = express.Router()
const Department = require("../models/Department")
const Task = require("../models/Task")
const User = require("../models/User")
const auth = require("../middleware/auth")

// Get all departments - SHOW ALL DEPARTMENTS (no blackhole filtering)
router.get("/", async (req, res) => {
  try {
    const departments = await Department.find()
      .populate({
        path: "lead",
        select: "name avatar stillExist email"
        // Removed blackhole filtering - show all leads
      })
      .populate({
        path: "members",
        select: "name avatar stillExist email"
        // Removed blackhole filtering - show all members
      })
    
    res.json({
      success: true,
      data: departments
    })
  } catch (error) {
    console.error("Error fetching departments:", error)
    res.status(500).json({
      success: false,
      error: "Server error"
    })
  }
})

// Get department by ID - SHOW ALL USERS
router.get("/:id", auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate({
        path: "lead",
        select: "name avatar stillExist email"
        // Removed blackhole filtering
      })
      .populate({
        path: "members",
        select: "name avatar stillExist email"
        // Removed blackhole filtering
      })

    if (!department) {
      return res.status(404).json({ error: "Department not found" })
    }

    res.json(department)
  } catch (error) {
    console.error("Error fetching department:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Create new department - ONLY ALLOW ACTIVE BLACKHOLE USERS FOR NEW ASSIGNMENTS
router.post("/", auth, async (req, res) => {
  try {
    const { lead, members, ...departmentData } = req.body

    // For NEW assignments, verify lead is active and has blackhole email if provided
    if (lead) {
      const leadUser = await User.findOne({ 
        _id: lead, 
        stillExist: 1,
        email: { $regex: /^blackhole/, $options: 'i' }
      })
      if (!leadUser) {
        return res.status(400).json({ error: "Lead user not found, not active, or not authorized" })
      }
    }

    // For NEW assignments, verify all members are active and have blackhole emails if provided
    if (members && members.length > 0) {
      const activeMembers = await User.find({ 
        _id: { $in: members }, 
        stillExist: 1,
        email: { $regex: /^blackhole/, $options: 'i' }
      })
      if (activeMembers.length !== members.length) {
        return res.status(400).json({ error: "Some members are not active, not found, or not authorized" })
      }
    }

    const newDepartment = new Department({
      ...departmentData,
      lead,
      members: members || []
    })
    const department = await newDepartment.save()

    // Populate fields for response - SHOW ALL USERS
    const populatedDepartment = await Department.findById(department._id)
      .populate({
        path: "lead",
        select: "name avatar stillExist email"
      })
      .populate({
        path: "members",
        select: "name avatar stillExist email"
      })

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit("department-created", populatedDepartment)
    }

    res.status(201).json(populatedDepartment)
  } catch (error) {
    console.error("Error creating department:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Update department - ONLY ALLOW ACTIVE BLACKHOLE USERS FOR NEW ASSIGNMENTS
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params
    const { lead, members, ...updates } = req.body

    // For NEW assignments, verify lead is active and has blackhole email if being updated
    if (lead) {
      const leadUser = await User.findOne({ 
        _id: lead, 
        stillExist: 1,
        email: { $regex: /^blackhole/, $options: 'i' }
      })
      if (!leadUser) {
        return res.status(400).json({ error: "Lead user not found, not active, or not authorized" })
      }
      updates.lead = lead
    }

    // For NEW assignments, verify all members are active and have blackhole emails if being updated
    if (members && members.length > 0) {
      const activeMembers = await User.find({ 
        _id: { $in: members }, 
        stillExist: 1,
        email: { $regex: /^blackhole/, $options: 'i' }
      })
      if (activeMembers.length !== members.length) {
        return res.status(400).json({ error: "Some members are not active, not found, or not authorized" })
      }
      updates.members = members
    }

    const department = await Department.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate({
        path: "lead",
        select: "name avatar stillExist email"
        // Show all users - no filtering
      })
      .populate({
        path: "members",
        select: "name avatar stillExist email"
        // Show all users - no filtering
      })

    if (!department) {
      return res.status(404).json({ error: "Department not found" })
    }

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit("department-updated", department)
    }

    res.json(department)
  } catch (error) {
    console.error("Error updating department:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete department
router.delete("/:id", auth, async (req, res) => {
  try {
    // Check if there are tasks assigned to this department
    const tasksCount = await Task.countDocuments({ department: req.params.id })

    if (tasksCount > 0) {
      return res.status(400).json({
        error: "Cannot delete department with assigned tasks",
      })
    }

    const department = await Department.findByIdAndDelete(req.params.id)

    if (!department) {
      return res.status(404).json({ error: "Department not found" })
    }

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit("department-deleted", req.params.id)
    }

    res.json({ message: "Department deleted successfully" })
  } catch (error) {
    console.error("Error deleting department:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get tasks by department - SHOW ALL EXISTING ASSIGNEES
router.get("/:id/tasks", auth, async (req, res) => {
  try {
    const { status } = req.query

    // Build filter object
    const filter = { department: req.params.id }
    if (status) filter.status = status

    const tasks = await Task.find(filter)
      .populate("dependencies", "title status")

    // Handle assignee population manually - SHOW ALL EXISTING ASSIGNEES
    const tasksWithAssignees = await Promise.all(tasks.map(async (task) => {
      const taskObj = task.toObject()
      
      if (!task.assignee) {
        taskObj.assignee = null
        return taskObj
      }

      // Get the actual user without filtering - SHOW EXISTING ASSIGNEES
      const actualUser = await User.findById(task.assignee).select("name avatar email stillExist")
      
      if (!actualUser) {
        taskObj.assignee = null
        return taskObj
      }

      // Always show the assignee, but with status indicators
      const isActive = actualUser.stillExist === 1
      const isBlackhole = actualUser.email.toLowerCase().startsWith('blackhole')

      taskObj.assignee = {
        _id: actualUser._id,
        name: actualUser.name,
        avatar: actualUser.avatar,
        email: actualUser.email,
        stillExist: actualUser.stillExist,
        isActive,
        isBlackhole,
        status: !isActive ? 'inactive' : !isBlackhole ? 'non-blackhole' : 'active'
      }

      return taskObj
    }))

    res.json(tasksWithAssignees)
  } catch (error) {
    console.error("Error fetching department tasks:", error)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router