const ManagedRelationship = require('../models/ManagedRelationship');
const User = require('../models/user');
const mongoose = require('mongoose');

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
    // 1. Debug incoming request
    console.log('\n[DEBUG] ========== START ADD CLIENT REQUEST ==========');
    console.log('[DEBUG] Headers:', req.headers);
    console.log('[DEBUG] Request Body:', req.body);
    console.log('[DEBUG] Authenticated User:', req.user);

    // 2. Validate request body
    if (!req.body.clientId) {
      console.error('[VALIDATION] Missing clientId');
      return res.status(400).json({
        success: false,
        message: "clientId is required in request body",
        received: req.body
      });
    }

    const clientId = String(req.body.clientId).trim();
    console.log('[DEBUG] Processing clientId:', clientId);

    // 3. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      console.error('[VALIDATION] Invalid clientId format');
      return res.status(400).json({
        success: false,
        message: "Invalid Client ID format",
        receivedId: clientId,
        expectedFormat: "24-character hex string",
        example: "507f1f77bcf86cd799439011"
      });
    }

    // 4. Verify client exists
    const client = await User.findOne({
      _id: clientId,
      role: 'client'
    }).select('fullname governorate district neededSpecialists').lean();

    if (!client) {
      console.error('[VALIDATION] Client not found');
      return res.status(404).json({
        success: false,
        message: "Client not found or invalid role"
      });
    }

    // 5. Check for existing relationship
    const existingRelationship = await ManagedRelationship.findOne({
      specialist: req.user._id,
      client: clientId
    });

    if (existingRelationship) {
      console.error('[VALIDATION] Relationship already exists');
      return res.status(409).json({
        success: false,
        message: "Client already in your managed list",
        existingRelationship: existingRelationship._id
      });
    }

    // 6. Create new relationship
    const relationship = new ManagedRelationship({
      specialist: req.user._id,
      client: clientId,
      isDone: false,
      dateAdded: new Date()
    });

    console.log('[DEBUG] New relationship object:', relationship);

    // 7. Validate before saving
    try {
      await relationship.validate();
      console.log('[DEBUG] Relationship validation passed');
    } catch (validationError) {
      console.error('[VALIDATION ERROR]', validationError.errors);
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validationError.errors
      });
    }

    // 8. Save to database
    const savedRelationship = await relationship.save();
    console.log('[DEBUG] Relationship saved successfully:', savedRelationship._id);

    // 9. Return success response
    return res.status(201).json({
      success: true,
      client: {
        ...client,
        isDone: false,
        dateAdded: savedRelationship.dateAdded,
        relationshipId: savedRelationship._id
      }
    });

  } catch (error) {
    // Enhanced error logging
    console.error('\n[ERROR] ======= ADD CLIENT FAILURE =======');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code); // MongoDB error code
    console.error('Stack Trace:', error.stack);
    
    if (error.name === 'MongoServerError') {
      console.error('MongoDB Details:', {
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
    }

    if (error.errors) {
      console.error('Validation Errors:', error.errors);
    }

    // User-friendly error response
    const errorResponse = {
      success: false,
      message: "Internal server error",
      error: error.name
    };

    // Only include sensitive info in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        message: error.message,
        stack: error.stack
      };
    }

    return res.status(500).json(errorResponse);
  } finally {
    console.log('[DEBUG] ========== END ADD CLIENT PROCESS ==========\n');
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
      .populate('client', 'fullname governorate district neededSpecialists');

    const clients = relationships.map(rel => ({
      _id: rel.client._id,
      fullname: rel.client.fullname,
      governorate: rel.client.governorate,
      district: rel.client.district,
      neededSpecialists: rel.client.neededSpecialists,
      isDone: rel.isDone,
      dateAdded: rel.dateAdded,
      relationshipId: rel._id  // <-- Add this line
    }));

    res.json({ clients });
  } catch (error) {
    console.error('Error fetching managed clients:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch managed clients',
      error: error.message 
    });
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

// managedController.js
const updateClientStatus = async (req, res) => {
  try {
    console.log("\n[DEBUG] Received update request:", {
      params: req.params,
      body: req.body,
      user: req.user._id,
      timestamp: new Date(),
    });

    const { isDone } = req.body;
    const { relationshipId } = req.params;

    // Log the raw relationshipId for debugging
    console.log("[DEBUG] Raw relationshipId:", relationshipId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(relationshipId)) {
      console.error("[ERROR] Invalid relationshipId:", relationshipId);
      return res.status(400).json({
        success: false,
        message: "Invalid relationship ID format",
        receivedId: relationshipId,
      });
    }

    console.log("[DEBUG] Attempting update with:", {
      relationshipId,
      isDone,
      specialist: req.user._id,
    });

    const result = await ManagedRelationship.updateOne(
      {
        _id: relationshipId,
        specialist: req.user._id,
      },
      { $set: { isDone } }
    );

    console.log("[DEBUG] MongoDB update result:", result);

    if (result.matchedCount === 0) {
      console.error("[ERROR] No document matched the query");
      return res.status(404).json({
        success: false,
        message: "Relationship not found or not owned by specialist",
      });
    }

    res.json({
      success: true,
      updated: result.modifiedCount === 1,
    });
  } catch (error) {
    console.error("[ERROR] Update failed:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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