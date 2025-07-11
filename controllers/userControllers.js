const User = require('../models/user');

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No Users Found' });
    }
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

const createUser = async (req, res) => {
  try {
    const body = req.body;
    if (!body) {
      return res.status(400).json({ message: 'Please provide valid information' });
    }
    const user = new User(body);
    const createdUser = await user.save();
    console.log(createdUser);
    return res.status(200).json({ users: createdUser });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getSpecialists = async (req, res) => {
  try {
    const { governorate, district, specialty, isAvailable } = req.query;
    const query = { role: 'specialist' };
    
    // Apply filters
    if (governorate) query.governorate = governorate;
    if (district) query.district = district;
    if (specialty) query.specialty = specialty;
    if (isAvailable) query.isAvailable = isAvailable === 'true';

    const specialists = await User.find(query)
      .select('-password -__v')
      .lean();

    // Standardize response structure to match frontend expectation
    res.status(200).json({
      success: true,
      data: {
        specialists // Wrap in data object
      },
      count: specialists.length
    });

  } catch (error) {
    console.error('Error fetching specialists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specialists',
      error: error.message
    });
  }
};

const getClients = async (req, res) => {
  try {
    const { governorate, district, specialty, needsMySpecialty } = req.query;
    const query = { role: 'client' };
    
    // Location filters
    if (governorate) query.governorate = governorate;
    if (district) query.district = district;
    
    // Specialty filter (FIXED)
    if (needsMySpecialty === 'true' && specialty) {
      query.neededSpecialists = {
        $elemMatch: {
          name: specialty,
          isNeeded: true
        }
      };
    }

    const clients = await User.find(query)
      .select('-password -__v')
      .lean();

    // Filter clients in case some entries don't match (additional safety)
    const filteredClients = needsMySpecialty === 'true' && specialty
      ? clients.filter(client => 
          client.neededSpecialists?.some(
            spec => spec.name === specialty && spec.isNeeded
          )
        )
      : clients;

    res.status(200).json({
      success: true,
      data: { clients: filteredClients },
      count: filteredClients.length
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
};
const updateNeededSpecialists = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can update needed specialists' });
    }

    // Validate input
    const { neededSpecialists } = req.body;
    
    if (!Array.isArray(neededSpecialists)) {
      return res.status(400).json({ message: 'neededSpecialists must be an array' });
    }

    // Validate each specialist entry
    const validSpecialties = [
      'Civil Engineer', 'Architect', 'Mason', 'Blacksmith', 
      'Glass Specialist', 'Plumber', 'Painter', 'Aluminum Frame Specialist',
      'Carpenter', 'Tiler', 'Waterproofing Specialist', 'Electrician',
      'Stone Cladding Specialist', 'HVAC Technician'
    ];

    for (const spec of neededSpecialists) {
      if (!validSpecialties.includes(spec.name)) {
        return res.status(400).json({ 
          message: `Invalid specialty: ${spec.name}` 
        });
      }
      if (typeof spec.isNeeded !== 'boolean') {
        return res.status(400).json({ 
          message: `isNeeded must be boolean for ${spec.name}` 
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { neededSpecialists },
      { 
        new: true, 
        runValidators: true,
        context: 'query' // Ensures schema validators run
      }
    ).select('-password -__v');

    res.status(200).json({
      success: true,
      data: user,
      message: 'Specialists updated successfully'
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to update needed specialists',
      error: error.message 
    });
  }
};

const updateAvailability = async (req, res) => {
  try {
    if (req.user.role !== 'specialist') {
      return res.status(403).json({ message: 'Only specialists can update availability' });
    }
    const { isAvailable } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isAvailable },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update availability' });
  }
};

module.exports = {
  getUserById,
  getUsers,
  createUser,
  getSpecialists,
  getClients,
  updateNeededSpecialists,
  updateAvailability,
};