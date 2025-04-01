const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Captain App Routs

const appController = require("../../controller/captainAppController/order.controller.js");

router.post('/addDineInOrderByApp', protect, appController.addDineInOrderByApp);
router.post('/updateSubTokenDataByIdForApp', protect, appController.updateSubTokenDataByIdForApp);
router.get('/getSubTokensByBillIdForApp', protect, appController.getSubTokensByBillIdForApp);
router.delete('/removeSubTokenDataByIdForApp', protect, appController.removeSubTokenDataByIdForApp);
router.get('/isTableEmpty', protect, appController.isTableEmpty);

// Item App Routs

const appItemController = require("../../controller/captainAppController/displayItem.controller.js");

router.get('/getItemDataForApp', protect, appItemController.getItemDataForApp);

module.exports = router;