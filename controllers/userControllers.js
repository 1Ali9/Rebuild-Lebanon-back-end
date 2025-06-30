const User = require('../models/user')
const getUsers = async (req, res)=>{
    try{
        const users = await User.find();
        if(users == null){
            return res.status(404).json("No Users Found")
        }
        return res.status(200).json({"users": users});
    }catch(error){
        return res.status(500).json({"error": error.message});
    }
}

const createUser = async (req, res)=>{
    const body = req.body;
    try{
        if(body == null){
            return res.status(400).json("Please provide valid information")
        }
        const user = new User(body);
        const createdUser = await user.save();
        console.log(createdUser);
        return res.status(200).json({"users": createdUser});
    }catch(error){
        return res.status(500).json({"error": error.message});
    }
};
exports.getSpecialists = async (req, res) => {
  try {
    const { governorate, district, specialty } = req.query;
    const query = { role: 'specialist', isAvailable: true };
    if (governorate) query.governorate = governorate;
    if (district) query.district = district;
    if (specialty) query.specialty = specialty;

    const specialists = await User.find(query).select('-password');
    res.json(specialists);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch specialists' });
  }
};

exports.getClients = async (req, res) => {
  try {
    const { governorate, district, specialty } = req.query;
    const query = { role: 'client' };
    if (governorate) query.governorate = governorate;
    if (district) query.district = district;
    if (specialty) query['neededSpecialists.name'] = specialty;

    const clients = await User.find(query).select('-password');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
};

exports.updateNeededSpecialists = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can update needed specialists' });
    }
    const { specialists } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { neededSpecialists: specialists },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update needed specialists' });
  }
};

exports.updateAvailability = async (req, res) => {
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

module.exports = {getUsers, createUser};