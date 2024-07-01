const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Billing Category Routs

const categoryController = require("../../controller/billingController/billCategory.controller.js");

router.get('/getBillCategory', protect, categoryController.getBillCategory);
router.post('/updateBillCategoryData', protect, categoryController.updateBillCategoryData);

// Comment Routs

const commentController = require("../../controller/billingController/comment.controller.js");

router.get('/getComment', protect, commentController.getComment);
router.post('/addComment', protect, commentController.addComment);
router.delete('/removeComment', protect, commentController.removeComment);
router.post('/updateComment', protect, commentController.updateComment);

// Customer Routs

const customerController = require("../../controller/billingController/customer.controller.js");

router.get('/searchCustomerData', protect, customerController.searchCustomerData);
router.get('/getCustomerList', protect, customerController.getCustomerList);
router.get('/getCustomerDetailsById', protect, customerController.getCustomerDetailsById);
router.post('/addMultipleCustomerData', customerController.addMultipleCustomerData);
router.post('/addCustomerData', customerController.addCustomerData);
router.post('/updateCustomerData', customerController.updateCustomerData);

// Bill No Test Routs
router.post('/billNoTest', commentController.billNoTest);

// Hotel Routs

const hotelController = require("../../controller/billingController/hotel.controller.js");

router.get('/getHotelList', protect, hotelController.getHotelList);
router.post('/addHotelData', protect, hotelController.addHotelData);
router.delete('/removeHotelData', protect, hotelController.removeHotelData);
router.post('/updateHotelData', protect, hotelController.updateHotelData);
router.get('/ddlHotelList', protect, hotelController.ddlHotelList);

// Firm Routs

const firmController = require("../../controller/billingController/firm.controller.js");

router.get('/getFirmData', protect, firmController.getFirmData);
router.post('/addFirmData', protect, firmController.addFirmData);
router.delete('/removeFirmData', protect, firmController.removeFirmData);
router.post('/updateFirmData', protect, firmController.updateFirmData);

// Billing Routs

const billingController = require("../../controller/billingController/billing.controller.js");

//Get Billing Data
router.get('/getBillingStaticsData', protect, billingController.getBillingStaticsData);
router.get('/getBillDataById', protect, billingController.getBillDataById);
router.get('/getRecentBillData', protect, billingController.getRecentBillData);
router.get('/getBillDataByToken', protect, billingController.getBillDataByToken);
router.get('/getLiveViewByCategoryId', protect, billingController.getLiveViewByCategoryId);

// Add Billing Data
router.post('/addHotelBillData', protect, billingController.addHotelBillData);
router.post('/addPickUpBillData', protect, billingController.addPickUpBillData);
router.post('/addDeliveryBillData', protect, billingController.addDeliveryBillData);

// Update Billing Data
router.post('/updateHotelBillData', protect, billingController.updateHotelBillData);
router.post('/updatePickUpBillData', protect, billingController.updatePickUpBillData);
router.post('/updateDeliveryBillData', protect, billingController.updateDeliveryBillData);

// Hold Billing Routs

const holdController = require("../../controller/billingController/hold.controller.js");

router.get('/getHoldCount', protect, holdController.getHoldCount);
router.get('/getHoldBillData', protect, holdController.getHoldBillData);
router.get('/getHoldBillDataById', protect, holdController.getHoldBillDataById);
router.post('/addHotelHoldBillData', protect, holdController.addHotelHoldBillData);
router.post('/addPickUpHoldBillData', protect, holdController.addPickUpHoldBillData);
router.post('/addDeliveryHoldBillData', protect, holdController.addDeliveryHoldBillData);
router.delete('/discardHoldData', protect, holdController.discardHoldData);

// Printer Routs

const printerController = require("../../controller/billingController/printer.controller.js");

router.get('/getPrinterList', protect, printerController.getPrinterList);
router.post('/updatePrinterData', protect, printerController.updatePrinterData);

module.exports = router;