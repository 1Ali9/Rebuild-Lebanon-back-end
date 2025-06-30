const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.login = async (req, res) => {
  try {
    const { fullname, password } = req.body;
    const user = await User.findOne({ fullname });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, fullname: user.fullname, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
};

exports.register = async (req, res) => {
  try {
    const { fullname, password, role, governorate, district, specialty, neededSpecialists } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullname,
      password: hashedPassword,
      role,
      governorate,
      district,
      specialty: role === 'specialist' ? specialty : undefined,
      neededSpecialists: role === 'client' ? neededSpecialists : undefined,
    });
    await user.save();
    res.status(201).json({ message: 'User registered successfully', user: { id: user._id, fullname, role } });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
};

exports.logout = async (req, res) => {
  // Client-side token removal; server can invalidate token if needed
  res.json({ message: 'Logout successful' });
};

exports.verifyToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Token verification failed' });
  }
};