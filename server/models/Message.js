import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  media: {
    type: String,
    default: ''
  },
  mediaType: {
    type: String,
    enum: ['', 'image', 'video'],
    default: ''
  },
  read: {
    type: Boolean,
    default: false
  },
  encrypted: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ sender: 1, recipient: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;