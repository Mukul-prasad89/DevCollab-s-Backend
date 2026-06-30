const express = require("express");
const { protect } = require("../middleware/auth");
const {
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
} = require("../controllers/social.controller");

const router = express.Router();

router.get("/dashboard", protect, getDashboard);
router.get("/connections", protect, getConnections);
router.post("/connections/request", protect, sendConnectionRequest);
router.get("/connections/requests", protect, getConnectionRequests);
router.patch("/connections/requests/:requestId/accept", protect, acceptConnectionRequest);
router.patch("/connections/requests/:requestId/reject", protect, rejectConnectionRequest);
router.delete("/connections/:userId", protect, removeConnection);

router.post("/projects/:projectId/save", protect, saveProject);
router.delete("/projects/:projectId/save", protect, unsaveProject);
router.post("/projects/:projectId/register", protect, registerProject);
router.post("/projects/:projectId/ongoing", protect, markProjectOngoing);

router.post("/hackathons/:hackathonId/save", protect, saveHackathon);
router.delete("/hackathons/:hackathonId/save", protect, unsaveHackathon);
router.post("/hackathons/:hackathonId/register", protect, registerHackathon);
router.post("/hackathons/:hackathonId/participate", protect, markHackathonParticipated);

router.get("/collabs/pending", protect, getPendingCollabRequests);
router.post("/collabs/request", protect, createCollabRequest);
router.patch("/collabs/:requestId/accept", protect, acceptCollabRequest);
router.patch("/collabs/:requestId/reject", protect, rejectCollabRequest);

module.exports = router;