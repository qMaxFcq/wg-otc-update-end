const express = require("express");
const router = express.Router();
const LoginController = require("../controllers/login-controller");

router.post("/login", LoginController.login);
router.get("/user", LoginController.userDetail);
router.put("/register", LoginController.register);

module.exports = router;
