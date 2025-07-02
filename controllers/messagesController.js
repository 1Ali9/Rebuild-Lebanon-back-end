const Conversation = require('../models/Conversation');
const Message = require('../models/message');
const User = require('../models/user');

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'fullname role')
      .populate('lastMessage');
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversations' });
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
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const messages = await Message.find({ conversationId })
      .populate('sender', 'fullname')
      .populate('recipient', 'fullname');
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

const createConversation = async (req, res) => {
  try {
    const { participantName } = req.body;
    const participant = await User.findOne({ fullname: participantName });
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    if (participant._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participant._id] },
    });
    if (existingConversation) {
      return res.status(400).json({ message: 'Conversation already exists' });
    }
    const conversation = new Conversation({
      participants: [req.user._id, participant._id],
    });
    await conversation.save();
    await conversation.populate('participants', 'fullname role');
    res.status(201).json({ conversationId: conversation._id, messages: [] });
  } catch (error) {
    res.status(400).json({ message: 'Failed to create conversation' });
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
      return res.status(404).json({ message: 'Conversation not found' });
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
    await newMessage.populate('sender', 'fullname');
    await newMessage.populate('recipient', 'fullname');
    res.status(201).json({ message: newMessage });
  } catch (error) {
    res.status(400).json({ message: 'Failed to send message' });
  }
};

module.exports = {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
};