const mongoose = require("mongoose");

const projectCollabRequestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

projectCollabRequestSchema.index({ project: 1, requester: 1, owner: 1, status: 1 });

module.exports = mongoose.model("ProjectCollabRequest", projectCollabRequestSchema);