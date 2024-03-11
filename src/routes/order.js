const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/order-controller");

router.get("/orderhistory", OrderController.getOrderHistory);
// router.get("/historywithdrawanddeposit", OrderController.getWithdrawDepositAllCoin)
router.put("/addorder", OrderController.addNewOrder);
router.put("/addorderarray",OrderController.addNewOrderArray)
router.post("/editorder/:id", OrderController.editOrder);
router.get("/historyWidDepo",OrderController.getHistoryWidDepo)

module.exports = router;
