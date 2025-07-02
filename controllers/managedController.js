const ManagedRelationship = require('../models/ManagedRelationship');
const User = require('../models/user');

const addSpecialist = async (req, res) => {
  try {
    const { specialistName } = req.body;
    const specialist = await User.findOne({ fullname: specialistName, role: 'specialist' });
    if (!specialist) {
      return res.status(404).json({ message: 'Specialist not found' });
    }
    const existingRelationship = await ManagedRelationship.findOne({
      client: req.user._id,
      specialist: specialist._id,
    });
    if (existingRelationship) {
      return res.status(400).json({ message: 'Specialist already added' });
    }
    const relationship = new ManagedRelationship({
      client: req.user._id,
      specialist: specialist._id,
      isDone: false,
      dateAdded: new Date(),
    });
    await relationship.save();
    await relationship.populate('specialist', 'fullname governorate district specialty isAvailable');
    res.status(201).json({ specialist: relationship.specialist });
  } catch (error) {
    res.status(400).json({ message: 'Failed to add specialist' });
  }
};

const addClient = async (req, res) => {
  try {
    const { clientName } = req.body;
    const client = await User.findOne({ fullname: clientName, role: 'client' });
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    const existingRelationship = await ManagedRelationship.findOne({
      specialist: req.user._id,
      client: client._id,
    });
    if (existingRelationship) {
      return res.status(400).json({ message: 'Client already added' });
    }
    const relationship = new ManagedRelationship({
      specialist: req.user._id,
      client: client._id,
      isDone: false,
      dateAdded: new Date(),
    });
    await relationship.save();
    await relationship.populate('client', 'fullname governorate district');
    res.status(201).json({ client: relationship.client });
  } catch (error) {
    res.status(400).json({ message: 'Failed to add client' });
  }
};

const getManagedSpecialists = async (req, res) => {
  try {
    const relationships = await ManagedRelationship.find({ client: req.user._id })
      .populate('specialist', 'fullname governorate district specialty isAvailable')
      .select('isDone dateAdded specialist');
    const specialists = relationships.map((rel) => ({
      _id: rel.specialist._id,
      fullname: rel.specialist.fullname,
      governorate: rel.specialist.governorate,
      district: rel.specialist.district,
      specialty: rel.specialist.specialty,
      isAvailable: rel.specialist.isAvailable,
      isDone: rel.isDone,
      dateAdded: rel.dateAdded,
    }));
    res.json({ specialists });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch managed specialists' });
  }
};

const getManagedClients = async (req, res) => {
  try {
    const relationships = await ManagedRelationship.find({ specialist: req.user._id })
      .populate('client', 'fullname governorate district')
      .select('isDone dateAdded client');
    const clients = relationships.map((rel) => ({
      _id: rel.client._id,
      fullname: rel.client.fullname,
      governorate: rel.client.governorate,
      district: rel.client.district,
      isDone: rel.isDone,
      dateAdded: rel.dateAdded,
    }));
    res.json({ clients });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch managed clients' });
  }
};

const updateSpecialistStatus = async (req, res) => {
  try {
    const { specialistId, isDone } = req.body;
    const relationship = await ManagedRelationship.findOne({
      client: req.user._id,
      specialist: specialistId,
    });
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    relationship.isDone = isDone;
    await relationship.save();
    res.json({ message: 'Specialist status updated' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update specialist status' });
  }
};

const updateClientStatus = async (req, res) => {
  try {
    const { clientId, isDone } = req.body;
    const relationship = await ManagedRelationship.findOne({
      specialist: req.user._id,
      client: clientId,
    });
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    relationship.isDone = isDone;
    await relationship.save();
    res.json({ message: 'Client status updated' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update client status' });
  }
};

const removeSpecialist = async (req, res) => {
  try {
    const { specialistId } = req.params;
    const relationship = await ManagedRelationship.findOneAndDelete({
      client: req.user._id,
      specialist: specialistId,
    });
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    res.json({ message: 'Specialist removed' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to remove specialist' });
  }
};

const removeClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const relationship = await ManagedRelationship.findOneAndDelete({
      specialist: req.user._id,
      client: clientId,
    });
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    res.json({ message: 'Client removed' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to remove client' });
  }
};

module.exports = {
  addSpecialist,
  addClient,
  getManagedSpecialists,
  getManagedClients,
  updateSpecialistStatus,
  updateClientStatus,
  removeSpecialist,
  removeClient,
};