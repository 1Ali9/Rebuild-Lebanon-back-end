const mongoose = require('mongoose');
const User = mongoose.model('User');
const Message = require('./message');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  unreadCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

conversationSchema.pre('save', async function(next) {
  if (this.messages.length > 0) {
    // Set lastMessage to the last message ID in the array
    this.lastMessage = this.messages[this.messages.length - 1];

    // Fetch the last message to get sender
    const lastMessageDoc = await Message.findById(this.lastMessage).populate('sender');
    if (!lastMessageDoc) {
      return next(new Error('Last message not found'));
    }

    // Find the recipient (participant not equal to sender)
    const senderId = lastMessageDoc.sender._id.toString();
    const recipientId = this.participants.find(p => p.toString() !== senderId);
    if (!recipientId) {
      return next(new Error('Recipient not found in participants'));
    }

    // Count unread messages for the recipient
    const unreadMessages = await Message.find({
      _id: { $in: this.messages },
      isRead: false,
      recipient: recipientId,
    }).countDocuments();

    this.unreadCount = unreadMessages;
  }
  next();
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'messages': 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;