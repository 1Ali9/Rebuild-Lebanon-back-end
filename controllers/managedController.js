const ManagedRelationship = require('../models/ManagedRelationship');
const User = require('../models/user');

const addClient = async (req, res) => {
  try {
    if (req.user.role !== 'specialist') {
      return res.status(403).json({ message: 'Only specialists can add clients' });
    }
    const { clientId } = req.body;
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(404).json({ message: 'Client not found' });
    }
    const existingRelationship = await ManagedRelationship.findOne({
      client: clientId,
      specialist: req.user._id,
    });
    if (existingRelationship) {
      return res.status(400).json({ message: 'Client already managed' });
    }
    const relationship = new ManagedRelationship({
      client: clientId,
      specialist: req.user._id,
    });
    await relationship.save();
    await relationship.populate('client', 'fullname governorate district');
    res.status(201).json(relationship);
  } catch (error) {
    res.status(400).json({ message: 'Failed to add client' });
  }
};

const removeClient = async (req, res) => {
  try {
    if (req.user.role !== 'specialist') {
      return res.status(403).json({ message: 'Only specialists can remove clients' });
    }
    const { clientId } = req.params;
    const relationship = await ManagedRelationship.findOneAndDelete({
      client: clientId,
      specialist: req.user._id,
    });
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    res.json({ message: 'Client removed successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to remove client' });
  }
};

const updateClientStatus = async (req, res) => {
  try {
    if (req.user.role !== 'specialist') {
      return res.status(403).json({ message: 'Only specialists can update client status' });
    }
    const { clientId } = req.params;
    const { isDone } = req.body;
    const relationship = await ManagedRelationship.findOneAndUpdate(
      { client: clientId, specialist: req.user._id },
      { isDone },
      { new: true, runValidators: true }
    );
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    await relationship.populate('client', 'fullname governorate district');
    res.json(relationship);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update client status' });
  }
};

const getManagedClients = async (req, res) => {
  try {
    if (req.user.role !== 'specialist') {
      return res.status(403).json({ message: 'Only specialists can view managed clients' });
    }
    const relationships = await ManagedRelationship.find({ specialist: req.user._id })
      .populate('client', 'fullname governorate district neededSpecialists');
    res.json(relationships);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch managed clients' });
  }
};

const addSpecialist = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can add specialists' });
    }
    const { specialistId } = req.body;
    const specialist = await User.findById(specialistId);
    if (!specialist || specialist.role !== 'specialist') {
      return res.status(404).json({ message: 'Specialist not found' });
    }
    const existingRelationship = await ManagedRelationship.findOne({
      client: req.user._id,
      specialist: specialistId,
    });
    if (existingRelationship) {
      return res.status(400).json({ message: 'Specialist already managed' });
    }
    const relationship = new ManagedRelationship({
      client: req.user._id,
      specialist: specialistId,
    });
    await relationship.save();
    await relationship.populate('specialist', 'fullname governorate district specialty');
    res.status(201).json(relationship);
  } catch (error) {
    res.status(400).json({ message: 'Failed to add specialist' });
  }
};

const removeSpecialist = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can remove specialists' });
    }
    const { specialistId } = req.params;
    const relationship = await ManagedRelationship.findOneAndDelete({
      client: req.user._id,
      specialist: specialistId,
    });
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    res.json({ message: 'Specialist removed successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to remove specialist' });
  }
};

const updateSpecialistStatus = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can update specialist status' });
    }
    const { specialistId } = req.params;
    const { isDone } = req.body;
    const relationship = await ManagedRelationship.findOneAndUpdate(
      { client: req.user._id, specialist: specialistId },
      { isDone },
      { new: true, runValidators: true }
    );
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    await relationship.populate('specialist', 'fullname governorate district specialty');
    res.json(relationship);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update specialist status' });
  }
};

const getManagedSpecialists = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can view managed specialists' });
    }
    const relationships = await ManagedRelationship.find({ client: req.user._id })
      .populate('specialist', 'fullname governorate district specialty isAvailable');
    res.json(relationships);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch managed specialists' });
  }
};

module.exports = {
  addClient,
  removeClient,
  updateClientStatus,
  getManagedClients,
  addSpecialist,
  removeSpecialist,
  updateSpecialistStatus,
  getManagedSpecialists,
};