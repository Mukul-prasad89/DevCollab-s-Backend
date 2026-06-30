const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    registeredUsers: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    savedBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["upcoming", "live", "finished", "archived"],
      default: "upcoming",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Hackathon", hackathonSchema);