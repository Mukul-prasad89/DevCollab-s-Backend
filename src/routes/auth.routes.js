const express = require("express");
const { register, login, me, updateProfile, logout } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.put("/profile", protect, updateProfile);
router.post("/logout", protect, logout);

module.exports = router;
