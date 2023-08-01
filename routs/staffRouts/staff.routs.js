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
router.get('/getEmployeeData', employeeController.getEmployeeData);
router.get('/updateEmployeeStatus', employeeController.updateEmployeeStatus);

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
router.post('/addEmployeeLeave', sallaryController.addEmployeeLeave);

// leave

const leaveCon = require('../../controller/staffController/leaveFunction.controller.js')

// router.get('/calculateDueSalary', leaveCon.calculateDueSalary);

module.exports = router;


