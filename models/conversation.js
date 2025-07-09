const mongoose = require('mongoose');
const User = mongoose.model('User');
const Message = require('./message');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
   vvalidate: {
      validator: function(v) {
        return v.length === 2 && !v[0].equals(v[1]);
      },
      message: 'Conversation must have exactly 2 distinct participants'
    }
  }],
  messageRefs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: []
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  participantUnread: {
    type: Map,
    of: Number,
    default: {}
  },
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Indexes for optimized queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'participants.0': 1, 'participants.1': 1 }, { unique: true });
conversationSchema.index({ lastMessage: -1 });
conversationSchema.index({ updatedAt: -1 });

// Virtual for message count
conversationSchema.virtual('messageCount').get(function() {
  return this.messageRefs.length;
});

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function(user1Id, user2Id) {
  const participants = [user1Id, user2Id].sort();
  let conversation = await this.findOne({ participants });
  
  if (!conversation) {
    conversation = await this.create({ 
      participants,
      participantUnread: new Map([
        [participants[0].toString(), 0],
        [participants[1].toString(), 0]
      ])
    });
  }
  
  return conversation
    .populate('participants', 'fullname role specialty isAvailable')
    .populate('lastMessage')
    .execPopulate();
};

// Instance method to mark as read
conversationSchema.methods.markAsRead = async function(userId) {
  const unread = this.participantUnread.get(userId.toString()) || 0;
  if (unread > 0) {
    await Message.updateMany(
      {
        conversationId: this._id,
        recipient: userId,
        isRead: false
      },
      { $set: { isRead: true } }
    );
    
    this.participantUnread.set(userId.toString(), 0);
    this.unreadCount = Math.max(0, this.unreadCount - unread);
    await this.save();
  }
  return this;
};

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;