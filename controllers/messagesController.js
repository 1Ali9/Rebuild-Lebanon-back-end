const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");
const mongoose = require("mongoose");

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

    await Message.updateMany(
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

// In your messagesController.js
const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user._id; // From auth middleware

    // Validate both IDs
    if (!participantId || !currentUserId) {
      return res.status(400).json({ message: "Missing participant IDs" });
    }

    // Check for existing conversation
    const existingConv = await Conversation.findOne({
      participants: { $all: [currentUserId, participantId] },
    });

    if (existingConv) {
      return res.json({
        conversationId: existingConv._id,
        messages: [],
      });
    }

    // Create new conversation
    const conversation = new Conversation({
      participants: [currentUserId, participantId],
      // ... other fields
    });

    await conversation.save();
    res.status(201).json({
      conversationId: conversation._id,
      messages: [],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId, message, recipientId } = req.body;

    // Sort participants consistently to match the unique index
    const participants = [req.user._id.toString(), recipientId].sort();

    // Check if conversation between these two users exists
    let conversation = await Conversation.findOne({
      participants: participants,
    });

    // Create if not exists
    if (!conversation) {
      conversation = new Conversation({
        participants: participants,
      });
      await conversation.save();
    }

    // Save message
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: req.user._id,
      recipient: recipientId,
      message,
    });

    await newMessage.save();
    await newMessage.populate("sender", "fullname");
    await newMessage.populate("recipient", "fullname");

    res.status(201).json({
      message: newMessage,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ message: "Failed to send message", error: error.message });
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
const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    // Find the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Use the existing instance method
    await conversation.markAsRead(userId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark conversation as read" });
  }
};

module.exports = {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  markAsRead,
  markConversationAsRead,
};
