const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.login = async (req, res) => {
  try {
    const { fullname, password } = req.body;
    
    if (!fullname || !password) {
      return res.status(400).json({ message: "Fullname and password are required" });
    }

    const user = await User.findOne({ fullname })
      .select('+password +role +governorate +district');
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    
    const userResponse = {
      id: user._id,
      fullname: user.fullname,
      role: user.role,
      governorate: user.governorate,
      district: user.district,
      ...(user.role === 'specialist' && {
        specialty: user.specialty,
        isAvailable: user.isAvailable
      }),
      ...(user.role === 'client' && {
        neededSpecialists: user.neededSpecialists
      })
    };

    res.json({ token, user: userResponse });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

exports.register = async (req, res) => {
  try {
    const {
      fullname,
      password,
      role,
      governorate,
      district,
      specialty,
      isAvailable = true, // Default to true if not provided
      neededSpecialists
    } = req.body;

    // Basic validation
    if (!fullname || !password || !role) {
      return res.status(400).json({ message: "Fullname, password and role are required" });
    }

    // Role-specific validation
    if (role === 'specialist' && !specialty) {
      return res.status(400).json({ message: "Specialty is required for specialists" });
    }

    if (role === 'client' && !neededSpecialists) {
      return res.status(400).json({ message: "At least one needed specialist is required for clients" });
    }

    if (!['client', 'specialist'].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ fullname });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = {
      fullname,
      password: hashedPassword,
      role,
      governorate,
      district,
      ...(role === "specialist" && { 
        specialty,
        isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true
      }),
      ...(role === "client" && { 
        neededSpecialists: Array.isArray(neededSpecialists) ? neededSpecialists : []
      })
    };

    const user = new User(userData);
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    
    const responseData = {
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        role: user.role,
        governorate: user.governorate,
        district: user.district,
        ...(user.role === 'specialist' && {
          specialty: user.specialty,
          isAvailable: user.isAvailable
        }),
        ...(user.role === 'client' && {
          neededSpecialists: user.neededSpecialists
        })
      }
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error("Register error:", error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation failed",
        errors 
      });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
};

exports.logout = async (req, res) => {
  // In a real implementation, you might want to:
  // 1. Add token to a blacklist
  // 2. Clear client-side token
  res.json({ message: "Logout successful" });
};

exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    // Prepare user data for response
    const userResponse = {
      id: user._id,
      fullname: user.fullname,
      role: user.role,
      governorate: user.governorate,
      district: user.district,
      ...(user.role === 'specialist' && {
        specialty: user.specialty,
        isAvailable: user.isAvailable
      }),
      ...(user.role === 'client' && {
        neededSpecialists: user.neededSpecialists
      })
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error("Verify token error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    
    res.status(500).json({ message: "Token verification failed" });
  }
};