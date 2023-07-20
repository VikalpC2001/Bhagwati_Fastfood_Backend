const pool = require('../../database');
const jwt = require("jsonwebtoken");
const fs = require('fs');
const { generateToken } = require('../../utils/genrateToken');
const path = require('path');

// Get Image Using API

const imageFolderPath = path.join('/Users/vikalp/Bhagwati_Fastfood_Backend/asset/staffPhotos');

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
        const { file, body } = req;
        console.log("file", file);
        if (!file || file.length === 0) {
            return res.status(400).send('Please Add Photo');
        }

        // Validate required fields
        const requiredFields = ['employeeFirstName', 'employeeLastName', 'employeeGender', 'employeeNickName', 'employeeMobileNumber', 'presentAddress', 'homeAddress', 'adharCardNum', 'category', 'designation', 'salary', 'maxLeave', 'employeeStatus'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return res.status(400).send(`Please provide a value for ${field}`);
            }
        }

        const uid1 = new Date();
        const employeeId = 'employee_' + uid1.getTime();
        const fileName = file.filename;
        const filePath = file.path
        const imgLink = '/staffrouter/getImagebyName?imageName=' + fileName;
        const data = {
            employeeFirstName: body.employeeFirstName.trim(),
            employeeLastName: body.employeeLastName.trim(),
            employeeGender: body.employeeGender.trim(),
            employeeNickName: body.employeeNickName.trim(),
            employeeMobileNumber: body.employeeMobileNumber.trim(),
            employeeOtherMobileNumber: body.employeeOtherMobileNumber.trim(),
            presentAddress: body.presentAddress.trim(),
            homeAddress: body.homeAddress.trim(),
            adharCardNum: body.adharCardNum.trim(),
            category: body.category,
            designation: body.designation.trim(),
            salary: body.salary,
            maxLeave: body.maxLeave,
            accountHolderName: body.accountHolderName ? body.accountHolderName.trim() : null,
            accountNumber: body.accountNumber ? body.accountNumber.trim() : null,
            ifscCode: body.ifscCode ? body.ifscCode.trim() : null,
            bankName: body.bankName ? body.bankName.trim() : null,
            branchName: body.branchName ? body.branchName.trim() : null,
            employeeStatus: body.employeeStatus,
        };

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
    } catch (error) {
        if (error instanceof multer.MulterError) {
            // Multer error occurred (e.g., file size exceeded or invalid file type)
            return res.status(400).send('Error uploading file: ' + error.message);
        } else {
            console.error('An error occurred', error);
            res.status(500).json('Internal Server Error');
        }
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

const updateEmployeeDetails = (req, res) => {
    try {
        const { file, body } = req;
        console.log("file", file);
        if (!file || file.length === 0) {
            return res.status(400).send('Please Add Photo');
        }
        const employeeId = req.body.employeeId;
        // Validate required fields
        const requiredFields = ['employeeFirstName', 'employeeLastName', 'employeeGender', 'employeeNickName', 'employeeMobileNumber', 'presentAddress', 'homeAddress', 'adharCardNum', 'category', 'designation', 'salary', 'maxLeave', 'employeeStatus'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return res.status(400).send(`Please provide a value for ${field}`);
            }
        }
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
            const fileName = file.filename;
            const filePath = file.path
            const imgLink = '/staffrouter/getImagebyName?imageName=' + fileName;
            const data = {
                employeeFirstName: body.employeeFirstName.trim(),
                employeeLastName: body.employeeLastName.trim(),
                employeeGender: body.employeeGender.trim(),
                employeeNickName: body.employeeNickName.trim(),
                employeeMobileNumber: body.employeeMobileNumber.trim(),
                employeeOtherMobileNumber: body.employeeOtherMobileNumber.trim(),
                presentAddress: body.presentAddress.trim(),
                homeAddress: body.homeAddress.trim(),
                adharCardNum: body.adharCardNum.trim(),
                category: body.category,
                designation: body.designation.trim(),
                salary: body.salary,
                maxLeave: body.maxLeave,
                accountHolderName: body.accountHolderName ? body.accountHolderName.trim() : null,
                accountNumber: body.accountNumber ? body.accountNumber.trim() : null,
                ifscCode: body.ifscCode ? body.ifscCode.trim() : null,
                bankName: body.bankName ? body.bankName.trim() : null,
                branchName: body.branchName ? body.branchName.trim() : null,
                employeeStatus: body.employeeStatus,
            };


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
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}


module.exports = {
    addEmployeedetails,
    getImagebyName,
    removeEmployeeDetails,
    updateEmployeeDetails
}

