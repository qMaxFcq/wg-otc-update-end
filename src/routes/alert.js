const express = require("express");
const router = express.Router();
const AlertController = require('../controllers/aler-controller')



router.get("/alertactive", AlertController.getAlertActive);
router.put("/updatealertprice", AlertController.updateAlertActive)

module.exports = router;