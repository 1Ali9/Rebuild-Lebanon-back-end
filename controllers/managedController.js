const ManagedRelationship = require("../models/ManagedRelationship");
const User = require("../models/user");
const mongoose = require("mongoose");

const addSpecialist = async (req, res) => {
  try {
    console.log("\n[DEBUG] Add Specialist Request:", {
      body: req.body,
      user: req.user,
    });

    const { specialistId } = req.body;

    // Validate input
    if (!specialistId) {
      return res.status(400).json({
        success: false,
        message: "Specialist ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(specialistId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Specialist ID format",
      });
    }

    // Check if specialist exists
    const specialist = await User.findOne({
      _id: specialistId,
      role: "specialist",
    }).select("fullname governorate district specialty isAvailable");

    if (!specialist) {
      return res.status(404).json({
        success: false,
        message: "Specialist not found or invalid role",
      });
    }

    // Check for existing relationship
    const existingRelationship = await ManagedRelationship.findOne({
      client: req.user._id,
      specialist: specialistId,
    });

    if (existingRelationship) {
      return res.status(409).json({
        success: false,
        message: "Specialist already in your managed list",
      });
    }

    // Create new relationship
    const relationship = new ManagedRelationship({
      client: req.user._id,
      specialist: specialistId,
      isDone: false,
      dateAdded: new Date(),
    });

    await relationship.save();

    // Return standardized response
    res.status(201).json({
      success: true,
      specialist: {
        _id: specialist._id,
        fullname: specialist.fullname,
        governorate: specialist.governorate,
        district: specialist.district,
        specialty: specialist.specialty,
        isAvailable: specialist.isAvailable,
        isDone: false,
        dateAdded: relationship.dateAdded,
      },
    });
  } catch (error) {
    console.error("Add Specialist Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add specialist",
      error: error.message,
    });
  }
};

const addClient = async (req, res) => {
  try {
    // 1. Debug incoming request
    console.log("\n[DEBUG] ========== START ADD CLIENT REQUEST ==========");
    console.log("[DEBUG] Headers:", req.headers);
    console.log("[DEBUG] Request Body:", req.body);
    console.log("[DEBUG] Authenticated User:", req.user);

    // 2. Validate request body
    if (!req.body.clientId) {
      console.error("[VALIDATION] Missing clientId");
      return res.status(400).json({
        success: false,
        message: "clientId is required in request body",
        received: req.body,
      });
    }

    const clientId = String(req.body.clientId).trim();
    console.log("[DEBUG] Processing clientId:", clientId);

    // 3. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      console.error("[VALIDATION] Invalid clientId format");
      return res.status(400).json({
        success: false,
        message: "Invalid Client ID format",
        receivedId: clientId,
        expectedFormat: "24-character hex string",
        example: "507f1f77bcf86cd799439011",
      });
    }

    // 4. Verify client exists
    const client = await User.findOne({
      _id: clientId,
      role: "client",
    })
      .select("fullname governorate district neededSpecialists")
      .lean();

    if (!client) {
      console.error("[VALIDATION] Client not found");
      return res.status(404).json({
        success: false,
        message: "Client not found or invalid role",
      });
    }

    // 5. Check for existing relationship
    const existingRelationship = await ManagedRelationship.findOne({
      specialist: req.user._id,
      client: clientId,
    });

    if (existingRelationship) {
      console.error("[VALIDATION] Relationship already exists");
      return res.status(409).json({
        success: false,
        message: "Client already in your managed list",
        existingRelationship: existingRelationship._id,
      });
    }

    // 6. Create new relationship
    const relationship = new ManagedRelationship({
      specialist: req.user._id,
      client: clientId,
      isDone: false,
      dateAdded: new Date(),
    });

    console.log("[DEBUG] New relationship object:", relationship);

    // 7. Validate before saving
    try {
      await relationship.validate();
      console.log("[DEBUG] Relationship validation passed");
    } catch (validationError) {
      console.error("[VALIDATION ERROR]", validationError.errors);
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validationError.errors,
      });
    }

    // 8. Save to database
    const savedRelationship = await relationship.save();
    console.log(
      "[DEBUG] Relationship saved successfully:",
      savedRelationship._id
    );

    // 9. Return success response
    return res.status(201).json({
      success: true,
      client: {
        ...client,
        isDone: false,
        dateAdded: savedRelationship.dateAdded,
        relationshipId: savedRelationship._id,
      },
    });
  } catch (error) {
    // Enhanced error logging
    console.error("\n[ERROR] ======= ADD CLIENT FAILURE =======");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Code:", error.code); // MongoDB error code
    console.error("Stack Trace:", error.stack);

    if (error.name === "MongoServerError") {
      console.error("MongoDB Details:", {
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
      });
    }

    if (error.errors) {
      console.error("Validation Errors:", error.errors);
    }

    // User-friendly error response
    const errorResponse = {
      success: false,
      message: "Internal server error",
      error: error.name,
    };

    // Only include sensitive info in development
    if (process.env.NODE_ENV === "development") {
      errorResponse.details = {
        message: error.message,
        stack: error.stack,
      };
    }

    return res.status(500).json(errorResponse);
  } finally {
    console.log("[DEBUG] ========== END ADD CLIENT PROCESS ==========\n");
  }
};

const getManagedSpecialists = async (req, res) => {
  try {
    const relationships = await ManagedRelationship.find({
      client: req.user._id,
    })
      .populate(
        "specialist",
        "fullname governorate district specialty isAvailable"
      )
      .select("isDone dateAdded specialist");

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

    // Return standardized response
    res.json({
      success: true,
      data: {
        specialists,
      },
    });
  } catch (error) {
    console.error("Error fetching managed specialists:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch managed specialists",
      error: error.message,
    });
  }
};

const getManagedClients = async (req, res) => {
  try {
    const relationships = await ManagedRelationship.find({
      specialist: req.user._id,
    }).populate("client", "fullname governorate district neededSpecialists");

    const clients = relationships.map((rel) => ({
      _id: rel.client._id,
      fullname: rel.client.fullname,
      governorate: rel.client.governorate,
      district: rel.client.district,
      neededSpecialists: rel.client.neededSpecialists,
      isDone: rel.isDone,
      dateAdded: rel.dateAdded,
      relationshipId: rel._id, // <-- Add this line
    }));

    res.json({ clients });
  } catch (error) {
    console.error("Error fetching managed clients:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch managed clients",
      error: error.message,
    });
  }
};

const updateSpecialistStatus = async (req, res) => {
  try {
    console.log("\n[DEBUG] Received specialist status update request:", {
      params: req.params,
      body: req.body,
      user: req.user._id,
      timestamp: new Date(),
    });

    const { isDone } = req.body;
    const { specialistId } = req.params;

    // Validate and clean the specialistId
    const cleanedSpecialistId = specialistId.trim();
    console.log("[DEBUG] Cleaned specialistId:", cleanedSpecialistId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(cleanedSpecialistId)) {
      console.error(
        "[ERROR] Invalid specialistId format:",
        cleanedSpecialistId
      );
      return res.status(400).json({
        success: false,
        message: "Invalid specialist ID format",
        receivedId: cleanedSpecialistId,
        expectedFormat: "24-character hex string",
        example: "507f1f77bcf86cd799439011",
      });
    }

    // Find the existing relationship
    const existingRelationship = await ManagedRelationship.findOne({
      specialist: cleanedSpecialistId,
      client: req.user._id,
    });

    if (!existingRelationship) {
      console.error(
        "[ERROR] Relationship not found for specialist:",
        cleanedSpecialistId
      );
      return res.status(404).json({
        success: false,
        message: "Relationship not found",
      });
    }

    // Check if the authenticated user is the client in this relationship
    if (existingRelationship.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not own this relationship",
      });
    }

    // Perform the update
    const updatedRelationship = await ManagedRelationship.findOneAndUpdate(
      { _id: existingRelationship._id, client: req.user._id },
      { isDone },
      { new: true, runValidators: true }
    ).populate(
      "specialist",
      "fullname governorate district specialty isAvailable"
    );

    if (!updatedRelationship) {
      console.error(
        "[ERROR] Update failed for relationship with specialist:",
        cleanedSpecialistId
      );
      return res.status(404).json({
        success: false,
        message: "Relationship not found or not authorized",
      });
    }

    console.log(
      "[DEBUG] Successfully updated relationship:",
      updatedRelationship._id
    );

    res.json({
      success: true,
      specialist: {
        _id: updatedRelationship.specialist._id,
        fullname: updatedRelationship.specialist.fullname,
        governorate: updatedRelationship.specialist.governorate,
        district: updatedRelationship.specialist.district,
        specialty: updatedRelationship.specialist.specialty,
        isAvailable: updatedRelationship.specialist.isAvailable,
        isDone: updatedRelationship.isDone,
        dateAdded: updatedRelationship.dateAdded,
        relationshipId: updatedRelationship._id,
      },
    });
  } catch (error) {
    console.error("[ERROR] Specialist status update failed:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
    });

    if (error.name === "MongoServerError") {
      console.error("[ERROR] MongoDB Details:", {
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
      });
    } else if (error.name === "CastError") {
      console.error("[ERROR] Cast Error Details:", error);
    }

    res.status(500).json({
      success: false,
      message: "Failed to update specialist status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// managedController.js
const updateClientStatus = async (req, res) => {
  try {
    console.log("\n[DEBUG] Received status update request:", {
      params: req.params,
      body: req.body,
      user: req.user._id,
      timestamp: new Date(),
    });

    const { isDone } = req.body;
    const { relationshipId } = req.params;

    // Log the raw relationshipId as received
    console.log("[DEBUG] Raw relationshipId from params:", relationshipId);

    // Validate and clean the relationshipId
    const cleanedRelationshipId = relationshipId.trim();
    console.log("[DEBUG] Cleaned relationshipId:", cleanedRelationshipId);

    // Validate ObjectId format with explicit check
    if (!mongoose.Types.ObjectId.isValid(cleanedRelationshipId)) {
      console.error(
        "[ERROR] Invalid relationshipId format:",
        cleanedRelationshipId
      );
      return res.status(400).json({
        success: false,
        message: "Invalid relationship ID format",
        receivedId: cleanedRelationshipId,
        expectedFormat: "24-character hex string",
        example: "507f1f77bcf86cd799439011",
      });
    }

    console.log("[DEBUG] Validated relationshipId:", cleanedRelationshipId);

    // Find the existing relationship to debug
    const existingRelationship = await ManagedRelationship.findOne({
      _id: cleanedRelationshipId,
    }).select("specialist");

    if (!existingRelationship) {
      console.error(
        "[ERROR] Relationship not found for ID:",
        cleanedRelationshipId
      );
      return res.status(404).json({
        success: false,
        message: "Relationship not found",
      });
    }

    console.log(
      "[DEBUG] Existing relationship specialist:",
      existingRelationship.specialist
    );
    console.log("[DEBUG] Authenticated user ID:", req.user._id);

    // Check if the authenticated user is the specialist
    if (
      existingRelationship.specialist.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not own this relationship",
      });
    }

    // Perform the update
    const updatedRelationship = await ManagedRelationship.findOneAndUpdate(
      { _id: cleanedRelationshipId, specialist: req.user._id },
      { isDone },
      { new: true, runValidators: true }
    ).populate("client", "fullname governorate district neededSpecialists");

    if (!updatedRelationship) {
      console.error(
        "[ERROR] Update failed for relationship:",
        cleanedRelationshipId
      );
      return res.status(404).json({
        success: false,
        message: "Relationship not found or not authorized",
      });
    }

    console.log(
      "[DEBUG] Successfully updated relationship:",
      updatedRelationship._id
    );

    res.json({
      success: true,
      client: {
        _id: updatedRelationship.client._id,
        fullname: updatedRelationship.client.fullname,
        governorate: updatedRelationship.client.governorate,
        district: updatedRelationship.client.district,
        neededSpecialists: updatedRelationship.client.neededSpecialists,
        isDone: updatedRelationship.isDone,
        dateAdded: updatedRelationship.dateAdded,
        relationshipId: updatedRelationship._id,
      },
    });
  } catch (error) {
    console.error("[ERROR] Status update failed:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
    });

    if (error.name === "MongoServerError") {
      console.error("[ERROR] MongoDB Details:", {
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
      });
    } else if (error.name === "CastError") {
      console.error("[ERROR] Cast Error Details:", error);
    }

    res.status(500).json({
      success: false,
      message: "Failed to update client status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
const removeSpecialist = async (req, res) => {
  try {
    const { specialistId } = req.params;
    console.log(req.params);
    const relationship = await ManagedRelationship.findOneAndDelete({
      specialist: specialistId,
      client: req.user._id
    });
    if (!relationship) {
      return res.status(404).json({ message: "Relationship not found" });
    }
    console.log("Specialist ", specialistId, " removed for client ", req.user._id);
    res.json({ message: "Specialist removed" });
  } catch (error) {
    res.status(400).json({ message: "Failed to remove specialist" });
  }
};

const removeClient = async (req, res) => {
  if (!req.params.id || typeof req.params.id !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID parameter",
    });
  }
  // 1. Enhanced request logging
  console.log("\n[DELETE CLIENT] Request received:", {
    timestamp: new Date().toISOString(),
    params: req.params,
    user: req.user._id,
    headers: req.headers,
  });
  console.log("[BACKEND] Received DELETE request:", {
    params: req.params,
    rawId: req.params.id,
    cleanedId: req.params.id?.toString().trim(),
  });
  console.log("[DEBUG] Received DELETE request with:", {
    params: req.params,
    user: req.user._id,
    rawId: req.params.id,
    cleanedId: req.params.id?.toString().trim(),
  });
  try {
    const id = req.params.id;
    console.log(id);
    // 2. Validate ID exists
    if (!id) {
      console.error("[VALIDATION] Missing ID parameter");
      return res.status(400).json({
        success: false,
        message: "Relationship ID parameter is required",
        received: req.params,
      });
    }

    // 3. Clean and validate ID format
    const cleanedId = id.toString().trim();
    console.log("[DEBUG] Processing relationship ID:", cleanedId);

    if (!mongoose.Types.ObjectId.isValid(cleanedId)) {
      console.error("[VALIDATION] Invalid ID format:", cleanedId);
      return res.status(400).json({
        success: false,
        message: "Invalid relationship ID format",
        receivedId: cleanedId,
        expectedFormat: "24-character hex string",
        example: "507f1f77bcf86cd799439011",
      });
    }

    // 4. Find relationship with existence check
    const relationship = await ManagedRelationship.findOne({
      _id: cleanedId,
      specialist: req.user._id,
    });

    if (!relationship) {
      console.error(
        "[NOT FOUND] Relationship not found or not owned by user:",
        {
          relationshipId: cleanedId,
          specialistId: req.user._id,
        }
      );
      return res.status(404).json({
        success: false,
        message: "Relationship not found or not authorized",
        relationshipId: cleanedId,
      });
    }

    // 5. Debug logging before deletion
    console.log("[DEBUG] Found relationship to delete:", {
      _id: relationship._id,
      client: relationship.client,
      specialist: relationship.specialist,
      createdAt: relationship.createdAt,
    });

    // 6. Perform deletion
    const deletionResult = await ManagedRelationship.deleteOne({
      _id: cleanedId,
      specialist: req.user._id,
    });

    // 7. Verify deletion
    if (deletionResult.deletedCount === 0) {
      console.error("[DELETE FAILED] No documents deleted:", deletionResult);
      return res.status(500).json({
        success: false,
        message: "No relationship was deleted",
        deletionResult,
      });
    }

    // 8. Success response
    console.log("[SUCCESS] Relationship deleted:", deletionResult);
    return res.json({
      success: true,
      message: "Client successfully removed from managed list",
      deletedCount: deletionResult.deletedCount,
      relationshipId: cleanedId,
    });
  } catch (error) {
    // 9. Enhanced error handling
    console.error("\n[ERROR] Client removal failed:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      params: req.params,
      user: req.user?._id,
    });

    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        error: error.message,
      });
    }

    if (error.name === "MongoServerError") {
      console.error("MongoDB Error Details:", {
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message: "Failed to remove client",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    console.log(
      "[DELETE CLIENT] Request completed at:",
      new Date().toISOString()
    );
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
