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

// Function to execute the SQL query for a given date and return the sum of numLeave
function getSumOfLeaveForDate(employeeId, date) {
    return new Promise((resolve, reject) => {
        sql_query = `SELECT COALESCE(SUM(numLeave),0) AS numLeave FROM staff_leave_data WHERE employeeId = '${employeeId}' AND leaveDate BETWEEN STR_TO_DATE('${date}','%d-%m-%Y') AND LAST_DAY(STR_TO_DATE('${date}','%d-%m-%Y'))`
        pool.query(
            sql_query,
            (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    const sumOfLeave = results.length > 0 ? results[0].numLeave : 0;
                    resolve(sumOfLeave);
                }
            }
        );
    });
}

// Function to iterate through the date array and get the sum of leave for each date
async function getSumOfLeaveForDates(employeeId, dateArray) {
    const sumOfLeaveArray = [];
    for (const date of dateArray) {
        const sumOfLeave = await getSumOfLeaveForDate(employeeId, date);
        sumOfLeaveArray.push(sumOfLeave);
    }
    return sumOfLeaveArray;
}

const calculateDueSalary = (employeeId) => {
    return new Promise((resolve, reject) => {
        try {
            const todayDate = new Date();
            const currentMonth = todayDate.getMonth() + 1;

            sql_query_getDateofJoining = `SELECT employeeJoiningDate, DAY(employeeJoiningDate) AS employeeJoiningDay,Month(salaryCalculationDate) AS salaryCalculationMonth, salary FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
            pool.query(sql_query_getDateofJoining, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Query", err);
                    reject('Database Error');
                }
                const joiningDate = data[0].employeeJoiningDate;
                const salaryCalculationMonth = data[0].salaryCalculationMonth;


                function getMonthsArrayBetweenDates(startDate, endDate) {
                    const monthsArray = [];
                    let currentDate = new Date(startDate);

                    // Adjust the start date to the first day of the month
                    currentDate.setDate(1);

                    while (currentDate < endDate) {
                        const day = String(currentDate.getDate()).padStart(2, '0');
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const year = currentDate.getFullYear();
                        const formattedDate = `${day}-${month}-${year}`;
                        monthsArray.push(formattedDate);
                        currentDate.setMonth(currentDate.getMonth() + 1); // Move to the next month
                    }

                    // Remove the last element from the array
                    monthsArray.pop();

                    return monthsArray;
                }

                const startDate = new Date(joiningDate);
                const endDate = new Date(todayDate);
                const monthsArray = getMonthsArrayBetweenDates(startDate, endDate);

                console.log('Month Array', monthsArray);

                // dateArray contains the array of dates in 'dd-mm-yyyy' format
                const dateArray = monthsArray;

                // Function to convert 'dd-mm-yyyy' date format to a Date object
                function getDateFromString(dateString) {
                    const [day, month, year] = dateString.split('-');
                    return new Date(`${year}-${month}-${day}`);
                }

                sql_query_getSalartdata = `SELECT salary, DATE_FORMAT(startDate,'%d-%m-%Y') AS startDate, DATE_FORMAT(endDate,'%d-%m-%Y') AS endDate FROM salary_history_data WHERE employeeId = '${employeeId}'`;
                pool.query(sql_query_getSalartdata, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Query", err);
                        reject('Database Error');
                    }
                    const actualSalaryData = data.map(item => ({
                        salary: item.salary,
                        startDate: item.startDate,
                        endDate: item.endDate
                    }));

                    console.log('actual Salary', actualSalaryData);
                    const salaryData = actualSalaryData
                    // Function to find the latest end date from the salary data
                    function findLatestEndDate() {
                        let latestEndDate = null;

                        for (const row of salaryData) {
                            const endDate = getDateFromString(row.endDate);

                            if (!latestEndDate || endDate > latestEndDate) {
                                latestEndDate = endDate;
                            }
                        }

                        return latestEndDate;
                    }

                    // Function to find the closest end date and corresponding salary for a given date
                    function findClosestEndDate(date) {
                        let closestEndDate = null;
                        let closestSalary = null;

                        for (const row of salaryData) {
                            const startDate = getDateFromString(row.startDate);
                            const endDate = getDateFromString(row.endDate);

                            if (startDate <= date && endDate >= date) {
                                closestEndDate = endDate;
                                closestSalary = row.salary;
                            }
                        }

                        return closestSalary;
                    }

                    // Array to store the corresponding salaries for each date
                    const salaryArray = dateArray.map((dateString) => {
                        const date = getDateFromString(dateString);
                        let salary = findClosestEndDate(date);

                        // If no salary is found, get the salary for the latest end date
                        if (!salary) {
                            const latestEndDate = findLatestEndDate(salaryData);
                            salary = findClosestEndDate(latestEndDate);
                        }

                        return salary;
                    });


                    sql_query_getLeaveData = `SELECT numberOfLeave AS numLeave, DATE_FORMAT(startDate,'%d-%m-%Y') AS startDate, DATE_FORMAT(endDate,'%d-%m-%Y') AS endDate FROM leave_history_data WHERE employeeId = '${employeeId}'`;
                    pool.query(sql_query_getLeaveData, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Query", err);
                            reject('Database Error');
                        }
                        const actualLeaveData = data.map(item => ({
                            numLeave: item.numLeave,
                            startDate: item.startDate,
                            endDate: item.endDate
                        }));

                        console.log('actual leave', actualLeaveData);
                        const leaveData = actualLeaveData
                        // Function to find the latest end date from the salary data
                        function findLatestEndDate() {
                            let latestEndDate = null;

                            for (const row of leaveData) {
                                const endDate = getDateFromString(row.endDate);

                                if (!latestEndDate || endDate > latestEndDate) {
                                    latestEndDate = endDate;
                                }
                            }

                            return latestEndDate;
                        }

                        // Function to find the closest end date and corresponding salary for a given date
                        function findClosestEndDate(date) {
                            let closestEndDate = null;
                            let closestLeave = null;

                            for (const row of leaveData) {
                                const startDate = getDateFromString(row.startDate);
                                const endDate = getDateFromString(row.endDate);

                                if (startDate <= date && endDate >= date) {
                                    closestEndDate = endDate;
                                    closestLeave = row.numLeave;
                                }
                            }

                            return closestLeave;
                        }

                        // Array to store the corresponding salaries for each date
                        const leaveArray = dateArray.map((dateString) => {
                            const date = getDateFromString(dateString);
                            let leave = findClosestEndDate(date);

                            // If no salary is found, get the salary for the latest end date
                            if (!leave) {
                                const latestEndDate = findLatestEndDate(leaveData);
                                leave = findClosestEndDate(latestEndDate);
                            }

                            return leave;
                        });

                        const perDaysalaryOfEmployee = salaryArray.map(salary => Math.floor(salary / 30));
                        console.log(perDaysalaryOfEmployee);
                        (async () => {
                            try {
                                const result = await getSumOfLeaveForDates(employeeId, dateArray);
                                console.log('....', result);


                                const takeLeave = getSumOfLeaveForDates(employeeId, dateArray);
                                const array1 = leaveArray;
                                const array2 = result;
                                function subtractArrays(arr1, arr2) {
                                    if (arr1.length !== arr2.length) {
                                        throw new Error('Arrays must have the same length for subtraction.');
                                    }

                                    return arr1.map((value, index) => value - arr2[index]);
                                }
                                const totalLeaveArray = subtractArrays(array1, array2);
                                console.log(totalLeaveArray); // Output: [5, 12]
                                console.log(perDaysalaryOfEmployee);
                                const multiplayArray = totalLeaveArray.map((value, index) => value * perDaysalaryOfEmployee[index])
                                const sumOfLeaveSalary = multiplayArray.reduce((accumulator, currentValue) => {
                                    return accumulator + currentValue;
                                }, 0);
                                const totalLeaveTaken = array2.reduce((accumulator, currentValue) => {
                                    return accumulator + currentValue;
                                }, 0);
                                const totalMaxLeave = leaveArray.reduce((accumulator, currentValue) => {
                                    return accumulator + currentValue;
                                }, 0);
                                console.log("jay", sumOfLeaveSalary, multiplayArray, totalLeaveTaken, totalMaxLeave)
                                sql_get_SAFPS = `SELECT
                                                    sed.employeeId,
                                                    CONCAT(sed.employeeFirstName,' ',sed.employeeLastName) AS employeeName,
                                                    sed.employeeNickName AS nickName,
                                                    sed.employeeStatus AS employeeStatus,
                                                    sed.imageLink AS imageLink,
                                                    sed.salary,
                                                    CONCAT(scd.staffCategoryName,' (',sed.designation,')') AS category,
                                                    COALESCE(totalSalary, 0) AS totalSalary,
                                                    COALESCE(sad.advaceAmount, 0) AS advaceAmount,
                                                    COALESCE(sfd.fineAmount, 0) AS fineAmount,
                                                    COALESCE(esd.totalPaidSalary, 0) AS totalPaidSalary,
                                                    COALESCE(eld.totalLeave, 0) AS totalLeave
                                                FROM
                                                    staff_employee_data AS sed
                                                    INNER JOIN staff_category_data AS scd
                                                ON
                                                    scd.staffCategoryId = sed.category
                                                LEFT JOIN(
                                                    SELECT
                                                        staff_advance_data.employeeId,
                                                        SUM(
                                                            staff_advance_data.remainAdvanceAmount
                                                        ) AS advaceAmount
                                                    FROM
                                                        staff_advance_data
                                                    WHERE
                                                        staff_advance_data.remainAdvanceAmount != 0
                                                    GROUP BY
                                                        staff_advance_data.employeeId
                                                ) AS sad
                                                ON
                                                    sed.employeeId = sad.employeeId
                                                LEFT JOIN(
                                                    SELECT
                                                        staff_fine_data.employeeId,
                                                        SUM(
                                                            staff_fine_data.remainFineAmount
                                                        ) AS fineAmount
                                                    FROM
                                                        staff_fine_data
                                                    WHERE
                                                        staff_fine_data.remainFineAmount != 0
                                                    GROUP BY
                                                        staff_fine_data.employeeId
                                                ) AS sfd
                                                ON
                                                    sed.employeeId = sfd.employeeId
                                                LEFT JOIN(
                                                    SELECT
                                                        staff_salary_data.employeeId,
                                                        SUM(staff_salary_data.salaryAmount) AS totalPaidSalary
                                                    FROM
                                                        staff_salary_data
                                                    WHERE
                                                        staff_salary_data.salaryDate BETWEEN(
                                                        SELECT
                                                            DATE_ADD(
                                                                DATE_FORMAT(employeeJoiningDate, '%Y-%m-01'),
                                                                INTERVAL 1 MONTH
                                                            )
                                                        FROM
                                                            staff_employee_data sed
                                                        WHERE
                                                            sed.employeeId = staff_salary_data.employeeId
                                                    ) AND CURDATE()
                                                GROUP BY
                                                    staff_salary_data.employeeId) AS esd
                                                ON
                                                    sed.employeeId = esd.employeeId
                                                LEFT JOIN(
                                                    SELECT
                                                        staff_leave_data.employeeId,
                                                        SUM(staff_leave_data.numLeave) AS totalLeave
                                                    FROM
                                                        staff_leave_data
                                                    WHERE
                                                        staff_leave_data.leaveDate BETWEEN(
                                                        SELECT
                                                            employeeJoiningDate
                                                        FROM
                                                            staff_employee_data sed
                                                        WHERE
                                                            sed.employeeId = staff_leave_data.employeeId
                                                    ) AND CURDATE()
                                                GROUP BY
                                                    staff_leave_data.employeeId) AS eld
                                                ON
                                                    sed.employeeId = eld.employeeId
                                                WHERE sed.employeeId = '${employeeId}'`
                                pool.query(sql_get_SAFPS, (err, data) => {
                                    if (err) {
                                        console.error("An error occurred in SQL Query", err);
                                        reject('Database Error');
                                    }
                                    const allSalaryData = {
                                        employeeId: data[0].employeeId,
                                        employeeName: data[0].employeeName,
                                        nickName: data[0].nickName,
                                        category: data[0].category,
                                        salary: data[0].salary,
                                        employeeStatus: data[0].employeeStatus,
                                        imageLink: data[0].imageLink,
                                        totalSalary: data[0].totalSalary,
                                        advanceAmount: data[0].advaceAmount,
                                        fineAmount: data[0].fineAmount,
                                        totalPaidSalary: data[0].totalPaidSalary,
                                        sumOfLeaveSalary: sumOfLeaveSalary,
                                        totalMaxLeave: totalMaxLeave,
                                        totalLeaveTaken: totalLeaveTaken,
                                        totalLeave: data[0].totalLeave,
                                        paymentDue: data[0].totalSalary - data[0].advaceAmount - data[0].fineAmount - data[0].totalPaidSalary + sumOfLeaveSalary
                                    }
                                    console.log('All Salary', allSalaryData);
                                    resolve(allSalaryData);
                                })
                            } catch (error) {
                                console.error('Error:', error);
                            }
                        })();
                    })
                })
            });
        } catch (error) {
            console.error('An error occurred', error);
            reject('Internal Server Error');
        }
    });
};

// Remain salary Calculation

const calculateTotalSalary = (employeeId) => {
    return new Promise((resolve, reject) => {
        try {
            const todayDate = new Date();
            const currentMonth = todayDate.getMonth() + 1;
            const salaryCalculationDate = new Date().toString().slice(4, 15)

            sql_query_getDateofJoining = `SELECT employeeJoiningDate, DAY(employeeJoiningDate) AS employeeJoiningDay,Month(salaryCalculationDate) AS salaryCalculationMonth, salary FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
            pool.query(sql_query_getDateofJoining, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Query", err);
                    reject('Database Error');
                }
                const joiningDate = data[0].employeeJoiningDate;
                const salaryCalculationMonth = data[0].salaryCalculationMonth;
                const employeeJoiningDay = data[0].employeeJoiningDay;
                const employeeSalary = data[0].salary;
                if (salaryCalculationMonth != currentMonth) {
                    if (employeeJoiningDay == '1') {

                        function getMonthsArrayBetweenDates(startDate, endDate) {
                            const monthsArray = [];
                            let currentDate = new Date(startDate);

                            // Adjust the start date to the first day of the month
                            currentDate.setDate(1);

                            while (currentDate < endDate) {
                                const day = String(currentDate.getDate()).padStart(2, '0');
                                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                const year = currentDate.getFullYear();
                                const formattedDate = `${day}-${month}-${year}`;
                                monthsArray.push(formattedDate);
                                currentDate.setMonth(currentDate.getMonth() + 1); // Move to the next month
                            }

                            // Remove the last element from the array
                            monthsArray.pop();

                            return monthsArray;
                        }

                        const startDate = new Date(joiningDate);
                        const endDate = new Date(todayDate);
                        const monthsArray = getMonthsArrayBetweenDates(startDate, endDate);

                        console.log(monthsArray);
                        // dateArray contains the array of dates in 'dd-mm-yyyy' format
                        const dateArray = monthsArray;

                        // Function to convert 'dd-mm-yyyy' date format to a Date object
                        function getDateFromString(dateString) {
                            const [day, month, year] = dateString.split('-');
                            return new Date(`${year}-${month}-${day}`);
                        }

                        sql_query_getSalartdata = `SELECT salary, DATE_FORMAT(startDate,'%d-%m-%Y') AS startDate, DATE_FORMAT(endDate,'%d-%m-%Y') AS endDate FROM salary_history_data WHERE employeeId = '${employeeId}'`;
                        pool.query(sql_query_getSalartdata, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            const actualSalaryData = data.map(item => ({
                                salary: item.salary,
                                startDate: item.startDate,
                                endDate: item.endDate
                            }));

                            console.log(actualSalaryData);
                            const salaryData = actualSalaryData
                            // Function to find the latest end date from the salary data
                            function findLatestEndDate() {
                                let latestEndDate = null;

                                for (const row of salaryData) {
                                    const endDate = getDateFromString(row.endDate);

                                    if (!latestEndDate || endDate > latestEndDate) {
                                        latestEndDate = endDate;
                                    }
                                }

                                return latestEndDate;
                            }

                            // Function to find the closest end date and corresponding salary for a given date
                            function findClosestEndDate(date) {
                                let closestEndDate = null;
                                let closestSalary = null;

                                for (const row of salaryData) {
                                    const startDate = getDateFromString(row.startDate);
                                    const endDate = getDateFromString(row.endDate);

                                    if (startDate <= date && endDate >= date) {
                                        closestEndDate = endDate;
                                        closestSalary = row.salary;
                                    }
                                }

                                return closestSalary;
                            }

                            // Array to store the corresponding salaries for each date
                            const salaryArray = dateArray.map((dateString) => {
                                const date = getDateFromString(dateString);
                                let salary = findClosestEndDate(date);

                                // If no salary is found, get the salary for the latest end date
                                if (!salary) {
                                    const latestEndDate = findLatestEndDate(salaryData);
                                    salary = findClosestEndDate(latestEndDate);
                                }

                                return salary;
                            });

                            console.log(salaryArray);
                            // Calculate the total salary using salaryArray
                            const totalSalary = salaryArray.reduce((accumulator, currentValue) => {
                                return accumulator + currentValue;
                            }, 0);

                            sql_update_remainSalary = `UPDATE
                                                    staff_employee_data
                                                SET
                                                   totalSalary = ${totalSalary},
                                                   salaryCalculationDate = STR_TO_DATE('${salaryCalculationDate}','%b %d %Y')
                                                WHERE
                                                   employeeId = '${employeeId}'`;
                            pool.query(sql_update_remainSalary, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                            })

                        })

                    } else {
                        function getLastDateOfMonth() {
                            // Get the current date
                            const currentDate = new Date(joiningDate);

                            // Get the first day of the next month
                            const firstDayOfNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

                            // Subtract 1 day (in milliseconds) to get the last day of the current month
                            const lastDayOfMonth = new Date(firstDayOfNextMonth.getTime() - 86400000);

                            // Extract day, month, and year from the last day of the month
                            const day = String(lastDayOfMonth.getDate()).padStart(2, '0');
                            const month = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
                            const year = lastDayOfMonth.getFullYear();

                            // Return the last date of the month in the format "dd-mm-yyyy"
                            return `${year}-${month}-${day}`;
                        }
                        const lastDate = getLastDateOfMonth();
                        console.log(`Last date of the current month: ${lastDate}`);
                        function getTotalDays(startDate, endDate) {
                            // Convert both dates to UTC to ensure accurate calculations regardless of time zones
                            const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                            const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

                            // Calculate the difference in milliseconds between the two dates
                            const timeDifference = endUTC - startUTC;

                            // Convert the time difference to days
                            const totalDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

                            return totalDays;
                        }

                        // Example usage:
                        const startDate = new Date(joiningDate); // Replace with the actual start date
                        const endDate = new Date(lastDate); // Replace with the actual end date

                        const totalDays = getTotalDays(startDate, endDate);


                        const perDaysalaryOfEmployee = employeeSalary / 30;
                        const remainDaySalaryOfEmployee = perDaysalaryOfEmployee * totalDays;
                        console.log(`Total days between the two dates: ${remainDaySalaryOfEmployee}`);
                        sql_update_remainSalary = `UPDATE
                                                    staff_employee_data
                                                SET
                                                   totalSalary = ${remainDaySalaryOfEmployee},
                                                   salaryCalculationDate = STR_TO_DATE('${salaryCalculationDate}','%b %d %Y')
                                                WHERE
                                                   employeeId = '${employeeId}'`;
                        pool.query(sql_update_remainSalary, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                        })
                    }
                }
            });
        } catch (error) {
            console.error('An error occurred', error);
            reject('Internal Server Error');
        }
    });
};


// Get Image Using API

const imageFolderPath = path.join(process.env.EMPLOYEE_PHOTO_PATH);

// Define a route to handle image retrieval
const getImagebyName = (req, res) => {
    try {
        const imageName = req.query.imageName;
        const imagePath = path.join(imageFolderPath, imageName);
        fs.readFile(imagePath, (err, data) => {
            if (err) {
                console.error("Error reading image file:", err);
                res.status(500).send("Error reading image file");
                return;
            }

            // Set response headers for the image
            res.setHeader("Content-Type", "image/jpeg");
            res.setHeader("Content-Length", data.length);

            // Send the image data in the response body
            res.end(data);
        })
        // Send the image as a response
        // res.sendFile(imagePath, (err) => {
        //     if (err) {
        //         console.error('Error sending image:', err);
        //         res.status(404).send('Image not found');
        //     }
        // });
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
            const filePath = files[0].filename;
            const imgLink = 'staffrouter/getImagebyName?imageName=' + fileName;
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
                joiningDate: new Date(req.body.joiningDate ? req.body.joiningDate : "10/10/1001").toString().slice(4, 15),
                accountHolderName: req.body.accountHolderName ? req.body.accountHolderName.trim() : null,
                accountNumber: req.body.accountNumber ? req.body.accountNumber.trim() : null,
                ifscCode: req.body.ifscCode ? req.body.ifscCode.trim() : null,
                bankName: req.body.bankName ? req.body.bankName.trim() : null,
                branchName: req.body.branchName ? req.body.branchName.trim() : null,
                employeeStatus: req.body.employeeStatus,
            };
            function getFirstDayOfJoining(joiningDate) {
                const firstDay = new Date(joiningDate);
                firstDay.setDate(1);
                return firstDay;
            }

            const joiningDate = new Date(req.body.joiningDate);
            const firstDayOfJoining = getFirstDayOfJoining(joiningDate);
            const startEndDate = new Date(firstDayOfJoining).toString().slice(4, 15);

            if (!data.employeeFirstName || !data.employeeLastName || !data.employeeGender || !data.employeeNickName ||
                !data.employeeMobileNumber || !data.employeeOtherMobileNumber || !data.presentAddress ||
                !data.homeAddress || !data.adharCardNum || !data.category || !data.designation ||
                !data.salary || !data.maxLeave || !data.joiningDate || !data.employeeStatus) {
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
                                                                                presentAddress,
                                                                                homeAddress,
                                                                                adharCardNum,
                                                                                category,
                                                                                designation,
                                                                                salary,
                                                                                maxLeave,
                                                                                employeeJoiningDate,
                                                                                employeeLastPaymentDate,
                                                                                totalSalary,
                                                                                salaryCalculationDate,
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
                                                                                STR_TO_DATE('${data.joiningDate}','%b %d %Y'),
                                                                                STR_TO_DATE('${data.joiningDate}','%b %d %Y'),
                                                                                0,
                                                                                STR_TO_DATE('${data.joiningDate}','%b %d %Y'),
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
                    sql_query_addSalaryhistory = `INSERT INTO salary_history_data(
                                                                                    employeeId,
                                                                                    salary,
                                                                                    startDate,
                                                                                    endDate
                                                                                )
                                                                                VALUES(
                                                                                    '${employeeId}',
                                                                                    ${data.salary},
                                                                                    STR_TO_DATE('${startEndDate}','%b %d %Y'),
                                                                                    STR_TO_DATE('${startEndDate}','%b %d %Y')
                                                                                )`;
                    pool.query(sql_query_addSalaryhistory, (err, result) => {
                        if (err) {
                            console.error('An error occurred in SQL Query', err);
                            return res.status(500).send('Database Error');
                        }
                        console.log('><><>', data.maxLeave);
                        sql_query_addSalaryhistory = `INSERT INTO leave_history_data(
                                                                                    employeeId,
                                                                                    numberOfLeave,
                                                                                    startDate,
                                                                                    endDate
                                                                                )
                                                                                VALUES(
                                                                                    '${employeeId}',
                                                                                    ${data.maxLeave},
                                                                                    STR_TO_DATE('${startEndDate}','%b %d %Y'),
                                                                                    STR_TO_DATE('${startEndDate}','%b %d %Y')
                                                                                )`;
                        pool.query(sql_query_addSalaryhistory, (err, data) => {
                            if (err) {
                                console.error('An error occurred in SQL Query', err);
                                return res.status(500).send('Database Error');
                            }
                            console.log('Data inserted successfully');
                            res.status(200).send('Data uploaded successfully');
                        })
                    })
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
                                employeeId,
                                employeeFirstName,
                                employeeLastName,
                                employeeGender,
                                employeeNickName,
                                employeeMobileNumber,
                                employeeOtherMobileNumber,
                                presentAddress,
                                homeAddress,
                                adharCardNum,
                                category,
                                designation,
                                salary,
                                maxLeave,
                                employeeJoiningDate AS joiningDate,
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
            const employeeId = req.body.employeeId;
            sql_query_getOldFilePath = `SELECT employeeId, imageFilePath FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
            pool.query(sql_query_getOldFilePath, (err, path) => {
                if (err) {
                    console.error('An error occurred in SQL Query', err);
                    return res.status(500).send('Database Error');
                }
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
                    previousSalary: req.body.previousSalary,
                    maxLeave: req.body.maxLeave,
                    previousMaxLeave: req.body.previousMaxLeave,
                    joiningDate: new Date(req.body.joiningDate ? req.body.joiningDate : "10/10/1001").toString().slice(4, 15),
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
                if (files.length > 0) {
                    try {
                        const imgFilePath = path[0].imageFilePath;
                        const fpath = process.env.EMPLOYEE_PHOTO_PATH + '/' + imgFilePath;
                        const fileName = files[0].filename;
                        const filePath = files[0].filename;
                        const imgLink = 'staffrouter/getImagebyName?imageName=' + fileName;
                        // Remove the original uploaded image after editing (optional)
                        fs.unlink(fpath, (err) => {
                            if (err) {
                                console.error('Error deleting file:', err);
                            } else {
                                console.log('File deleted successfully');
                            }
                        });

                        // Save the edited image URL to the database
                        sql_query_updatePhoto = `UPDATE
                                                    staff_employee_data
                                                SET
                                                    imageFilePath ='${filePath}',
                                                    imageLink = '${imgLink}'
                                                WHERE
                                                    employeeId = '${employeeId}'`
                        pool.query(sql_query_updatePhoto, (err, result) => {
                            if (err) {
                                console.error('Error updating image in the database:', err);
                                return res.status(500).send('Image editing failed');
                            }
                            console.log('Image URL updated in the database');
                        });
                    } catch (err) {
                        console.error('Error editing image:', err);
                        return res.status(500).send('Image editing failed');
                    }
                }
                function getFirstDayOfJoining(joiningDate) {
                    const firstDay = new Date(joiningDate);
                    firstDay.setDate(1);
                    return firstDay;
                }

                const joiningDate = new Date();
                const firstDayOfJoining = getFirstDayOfJoining(joiningDate);
                const startEndDate = new Date(firstDayOfJoining).toString().slice(4, 15);

                // Insert data into the database
                const sql_query_updateEmployeeData = ` UPDATE
                                                    staff_employee_data
                                                SET
                                                    employeeFirstName = '${data.employeeFirstName}',
                                                    employeeLastName = '${data.employeeLastName}',
                                                    employeeGender ='${data.employeeGender}',
                                                    employeeNickName ='${data.employeeNickName}',
                                                    employeeMobileNumber ='${data.employeeMobileNumber}',
                                                    employeeOtherMobileNumber = ${data.employeeOtherMobileNumber ? `'${data.employeeOtherMobileNumber}'` : null},
                                                    presentAddress = '${data.presentAddress}',
                                                    homeAddress = '${data.homeAddress}',
                                                    adharCardNum = '${data.adharCardNum}',
                                                    category = '${data.category}',
                                                    designation ='${data.designation}',
                                                    salary = ${data.salary},
                                                    maxLeave = ${data.maxLeave},
                                                    employeeJoiningDate = STR_TO_DATE('${data.joiningDate}','%b %d %Y'),
                                                    employeeLastPaymentDate = STR_TO_DATE('${data.joiningDate}','%b %d %Y'),
                                                    accountHolderName = ${data.accountHolderName ? `'${data.accountHolderName}'` : null},
                                                    accountNumber = ${data.accountNumber ? `'${data.accountNumber}'` : null},
                                                    ifscCode = ${data.ifscCode ? `'${data.ifscCode}'` : null},
                                                    bankName = ${data.bankName ? `'${data.bankName}'` : null},
                                                    branchName = ${data.branchName ? `'${data.branchName}'` : null},
                                                    employeeStatus = ${data.employeeStatus}
                                                WHERE
                                                    employeeId = '${employeeId}'`;
                pool.query(sql_query_updateEmployeeData, (err, result) => {
                    if (err) {
                        console.error('An error occurred in SQL Query', err);
                        return res.status(500).send('Database Error');
                    }
                    if (req.body.salary != req.body.previousSalary && req.body.previousSalary) {
                        sql_query_addUpdateHistory = `UPDATE
                                                        salary_history_data
                                                      SET
                                                        endDate = STR_TO_DATE('${startEndDate}','%b %d %Y')
                                                        WHERE employeeId = '${employeeId}' AND historyCreationDate = (SELECT MAX(historyCreationDate) FROM salary_history_data WHERE employeeId = '${employeeId}');
                                                    INSERT INTO salary_history_data(
                                                                                    employeeId,
                                                                                    salary,
                                                                                    startDate,
                                                                                    endDate
                                                                                )
                                                                                VALUES(
                                                                                    '${employeeId}',
                                                                                    ${data.salary},
                                                                                    STR_TO_DATE('${startEndDate}','%b %d %Y'),
                                                                                    STR_TO_DATE('${startEndDate}','%b %d %Y')
                                                                                )`;
                        pool.query(sql_query_addUpdateHistory, (err, data) => {
                            if (err) {
                                console.error('An error occurred in SQL Query', err);
                                return res.status(500).send('Database Error');
                            }
                            console.log('Data inserted successfully');
                            res.status(200).send('Data Updated successfully');
                        })
                    }
                    if (req.body.maxLeave != req.body.previousMaxLeave && req.body.previousMaxLeave) {
                        sql_query_addUpdateHistory = `UPDATE
                                                        leave_history_data
                                                      SET
                                                        endDate = STR_TO_DATE('${startEndDate}','%b %d %Y')
                                                        WHERE employeeId = '${employeeId}' AND creationDate = (SELECT MAX(creationDate) FROM leave_history_data WHERE employeeId = '${employeeId}');
                                                    INSERT INTO leave_history_data(
                                                                                    employeeId,
                                                                                    numberOfLeave,
                                                                                    startDate,
                                                                                    endDate
                                                                                )
                                                                                VALUES(
                                                                                    '${employeeId}',
                                                                                    ${data.maxLeave},
                                                                                    STR_TO_DATE('${startEndDate}','%b %d %Y'),
                                                                                    STR_TO_DATE('${startEndDate}','%b %d %Y')
                                                                                )`;
                        pool.query(sql_query_addUpdateHistory, (err, data) => {
                            if (err) {
                                console.error('An error occurred in SQL Query', err);
                                return res.status(500).send('Database Error');
                            }
                            console.log('Data inserted successfully');
                            res.status(200).send('Data Updated successfully');
                        })
                    }
                    else {
                        console.log('Data inserted successfully');
                        res.status(200).send('Data Updated successfully');
                    }
                });
            })
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getEmployeeData = (req, res) => {
    try {
        const categoryId = req.query.categoryId
        if (req.query.categoryId) {
            sql_query_getEmployee = `SELECT employeeId FROM staff_employee_data
                                     WHERE staff_employee_data.category = '${categoryId}'`;
        } else {
            sql_query_getEmployee = `SELECT employeeId FROM staff_employee_data`;
        }
        if (!req.query.categoryId) {
            sql_query_getEmployeeIds = `SELECT employeeId FROM staff_employee_data WHERE employeeStatus = 1`;
            pool.query(sql_query_getEmployeeIds, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const employeeIdsArray = data.map(item => item.employeeId);
                console.log('><><', employeeIdsArray);
                // calculateTotalSalary(employeeId)
                Promise.all(
                    employeeIdsArray.map(employeeId => calculateTotalSalary(employeeId))
                )
                    .then((totalSalary) => {
                        console.log("Total Salary:", totalSalary);
                        // Handle the totalSalary as needed
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                        // Handle errors appropriately
                    });
            })
        }
        pool.query(sql_query_getEmployee, (err, data) => {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }
            const employeeIdsArray = data.map(item => item.employeeId);
            console.log('><><', employeeIdsArray);
            // calculateTotalSalary(employeeId)
            Promise.all(
                employeeIdsArray.map(employeeId => calculateDueSalary(employeeId))
            )
                .then((allSalaryData) => {
                    console.log("Vikalp Chavda:", allSalaryData);
                    return res.status(200).send(allSalaryData);
                })
                .catch((error) => {
                    console.error("Error:", error);
                    res.status(500).send('Internal Server Error');
                    // The code inside this block is executed when the Promise is rejected with an error
                });
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Employee Active Or Inactive API

const updateEmployeeStatus = (req, res) => {
    try {
        const status = req.query.status;
        const employeeId = req.query.employeeId;
        const currentDate = new Date();

        // Set the day of the month to 1 to get the first day of the current month
        currentDate.setDate(1);

        // Get the year, month, and day from the currentDate
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');

        // Create the first day of the current month in 'YYYY-MM-DD' format
        const firstDayOfMonth = `${year}-${month}-${day}`;
        sql_querry_getJoinIngDate = `SELECT DATE_FORMAT(employeeJoiningDate,'%Y-%m-%d') AS employeeJoiningDate FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
        pool.query(sql_querry_getJoinIngDate, (err, data) => {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }
            const employeeJoiningDate = data[0].employeeJoiningDate;
            console.log('JoinIng Date : ', employeeJoiningDate);
            console.log('Current Date : ', `${year}-${month}-${day}`);
            const currentDateString = `${year}-${month}-${day}`;

            if (status == true) {
                sql_query_updateStatus = `UPDATE
                                                staff_employee_data
                                            SET

                                                employeeJoiningDate = CURDATE(),
                                                employeeStatus = true
                                            WHERE
                                                employeeId = '${employeeId}'`;
                pool.query(sql_query_updateStatus, (err, data) => {
                    if (err) {
                        console.error('An error occurred in SQL Query', err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send('Status is ' + status == true ? 'Activeted' : 'In-Activeted');
                })
            } else {
                sql_query_updateStatus = `UPDATE
                                                staff_employee_data
                                            SET
                                                employeeStatus = false
                                            WHERE
                                                employeeId = '${employeeId}'`;
                // Compare the dates (ignoring the time component)
                if (employeeJoiningDate == currentDateString) {
                    pool.query(sql_query_updateStatus, (err, data) => {
                        if (err) {
                            console.error('An error occurred in SQL Query', err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send('Status is ' + status == true ? 'Activeted' : 'In-Activeted');
                    })
                } else {
                    return res.status(200).send('You can not In-acftivate, Payment Is Pending');
                }
            }
            res.send('ok');
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
    fillEmployeeDetails,
    getEmployeeData,
    calculateDueSalary,
    updateEmployeeStatus
}