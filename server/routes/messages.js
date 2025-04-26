import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const router = express.Router();

// Configure storage for media files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|webm|ogg/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image and video files are allowed"));
  }
});

// Get conversation history with a specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Get messages between current user and specified user
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ]
    }).sort({ createdAt: 1 });
    
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    
    // Validate recipientId
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    // Create and save the message
    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content
    });
    
    await message.save();
    
    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message with media
router.post('/media', auth, upload.single('media'), async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Validate recipientId
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    // Determine media type
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    // Create and save the message
    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content: content || '',
      media: req.file.path,
      mediaType
    });
    
    await message.save();
    
    res.status(201).json({ message });
  } catch (error) {
    console.error('Send media message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.put('/read/:senderId', auth, async (req, res) => {
  try {
    const senderId = req.params.senderId;
    
    // Validate senderId
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: 'Invalid sender ID' });
    }
    
    // Update all unread messages from sender to current user
    await Message.updateMany(
      { sender: senderId, recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a specific message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    
    // Validate messageId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if the user is authorized to delete this message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    // Delete the message
    await Message.findByIdAndDelete(messageId);
    
    // If message had media, delete the file
    if (message.media) {
      const filePath = path.join(process.cwd(), message.media.substring(1));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete entire conversation with a user
router.delete('/conversations/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Find all messages in the conversation
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ]
    });
    
    // Delete media files
    for (const message of messages) {
      if (message.media) {
        const filePath = path.join(process.cwd(), message.media.substring(1));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    
    // Delete all messages in the conversation
    await Message.deleteMany({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ]
    });
    
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;