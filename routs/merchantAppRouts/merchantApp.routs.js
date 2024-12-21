const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Inventory App Routs

const inventoryAppController = require("../../controller/merchantAppController/inventoryApp.controller.js");

router.get('/getProductData', protect, inventoryAppController.getProductData);
router.get('/getOutCategoryForApp', protect, inventoryAppController.getOutCategoryForApp);

module.exports = router;