const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");
const mongoose = require('mongoose');

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "fullname role")
      .populate("lastMessage");
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const updateUnreadMessages = await Message.updateMany(
      {
        isRead: false,
        recipient: req.user._id,
      },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({ conversationId })
      .populate("sender", "fullname")
      .populate("recipient", "fullname");

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user._id; // Get from authenticated user
    
    // Validate inputs
    if (!participantId) {
      return res.status(400).json({ message: "Participant ID is required" });
    }

    // Check if trying to message self
    if (participantId === currentUserId.toString()) {
      return res.status(400).json({ message: "Cannot create conversation with yourself" });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    // Check for existing conversation (order doesn't matter)
    const existingConversation = await Conversation.findOne({
      participants: { $all: [currentUserId, participantId] }
    });

    if (existingConversation) {
      return res.json({ 
        conversationId: existingConversation._id,
        messages: []
      });
    }

    // Create new conversation with both participants
    const conversation = new Conversation({
      participants: [currentUserId, participantId],
      participantUnread: new Map([
        [currentUserId.toString(), 0],
        [participantId.toString(), 0]
      ])
    });

    await conversation.save();
    
    // Populate participant data
    await conversation.populate('participants', 'fullname role');
    
    res.status(201).json({ 
      conversationId: conversation._id,
      messages: []
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(400).json({ 
      message: error.message || "Failed to create conversation"
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const recipientId = conversation.participants.find(
      (p) => !p.equals(req.user._id)
    );
    const newMessage = new Message({
      conversationId,
      sender: req.user._id,
      recipient: recipientId,
      message,
    });
    conversation.messages.push(newMessage._id);
    await newMessage.save();
    await conversation.save();
    await newMessage.populate("sender", "fullname");
    await newMessage.populate("recipient", "fullname");
    res.status(201).json({ message: newMessage });
  } catch (error) {
    res.status(400).json({ message: "Failed to send message" });
  }
};
const markAsRead = async (req, res) => {
  try {
    const messageId = req.params.id;
    // Your implementation here
    const message = await Message.findByIdAndUpdate(
      messageId,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark message as read" });
  }
};
module.exports = {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  markAsRead 
};
