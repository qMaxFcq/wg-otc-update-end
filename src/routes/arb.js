const express = require("express");
const router = express.Router();
const ArbController = require("../controllers/arb-controller");

router.get("/arbconfig", ArbController.getArbConfig);
router.put("/updatearbconfig", ArbController.updateArbConfig);

module.exports = router;
