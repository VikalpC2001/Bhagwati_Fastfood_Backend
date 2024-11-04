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
router.get('/getHotelStaticsData', protect, hotelController.getHotelStaticsData);
router.get('/getHotelDataById', protect, hotelController.getHotelDataById);
router.get('/getHotelBillDataById', protect, hotelController.getHotelBillDataById);
router.post('/addHotelData', protect, hotelController.addHotelData);
router.delete('/removeHotelData', protect, hotelController.removeHotelData);
router.post('/updateHotelData', protect, hotelController.updateHotelData);
router.get('/ddlHotelList', protect, hotelController.ddlHotelList);
router.get('/exportPdfBillDataById', hotelController.exportPdfBillDataById);
router.post('/addHotelTransactionData', protect, hotelController.addHotelTransactionData);
router.delete('/removeHotelTransactionById', protect, hotelController.removeHotelTransactionById);
router.get('/getMonthWiseTransactionForHotel', protect, hotelController.getMonthWiseTransactionForHotel);
router.get('/getHotelTransactionListById', protect, hotelController.getHotelTransactionListById);

// Firm Routs

const firmController = require("../../controller/billingController/firm.controller.js");

router.get('/getFirmData', protect, firmController.getFirmData);
router.post('/addFirmData', protect, firmController.addFirmData);
router.delete('/removeFirmData', protect, firmController.removeFirmData);
router.post('/updateFirmData', protect, firmController.updateFirmData);
router.get('/ddlFirmData', protect, firmController.ddlFirmData);
router.get('/getTaxReportByFirmId', firmController.getTaxReportByFirmId);

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
router.get('/updateBillStatusById', protect, billingController.updateBillStatusById);

// Print Bill Data
router.get('/printBillInAdminSystem', protect, billingController.printBillInAdminSystem);

// Online Billing Routs

const onlineBillingController = require("../../controller/billingController/onlineBilling.controller.js");

router.post('/addOnlineHotelBillData', onlineBillingController.addOnlineHotelBillData);
router.post('/addOnlinePickUpBillData', onlineBillingController.addOnlinePickUpBillData);

// Hold Billing Routs

const holdController = require("../../controller/billingController/hold.controller.js");

router.get('/getHoldCount', protect, holdController.getHoldCount);
router.get('/getHoldBillData', protect, holdController.getHoldBillData);
router.get('/getHoldBillDataById', protect, holdController.getHoldBillDataById);
router.post('/addHotelHoldBillData', protect, holdController.addHotelHoldBillData);
router.post('/addPickUpHoldBillData', protect, holdController.addPickUpHoldBillData);
router.post('/addDeliveryHoldBillData', protect, holdController.addDeliveryHoldBillData);
router.delete('/discardHoldData', protect, holdController.discardHoldData);

// Pending Billing Routs

const pendingController = require("../../controller/billingController/pendingBill.controller.js");

router.get('/getPendingCount', protect, pendingController.getPendingCount);
router.get('/getPendingBillData', protect, pendingController.getPendingBillData);
router.get('/getPendingBillDataById', protect, pendingController.getPendingBillDataById);
router.post('/addHotelPendingBillData', protect, pendingController.addHotelPendingBillData);
router.post('/addPickUpPendingBillData', protect, pendingController.addPickUpPendingBillData);
router.post('/addDeliveryPendingBillData', protect, pendingController.addDeliveryPendingBillData);
router.delete('/discardpendingData', protect, pendingController.discardpendingData);

// Printer Routs

const printerController = require("../../controller/billingController/printer.controller.js");

router.get('/getPrinterList', protect, printerController.getPrinterList);
router.post('/updatePrinterData', protect, printerController.updatePrinterData);

// Due Accounts Routs

const accountConntroller = require("../../controller/billingController/dueAccount.controller.js");

router.get('/getCustomerAccountList', protect, accountConntroller.getCustomerAccountList);
router.get('/getDueCustomerDataById', protect, accountConntroller.getDueCustomerDataById);
router.post('/addCustomerAccount', protect, accountConntroller.addCustomerAccount);
router.delete('/removeCustomerAccount', protect, accountConntroller.removeCustomerAccount);
router.post('/updateCustomerAccount', protect, accountConntroller.updateCustomerAccount);
router.post('/addDueBillData', protect, accountConntroller.addDueBillData);
router.post('/addDebitDueTransactionData', protect, accountConntroller.addDebitDueTransactionData);
router.get('/getDueBillDataById', protect, accountConntroller.getDueBillDataById);
router.get('/getDueDebitTransactionListById', protect, accountConntroller.getDueDebitTransactionListById);
router.get('/getMonthWiseTransactionForDueAccount', protect, accountConntroller.getMonthWiseTransactionForDueAccount);
router.get('/getDueStaticsById', protect, accountConntroller.getDueStaticsById);
router.delete('/removeDueBillDataById', protect, accountConntroller.removeDueBillDataById);
router.delete('/removeDueDebitTransactionById', protect, accountConntroller.removeDueDebitTransactionById);
router.post('/updateDueBillDataById', protect, accountConntroller.updateDueBillDataById);
router.get('/ddlDueAccountData', protect, accountConntroller.ddlDueAccountData);
router.get('/exportDueTransactionInvoice', protect, accountConntroller.exportDueTransactionInvoice);

// UPI Routs

const upiConntroller = require("../../controller/billingController/upi.controller.js");

router.get('/getCustomerAccountList', protect, upiConntroller.getUPIList);
router.post('/addCustomerAccount', protect, upiConntroller.addUPI);
router.delete('/removeCustomerAccount', protect, upiConntroller.removeUPI);
router.post('/updateCustomerAccount', protect, upiConntroller.updateUPI);
router.get('/ddlUPI', protect, upiConntroller.ddlUPI);

// Dine In Routs

const dineInController = require("../../controller/billingController/dineIn.controller.js");

router.get('/getSubTokensByBillId', protect, dineInController.getSubTokensByBillId);
router.get('/getAllTableView', protect, dineInController.getAllTableView);
router.post('/addDineInOrder', protect, dineInController.addDineInOrder);
router.delete('/removeSubTokenDataById', protect, dineInController.removeSubTokenDataById);
router.post('/updateSubTokenDataById', protect, dineInController.updateSubTokenDataById);
router.get('/updateStaticTableNumbers', protect, dineInController.updateStaticTableNumbers);
router.get('/printTableBill', protect, dineInController.printTableBill);
router.post('/updateDineInBillData', protect, dineInController.updateDineInBillData);
router.post('/sattledBillDataByID', protect, dineInController.sattledBillDataByID);
router.post('/cancelBillDataByID', protect, dineInController.cancelBillDataByID);
router.get('/moveTable', protect, dineInController.moveTable);
router.get('/isTableEmpty', protect, dineInController.isTableEmpty);

module.exports = router;