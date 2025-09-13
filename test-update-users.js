// Quick test script to update all users
const fetch = require('node-fetch');

async function updateAllUsers() {
  try {
    const response = await fetch('http://localhost:5000/api/users/update-all-stillexist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Update result:', result);
  } catch (error) {
    console.error('Error updating users:', error);
  }
}

updateAllUsers();