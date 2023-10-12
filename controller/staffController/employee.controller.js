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
                const date = new Date(joiningDate);

                // Extract the day, month, and year from the Date object
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();

                // Create the formatted date string in 'dd-mm-yyyy' format
                const formattedJoiningDate = `${day}-${month}-${year}`;

                console.log(formattedJoiningDate); // Output: '02-05-2023'
                // if (salaryCalculationMonth != currentMonth) {
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
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const actualSalaryData = data.map(item => ({
                            salary: item.salary,
                            startDate: item.startDate,
                            endDate: item.endDate
                        }));

                        // console.log('actual Salary', actualSalaryData);
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
                                console.error("An error occurd in SQL Queery", err);
                                return;
                            }
                            const actualLeaveData = data.map(item => ({
                                numLeave: item.numLeave,
                                startDate: item.startDate,
                                endDate: item.endDate
                            }));

                            // console.log('actual leave', actualLeaveData);
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
                            console.log('salary Array', salaryArray);

                            // Function to get the last day of a month for a given date as an integer
                            const getLastDayOfMonth = (dateStr) => {
                                const [day, month, year] = dateStr.split('-').map(Number);
                                const lastDay = new Date(year, month, 0).getDate();
                                return lastDay;
                            };

                            // Map the dates to their last days of the month as integers
                            const lastDaysOfMonths = monthsArray.map(getLastDayOfMonth);

                            console.log('mane joy ee', lastDaysOfMonths);


                            const perDaysalaryOfEmployee = salaryArray.map((salary, index) => Math.floor(salary / lastDaysOfMonths[index]));
                            console.log('per day salary', perDaysalaryOfEmployee);
                            (async () => {
                                try {
                                    const result = await getSumOfLeaveForDates(employeeId, dateArray);
                                    // console.log('....', result);


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
                                    console.log('max leave array', leaveArray);
                                    console.log('take leave array', result);
                                    console.log('leave array', totalLeaveArray); // Output: [5, 12]

                                    sql_querry_getRemainMaxLeave = `SELECT remainLeave FROM staff_monthlySalary_data WHERE employeeId = '${employeeId}' ORDER BY msEndDate DESC LIMIT 1`;
                                    pool.query(sql_querry_getRemainMaxLeave, (err, results) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return;
                                        }

                                        const remainLeaveDb = results.length > 0 ? results[0].remainLeave : 0;
                                        let monthlySalary = []

                                        var index = 0;
                                        for (const data of salaryArray) {
                                            let salaryData = {
                                                employeeId: employeeId,
                                                totalSalary: '',
                                                maxLeave: '',
                                                remainLeave: '',
                                                msDate: ''
                                            }
                                            if (index == 0) {
                                                salaryData.maxLeave = remainLeaveDb + leaveArray[index]
                                                console.log('????', remainLeaveDb, leaveArray[index], index)
                                                salaryData.remainLeave = salaryData.maxLeave - result[index]
                                                console.log(';;;', salaryData.maxLeave, result[index], salaryData.maxLeave - result[index])
                                                if (salaryData.remainLeave >= 0) {
                                                    salaryData.totalSalary = data
                                                } else {
                                                    salaryData.totalSalary = data + (salaryData.remainLeave * perDaysalaryOfEmployee[index])
                                                    salaryData.remainLeave = 0
                                                }
                                                salaryData.msDate = monthsArray[index]
                                                monthlySalary.push(salaryData)
                                            } else {
                                                salaryData.maxLeave = monthlySalary[index - 1].remainLeave + leaveArray[index]
                                                salaryData.remainLeave = salaryData.maxLeave - result[index]
                                                if (salaryData.remainLeave >= 0) {
                                                    salaryData.totalSalary = data
                                                } else {
                                                    salaryData.totalSalary = data + (salaryData.remainLeave * perDaysalaryOfEmployee[index])
                                                    salaryData.remainLeave = 0
                                                }
                                                salaryData.msDate = monthsArray[index]
                                                monthlySalary.push(salaryData)
                                            }
                                            index++;
                                        }
                                        console.log('arrayss', monthlySalary);

                                        monthlySalary.forEach((item) => {
                                            const query = `INSERT INTO staff_monthlySalary_data (employeeId, totalSalary, remainSalary, maxLeave, remainLeave, msStartDate, msEndDate)
                                                            VALUES ('${item.employeeId}', ROUND(${item.totalSalary}), ROUND(${item.totalSalary}) ,${item.maxLeave}, ${item.remainLeave}, STR_TO_DATE('${item.msDate}', '%d-%m-%Y'),LAST_DAY(STR_TO_DATE('${item.msDate}','%d-%m-%Y')))`;

                                            pool.query(query, (err, result) => {
                                                if (err) {
                                                    console.error('Error inserting data:', err);
                                                    return;
                                                }
                                                console.log('Data inserted:', result);
                                            });
                                        });
                                    })
                                    sql_update_remainSalary = `UPDATE
                                                    staff_employee_data
                                                SET
                                                    employeeJoiningDate = DATE_FORMAT(NOW(), '%Y-%m-01'),
                                                    salaryCalculationDate = STR_TO_DATE('${salaryCalculationDate}','%b %d %Y')
                                                WHERE
                                                   employeeId = '${employeeId}'`;
                                    pool.query(sql_update_remainSalary, (err, data) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
                                        var allSalaryDataCalculation = 'All Salary Calculation Is Done';
                                        resolve(allSalaryDataCalculation);
                                    })
                                } catch (error) {
                                    console.error('Error:', error);
                                }
                            })();
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
                    console.log(`Last date of the current month AA JOVI: ${lastDate}`);
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
                    const joinDate = new Date(joiningDate); // Replace with the actual start date
                    const monthendDate = new Date(lastDate); // Replace with the actual end date

                    const totalDays = getTotalDays(joinDate, monthendDate) + 1;
                    var lastMonthEndDay = monthendDate.getDate();
                    console.log(lastMonthEndDay);

                    const perDaysalaryOfEmployee = Math.floor(employeeSalary / lastMonthEndDay);
                    const remainDaySalaryOfEmployee = perDaysalaryOfEmployee * totalDays;
                    console.log(`Total Days: ${totalDays}`);
                    console.log(`Total days between the two dates: ${remainDaySalaryOfEmployee}`);

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
                        monthsArray.splice(0, 1, formattedJoiningDate);

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
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const actualSalaryData = data.map(item => ({
                            salary: item.salary,
                            startDate: item.startDate,
                            endDate: item.endDate
                        }));

                        // console.log('actual Salary', actualSalaryData);
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

                        salaryArray.splice(0, 1, remainDaySalaryOfEmployee);
                        sql_query_getLeaveData = `SELECT numberOfLeave AS numLeave, DATE_FORMAT(startDate,'%d-%m-%Y') AS startDate, DATE_FORMAT(endDate,'%d-%m-%Y') AS endDate FROM leave_history_data WHERE employeeId = '${employeeId}'`;
                        pool.query(sql_query_getLeaveData, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return;
                            }
                            const actualLeaveData = data.map(item => ({
                                numLeave: item.numLeave,
                                startDate: item.startDate,
                                endDate: item.endDate
                            }));

                            // console.log('actual leave', actualLeaveData);
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
                            const leaveArray = dateArray.map((dateString, index) => {
                                const date = getDateFromString(dateString);
                                let leave = findClosestEndDate(date);

                                // If no salary is found, get the salary for the latest end date
                                if (!leave) {
                                    const latestEndDate = findLatestEndDate(leaveData);
                                    leave = findClosestEndDate(latestEndDate);
                                }

                                if (index === 0) {
                                    leave = 0;
                                }
                                return leave;
                            });
                            console.log('salary Array', salaryArray);

                            const getLastDayOfMonth = (dateStr) => {
                                const [day, month, year] = dateStr.split('-').map(Number);
                                const lastDay = new Date(year, month, 0).getDate();
                                return lastDay;
                            };

                            // Map the dates to their last days of the month as integers
                            const lastDaysOfMonths = monthsArray.map(getLastDayOfMonth);

                            console.log('mane joy ee', lastDaysOfMonths);


                            const perDaysalaryOfEmployee = salaryArray.map((salary, index) => Math.floor(salary / lastDaysOfMonths[index]));
                            console.log('per day salary', perDaysalaryOfEmployee);

                            (async () => {
                                try {
                                    const result = await getSumOfLeaveForDates(employeeId, dateArray);
                                    // console.log('....', result);

                                    // const takeLeave = getSumOfLeaveForDates(employeeId, dateArray);

                                    console.log('leave array', leaveArray, result);

                                    sql_querry_getRemainMaxLeave = `SELECT remainLeave FROM staff_monthlySalary_data WHERE employeeId = '${employeeId}' ORDER BY msEndDate DESC LIMIT 1`;
                                    pool.query(sql_querry_getRemainMaxLeave, (err, results) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return;
                                        }

                                        const remainLeaveDb = results.length > 0 ? results[0].remainLeave : 0;
                                        let monthlySalary = []

                                        var index = 0;
                                        for (const data of salaryArray) {
                                            let salaryData = {
                                                employeeId: employeeId,
                                                totalSalary: '',
                                                maxLeave: '',
                                                remainLeave: '',
                                                msDate: ''
                                            }
                                            if (index == 0) {
                                                salaryData.maxLeave = remainLeaveDb + leaveArray[index]
                                                console.log('????', remainLeaveDb, leaveArray[index], index)
                                                salaryData.remainLeave = salaryData.maxLeave - result[index]
                                                console.log(';;;', salaryData.maxLeave, result[index], salaryData.maxLeave - result[index])
                                                if (salaryData.remainLeave >= 0) {
                                                    salaryData.totalSalary = data
                                                } else {
                                                    salaryData.totalSalary = data + (salaryData.remainLeave * perDaysalaryOfEmployee[index])
                                                    salaryData.remainLeave = 0
                                                }
                                                salaryData.msDate = monthsArray[index]
                                                monthlySalary.push(salaryData)
                                            } else {
                                                salaryData.maxLeave = monthlySalary[index - 1].remainLeave + leaveArray[index]
                                                salaryData.remainLeave = salaryData.maxLeave - result[index]
                                                if (salaryData.remainLeave >= 0) {
                                                    salaryData.totalSalary = data
                                                } else {
                                                    salaryData.totalSalary = data + (salaryData.remainLeave * perDaysalaryOfEmployee[index])
                                                    salaryData.remainLeave = 0
                                                }
                                                salaryData.msDate = monthsArray[index]
                                                monthlySalary.push(salaryData)
                                            }
                                            index++;
                                        }
                                        console.log('arrayss', monthlySalary);

                                        monthlySalary.forEach((item) => {
                                            const query = `INSERT INTO staff_monthlySalary_data (employeeId, totalSalary, remainSalary, maxLeave, remainLeave, msStartDate, msEndDate)
                                                            VALUES ('${item.employeeId}', ROUND(${item.totalSalary}), ROUND(${item.totalSalary}) ,${item.maxLeave}, ${item.remainLeave}, STR_TO_DATE('${item.msDate}', '%d-%m-%Y'),LAST_DAY(STR_TO_DATE('${item.msDate}','%d-%m-%Y')))`;

                                            pool.query(query, (err, result) => {
                                                if (err) {
                                                    console.error('Error inserting data:', err);
                                                    return;
                                                }
                                                console.log('Data inserted:', result);
                                            });
                                        });
                                    })
                                    sql_update_remainSalary = `UPDATE
                                                    staff_employee_data
                                                SET
                                                    employeeJoiningDate = DATE_FORMAT(NOW(), '%Y-%m-01'),
                                                   salaryCalculationDate = STR_TO_DATE('${salaryCalculationDate}','%b %d %Y')
                                                WHERE
                                                   employeeId = '${employeeId}'`;
                                    pool.query(sql_update_remainSalary, (err, data) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
                                        const allSalaryDataCalculation = 'All Salary Calculation Is Done';
                                        resolve(allSalaryDataCalculation);
                                    })
                                } catch (error) {
                                    console.error('Error:', error);
                                }
                            })();
                        })
                    })
                }
                // }
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
                !data.employeeMobileNumber || !data.presentAddress ||
                !data.homeAddress || !data.category || !data.designation ||
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
                                                                                employeeStaticJoiningDate,
                                                                                employeeJoiningDate,
                                                                                employeeLastPaymentDate,
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
                                                                                ${data.adharCardNum ? `'${data.adharCardNum}'` : null},
                                                                                '${data.category}',
                                                                                '${data.designation}',
                                                                                ${data.salary},
                                                                                ${data.maxLeave},
                                                                                STR_TO_DATE('${data.joiningDate}','%b %d %Y'),
                                                                                STR_TO_DATE('${data.joiningDate}','%b %d %Y'),
                                                                                STR_TO_DATE('${data.joiningDate}','%b %d %Y'),
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
                const fpath = process.env.EMPLOYEE_PHOTO_PATH + '/' + imgFilePath;
                fs.unlink(fpath, (err) => {
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
                    !data.employeeMobileNumber || !data.presentAddress ||
                    !data.homeAddress || !data.category || !data.designation ||
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
                                                    adharCardNum = ${data.adharCardNum ? `'${data.adharCardNum}'` : null},
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
                        sql_query_addUpdateHistory = `DELETE FROM salary_history_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(startDate, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m');
                                                    UPDATE
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
                        })
                    }
                    if (req.body.maxLeave != req.body.previousMaxLeave && req.body.previousMaxLeave) {
                        sql_query_addUpdateHistory = `DELETE FROM leave_history_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(startDate, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m');
                                                    UPDATE
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
        const categoryId = req.query.categoryId;
        const employeeStatus = req.query.employeeStatus ? req.query.employeeStatus : 1;
        console.log(employeeStatus);
        sql_common_query = `SELECT
                                sed.employeeId,
                                CONCAT(
                                    sed.employeeFirstName,
                                    ' ',
                                    sed.employeeLastName
                                ) AS employeeName,
                                sed.employeeNickName AS nickName,
                                sed.employeeStatus AS employeeStatus,
                                sed.salary AS salary,
                                FLOOR(sed.salary / DAY(LAST_DAY(CURRENT_DATE))) AS perDaySalary,
                                sed.imageLink AS imageLink,
                                COALESCE(
                                    CONCAT(
                                        DATE_FORMAT(smsddate.startDate, '%d-%b-%Y'),
                                        ' - ',
                                        DATE_FORMAT(smsddate.endDate, '%d-%b-%Y')
                                    ),
                                    'No Payment Remaining'
                                ) AS dateOfPayment,
                                CONCAT(
                                    scd.staffCategoryName,
                                    ' (',
                                    sed.designation,
                                    ')'
                                ) AS category,
                                IF(employeeStatus = 1, TRUE, FALSE) AS employeeStatus,
                                sed.maxLeave AS maxLeave,
                                COALESCE(
                                    (
                                        COALESCE(
                                            (
                                            SELECT
                                                staff_monthlySalary_data.remainLeave
                                            FROM
                                                staff_monthlySalary_data
                                            WHERE
                                                employeeId = sed.employeeId
                                            ORDER BY
                                                staff_monthlySalary_data.msStartDate
                                            DESC
                                        LIMIT 1
                                        ),
                                        0
                                        ) + sed.maxLeave
                                    ),
                                    0
                                ) - COALESCE(
                                    (
                                    SELECT
                                        SUM(staff_leave_data.numLeave)
                                    FROM
                                        staff_leave_data
                                    WHERE
                                        employeeId = sed.employeeId AND staff_leave_data.leaveDate BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE())),
                                        0) AS availableLeave,
                                        COALESCE(smsd.remainSalary, 0) AS totalSalary,
                                        COALESCE(sad.advaceAmount, 0) AS advanceAmount,
                                        COALESCE(sfd.fineAmount, 0) AS fineAmount,
                                        COALESCE(esd.totalPaidSalary, 0) AS totalPaidSalary,
                                        COALESCE(smsd.remainSalary, 0) - COALESCE(sad.advaceAmount, 0) - COALESCE(sfd.fineAmount, 0) AS paymentDue
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
                                        staff_fine_data.remainFineAmount != 0 AND staff_fine_data.fineStatus = 1
                                    GROUP BY
                                        staff_fine_data.employeeId
                                ) AS sfd
                            ON
                                sed.employeeId = sfd.employeeId
                            LEFT JOIN(
                                SELECT
                                    staff_salary_data.employeeId,
                                    SUM(staff_salary_data.salaryAmount) totalPaidSalary
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
                                    staff_monthlySalary_data.employeeId,
                                    SUM(
                                        staff_monthlySalary_data.remainSalary
                                    ) AS remainSalary
                                FROM
                                    staff_monthlySalary_data
                                WHERE
                                    staff_monthlySalary_data.remainSalary != 0
                                GROUP BY
                                    staff_monthlySalary_data.employeeId
                            ) AS smsd
                            ON
                                sed.employeeId = smsd.employeeId
                            LEFT JOIN(
                                SELECT
                                    staff_monthlySalary_data.employeeId,
                                    MIN(
                                        staff_monthlySalary_data.msStartDate
                                    ) AS startDate,
                                    MAX(
                                        staff_monthlySalary_data.msEndDate
                                    ) AS endDate
                                FROM
                                    staff_monthlySalary_data
                                WHERE
                                    staff_monthlySalary_data.remainSalary != 0
                                GROUP BY
                                    staff_monthlySalary_data.employeeId
                            ) AS smsddate
                            ON
                                sed.employeeId = smsddate.employeeId`;
        if (req.query.categoryId) {
            sql_query_getEmployee = `${sql_common_query}
                                     WHERE sed.category = '${categoryId}' AND sed.employeeStatus = 1
                                     ORDER BY sed.employeeFirstName`;
        } else {
            sql_query_getEmployee = `${sql_common_query}
                                     WHERE sed.employeeStatus = ${employeeStatus}
                                     ORDER BY sed.employeeFirstName`;
        }
        if (!req.query.categoryId) {
            sql_query_getEmployeeIds = `SELECT employeeId FROM staff_employee_data WHERE employeeStatus = 1 AND DATE_FORMAT(CURDATE(),'%Y-%m') != DATE_FORMAT(salaryCalculationDate,'%Y-%m')`;
            pool.query(sql_query_getEmployeeIds, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                // const employeeIdsArray = data.map(item => item.employeeId);
                // console.log('><><', employeeIdsArray);
                const employeeIdsArray = data.map(item => item.employeeId);
                console.log('><><', employeeIdsArray);
                // calculateTotalSalary(employeeId)
                if (employeeIdsArray) {
                    Promise.all(
                        employeeIdsArray.map(employeeId => calculateDueSalary(employeeId))
                    ).then((allSalaryData) => {
                        console.log("?////?", allSalaryData);
                        pool.query(sql_query_getEmployee, (err, data) => {
                            console.log('???');
                            if (err) {
                                console.error('An error occurred in SQL Query', err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send(data);
                        })
                    })
                        .catch((error) => {
                            console.error("Error:", error);
                            res.status(500).send('Internal Server Error');
                            // The code inside this block is executed when the Promise is rejected with an error
                        });
                } else {
                    pool.query(sql_query_getEmployee, (err, data) => {
                        if (err) {
                            console.error('An error occurred in SQL Query', err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send(data);
                    })
                }
            })
        } else {
            pool.query(sql_query_getEmployee, (err, data) => {
                if (err) {
                    console.error('An error occurred in SQL Query', err);
                    return res.status(500).send('Database Error');
                }
                return res.status(200).send(data);
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getMidMonthInActiveSalaryOfEmployee = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        sql_querry_calculateMidSalary = `SELECT
                                                (FLOOR(salary / DAY(LAST_DAY(CURRENT_DATE))) * (DATEDIFF(CURDATE(), employeeJoiningDate))) AS daySalary,
                                                (CEIL(salary / DAY(LAST_DAY(CURRENT_DATE))) * (COALESCE(sld.numLeave, 0))) AS currentMonthLeaveSalary,
                                                (CEIL(salary / DAY(LAST_DAY(CURRENT_DATE))) * (COALESCE(msld.remainLeave, 0))) AS remainLeaveSalary,
                                                CONCAT(DATE_FORMAT(sed.employeeJoiningDate, '%d-%b-%Y'), ' - ', DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%d-%b-%Y')) AS dateOfPayment
                                            FROM
                                                staff_employee_data AS sed
                                            LEFT JOIN(
                                                SELECT
                                                    employeeId,
                                                SUM(staff_leave_data.numLeave) AS numLeave
                                                FROM
                                                    staff_leave_data
                                                WHERE
                                                    staff_leave_data.employeeId = '${employeeId}' AND staff_leave_data.leaveDate BETWEEN(
                                                    SELECT
                                                        employeeJoiningDate
                                                    FROM
                                                        staff_employee_data sed
                                                    WHERE
                                                        sed.employeeId = '${employeeId}'
                                                ) AND CURDATE()) AS sld
                                            ON
                                            sed.employeeId = sld.employeeId
                                            LEFT JOIN(
                                                SELECT 
                                                employeeId,
                                                remainLeave
                                                FROM
                                                    staff_monthlySalary_data
                                                WHERE
                                                    (employeeId, msEndDate) = (
                                                    SELECT
                                                        employeeId,
                                                MAX(msEndDate)
                                                    FROM
                                                        staff_monthlySalary_data
                                                    WHERE
                                                        employeeId = '${employeeId}'
                                            )
                                            ) AS msld
                                            ON
                                            sed.employeeId = msld.employeeId
                                            WHERE
                                            sed.employeeId = '${employeeId}';`;
        // console.log(sql_querry_calculateMidSalary);
        pool.query(sql_querry_calculateMidSalary, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const daySalary = data[0].daySalary;
            const currentMonthLeaveSalary = data[0].currentMonthLeaveSalary;
            const remainLeaveSalary = data[0].remainLeaveSalary;
            const deductionSalary = remainLeaveSalary - currentMonthLeaveSalary;
            const proratedSalary = {
                'proratedSalary': daySalary + (deductionSalary < 0 ? deductionSalary : 0),
                'dateOfPayment': data[0].dateOfPayment
            }
            return res.status(200).send(proratedSalary);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getEmployeeDetailsById = (req, res) => {
    try {
        const employeeId = req.query.employeeId
        sql_querry_getEmployeeById = `SELECT
                                        sed.employeeId,
                                        CONCAT(
                                            employeeFirstName,
                                            ' ',
                                            employeeLastName
                                        ) AS employeeName,
                                        employeeGender,
                                        employeeNickName,
                                        CONCAT('+91 ', employeeMobileNumber) AS employeeMobileNumber,
                                        employeeOtherMobileNumber,
                                        presentAddress,
                                        homeAddress,
                                        adharCardNum,
                                        CONCAT(
                                            staff_category_data.staffCategoryName,
                                            ' (',
                                            designation,
                                            ')'
                                        ) AS category,
                                        salary,
                                        FLOOR(salary / DAY(LAST_DAY(CURRENT_DATE))) AS perDaySalary,
                                        maxLeave,
                                        DATE_FORMAT(employeeStaticJoiningDate, '%d-%b-%Y') AS employeeStaticJoiningDate,
                                        DATE_FORMAT(employeeJoiningDate, '%d-%b-%Y') AS employeeJoiningDate,
                                        DATE_FORMAT(
                                            employeeLastPaymentDate,
                                            '%d-%b-%Y'
                                        ) AS employeeLastPaymentDate,
                                        accountHolderName,
                                        accountNumber,
                                        ifscCode,
                                        bankName,
                                        branchName,
                                        imageLink,
                                        COALESCE(
                                            CONCAT(
                                                DATE_FORMAT(smsddate.startDate, '%d-%b-%Y'),
                                                ' - ',
                                                DATE_FORMAT(smsddate.endDate, '%d-%b-%Y')
                                            ),
                                            'No Payment Remaining'
                                        ) AS dateOfPayment,
                                        COALESCE(
                                            (
                                                COALESCE(
                                                    (
                                                    SELECT
                                                        staff_monthlySalary_data.remainLeave
                                                    FROM
                                                        staff_monthlySalary_data
                                                    WHERE
                                                        employeeId = sed.employeeId
                                                    ORDER BY
                                                        staff_monthlySalary_data.msStartDate
                                                    DESC
                                                LIMIT 1
                                                ),
                                                0
                                                ) + sed.maxLeave
                                            ),
                                            0
                                        ) - COALESCE(
                                            (
                                            SELECT
                                                SUM(staff_leave_data.numLeave)
                                            FROM
                                                staff_leave_data
                                            WHERE
                                                employeeId = sed.employeeId AND staff_leave_data.leaveDate BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE())),
                                                0) AS availableLeave,
                                                IF(employeeStatus = 1, TRUE, FALSE) AS employeeStatus,
                                                COALESCE(smsd.remainSalary, 0) AS totalSalary,
                                                COALESCE(sad.advaceAmount, 0) AS advanceAmount,
                                                COALESCE(sfd.fineAmount, 0) AS fineAmount,
                                                COALESCE(esd.totalPaidSalary, 0) AS totalPaidSalary,
                                                COALESCE(smsd.remainSalary, 0) - COALESCE(sad.advaceAmount, 0) - COALESCE(sfd.fineAmount, 0) AS paymentDue
                                            FROM
                                                staff_employee_data AS sed
                                            LEFT JOIN staff_category_data ON staff_category_data.staffCategoryId = sed.category
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
                                                staff_fine_data.remainFineAmount != 0 AND staff_fine_data.fineStatus = 1
                                            GROUP BY
                                                staff_fine_data.employeeId
                                        ) AS sfd
                                    ON
                                        sed.employeeId = sfd.employeeId
                                    LEFT JOIN(
                                        SELECT
                                            staff_salary_data.employeeId,
                                            SUM(staff_salary_data.salaryAmount) totalPaidSalary
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
                                            staff_monthlySalary_data.employeeId,
                                            SUM(
                                                staff_monthlySalary_data.remainSalary
                                            ) AS remainSalary
                                        FROM
                                            staff_monthlySalary_data
                                        WHERE
                                            staff_monthlySalary_data.remainSalary != 0
                                        GROUP BY
                                            staff_monthlySalary_data.employeeId
                                    ) AS smsd
                                    ON
                                        sed.employeeId = smsd.employeeId
                                    LEFT JOIN(
                                        SELECT
                                            staff_monthlySalary_data.employeeId,
                                            MIN(
                                                staff_monthlySalary_data.msStartDate
                                            ) AS startDate,
                                            MAX(
                                                staff_monthlySalary_data.msEndDate
                                            ) AS endDate
                                        FROM
                                            staff_monthlySalary_data
                                        WHERE
                                            staff_monthlySalary_data.remainSalary != 0
                                        GROUP BY
                                            staff_monthlySalary_data.employeeId
                                    ) AS smsddate
                                    ON
                                        sed.employeeId = smsddate.employeeId
                                    WHERE
                                        sed.employeeId = '${employeeId}';`;
        pool.query(sql_querry_getEmployeeById, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data[0]);
        })
    }
    catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const ddlForEmployeeList = (req, res) => {
    try {
        sql_querry_getEmployeeData = `SELECT
                                        employeeId,
                                        employeeNickName,
                                        COALESCE(
                                            (
                                                COALESCE(
                                                    (
                                                    SELECT
                                                        staff_monthlySalary_data.remainLeave
                                                    FROM
                                                        staff_monthlySalary_data
                                                    WHERE
                                                        employeeId = staff_employee_data.employeeId
                                                    ORDER BY
                                                        staff_monthlySalary_data.msStartDate
                                                    DESC
                                                LIMIT 1
                                                ),
                                                0
                                                ) + staff_employee_data.maxLeave
                                            ),
                                            0
                                        ) - COALESCE(
                                            (
                                            SELECT
                                                SUM(staff_leave_data.numLeave)
                                            FROM
                                                staff_leave_data
                                            WHERE
                                                employeeId = staff_employee_data.employeeId AND staff_leave_data.leaveDate BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE())),
                                                0) AS availableLeave
                                            FROM
                                                staff_employee_data
                                            WHERE
                                                employeeStatus = 1
                                            ORDER BY employeeNickName`;
        pool.query(sql_querry_getEmployeeData, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getEmployeeIdAndName = (req, res) => {
    try {
        sql_querry_getEmployeeIdAndName = `SELECT employeeId, employeeNickName FROM staff_employee_data ORDER BY employeeCreationDate DESC`;
        pool.query(sql_querry_getEmployeeIdAndName, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
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
    getMidMonthInActiveSalaryOfEmployee,
    getEmployeeDetailsById,
    ddlForEmployeeList,
    getEmployeeIdAndName
}
