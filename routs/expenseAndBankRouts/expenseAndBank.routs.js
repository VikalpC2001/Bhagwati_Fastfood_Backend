const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Main Ctegory Routs

const mainCategoryController = require("../../controller/expenseAndBankController/mainCategory.controller.js");

router.get('/getMainCategoryList', mainCategoryController.getMainCategoryList);
router.get('/exportExcelForMainCategoryData', mainCategoryController.exportExcelForMainCategoryData);
router.get('/exportPdfForMainCategoryData', mainCategoryController.exportPdfForMainCategoryData);
router.get('/ddlMainCategoryData', mainCategoryController.ddlMainCategoryData);
router.get('/getMainCategoryDashboard', mainCategoryController.getMainCategoryDashboard);
router.post('/addMainCategory', mainCategoryController.addMainCategory);
router.post('/updateMainCategory', mainCategoryController.updateMainCategory);
router.delete('/removeMainCategory', mainCategoryController.removeMainCategory);


// Sub-Ctegory Routs

const subCategoryController = require("../../controller/expenseAndBankController/subCategory.controller.js");

router.get('/getSubCategoryListById', subCategoryController.getSubCategoryListById);
router.get('/getStaticsForSubCategoryById', subCategoryController.getStaticsForSubCategoryById);
router.get('/exportExcelForSubCategoryData', subCategoryController.exportExcelForSubCategoryData);
router.get('/exportPdfForSubcategoryData', subCategoryController.exportPdfForSubcategoryData);
router.get('/ddlSubCategoryData', subCategoryController.ddlSubCategoryData);
router.post('/addSubCategory', subCategoryController.addSubCategory);
router.post('/updateSubCategory', subCategoryController.updateSubCategory);
router.delete('/removeSubCategory', subCategoryController.removeSubCategory);

// In-Come Source Routs

const inComeSourceController = require("../../controller/expenseAndBankController/incomeSource.controller.js");

router.get('/getIncomeSourceList', inComeSourceController.getIncomeSourceList);
router.get('/exportExcelForIncomeData', inComeSourceController.exportExcelForIncomeData);
router.get('/exportPdfForIncomeData', inComeSourceController.exportPdfForIncomeData);
router.get('/ddlFilterBankData', inComeSourceController.ddlFilterBankData);
router.get('/ddlFromData', inComeSourceController.ddlFromData);
router.post('/addIncomeSource', inComeSourceController.addIncomeSource);
router.post('/updateInComeSource', inComeSourceController.updateInComeSource);
router.delete('/removeIncomeSource', inComeSourceController.removeIncomeSource);

// Bank Routs

const bankController = require("../../controller/expenseAndBankController/bank.controller.js");

router.get('/getBankList', bankController.getBankList);
router.get('/ddlToData', bankController.ddlToData);
router.get('/getBankDashboardData', bankController.getBankDashboardData);
router.get('/getDebitAmtForCategory', bankController.getDebitAmtForCategory);
router.get('/getBankStaticsById', bankController.getBankStaticsById);
router.get('/getBankDetailsById', bankController.getBankDetailsById);
router.post('/addBankData', bankController.addBankData);
router.post('/updateBankData', bankController.updateBankData);
router.delete('/removeBankData', bankController.removeBankData);

// Transaction Routs

const transactionController = require("../../controller/expenseAndBankController/bankTransaction.controller.js");

router.get('/getBankTransactionById', transactionController.getBankTransactionById);
router.post('/addTransactionData', transactionController.addTransactionData);
router.post('/updateBankTransaction', transactionController.updateBankTransaction);
router.delete('/removeTransactionData', transactionController.removeTransactionData);
router.get('/getBankCreditTransaction', transactionController.getBankCreditTransaction);
router.get('/exportExcelForBankTransactionById', transactionController.exportExcelForBankTransactionById);
router.get('/exportPdfForBankTransactionById', transactionController.exportPdfForBankTransactionById);
router.get('/exportExcelForFundTransfer', transactionController.exportExcelForFundTransfer);
router.get('/exportPdfForFundTransfer', transactionController.exportPdfForFundTransfer);

// Expense Routs

const expenseController = require("../../controller/expenseAndBankController/expense.controller.js");

router.get('/getExpenseTransactionData', expenseController.getExpenseTransactionData);
router.get('/exportExcelSheetForExpenseData', expenseController.exportExcelSheetForExpenseData);
router.get('/exportPdfForExpenseData', expenseController.exportPdfForExpenseData);
router.post('/addExpenseData', expenseController.addExpenseData);
router.post('/updateExpenseData', expenseController.updateExpenseData);
router.delete('/removeExpenseData', expenseController.removeExpenseData);
router.get('/fillExpenseDataById', expenseController.fillExpenseDataById);

// Business Category Routs

const businessCategoryController = require("../../controller/expenseAndBankController/businessCategory.controller.js");

router.get('/getBusinessCategoryList', businessCategoryController.getBusinessCategoryList);
router.get('/getBusinessCategory', businessCategoryController.getBusinessCategory);
router.post('/addBusinessCategory', businessCategoryController.addBusinessCategory);
router.delete('/removeBusinessCategory', businessCategoryController.removeBusinessCategory);
router.post('/updateBusinessCategory', businessCategoryController.updateBusinessCategory);

// Business Report Routs

const businessReportController = require("../../controller/expenseAndBankController/businessReport.controller.js");

router.post('/addBusinessReport', businessReportController.addBusinessReport);
router.post('/updateBusinessReport', businessReportController.updateBusinessReport);
router.delete('/removeBusinessReport', businessReportController.removeBusinessReport);
router.get('/getExpenseAndClosingBalanceByDate', businessReportController.getExpenseAndClosingBalanceByDate);
router.get('/getBusinessReportDashBoard', businessReportController.getBusinessReportDashBoard);
router.get('/exportExcelForBusinessReport', businessReportController.exportExcelForBusinessReport);
router.get('/exportPdfForBusinessReport', businessReportController.exportPdfForBusinessReport);

module.exports = router;