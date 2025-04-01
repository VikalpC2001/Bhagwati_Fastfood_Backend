const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Inventory App Routs

const inventoryAppController = require("../../controller/merchantAppController/inventoryApp.controller.js");

router.get('/getProductData', protect, inventoryAppController.getProductData);
router.get('/getOutCategoryForApp', protect, inventoryAppController.getOutCategoryForApp);
router.get('/getSupplierdataForApp', protect, inventoryAppController.getSupplierdataForApp);
router.get('/getProductStaticsByIdForApp', protect, inventoryAppController.getProductStaticsByIdForApp);

// Staff App Routs

const staffAppController = require("../../controller/merchantAppController/staffApp.controller.js");

router.get('/getEmployeeDataForApp', protect, staffAppController.getEmployeeDataForApp);
router.get('/getAllEmployeeLeaveDataForApp', protect, staffAppController.getAllEmployeeLeaveDataForApp);
router.get('/getEmployeeMonthlySalaryByIdForApp', protect, staffAppController.getEmployeeMonthlySalaryByIdForApp);
router.get('/getLeaveDataByIdForApp', protect, staffAppController.getLeaveDataByIdForApp);
router.get('/getStaffCategoryWithEmployeeNumberForApp', protect, staffAppController.getStaffCategoryWithEmployeeNumberForApp);
router.get('/getAllPaymentStatisticsCountByIdForApp', protect, staffAppController.getAllPaymentStatisticsCountByIdForApp);

// Bank App Routs

const bankAppController = require("../../controller/merchantAppController/bankApp.controller.js");

router.get('/getBankDashboardDataForApp', protect, bankAppController.getBankDashboardDataForApp);
router.get('/getBankDetailsByIdForApp', protect, bankAppController.getBankDetailsByIdForApp);
router.get('/getBankStaticsByIdForApp', protect, bankAppController.getBankStaticsByIdForApp);
router.get('/getBankTransactionByIdForApp', protect, bankAppController.getBankTransactionByIdForApp);
router.get('/ddlToDataForApp', protect, bankAppController.ddlToDataForApp);
router.get('/ddlMainCategoryDataForApp', protect, bankAppController.ddlMainCategoryDataForApp);

// Expense App Routs

const expenseAppController = require("../../controller/merchantAppController/expenseApp.controller.js");

router.get('/getMainCategoryDashboardForApp', protect, expenseAppController.getMainCategoryDashboardForApp);
router.get('/getSubCategoryListByIdForApp', protect, expenseAppController.getSubCategoryListByIdForApp);
router.get('/getStaticsForSubCategoryByIdForApp', protect, expenseAppController.getStaticsForSubCategoryByIdForApp);
router.get('/getExpenseTransactionDataForApp', protect, expenseAppController.getExpenseTransactionDataForApp);

// Khata Book Routs

const khataBookAppController = require("../../controller/merchantAppController/khataBookApp.controller.js");

// Customer Account

router.get('/getCustomerAccountListForApp', protect, khataBookAppController.getCustomerAccountListForApp);
router.get('/getStaticsForAllCustomer', protect, khataBookAppController.getStaticsForAllCustomer);
router.post('/addCustomerAccountForApp', protect, khataBookAppController.addCustomerAccountForApp);
router.delete('/removeCustomerAccountForApp', protect, khataBookAppController.removeCustomerAccountForApp);
router.post('/updateCustomerAccountForApp', protect, khataBookAppController.updateCustomerAccountForApp);

// Customer Transaction

router.get('/getCustomerTransactionData', protect, khataBookAppController.getCustomerTransactionData);
router.get('/getCustomerStaticsById', protect, khataBookAppController.getCustomerStaticsById);
router.post('/addYouGaveDataForApp', protect, khataBookAppController.addYouGaveDataForApp);
router.post('/addYouGotDataForApp', protect, khataBookAppController.addYouGotDataForApp);
router.delete('/removeCustomerTransactionData', protect, khataBookAppController.removeCustomerTransactionData);
router.post('/updateCustomerTransactionData', protect, khataBookAppController.updateCustomerTransactionData);

// Category Analysis Data For App

const analysisAppController = require("../../controller/merchantAppController/analysisApp.controller.js");

router.get('/getThreeCategorDashBoardDataForApp', protect, analysisAppController.getThreeCategorDashBoardDataForApp);


module.exports = router;