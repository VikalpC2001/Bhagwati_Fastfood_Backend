const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Captain App Routs

const appController = require("../../controller/captainAppController/order.controller.js");

router.post('/addDineInOrderByApp', protect, appController.addDineInOrderByApp);

// Item App Routs

const appItemController = require("../../controller/captainAppController/displayItem.controller.js");

router.get('/getItemDataForApp', protect, appItemController.getItemDataForApp);

module.exports = router;