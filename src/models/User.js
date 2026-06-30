const mongoose = require("mongoose");

const connectionSnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["connected", "pending", "blocked"],
      default: "connected",
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const metadataSchema = new mongoose.Schema(
  {
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLogoutAt: {
      type: Date,
      default: null,
    },
    lastProfileUpdateAt: {
      type: Date,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profileImage: {
      type: String,
      default: "",
    },
    headline: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: "",
    },
    availability: {
      type: String,
      enum: ["Available", "Busy", "Looking for Team"],
      default: "Available",
    },
    socialLinks: {
      linkedin: {
        type: String,
        default: "",
      },
      github: {
        type: String,
        default: "",
      },
      leetcode: {
        type: String,
        default: "",
      },
    },
    experience: {
      type: String,
      default: "",
    },
    metadata: {
      type: metadataSchema,
      default: () => ({}),
    },
    connections: {
      type: [connectionSnapshotSchema],
      default: [],
    },
    savedHackathons: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hackathon",
        },
      ],
      default: [],
    },
    savedProjects: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
      ],
      default: [],
    },
    registeredHackathons: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hackathon",
        },
      ],
      default: [],
    },
    registeredProjects: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
      ],
      default: [],
    },
    ongoingProjects: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
      ],
      default: [],
    },
    hackathonsParticipated: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hackathon",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("hackathonsParticipatedCount").get(function getHackathonsParticipatedCount() {
  return this.hackathonsParticipated.length;
});

userSchema.virtual("ongoingProjectsCount").get(function getOngoingProjectsCount() {
  return this.ongoingProjects.length;
});

userSchema.virtual("connectionsCount").get(function getConnectionsCount() {
  return this.connections.length;
});

module.exports = mongoose.model("User", userSchema);
