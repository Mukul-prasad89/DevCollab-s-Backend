const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
};

const toUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  profileImage: user.profileImage,
  headline: user.headline,
  skills: user.skills,
  bio: user.bio,
  availability: user.availability,
  socialLinks: user.socialLinks || {
    linkedin: "",
    github: user.github || "",
    leetcode: "",
  },
  experience: user.experience,
  metadata: user.metadata,
  connections: user.connections,
  savedHackathons: user.savedHackathons,
  savedProjects: user.savedProjects,
  registeredHackathons: user.registeredHackathons,
  registeredProjects: user.registeredProjects,
  ongoingProjects: user.ongoingProjects,
  hackathonsParticipated: user.hackathonsParticipated,
  hackathonsParticipatedCount: user.hackathonsParticipatedCount,
  ongoingProjectsCount: user.ongoingProjectsCount,
  connectionsCount: user.connectionsCount,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      skills,
      bio,
      availability,
      experience,
      profileImage,
      headline,
      socialLinks,
      linkedin,
      leetcode,
      github,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      skills,
      bio,
      availability,
      experience,
      profileImage,
      headline,
      socialLinks: {
        linkedin: socialLinks?.linkedin || linkedin || "",
        github: socialLinks?.github || github || "",
        leetcode: socialLinks?.leetcode || leetcode || "",
      },
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "User registered",
      token,
      user: toUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.metadata.lastLoginAt = new Date();
    user.metadata.lastActiveAt = new Date();
    await user.save();

    const token = signToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: toUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(toUserResponse(user));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "skills",
      "bio",
      "availability",
      "experience",
      "profileImage",
      "headline",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.body.socialLinks || req.body.linkedin || req.body.github || req.body.leetcode) {
      updates.socialLinks = {
        linkedin: req.body.socialLinks?.linkedin || req.body.linkedin || "",
        github: req.body.socialLinks?.github || req.body.github || "",
        leetcode: req.body.socialLinks?.leetcode || req.body.leetcode || "",
      };
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.github && !req.body.socialLinks && !req.body.linkedin) {
      updates.socialLinks = {
        linkedin: user.socialLinks?.linkedin || "",
        github: req.body.github,
        leetcode: user.socialLinks?.leetcode || "",
      };
    }

    Object.assign(user, updates);
    user.metadata.lastProfileUpdateAt = new Date();
    user.metadata.lastActiveAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: toUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.metadata.lastLogoutAt = new Date();
    user.metadata.lastActiveAt = new Date();
    await user.save();

    return res.status(200).json({ message: "Logout recorded" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to logout", error: error.message });
  }
};

module.exports = {
  register,
  login,
  me,
  updateProfile,
  logout,
};
