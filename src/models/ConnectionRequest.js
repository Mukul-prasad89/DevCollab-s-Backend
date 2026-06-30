const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
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

connectionRequestSchema.index({ requester: 1, recipient: 1, status: 1 });

module.exports = mongoose.model("ConnectionRequest", connectionRequestSchema);