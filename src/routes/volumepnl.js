const express = require("express");
const router = express.Router();
const VolumeAndPnl = require("../controllers/volume-pnl-controller");

router.get("/volumeandpnl", VolumeAndPnl.getVolumePnl);

module.exports = router;
