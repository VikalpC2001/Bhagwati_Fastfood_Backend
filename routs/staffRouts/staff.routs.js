const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Employee Routs

const employeeController = require("../../controller/staffController/employee.controller.js");

router.post('/addEmployeedetails', employeeController.addEmployeedetails);
router.get('/getImagebyName', employeeController.getImagebyName);
router.delete('/removeEmployeeDetails', employeeController.removeEmployeeDetails);
router.post('/updateEmployeeDetails', employeeController.updateEmployeeDetails);
router.get('/fillEmployeeDetails', employeeController.fillEmployeeDetails);

// Staff

module.exports = router;


