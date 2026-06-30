const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
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
      enum: ["draft", "ongoing", "completed", "archived"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Project", projectSchema);