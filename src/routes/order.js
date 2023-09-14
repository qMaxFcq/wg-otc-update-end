const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/order-controller");

router.put("/addorder", OrderController.addNewOrder);
router.post("/editorder/:id", OrderController.editOrder);

module.exports = router;
