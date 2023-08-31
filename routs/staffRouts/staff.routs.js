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

// Staff Category Routs

const staffCategoryController = require("../../controller/staffController/staffCategory.controller.js");

router.post('/addStaffCategory', staffCategoryController.addStaffCategory);
router.delete('/removeStaffCategory', staffCategoryController.removeStaffCategory);
router.get('/ddlStaffCategory', staffCategoryController.ddlStaffCategory);
router.get('/getStaffCategoryList', staffCategoryController.getStaffCategoryList);
router.post('/updateStaffCategory', staffCategoryController.updateStaffCategory);
router.get('/getStaffCategoryWithEmployeeNumber', staffCategoryController.getStaffCategoryWithEmployeeNumber);

// Salary ,Fine and Advance Routs

const sallaryController = require("../../controller/staffController/salary.controller.js");

router.post('/addAmountOfSFA', protect, sallaryController.addAmountOfSFA);
router.delete('/removeSalaryHistory', sallaryController.removeSalaryHistory);
router.delete('/removeCreditTransaction', sallaryController.removeCreditTransaction);
router.post('/updateEmployeeStatus', sallaryController.updateEmployeeStatus, sallaryController.addAmountOfSFA);

// Leave Routs

const leaveController = require('../../controller/staffController/leave.controller.js')

router.post('/addEmployeeLeave', leaveController.addEmployeeLeave);
router.post('/addLeaveForAllEployee', leaveController.addLeaveForAllEployee);

// Employee Table Routs

const employeeTableController = require('../../controller/staffController/employeeTable.controller.js');

router.get('/getEmployeeMonthlySalaryById', employeeTableController.getEmployeeMonthlySalaryById);
router.get('/getAdvanceDataById', employeeTableController.getAdvanceDataById);
router.get('/getFineDataById', employeeTableController.getFineDataById);
router.get('/getBonusDataById', employeeTableController.getBonusDataById);
router.get('/getCreditDataById', employeeTableController.getCreditDataById);
router.get('/getLeaveDataById', employeeTableController.getLeaveDataById);
router.get('/getTransactionDataById', employeeTableController.getTransactionDataById);

// Employee Invoice Routs

const employeeInvoiceController = require('../../controller/staffController/empInvoice.controller.js');

router.get('/getEmployeeInvoice', employeeInvoiceController.getEmployeeInvoice);

module.exports = router;


