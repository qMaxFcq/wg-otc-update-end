const express = require("express");
const router = express.Router();
const LoginController = require("../controllers/login-controller");
const authenticate = require("../middleware/authenticate");

router.post("/login", LoginController.login);
router.put("/register", LoginController.register);
router.get("/userprofile", authenticate, LoginController.userProflie);

module.exports = router;
