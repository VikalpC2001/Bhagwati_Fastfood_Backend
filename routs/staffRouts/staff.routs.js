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
router.get('/getEmployeeIdAndName', employeeController.getEmployeeIdAndName);

// Staff Category Routs

const staffCategoryController = require("../../controller/staffController/staffCategory.controller.js");

router.post('/addStaffCategory', protect, staffCategoryController.addStaffCategory);
router.delete('/removeStaffCategory', protect, staffCategoryController.removeStaffCategory);
router.get('/ddlStaffCategory', protect, staffCategoryController.ddlStaffCategory);
router.get('/getStaffCategoryList', protect, staffCategoryController.getStaffCategoryList);
router.post('/updateStaffCategory', protect, staffCategoryController.updateStaffCategory);
router.get('/getStaffCategoryWithEmployeeNumber', protect, staffCategoryController.getStaffCategoryWithEmployeeNumber);
router.get('/getEmployeeStatisticsByCategoryId', protect, staffCategoryController.getEmployeeStatisticsByCategoryId);

// Salary ,Fine and Advance Routs

const sallaryController = require("../../controller/staffController/salary.controller.js");

router.post('/addAmountOfSFA', protect, sallaryController.addAmountOfSFA);
router.delete('/removeCreditTransaction', protect, sallaryController.removeCreditTransaction);
router.delete('/removeSalaryTranction', protect, sallaryController.removeSalaryTranction);
router.post('/updateEmployeeStatus', protect, sallaryController.updateEmployeeStatus, sallaryController.addAmountOfSFA);
router.get('/updateFineStatus', protect, sallaryController.updateFineStatus);
router.get('/updateFineTransaction', protect, sallaryController.updateFineTransaction);
router.delete('/removeAdvanceTransaction', protect, sallaryController.removeAdvanceTransaction);
router.delete('/removeFineTransaction', protect, sallaryController.removeFineTransaction);
router.delete('/removeBonusTransaction', protect, sallaryController.removeBonusTransaction);
router.delete('/removeMonthlySalary', protect, sallaryController.removeMonthlySalary);
router.get('/updateMonthlySalary', protect, sallaryController.updateMonthlySalary);

// Leave Routs

const leaveController = require('../../controller/staffController/leave.controller.js')

router.post('/addEmployeeLeave', protect, leaveController.addEmployeeLeave);
router.post('/addLeaveForAllEployee', protect, leaveController.addLeaveForAllEmployee);
router.delete('/removeEmployeeLeave', protect, leaveController.removeEmployeeLeave);
router.post('/updateEmployeeLeave', protect, leaveController.updateEmployeeLeave);
router.delete('/removeEmployeeHoliday', protect, leaveController.removeEmployeeHoliday);

// Employee Table Routs

const employeeTableController = require('../../controller/staffController/employeeTable.controller.js');

router.get('/getEmployeeMonthlySalaryById', protect, employeeTableController.getEmployeeMonthlySalaryById);
router.get('/getAdvanceDataById', protect, employeeTableController.getAdvanceDataById);
router.get('/getFineDataById', protect, employeeTableController.getFineDataById);
router.get('/getBonusDataById', protect, employeeTableController.getBonusDataById);
router.get('/getCreditDataById', protect, employeeTableController.getCreditDataById);
router.get('/getLeaveDataById', protect, employeeTableController.getLeaveDataById);
router.get('/getTransactionDataById', protect, employeeTableController.getTransactionDataById);
router.get('/getCutSalaryDataById', protect, employeeTableController.getCutSalaryDataById);
router.get('/getAllPaymentStatisticsCountById', protect, employeeTableController.getAllPaymentStatisticsCountById);
router.get('/getCutCreditDataById', protect, employeeTableController.getCutCreditDataById);
router.get('/getPresentDaysByEmployeeId', protect, employeeTableController.getPresentDaysByEmployeeId);

// Export Table Data Routs

const exportDataTable = require('../../controller/staffController/exportDataTable.controller.js');

// Export Excel For Employee Data
router.get('/exportExcelSheetForEmployeeMonthlySalaryDataById', protect, exportDataTable.exportExcelSheetForEmployeeMonthlySalaryDataById);
router.get('/exportExcelSheetForAdvanceData', protect, exportDataTable.exportExcelSheetForAdvanceData);
router.get('/exportExcelSheetForFineData', protect, exportDataTable.exportExcelSheetForFineData);
router.get('/exportExcelSheetForBonusData', protect, exportDataTable.exportExcelSheetForBonusData);
router.get('/exportExcelSheetForCreditData', protect, exportDataTable.exportExcelSheetForCreditData);
router.get('/exportExcelSheetForLeaveData', protect, exportDataTable.exportExcelSheetForLeaveData);
router.get('/exportExcelSheetForTransactionData', protect, exportDataTable.exportExcelSheetForTransactionData);

// Export Excel For All Table Data
router.get('/exportExcelSheetForAllTransactionData', protect, exportDataTable.exportExcelSheetForAllTransactionData);
router.get('/exportExcelSheetForAllAdvanceData', protect, exportDataTable.exportExcelSheetForAllAdvanceData);
router.get('/exportExcelSheetForAllFineData', protect, exportDataTable.exportExcelSheetForAllFineData);
router.get('/exportExcelSheetForAllBonusData', protect, exportDataTable.exportExcelSheetForAllBonusData);
router.get('/exportExcelSheetForAllCreditData', protect, exportDataTable.exportExcelSheetForAllCreditData);
router.get('/exportExcelSheetForAllLeaveData', protect, exportDataTable.exportExcelSheetForAllLeaveData);

// Export PDF For All Table Data
router.get('/exportPdfForAllTransactionData', protect, exportDataTable.exportPdfForAllTransactionData);
router.get('/exportPdfForAllAdvanceData', protect, exportDataTable.exportPdfForAllAdvanceData);
router.get('/exportPdfForALLFineData', protect, exportDataTable.exportPdfForALLFineData);
router.get('/exportPdfForAllBonusData', protect, exportDataTable.exportPdfForAllBonusData);
router.get('/exportPdfForAllCreditData', protect, exportDataTable.exportPdfForAllCreditData);
router.get('/exportPdfForAllLeaveData', protect, exportDataTable.exportPdfForAllLeaveData);

// Export PDF For Employee Data
router.get('/exportPdfForEmployeeMonthlySalaryData', protect, exportDataTable.exportPdfForEmployeeMonthlySalaryData);
router.get('/exportPdfForAdvanceData', protect, exportDataTable.exportPdfForAdvanceData);
router.get('/exportPdfForFineData', protect, exportDataTable.exportPdfForFineData);
router.get('/exportPdfForBonusData', protect, exportDataTable.exportPdfForBonusData);
router.get('/exportPdfForCreditData', protect, exportDataTable.exportPdfForCreditData);
router.get('/exportPdfForLeaveData', protect, exportDataTable.exportPdfForLeaveData);
router.get('/exportPdfForTransactionData', protect, exportDataTable.exportPdfForTransactionData);

// Employee Invoice Routs

const employeeInvoiceController = require('../../controller/staffController/empInvoice.controller.js');
const { RotationTypes } = require('pdf-lib');

router.get('/getEmployeeInvoice', protect, employeeInvoiceController.getEmployeeInvoice);

// All Payment Routs

const allPaymentController = require('../../controller/staffController/allPayment.controller.js');

router.get('/getAllEmployeeTransactionData', protect, allPaymentController.getAllEmployeeTransactionData);
router.get('/getAllEmployeeLeaveData', protect, allPaymentController.getAllEmployeeLeaveData);
router.get('/getAllEmployeeBonusData', protect, allPaymentController.getAllEmployeeBonusData);
router.get('/getAllEmployeeCreditData', protect, allPaymentController.getAllEmployeeCreditData);
router.get('/getAllEmployeeFineData', protect, allPaymentController.getAllEmployeeFineData);
router.get('/getAllEmployeeAdvanceData', protect, allPaymentController.getAllEmployeeAdvanceData);
router.get('/getAllPaymentStatisticsCount', protect, allPaymentController.getAllPaymentStatisticsCount);
router.get('/getAllEmployeeHolidayData', protect, allPaymentController.getAllEmployeeHolidayData);

module.exports = router;


