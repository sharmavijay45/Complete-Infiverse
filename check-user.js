// Quick script to check and activate specific user
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  stillExist: { type: Number, default: 1 },
  role: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }
});

const User = mongoose.model('User', userSchema);

async function checkAndActivateUser() {
  try {
    console.log('🔍 Searching for user: 9321vijaysharma@gmail.com');
    
    // Find the user
    const user = await User.findOne({ email: '9321vijaysharma@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found in database');
      
      // Search for similar emails
      const similarUsers = await User.find({ 
        email: { $regex: /9321vijaysharma/i } 
      }).select('name email stillExist');
      
      console.log('🔍 Similar users found:', similarUsers);
      
    } else {
      console.log('✅ User found:', {
        id: user._id,
        name: user.name,
        email: user.email,
        stillExist: user.stillExist,
        role: user.role,
        department: user.department
      });
      
      // Activate user if not active
      if (user.stillExist !== 1) {
        console.log('🔄 Activating user...');
        user.stillExist = 1;
        await user.save();
        console.log('✅ User activated successfully');
      } else {
        console.log('✅ User is already active');
      }
      
      // Get user's tasks
      const Task = mongoose.model('Task', new mongoose.Schema({
        title: String,
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: String,
        createdAt: { type: Date, default: Date.now }
      }));
      
      const tasks = await Task.find({ assignee: user._id }).select('title status createdAt');
      console.log(`📋 User has ${tasks.length} tasks:`, tasks.slice(0, 5));
    }
    
    // Also check all users to see the total count
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ stillExist: 1 });
    const inactiveUsers = await User.countDocuments({ stillExist: 0 });
    
    console.log('\n📊 Database Stats:');
    console.log(`Total users: ${totalUsers}`);
    console.log(`Active users: ${activeUsers}`);
    console.log(`Inactive users: ${inactiveUsers}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAndActivateUser();