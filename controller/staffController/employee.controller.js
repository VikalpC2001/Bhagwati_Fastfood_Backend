const pool = require('../../database');
const jwt = require("jsonwebtoken");
const fs = require('fs');
const { generateToken } = require('../../utils/genrateToken');
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
        const uploadDir = process.env.EMPLOYEE_PHOTO_PATH; // Replace with your custom folder name
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
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (isImage(file)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files with jpg, jpeg, or png extensions are allowed.'));
        }
    },
}).any();


// Get Image Using API

const imageFolderPath = path.join(process.env.EMPLOYEE_PHOTO_PATH);

// Define a route to handle image retrieval
const getImagebyName = (req, res) => {
    try {
        const imageName = req.query.imageName;
        const imagePath = path.join(imageFolderPath, imageName);

        // Send the image as a response
        res.sendFile(imagePath, (err) => {
            if (err) {
                console.error('Error sending image:', err);
                res.status(404).send('Image not found');
            }
        });
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('Internal Server Error');
    }
};


// ADD Employe API

const addEmployeedetails = (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                console.error('An error occurred during file upload:', err);
                return res.status(500).send('File Upload Error');
            }
            const { files } = req;
            console.log("Uploaded Files:", files);
            if (!files || files.length === 0) {
                return res.status(400).send("Please Select File");
            }
            const uid1 = new Date();
            const employeeId = 'employee_' + uid1.getTime();
            const fileName = files[0].filename;
            const filePath = files[0].path;
            const imgLink = '/staffrouter/getImagebyName?imageName=' + fileName;
            const data = {
                employeeFirstName: req.body.employeeFirstName.trim(),
                employeeLastName: req.body.employeeLastName.trim(),
                employeeGender: req.body.employeeGender.trim(),
                employeeNickName: req.body.employeeNickName.trim(),
                employeeMobileNumber: req.body.employeeMobileNumber.trim(),
                employeeOtherMobileNumber: req.body.employeeOtherMobileNumber.trim(),
                presentAddress: req.body.presentAddress.trim(),
                homeAddress: req.body.homeAddress.trim(),
                adharCardNum: req.body.adharCardNum.trim(),
                category: req.body.category,
                designation: req.body.designation.trim(),
                salary: req.body.salary,
                maxLeave: req.body.maxLeave,
                accountHolderName: req.body.accountHolderName ? req.body.accountHolderName.trim() : null,
                accountNumber: req.body.accountNumber ? req.body.accountNumber.trim() : null,
                ifscCode: req.body.ifscCode ? req.body.ifscCode.trim() : null,
                bankName: req.body.bankName ? req.body.bankName.trim() : null,
                branchName: req.body.branchName ? req.body.branchName.trim() : null,
                employeeStatus: req.body.employeeStatus,
            };
            if (!data.employeeFirstName || !data.employeeLastName || !data.employeeGender || !data.employeeNickName ||
                !data.employeeMobileNumber || !data.employeeOtherMobileNumber || !data.presentAddress ||
                !data.homeAddress || !data.adharCardNum || !data.category || !data.designation ||
                !data.salary || !data.maxLeave || !data.employeeStatus) {
                return res.status(400).send("Please Fill all the feilds");
            }

            // Check if the employee already exists by employeeNickName
            pool.query(`SELECT employeeNickName FROM staff_employee_data WHERE employeeNickName = '${data.employeeNickName}'`, function (err, rows) {
                if (err) {
                    console.error('An error occurred in SQL Query', err);
                    return res.status(500).send('Database Error');
                }

                if (rows.length > 0) {
                    return res.status(400).send('Employee is Already Added');
                }

                // Add the photo path to the data object
                data.imageFilePath = filePath;

                // Insert data into the database
                const sql_query_addEmployeeData = `INSERT INTO staff_employee_data (
                                                                                employeeId,
                                                                                employeeFirstName,
                                                                                employeeLastName,
                                                                                employeeGender,
                                                                                employeeNickName,
                                                                                employeeMobileNumber,
                                                                                employeeOtherMobileNumber,
                                                                                presantAddress,
                                                                                homeAddress,
                                                                                adharCardNum,
                                                                                category,
                                                                                designation,
                                                                                salary,
                                                                                maxLeave,
                                                                                accountHolderName,
                                                                                accountNumber,
                                                                                ifscCode,
                                                                                bankName,
                                                                                branchName,
                                                                                employeeStatus,
                                                                                imageLink,
                                                                                imageFilePath
                                                                              ) VALUES (
                                                                                '${employeeId}',
                                                                                '${data.employeeFirstName}',
                                                                                '${data.employeeLastName}',
                                                                                '${data.employeeGender}',
                                                                                '${data.employeeNickName}',
                                                                                '${data.employeeMobileNumber}',
                                                                                ${data.employeeOtherMobileNumber ? `'${data.employeeOtherMobileNumber}'` : null},
                                                                                '${data.presentAddress}',
                                                                                '${data.homeAddress}',
                                                                                '${data.adharCardNum}',
                                                                                '${data.category}',
                                                                                '${data.designation}',
                                                                                ${data.salary},
                                                                                ${data.maxLeave},
                                                                                ${data.accountHolderName ? `'${data.accountHolderName}'` : null},
                                                                                ${data.accountNumber ? `'${data.accountNumber}'` : null},
                                                                                ${data.ifscCode ? `'${data.ifscCode}'` : null},
                                                                                ${data.bankName ? `'${data.bankName}'` : null},
                                                                                ${data.branchName ? `'${data.branchName}'` : null},
                                                                                ${data.employeeStatus},
                                                                                '${imgLink}',
                                                                                '${filePath}'
                                                                              )`;

                pool.query(sql_query_addEmployeeData, (err, result) => {
                    if (err) {
                        console.error('An error occurred in SQL Query', err);
                        return res.status(500).send('Database Error');
                    }

                    console.log('Data inserted successfully');
                    res.status(200).send('Data uploaded successfully');
                });
            });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
};

// Remove Employee Api 

const removeEmployeeDetails = async (req, res) => {

    try {
        const employeeId = req.query.employeeId.trim();
        req.query.stockOutCategoryId = pool.query(`SELECT employeeId, imageFilePath FROM staff_employee_data WHERE employeeId = '${employeeId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const imgFilePath = row[0].imageFilePath;
                console.log('><><><><', imgFilePath);
                fs.unlink(imgFilePath, (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                    } else {
                        console.log('File deleted successfully');
                    }
                });
                const sql_querry_removedetails = `DELETE FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Employee Deleted Successfully");
                })
            } else {
                return res.send('EmployeeId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Fill Employee Details 

const fillEmployeeDetails = (req, res) => {
    try {
        const employeeId = req.query.employeeId
        sql_querry_fillUser = `SELECT
                                employeeFirstName,
                                employeeLastName,
                                employeeGender,
                                employeeNickName,
                                employeeMobileNumber,
                                employeeOtherMobileNumber,
                                presantAddress,
                                homeAddress,
                                adharCardNum,
                                category,
                                designation,
                                salary,
                                maxLeave,
                                accountHolderName,
                                accountNumber,
                                ifscCode,
                                bankName,
                                branchName,
                                employeeStatus,
                                imageFilePath,
                                imageLink
                              FROM
                                staff_employee_data
                              WHERE
                                employeeId = '${employeeId}'`;
        pool.query(sql_querry_fillUser, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data[0]);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

const updateEmployeeDetails = (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                console.error('An error occurred during file upload:', err);
                return res.status(500).send('File Upload Error');
            }
            const { files } = req;
            console.log("Uploaded Files:", files);
            if (!files || files.length === 0) {
                return res.status(400).send("Please Select File");
            }
            const employeeId = req.body.employeeId;
            sql_query_getOldFilePath = `SELECT employeeId, imageFilePath FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
            pool.query(sql_query_getOldFilePath, (err, path) => {
                if (err) {
                    console.error('An error occurred in SQL Query', err);
                    return res.status(500).send('Database Error');
                }
                const imgFilePath = path[0].imageFilePath;
                console.log('><><><><', imgFilePath);
                fs.unlink(imgFilePath, (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                    } else {
                        console.log('File deleted successfully');
                    }
                });
                const fileName = files[0].filename;
                const filePath = files[0].path;
                const imgLink = '/staffrouter/getImagebyName?imageName=' + fileName;
                const data = {
                    employeeFirstName: req.body.employeeFirstName.trim(),
                    employeeLastName: req.body.employeeLastName.trim(),
                    employeeGender: req.body.employeeGender.trim(),
                    employeeNickName: req.body.employeeNickName.trim(),
                    employeeMobileNumber: req.body.employeeMobileNumber.trim(),
                    employeeOtherMobileNumber: req.body.employeeOtherMobileNumber.trim(),
                    presentAddress: req.body.presentAddress.trim(),
                    homeAddress: req.body.homeAddress.trim(),
                    adharCardNum: req.body.adharCardNum.trim(),
                    category: req.body.category,
                    designation: req.body.designation.trim(),
                    salary: req.body.salary,
                    maxLeave: req.body.maxLeave,
                    accountHolderName: req.body.accountHolderName ? req.body.accountHolderName.trim() : null,
                    accountNumber: req.body.accountNumber ? req.body.accountNumber.trim() : null,
                    ifscCode: req.body.ifscCode ? req.body.ifscCode.trim() : null,
                    bankName: req.body.bankName ? req.body.bankName.trim() : null,
                    branchName: req.body.branchName ? req.body.branchName.trim() : null,
                    employeeStatus: req.body.employeeStatus,
                };
                if (!data.employeeFirstName || !data.employeeLastName || !data.employeeGender || !data.employeeNickName ||
                    !data.employeeMobileNumber || !data.employeeOtherMobileNumber || !data.presentAddress ||
                    !data.homeAddress || !data.adharCardNum || !data.category || !data.designation ||
                    !data.salary || !data.maxLeave || !data.employeeStatus) {
                    return res.status(400).send("Please Fill all the feilds");
                }
                // Add the photo path to the data object
                data.imageFilePath = filePath;

                // Insert data into the database
                const sql_query_addEmployeeData = ` UPDATE
                                                    staff_employee_data
                                                SET
                                                    employeeFirstName = '${data.employeeFirstName}',
                                                    employeeLastName = '${data.employeeLastName}',
                                                    employeeGender ='${data.employeeGender}',
                                                    employeeNickName ='${data.employeeNickName}',
                                                    employeeMobileNumber ='${data.employeeMobileNumber}',
                                                    employeeOtherMobileNumber = ${data.employeeOtherMobileNumber ? `'${data.employeeOtherMobileNumber}'` : null},
                                                    presantAddress = '${data.presentAddress}',
                                                    homeAddress = '${data.homeAddress}',
                                                    adharCardNum = '${data.adharCardNum}',
                                                    category = '${data.category}',
                                                    designation ='${data.designation}',
                                                    salary = ${data.salary},
                                                    maxLeave = ${data.maxLeave},
                                                    accountHolderName = ${data.accountHolderName ? `'${data.accountHolderName}'` : null},
                                                    accountNumber = ${data.accountNumber ? `'${data.accountNumber}'` : null},
                                                    ifscCode = ${data.ifscCode ? `'${data.ifscCode}'` : null},
                                                    bankName = ${data.bankName ? `'${data.bankName}'` : null},
                                                    branchName = ${data.branchName ? `'${data.branchName}'` : null},
                                                    employeeStatus = ${data.employeeStatus},
                                                    imageFilePath ='${filePath}',
                                                    imageLink = '${imgLink}'
                                                WHERE
                                                    employeeId = '${employeeId}'`;

                pool.query(sql_query_addEmployeeData, (err, result) => {
                    if (err) {
                        console.error('An error occurred in SQL Query', err);
                        return res.status(500).send('Database Error');
                    }

                    console.log('Data inserted successfully');
                    res.status(200).send('Data Updated successfully');
                });
            })
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}


module.exports = {
    addEmployeedetails,
    getImagebyName,
    removeEmployeeDetails,
    updateEmployeeDetails,
    fillEmployeeDetails
}

