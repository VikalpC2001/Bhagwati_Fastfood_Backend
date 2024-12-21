const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Main Ctegory Routs

const mainCategoryController = require("../../controller/expenseAndBankController/mainCategory.controller.js");

router.get('/getMainCategoryList', protect, mainCategoryController.getMainCategoryList);
router.get('/exportExcelForMainCategoryData', protect, mainCategoryController.exportExcelForMainCategoryData);
router.get('/exportPdfForMainCategoryData', protect, mainCategoryController.exportPdfForMainCategoryData);
router.get('/ddlMainCategoryData', protect, mainCategoryController.ddlMainCategoryData);
router.get('/getMainCategoryDashboard', protect, mainCategoryController.getMainCategoryDashboard);
router.post('/addMainCategory', protect, mainCategoryController.addMainCategory);
router.post('/updateMainCategory', protect, mainCategoryController.updateMainCategory);
router.delete('/removeMainCategory', protect, mainCategoryController.removeMainCategory);


// Sub-Ctegory Routs

const subCategoryController = require("../../controller/expenseAndBankController/subCategory.controller.js");

router.get('/getSubCategoryListById', protect, subCategoryController.getSubCategoryListById);
router.get('/getStaticsForSubCategoryById', protect, subCategoryController.getStaticsForSubCategoryById);
router.get('/exportExcelForSubCategoryData', protect, subCategoryController.exportExcelForSubCategoryData);
router.get('/exportPdfForSubcategoryData', protect, subCategoryController.exportPdfForSubcategoryData);
router.get('/ddlSubCategoryData', protect, subCategoryController.ddlSubCategoryData);
router.post('/addSubCategory', protect, subCategoryController.addSubCategory);
router.post('/updateSubCategory', protect, subCategoryController.updateSubCategory);
router.delete('/removeSubCategory', protect, subCategoryController.removeSubCategory);

// In-Come Source Routs

const inComeSourceController = require("../../controller/expenseAndBankController/incomeSource.controller.js");

router.get('/getIncomeSourceList', protect, inComeSourceController.getIncomeSourceList);
router.get('/exportExcelForIncomeData', protect, inComeSourceController.exportExcelForIncomeData);
router.get('/exportPdfForIncomeData', protect, inComeSourceController.exportPdfForIncomeData);
router.get('/ddlFilterBankData', protect, inComeSourceController.ddlFilterBankData);
router.get('/ddlFromData', protect, inComeSourceController.ddlFromData);
router.post('/addIncomeSource', protect, inComeSourceController.addIncomeSource);
router.post('/updateInComeSource', protect, inComeSourceController.updateInComeSource);
router.delete('/removeIncomeSource', protect, inComeSourceController.removeIncomeSource);

// Bank Routs

const bankController = require("../../controller/expenseAndBankController/bank.controller.js");

router.get('/getBankList', protect, bankController.getBankList);
router.get('/ddlToData', protect, bankController.ddlToData);
router.get('/getBankDashboardData', protect, bankController.getBankDashboardData);
router.get('/getDebitAmtForCategory', protect, bankController.getDebitAmtForCategory);
router.get('/getBankStaticsById', protect, bankController.getBankStaticsById);
router.get('/getBankDetailsById', protect, bankController.getBankDetailsById);
router.post('/addBankData', protect, bankController.addBankData);
router.post('/updateBankData', protect, bankController.updateBankData);
router.delete('/removeBankData', protect, bankController.removeBankData);

// Transaction Routs

const transactionController = require("../../controller/expenseAndBankController/bankTransaction.controller.js");

router.get('/getBankTransactionById', protect, transactionController.getBankTransactionById);
router.post('/addTransactionData', protect, transactionController.addTransactionData);
router.post('/updateBankTransaction', protect, transactionController.updateBankTransaction);
router.delete('/removeTransactionData', protect, transactionController.removeTransactionData);
router.get('/getBankCreditTransaction', protect, transactionController.getBankCreditTransaction);
router.get('/exportExcelForBankTransactionById', protect, transactionController.exportExcelForBankTransactionById);
router.get('/exportPdfForBankTransactionById', protect, transactionController.exportPdfForBankTransactionById);
router.get('/exportExcelForFundTransfer', protect, transactionController.exportExcelForFundTransfer);
router.get('/exportPdfForFundTransfer', protect, transactionController.exportPdfForFundTransfer);
router.get('/getMonthWiseTransactionForBankById', protect, transactionController.getMonthWiseTransactionForBankById);

// Expense Routs

const expenseController = require("../../controller/expenseAndBankController/expense.controller.js");

router.get('/getExpenseTransactionData', protect, expenseController.getExpenseTransactionData);
router.get('/exportExcelSheetForExpenseData', protect, expenseController.exportExcelSheetForExpenseData);
router.get('/exportPdfForExpenseData', protect, expenseController.exportPdfForExpenseData);
router.post('/addExpenseData', protect, expenseController.addExpenseData);
router.post('/updateExpenseData', protect, expenseController.updateExpenseData);
router.delete('/removeExpenseData', protect, expenseController.removeExpenseData);
router.get('/fillExpenseDataById', protect, expenseController.fillExpenseDataById);

// Business Category Routs

const businessCategoryController = require("../../controller/expenseAndBankController/businessCategory.controller.js");

router.get('/getBusinessCategoryList', protect, businessCategoryController.getBusinessCategoryList);
router.get('/getBusinessCategory', protect, businessCategoryController.getBusinessCategory);
router.post('/addBusinessCategory', protect, businessCategoryController.addBusinessCategory);
router.delete('/removeBusinessCategory', protect, businessCategoryController.removeBusinessCategory);
router.post('/updateBusinessCategory', protect, businessCategoryController.updateBusinessCategory);

// Business Report Routs

const businessReportController = require("../../controller/expenseAndBankController/businessReport.controller.js");

router.post('/addBusinessReport', protect, businessReportController.addBusinessReport);
router.post('/updateBusinessReport', protect, businessReportController.updateBusinessReport);
router.delete('/removeBusinessReport', protect, businessReportController.removeBusinessReport);
router.get('/getExpenseAndClosingBalanceByDate', protect, businessReportController.getExpenseAndClosingBalanceByDate);
router.get('/getBusinessReportDashBoard', protect, businessReportController.getBusinessReportDashBoard);
router.get('/getBusinessReportDashBoardwithNetProfit', protect, businessReportController.getBusinessReportDashBoardwithNetProfit);
router.get('/exportExcelForBusinessReport', protect, businessReportController.exportExcelForBusinessReport);
router.get('/exportPdfForBusinessReport', protect, businessReportController.exportPdfForBusinessReport);
router.get('/exportPdfForBusinessReportNet', protect, businessReportController.exportPdfForBusinessReportNet);
router.get('/exportExcelForBusinessReportNet', businessReportController.exportExcelForBusinessReportNet);

module.exports = router;