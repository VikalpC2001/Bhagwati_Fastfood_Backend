const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Captain App Routs

const appController = require("../../controller/captainAppController/dineIn.controller.js");

router.post('/addDineInOrderByApp', protect, appController.addDineInOrderByApp);


module.exports = router;