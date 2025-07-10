const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Central error handler for auth controller
const handleAuthError = (
  res,
  error,
  defaultMessage = "Authentication failed"
) => {
  console.error("Auth Error:", error);

  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  res.status(500).json({
    success: false,
    message: defaultMessage,
    error: error.message,
  });
};

const authController = {
  login: async (req, res) => {
    try {
      const { fullname, password } = req.body;

      if (!fullname || !password) {
        return res.status(400).json({
          success: false,
          message: "Fullname and password are required",
        });
      }

      const user = await User.findOne({ fullname }).select("+password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      // Prepare user data without sensitive information
      const userData = {
        id: user._id,
        fullname: user.fullname,
        role: user.role,
        governorate: user.governorate,
        district: user.district,
        ...(user.role === "specialist" && {
          specialty: user.specialty,
          isAvailable: user.isAvailable,
        }),
        ...(user.role === "client" && {
          neededSpecialists: user.neededSpecialists?.filter(
            (c) => c.isNeeded === true
          ),
        }),
      };

      res.json({
        success: true,
        token,
        user: userData,
      });
    } catch (error) {
      handleAuthError(res, error, "Login failed");
    }
  },

  register: async (req, res) => {
    try {
      const { fullname, password, role } = req.body;

      if (!fullname || !password || !role) {
        return res.status(400).json({
          success: false,
          message: "Fullname, password and role are required",
        });
      }

      const existingUser = await User.findOne({ fullname });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        ...req.body,
        password: hashedPassword,
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      // Prepare response without sensitive data
      const userData = {
        id: user._id,
        fullname: user.fullname,
        role: user.role,
        governorate: user.governorate,
        district: user.district,
        ...(user.role === "specialist" && {
          specialty: user.specialty,
          isAvailable: user.isAvailable,
        }),
        ...(user.role === "client" && {
          neededSpecialists: user.neededSpecialists,
        }),
      };

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        user: userData,
      });
    } catch (error) {
      handleAuthError(res, error, "Registration failed");
    }
  },

  logout: async (req, res) => {
    try {
      // In a real implementation, you might invalidate the token here
      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      handleAuthError(res, error, "Logout failed");
    }
  },

  verifyToken: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password -__v");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      // Prepare user data for response
      const userData = {
        id: user._id,
        fullname: user.fullname,
        role: user.role,
        governorate: user.governorate,
        district: user.district,
        ...(user.role === "specialist" && {
          specialty: user.specialty,
          isAvailable: user.isAvailable,
        }),
        ...(user.role === "client" && {
          neededSpecialists: user.neededSpecialists,
        }),
      };

      res.json({
        success: true,
        user: userData,
      });
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired",
        });
      }
      handleAuthError(res, error, "Token verification failed");
    }
  },
};

module.exports = authController;
