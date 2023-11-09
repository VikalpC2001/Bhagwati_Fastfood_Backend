const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Main Ctegory Routs

const mainCategoryController = require("../../controller/expenseAndBankController/mainCategory.controller.js");

router.get('/getMainCategoryList', mainCategoryController.getMainCategoryList);
router.get('/ddlMainCategoryData', mainCategoryController.ddlMainCategoryData);
router.post('/addMainCategory', mainCategoryController.addMainCategory);
router.post('/updateMainCategory', mainCategoryController.updateMainCategory);
router.delete('/removeMainCategory', mainCategoryController.removeMainCategory);

// Sub-Ctegory Routs

const subCategoryController = require("../../controller/expenseAndBankController/subCategory.controller.js");

router.get('/getSubCategoryListById', subCategoryController.getSubCategoryListById);
router.get('/ddlSubCategoryData', subCategoryController.ddlSubCategoryData);
router.post('/addSubCategory', subCategoryController.addSubCategory);
router.post('/updateSubCategory', subCategoryController.updateSubCategory);
router.delete('/removeSubCategory', subCategoryController.removeSubCategory);

// In-Come Source Routs

const inComeSourceController = require("../../controller/expenseAndBankController/incomeSource.controller.js");

router.get('/getIncomeSourceList', inComeSourceController.getIncomeSourceList);
router.get('/ddlFromData', inComeSourceController.ddlFromData);
router.post('/addIncomeSource', inComeSourceController.addIncomeSource);
router.post('/updateInComeSource', inComeSourceController.updateInComeSource);
router.delete('/removeIncomeSource', inComeSourceController.removeIncomeSource);

// Bank Routs

const bankController = require("../../controller/expenseAndBankController/bank.controller.js");

router.get('/getBankList', bankController.getBankList);
router.get('/ddlToData', bankController.ddlToData);
router.post('/addBankData', bankController.addBankData);
router.post('/updateBankData', bankController.updateBankData);
router.delete('/removeBankData', bankController.removeBankData);

// Transaction Routs

const transactionController = require("../../controller/expenseAndBankController/bankTransaction.controller.js");

router.get('/getBankTransactionById', transactionController.getBankTransactionById);
router.post('/addTransactionData', transactionController.addTransactionData);
router.post('/updateBankTransaction', transactionController.updateBankTransaction);
router.delete('/removeTransactionData', transactionController.removeTransactionData);

// Expense Routs

const expenseController = require("../../controller/expenseAndBankController/expense.controller.js");

router.get('/getExpenseTransactionData', expenseController.getExpenseTransactionData);
router.post('/addExpenseData', expenseController.addExpenseData);
router.post('/updateExpenseData', expenseController.updateExpenseData);
router.delete('/removeExpenseData', expenseController.removeExpenseData);

module.exports = router;