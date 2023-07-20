const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");
const multer = require('multer');
const path = require('path');

const isImage = (file) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    return mimetype && extname;
};

const customDestination = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = '/Users/vikalp/Bhagwati_Fastfood_Backend/asset/staffPhotos'; // Replace with your custom folder name
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        const employeeFirstName = req.body.employeeFirstName.replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters from the employeeFirstName
        cb(null, employeeFirstName + '_' + Date.now() + '.' + ext);
    },
});

const upload = multer({
    storage: customDestination,
    limits: {
        fileSize: 500 * 1024, // 500 KB in bytes
    },
    fileFilter: (req, file, cb) => {
        if (isImage(file)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files with jpg, jpeg, or png extensions are allowed.'));
        }
    },
}).single('files');

// Employee Routs

const employeeController = require("../../controller/staffController/employee.controller.js");

router.post('/addEmployeedetails', upload, employeeController.addEmployeedetails);
router.get('/getImagebyName', employeeController.getImagebyName);
router.delete('/removeEmployeeDetails', employeeController.removeEmployeeDetails);
router.post('/updateEmployeeDetails', upload, employeeController.updateEmployeeDetails);

module.exports = router;
