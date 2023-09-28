const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Employee Routs

const employeeController = require("../../controller/staffController/employee.controller.js");

router.post('/addEmployeedetails', protect, employeeController.addEmployeedetails);
router.get('/getImagebyName', employeeController.getImagebyName);
router.delete('/removeEmployeeDetails', protect, employeeController.removeEmployeeDetails);
router.post('/updateEmployeeDetails', protect, employeeController.updateEmployeeDetails);
router.get('/fillEmployeeDetails', protect, employeeController.fillEmployeeDetails);
router.get('/getEmployeeData', protect, employeeController.getEmployeeData);
router.get('/getMidMonthInActiveSalaryOfEmployee', protect, employeeController.getMidMonthInActiveSalaryOfEmployee);
router.get('/getEmployeeDetailsById', protect, employeeController.getEmployeeDetailsById);
router.get('/ddlForEmployeeList', protect, employeeController.ddlForEmployeeList);

// Staff Category Routs

const staffCategoryController = require("../../controller/staffController/staffCategory.controller.js");

router.post('/addStaffCategory', staffCategoryController.addStaffCategory);
router.delete('/removeStaffCategory', staffCategoryController.removeStaffCategory);
router.get('/ddlStaffCategory', staffCategoryController.ddlStaffCategory);
router.get('/getStaffCategoryList', staffCategoryController.getStaffCategoryList);
router.post('/updateStaffCategory', staffCategoryController.updateStaffCategory);
router.get('/getStaffCategoryWithEmployeeNumber', staffCategoryController.getStaffCategoryWithEmployeeNumber);
router.get('/getEmployeeStatisticsByCategoryId', staffCategoryController.getEmployeeStatisticsByCategoryId);

// Salary ,Fine and Advance Routs

const sallaryController = require("../../controller/staffController/salary.controller.js");

router.post('/addAmountOfSFA', protect, sallaryController.addAmountOfSFA);
router.delete('/removeCreditTransaction', protect, sallaryController.removeCreditTransaction);
router.delete('/removeSalaryTranction', sallaryController.removeSalaryTranction);
router.post('/updateEmployeeStatus', protect, sallaryController.updateEmployeeStatus, sallaryController.addAmountOfSFA);
router.get('/updateFineStatus', protect, sallaryController.updateFineStatus);
router.get('/updateFineTransaction', protect, sallaryController.updateFineTransaction);
router.delete('/removeAdvanceTransaction', protect, sallaryController.removeAdvanceTransaction);
router.delete('/removeFineTransaction', protect, sallaryController.removeFineTransaction);
router.delete('/removeBonusTransaction', protect, sallaryController.removeBonusTransaction);
router.delete('/removeMonthlySalary', protect, sallaryController.removeMonthlySalary);
router.get('/updateMonthlySalary', sallaryController.updateMonthlySalary);

// Leave Routs

const leaveController = require('../../controller/staffController/leave.controller.js')

router.post('/addEmployeeLeave', leaveController.addEmployeeLeave);
router.post('/addLeaveForAllEployee', leaveController.addLeaveForAllEmployee);
router.delete('/removeEmployeeLeave', protect, leaveController.removeEmployeeLeave);
router.post('/updateEmployeeLeave', protect, leaveController.updateEmployeeLeave);
router.delete('/removeEmployeeHoliday', protect, leaveController.removeEmployeeHoliday);

// Employee Table Routs

const employeeTableController = require('../../controller/staffController/employeeTable.controller.js');

router.get('/getEmployeeMonthlySalaryById', employeeTableController.getEmployeeMonthlySalaryById);
router.get('/getAdvanceDataById', employeeTableController.getAdvanceDataById);
router.get('/getFineDataById', employeeTableController.getFineDataById);
router.get('/getBonusDataById', employeeTableController.getBonusDataById);
router.get('/getCreditDataById', employeeTableController.getCreditDataById);
router.get('/getLeaveDataById', employeeTableController.getLeaveDataById);
router.get('/getTransactionDataById', employeeTableController.getTransactionDataById);
router.get('/getCutSalaryDataById', employeeTableController.getCutSalaryDataById);
router.get('/getAllPaymentStatisticsCountById', employeeTableController.getAllPaymentStatisticsCountById);
router.get('/getCutCreditDataById', employeeTableController.getCutCreditDataById);
router.get('/getPresentDaysByEmployeeId', employeeTableController.getPresentDaysByEmployeeId);

// Export Table Data Routs

const exportDataTable = require('../../controller/staffController/exportDataTable.controller.js');

// Export Excel For Employee Data
router.get('/exportExcelSheetForEmployeeMonthlySalaryDataById', exportDataTable.exportExcelSheetForEmployeeMonthlySalaryDataById);
router.get('/exportExcelSheetForAdvanceData', exportDataTable.exportExcelSheetForAdvanceData);
router.get('/exportExcelSheetForFineData', exportDataTable.exportExcelSheetForFineData);
router.get('/exportExcelSheetForBonusData', exportDataTable.exportExcelSheetForBonusData);
router.get('/exportExcelSheetForCreditData', exportDataTable.exportExcelSheetForCreditData);
router.get('/exportExcelSheetForLeaveData', exportDataTable.exportExcelSheetForLeaveData);
router.get('/exportExcelSheetForTransactionData', exportDataTable.exportExcelSheetForTransactionData);

// Export Excel For All Table Data
router.get('/exportExcelSheetForAllTransactionData', exportDataTable.exportExcelSheetForAllTransactionData);
router.get('/exportExcelSheetForAllAdvanceData', exportDataTable.exportExcelSheetForAllAdvanceData);
router.get('/exportExcelSheetForAllFineData', exportDataTable.exportExcelSheetForAllFineData);
router.get('/exportExcelSheetForAllBonusData', exportDataTable.exportExcelSheetForAllBonusData);
router.get('/exportExcelSheetForAllCreditData', exportDataTable.exportExcelSheetForAllCreditData);
router.get('/exportExcelSheetForAllLeaveData', exportDataTable.exportExcelSheetForAllLeaveData);

// Export PDF For All Table Data
router.get('/exportPdfForAllTransactionData', exportDataTable.exportPdfForAllTransactionData);
router.get('/exportPdfForAllAdvanceData', exportDataTable.exportPdfForAllAdvanceData);
router.get('/exportPdfForALLFineData', exportDataTable.exportPdfForALLFineData);
router.get('/exportPdfForAllBonusData', exportDataTable.exportPdfForAllBonusData);
router.get('/exportPdfForAllCreditData', exportDataTable.exportPdfForAllCreditData);
router.get('/exportPdfForAllLeaveData', exportDataTable.exportPdfForAllLeaveData);

// Export PDF For Employee Data
router.get('/exportPdfForEmployeeMonthlySalaryData', exportDataTable.exportPdfForEmployeeMonthlySalaryData);
router.get('/exportPdfForAdvanceData', exportDataTable.exportPdfForAdvanceData);
router.get('/exportPdfForFineData', exportDataTable.exportPdfForFineData);
router.get('/exportPdfForBonusData', exportDataTable.exportPdfForBonusData);
router.get('/exportPdfForCreditData', exportDataTable.exportPdfForCreditData);
router.get('/exportPdfForLeaveData', exportDataTable.exportPdfForLeaveData);
router.get('/exportPdfForTransactionData', exportDataTable.exportPdfForTransactionData);

// Employee Invoice Routs

const employeeInvoiceController = require('../../controller/staffController/empInvoice.controller.js');
const { RotationTypes } = require('pdf-lib');

router.get('/getEmployeeInvoice', employeeInvoiceController.getEmployeeInvoice);

// All Payment Routs

const allPaymentController = require('../../controller/staffController/allPayment.controller.js');

router.get('/getAllEmployeeTransactionData', allPaymentController.getAllEmployeeTransactionData);
router.get('/getAllEmployeeLeaveData', allPaymentController.getAllEmployeeLeaveData);
router.get('/getAllEmployeeBonusData', allPaymentController.getAllEmployeeBonusData);
router.get('/getAllEmployeeCreditData', allPaymentController.getAllEmployeeCreditData);
router.get('/getAllEmployeeFineData', allPaymentController.getAllEmployeeFineData);
router.get('/getAllEmployeeAdvanceData', allPaymentController.getAllEmployeeAdvanceData);
router.get('/getAllPaymentStatisticsCount', allPaymentController.getAllPaymentStatisticsCount);
router.get('/getAllEmployeeHolidayData', allPaymentController.getAllEmployeeHolidayData);

module.exports = router;


