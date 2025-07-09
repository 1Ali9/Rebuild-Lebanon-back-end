const mongoose = require('mongoose');
const User = mongoose.model('User');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Indexes for optimized queries
messageSchema.index({ conversationId: 1, createdAt: -1 }); // For message history
messageSchema.index({ conversationId: 1, isRead: 1 });    // For unread counts
messageSchema.index({ sender: 1, createdAt: -1 });        // For user activity
messageSchema.index({ recipient: 1, isRead: 1 });         // For inbox queries

// Middleware to update conversation after message is saved
messageSchema.post('save', async function(doc, next) {
  try {
    await mongoose.model('Conversation').updateOne(
      { _id: doc.conversationId },
      { 
        $set: { lastMessage: doc._id },
        $inc: { 
          unreadCount: doc.isRead ? 0 : 1,
          [`participantUnread.${doc.recipient}`]: doc.isRead ? 0 : 1
        },
        $addToSet: { messageRefs: doc._id } // Track message references without storing all
      }
    );
    next();
  } catch (err) {
    next(err);
  }
});

// Static method for paginated messages
messageSchema.statics.getPaginated = function(conversationId, page = 1, limit = 20) {
  return this.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'fullname role')
    .populate('recipient', 'fullname role')
    .lean();
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;