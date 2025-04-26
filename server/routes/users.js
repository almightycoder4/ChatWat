import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Search users by username
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Find users matching the query
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user._id } // Exclude current user
    }).select('-password').limit(10);
    
    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate userId format
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;