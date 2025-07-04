const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.login = async (req, res) => {
  try {
    const { fullname, password } = req.body;
    const user = await User.findOne({ fullname });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const compared = await bcrypt.compare(password, user.password);
    if (!compared) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      token,
      user: { id: user._id, fullname: user.fullname, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
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
      neededSpecialists,
    } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullname,
      password: hashedPassword,
      role,
      governorate,
      district,
      specialty: role === "specialist" ? specialty : undefined,
      neededSpecialists: role === "client" ? neededSpecialists : undefined,
    });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: user._id, fullname, role },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(400).json({ message: error.message || "Registration failed" });
  }
};

exports.logout = async (req, res) => {
  res.json({ message: "Logout successful" });
};

exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.json({ user: { id: user._id, fullname: user.fullname, role: user.role } });
  } catch (error) {
    console.error("Verify token error:", error);
    res.status(401).json({ message: "Token verification failed" });
  }
};