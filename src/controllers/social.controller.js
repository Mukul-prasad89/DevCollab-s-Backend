const ConnectionRequest = require("../models/ConnectionRequest");
const Hackathon = require("../models/Hackathon");
const Project = require("../models/Project");
const ProjectCollabRequest = require("../models/ProjectCollabRequest");
const User = require("../models/User");

const buildConnectionSnapshot = (user, status = "connected") => ({
  user: user._id,
  name: user.name,
  profileImage: user.profileImage || "",
  status,
  connectedAt: new Date(),
});

const toObjectIdString = (value) => value?.toString();

const populateUserDashboard = async (userId) => {
  return User.findById(userId)
    .select("-password")
    .populate({ path: "savedHackathons", select: "title description status organizer createdAt updatedAt" })
    .populate({ path: "savedProjects", select: "title description status owner createdAt updatedAt" })
    .populate({ path: "registeredHackathons", select: "title description status organizer createdAt updatedAt" })
    .populate({ path: "registeredProjects", select: "title description status owner createdAt updatedAt" })
    .populate({ path: "ongoingProjects", select: "title description status owner createdAt updatedAt" })
    .populate({ path: "hackathonsParticipated", select: "title description status organizer createdAt updatedAt" })
    .populate({ path: "connections.user", select: "name profileImage headline" });
};

const getDashboard = async (req, res) => {
  try {
    const [user, connectionRequests, collabRequests] = await Promise.all([
      populateUserDashboard(req.user.id),
      ConnectionRequest.find({ $or: [{ requester: req.user.id }, { recipient: req.user.id }] })
        .populate("requester", "name profileImage headline")
        .populate("recipient", "name profileImage headline")
        .sort({ createdAt: -1 }),
      ProjectCollabRequest.find({ $or: [{ requester: req.user.id }, { owner: req.user.id }] })
        .populate("project", "title status")
        .populate("requester", "name profileImage headline")
        .populate("owner", "name profileImage headline")
        .sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user,
      sections: {
        connections: user.connections,
        savedHackathons: user.savedHackathons,
        savedProjects: user.savedProjects,
        registeredHackathons: user.registeredHackathons,
        registeredProjects: user.registeredProjects,
        ongoingProjects: user.ongoingProjects,
        hackathonsParticipated: user.hackathonsParticipated,
        connectionRequests,
        collabRequests,
      },
      stats: {
        connectionsCount: user.connectionsCount,
        hackathonsParticipatedCount: user.hackathonsParticipatedCount,
        ongoingProjectsCount: user.ongoingProjectsCount,
        savedHackathonsCount: user.savedHackathons.length,
        savedProjectsCount: user.savedProjects.length,
        registeredHackathonsCount: user.registeredHackathons.length,
        registeredProjectsCount: user.registeredProjects.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard", error: error.message });
  }
};

const getConnections = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("connections").populate({
      path: "connections.user",
      select: "name profileImage headline",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ connections: user.connections });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch connections", error: error.message });
  }
};

const sendConnectionRequest = async (req, res) => {
  try {
    const { recipientId, message = "" } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: "recipientId is required" });
    }

    if (recipientId === req.user.id) {
      return res.status(400).json({ message: "You cannot send a connection request to yourself" });
    }

    const [requester, recipient] = await Promise.all([
      User.findById(req.user.id),
      User.findById(recipientId),
    ]);

    if (!requester || !recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyConnected = requester.connections.some(
      (connection) => toObjectIdString(connection.user) === toObjectIdString(recipient._id)
    );

    if (alreadyConnected) {
      return res.status(409).json({ message: "Users are already connected" });
    }

    const existingPending = await ConnectionRequest.findOne({
      requester: req.user.id,
      recipient: recipientId,
      status: "pending",
    });

    if (existingPending) {
      return res.status(409).json({ message: "A pending connection request already exists" });
    }

    const request = await ConnectionRequest.create({
      requester: req.user.id,
      recipient: recipientId,
      message,
    });

    return res.status(201).json({ message: "Connection request sent", request });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send connection request", error: error.message });
  }
};

const getConnectionRequests = async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    })
      .populate("requester", "name profileImage headline")
      .populate("recipient", "name profileImage headline")
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch connection requests", error: error.message });
  }
};

const acceptConnectionRequest = async (req, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    if (toObjectIdString(request.recipient) !== req.user.id) {
      return res.status(403).json({ message: "You are not allowed to accept this request" });
    }

    if (request.status !== "pending") {
      return res.status(409).json({ message: "This request is no longer pending" });
    }

    const [requester, recipient] = await Promise.all([
      User.findById(request.requester),
      User.findById(request.recipient),
    ]);

    if (!requester || !recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    const requesterHasConnection = requester.connections.some(
      (connection) => toObjectIdString(connection.user) === toObjectIdString(recipient._id)
    );
    const recipientHasConnection = recipient.connections.some(
      (connection) => toObjectIdString(connection.user) === toObjectIdString(requester._id)
    );

    if (!requesterHasConnection) {
      requester.connections.push(buildConnectionSnapshot(recipient));
    }

    if (!recipientHasConnection) {
      recipient.connections.push(buildConnectionSnapshot(requester));
    }

    request.status = "accepted";
    request.respondedAt = new Date();

    await Promise.all([requester.save(), recipient.save(), request.save()]);

    return res.status(200).json({ message: "Connection request accepted", request });
  } catch (error) {
    return res.status(500).json({ message: "Failed to accept connection request", error: error.message });
  }
};

const rejectConnectionRequest = async (req, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    if (toObjectIdString(request.recipient) !== req.user.id) {
      return res.status(403).json({ message: "You are not allowed to reject this request" });
    }

    request.status = "rejected";
    request.respondedAt = new Date();
    await request.save();

    return res.status(200).json({ message: "Connection request rejected", request });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject connection request", error: error.message });
  }
};

const removeConnection = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    const [user, otherUser] = await Promise.all([
      User.findById(req.user.id),
      User.findById(otherUserId),
    ]);

    if (!user || !otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    user.connections = user.connections.filter(
      (connection) => toObjectIdString(connection.user) !== toObjectIdString(otherUser._id)
    );
    otherUser.connections = otherUser.connections.filter(
      (connection) => toObjectIdString(connection.user) !== toObjectIdString(user._id)
    );

    await Promise.all([user.save(), otherUser.save()]);

    return res.status(200).json({ message: "Connection removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove connection", error: error.message });
  }
};

const saveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $addToSet: { savedProjects: project._id } }),
      Project.updateOne({ _id: project._id }, { $addToSet: { savedBy: req.user.id } }),
    ]);

    return res.status(200).json({ message: "Project saved" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save project", error: error.message });
  }
};

const unsaveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $pull: { savedProjects: project._id } }),
      Project.updateOne({ _id: project._id }, { $pull: { savedBy: req.user.id } }),
    ]);

    return res.status(200).json({ message: "Project removed from saved list" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to unsave project", error: error.message });
  }
};

const registerProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.status = project.status === "draft" ? "ongoing" : project.status;

    await Promise.all([
      User.updateOne(
        { _id: req.user.id },
        { $addToSet: { registeredProjects: project._id, ongoingProjects: project._id } }
      ),
      Project.updateOne(
        { _id: project._id },
        { $addToSet: { participants: req.user.id, collaborators: req.user.id }, $set: { status: "ongoing" } }
      ),
    ]);

    await project.save();

    return res.status(200).json({ message: "Project registration recorded" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register project", error: error.message });
  }
};

const markProjectOngoing = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $addToSet: { ongoingProjects: project._id } }),
      Project.updateOne({ _id: project._id }, { $addToSet: { participants: req.user.id }, $set: { status: "ongoing" } }),
    ]);

    return res.status(200).json({ message: "Project marked as ongoing" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update ongoing project", error: error.message });
  }
};

const saveHackathon = async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.hackathonId);

    if (!hackathon) {
      return res.status(404).json({ message: "Hackathon not found" });
    }

    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $addToSet: { savedHackathons: hackathon._id } }),
      Hackathon.updateOne({ _id: hackathon._id }, { $addToSet: { savedBy: req.user.id } }),
    ]);

    return res.status(200).json({ message: "Hackathon saved" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save hackathon", error: error.message });
  }
};

const unsaveHackathon = async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.hackathonId);

    if (!hackathon) {
      return res.status(404).json({ message: "Hackathon not found" });
    }

    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $pull: { savedHackathons: hackathon._id } }),
      Hackathon.updateOne({ _id: hackathon._id }, { $pull: { savedBy: req.user.id } }),
    ]);

    return res.status(200).json({ message: "Hackathon removed from saved list" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to unsave hackathon", error: error.message });
  }
};

const registerHackathon = async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.hackathonId);

    if (!hackathon) {
      return res.status(404).json({ message: "Hackathon not found" });
    }

    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $addToSet: { registeredHackathons: hackathon._id } }),
      Hackathon.updateOne({ _id: hackathon._id }, { $addToSet: { registeredUsers: req.user.id } }),
    ]);

    return res.status(200).json({ message: "Hackathon registration recorded" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register hackathon", error: error.message });
  }
};

const markHackathonParticipated = async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.hackathonId);

    if (!hackathon) {
      return res.status(404).json({ message: "Hackathon not found" });
    }

    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $addToSet: { hackathonsParticipated: hackathon._id } }),
      Hackathon.updateOne({ _id: hackathon._id }, { $addToSet: { participants: req.user.id }, $set: { status: "live" } }),
    ]);

    return res.status(200).json({ message: "Hackathon participation recorded" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record hackathon participation", error: error.message });
  }
};

const createCollabRequest = async (req, res) => {
  try {
    const { projectId, message = "" } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const existingPending = await ProjectCollabRequest.findOne({
      project: project._id,
      requester: req.user.id,
      owner: project.owner,
      status: "pending",
    });

    if (existingPending) {
      return res.status(409).json({ message: "A pending collaboration request already exists" });
    }

    const collabRequest = await ProjectCollabRequest.create({
      project: project._id,
      requester: req.user.id,
      owner: project.owner,
      message,
    });

    return res.status(201).json({ message: "Collaboration request sent", collabRequest });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create collaboration request", error: error.message });
  }
};

const getPendingCollabRequests = async (req, res) => {
  try {
    const requests = await ProjectCollabRequest.find({
      $or: [{ requester: req.user.id }, { owner: req.user.id }],
      status: "pending",
    })
      .populate("project", "title status")
      .populate("requester", "name profileImage headline")
      .populate("owner", "name profileImage headline")
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch collaboration requests", error: error.message });
  }
};

const acceptCollabRequest = async (req, res) => {
  try {
    const request = await ProjectCollabRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: "Collaboration request not found" });
    }

    if (toObjectIdString(request.owner) !== req.user.id) {
      return res.status(403).json({ message: "You are not allowed to accept this request" });
    }

    if (request.status !== "pending") {
      return res.status(409).json({ message: "This collaboration request is no longer pending" });
    }

    request.status = "accepted";
    request.respondedAt = new Date();

    await Promise.all([
      request.save(),
      User.updateOne(
        { _id: request.requester },
        {
          $addToSet: {
            ongoingProjects: request.project,
            registeredProjects: request.project,
          },
        }
      ),
      Project.updateOne(
        { _id: request.project },
        { $addToSet: { collaborators: request.requester, participants: request.requester }, $set: { status: "ongoing" } }
      ),
    ]);

    return res.status(200).json({ message: "Collaboration request accepted", request });
  } catch (error) {
    return res.status(500).json({ message: "Failed to accept collaboration request", error: error.message });
  }
};

const rejectCollabRequest = async (req, res) => {
  try {
    const request = await ProjectCollabRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: "Collaboration request not found" });
    }

    if (toObjectIdString(request.owner) !== req.user.id) {
      return res.status(403).json({ message: "You are not allowed to reject this request" });
    }

    request.status = "rejected";
    request.respondedAt = new Date();
    await request.save();

    return res.status(200).json({ message: "Collaboration request rejected", request });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject collaboration request", error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password")
      .populate({ path: "savedHackathons", select: "title description status" })
      .populate({ path: "savedProjects", select: "title description status" })
      .populate({ path: "registeredHackathons", select: "title description status" })
      .populate({ path: "registeredProjects", select: "title description status" })
      .populate({ path: "ongoingProjects", select: "title description status" })
      .populate({ path: "hackathonsParticipated", select: "title description status" })
      .populate({ path: "connections.user", select: "name profileImage headline" });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user profile", error: error.message });
  }
};

module.exports = {
  getDashboard,
  getConnections,
  sendConnectionRequest,
  getConnectionRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  saveProject,
  unsaveProject,
  registerProject,
  markProjectOngoing,
  saveHackathon,
  unsaveHackathon,
  registerHackathon,
  markHackathonParticipated,
  createCollabRequest,
  getPendingCollabRequests,
  acceptCollabRequest,
  rejectCollabRequest,
  getUsers,
  getUserProfile,
};