// const pool = require('../../database');

// // Function to execute the SQL query for a given date and return the sum of numLeave
// function getSumOfLeaveForDate(employeeId, date) {
//     return new Promise((resolve, reject) => {
//         sql_query = `SELECT COALESCE(SUM(numLeave),0) AS numLeave FROM staff_leave_data WHERE employeeId = '${employeeId}' AND leaveDate BETWEEN STR_TO_DATE('${date}','%d-%m-%Y') AND LAST_DAY(STR_TO_DATE('${date}','%d-%m-%Y'))`
//         pool.query(
//             sql_query,
//             (error, results) => {
//                 if (error) {
//                     reject(error);
//                 } else {
//                     const sumOfLeave = results.length > 0 ? results[0].numLeave : 0;
//                     resolve(sumOfLeave);
//                 }
//             }
//         );
//     });
// }

// // Function to iterate through the date array and get the sum of leave for each date
// async function getSumOfLeaveForDates(employeeId, dateArray) {
//     const sumOfLeaveArray = [];
//     for (const date of dateArray) {
//         const sumOfLeave = await getSumOfLeaveForDate(employeeId, date);
//         sumOfLeaveArray.push(sumOfLeave);
//     }
//     return sumOfLeaveArray;
// }

// const calculateDueSalary = (employeeId) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const todayDate = new Date();
//             const currentMonth = todayDate.getMonth() + 1;

//             sql_query_getDateofJoining = `SELECT employeeJoiningDate, DAY(employeeJoiningDate) AS employeeJoiningDay,Month(salaryCalculationDate) AS salaryCalculationMonth, salary FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
//             pool.query(sql_query_getDateofJoining, (err, data) => {
//                 if (err) {
//                     console.error("An error occurred in SQL Query", err);
//                     reject('Database Error');
//                 }
//                 const joiningDate = data[0].employeeJoiningDate;
//                 const salaryCalculationMonth = data[0].salaryCalculationMonth;


//                 function getMonthsArrayBetweenDates(startDate, endDate) {
//                     const monthsArray = [];
//                     let currentDate = new Date(startDate);

//                     // Adjust the start date to the first day of the month
//                     currentDate.setDate(1);

//                     while (currentDate < endDate) {
//                         const day = String(currentDate.getDate()).padStart(2, '0');
//                         const month = String(currentDate.getMonth() + 1).padStart(2, '0');
//                         const year = currentDate.getFullYear();
//                         const formattedDate = `${day}-${month}-${year}`;
//                         monthsArray.push(formattedDate);
//                         currentDate.setMonth(currentDate.getMonth() + 1); // Move to the next month
//                     }

//                     // Remove the last element from the array
//                     monthsArray.pop();

//                     return monthsArray;
//                 }

//                 const startDate = new Date(joiningDate);
//                 const endDate = new Date(todayDate);
//                 const monthsArray = getMonthsArrayBetweenDates(startDate, endDate);

//                 console.log('Month Array', monthsArray);

//                 // dateArray contains the array of dates in 'dd-mm-yyyy' format
//                 const dateArray = monthsArray;

//                 // Function to convert 'dd-mm-yyyy' date format to a Date object
//                 function getDateFromString(dateString) {
//                     const [day, month, year] = dateString.split('-');
//                     return new Date(`${year}-${month}-${day}`);
//                 }

//                 sql_query_getSalartdata = `SELECT salary, DATE_FORMAT(startDate,'%d-%m-%Y') AS startDate, DATE_FORMAT(endDate,'%d-%m-%Y') AS endDate FROM salary_history_data WHERE employeeId = '${employeeId}'`;
//                 pool.query(sql_query_getSalartdata, (err, data) => {
//                     if (err) {
//                         console.error("An error occurd in SQL Queery", err);
//                         return res.status(500).send('Database Error');
//                     }
//                     const actualSalaryData = data.map(item => ({
//                         salary: item.salary,
//                         startDate: item.startDate,
//                         endDate: item.endDate
//                     }));

//                     console.log('actual Salary', actualSalaryData);
//                     const salaryData = actualSalaryData
//                     // Function to find the latest end date from the salary data
//                     function findLatestEndDate() {
//                         let latestEndDate = null;

//                         for (const row of salaryData) {
//                             const endDate = getDateFromString(row.endDate);

//                             if (!latestEndDate || endDate > latestEndDate) {
//                                 latestEndDate = endDate;
//                             }
//                         }

//                         return latestEndDate;
//                     }

//                     // Function to find the closest end date and corresponding salary for a given date
//                     function findClosestEndDate(date) {
//                         let closestEndDate = null;
//                         let closestSalary = null;

//                         for (const row of salaryData) {
//                             const startDate = getDateFromString(row.startDate);
//                             const endDate = getDateFromString(row.endDate);

//                             if (startDate <= date && endDate >= date) {
//                                 closestEndDate = endDate;
//                                 closestSalary = row.salary;
//                             }
//                         }

//                         return closestSalary;
//                     }

//                     // Array to store the corresponding salaries for each date
//                     const salaryArray = dateArray.map((dateString) => {
//                         const date = getDateFromString(dateString);
//                         let salary = findClosestEndDate(date);

//                         // If no salary is found, get the salary for the latest end date
//                         if (!salary) {
//                             const latestEndDate = findLatestEndDate(salaryData);
//                             salary = findClosestEndDate(latestEndDate);
//                         }

//                         return salary;
//                     });


//                     sql_query_getLeaveData = `SELECT numberOfLeave AS numLeave, DATE_FORMAT(startDate,'%d-%m-%Y') AS startDate, DATE_FORMAT(endDate,'%d-%m-%Y') AS endDate FROM leave_history_data WHERE employeeId = '${employeeId}'`;
//                     pool.query(sql_query_getLeaveData, (err, data) => {
//                         if (err) {
//                             console.error("An error occurd in SQL Queery", err);
//                             return;
//                         }
//                         const actualLeaveData = data.map(item => ({
//                             numLeave: item.numLeave,
//                             startDate: item.startDate,
//                             endDate: item.endDate
//                         }));

//                         console.log('actual leave', actualLeaveData);
//                         const leaveData = actualLeaveData
//                         // Function to find the latest end date from the salary data
//                         function findLatestEndDate() {
//                             let latestEndDate = null;

//                             for (const row of leaveData) {
//                                 const endDate = getDateFromString(row.endDate);

//                                 if (!latestEndDate || endDate > latestEndDate) {
//                                     latestEndDate = endDate;
//                                 }
//                             }

//                             return latestEndDate;
//                         }

//                         // Function to find the closest end date and corresponding salary for a given date
//                         function findClosestEndDate(date) {
//                             let closestEndDate = null;
//                             let closestLeave = null;

//                             for (const row of leaveData) {
//                                 const startDate = getDateFromString(row.startDate);
//                                 const endDate = getDateFromString(row.endDate);

//                                 if (startDate <= date && endDate >= date) {
//                                     closestEndDate = endDate;
//                                     closestLeave = row.numLeave;
//                                 }
//                             }

//                             return closestLeave;
//                         }

//                         // Array to store the corresponding salaries for each date
//                         const leaveArray = dateArray.map((dateString) => {
//                             const date = getDateFromString(dateString);
//                             let leave = findClosestEndDate(date);

//                             // If no salary is found, get the salary for the latest end date
//                             if (!leave) {
//                                 const latestEndDate = findLatestEndDate(leaveData);
//                                 leave = findClosestEndDate(latestEndDate);
//                             }

//                             return leave;
//                         });

//                         const perDaysalaryOfEmployee = salaryArray.map(salary => Math.floor(salary / 30));
//                         console.log(perDaysalaryOfEmployee);
//                         (async () => {
//                             try {
//                                 const result = await getSumOfLeaveForDates(employeeId, dateArray);
//                                 console.log('....', result);


//                                 const takeLeave = getSumOfLeaveForDates(employeeId, dateArray);
//                                 const array1 = leaveArray;
//                                 const array2 = result;
//                                 function subtractArrays(arr1, arr2) {
//                                     if (arr1.length !== arr2.length) {
//                                         throw new Error('Arrays must have the same length for subtraction.');
//                                     }

//                                     return arr1.map((value, index) => value - arr2[index]);
//                                 }
//                                 const totalLeaveArray = subtractArrays(array1, array2);
//                                 console.log(totalLeaveArray); // Output: [5, 12]
//                                 console.log(perDaysalaryOfEmployee);
//                                 const multiplayArray = totalLeaveArray.map((value, index) => value * perDaysalaryOfEmployee[index])
//                                 const sumOfLeaveSalary = multiplayArray.reduce((accumulator, currentValue) => {
//                                     return accumulator + currentValue;
//                                 }, 0);
//                                 const totalLeaveTaken = array2.reduce((accumulator, currentValue) => {
//                                     return accumulator + currentValue;
//                                 }, 0);
//                                 const totalMaxLeave = leaveArray.reduce((accumulator, currentValue) => {
//                                     return accumulator + currentValue;
//                                 }, 0);
//                                 console.log("jay", sumOfLeaveSalary, multiplayArray, totalLeaveTaken, totalMaxLeave)
//                                 sql_get_SAFPS = `SELECT
//                                                     sed.employeeId,
//                                                     CONCAT(sed.employeeFirstName,' ',sed.employeeLastName) AS employeeName,
//                                                     sed.employeeNickName AS nickName,
//                                                     sed.employeeStatus AS employeeStatus,
//                                                     sed.imageLink AS imageLink,
//                                                     CONCAT(scd.staffCategoryName,' (',sed.designation,')') AS category,
//                                                     COALESCE(totalSalary, 0) AS totalSalary,
//                                                     COALESCE(sad.advaceAmount, 0) AS advaceAmount,
//                                                     COALESCE(sfd.fineAmount, 0) AS fineAmount,
//                                                     COALESCE(esd.totalPaidSalary, 0) AS totalPaidSalary
//                                                 FROM
//                                                     staff_employee_data AS sed
//                                                     INNER JOIN staff_category_data AS scd
//                                                 ON
//                                                     scd.staffCategoryId = sed.category
//                                                 LEFT JOIN(
//                                                     SELECT
//                                                         staff_advance_data.employeeId,
//                                                         SUM(
//                                                             staff_advance_data.remainAdvanceAmount
//                                                         ) AS advaceAmount
//                                                     FROM
//                                                         staff_advance_data
//                                                     WHERE
//                                                         staff_advance_data.remainAdvanceAmount != 0
//                                                     GROUP BY
//                                                         staff_advance_data.employeeId
//                                                 ) AS sad
//                                                 ON
//                                                     sed.employeeId = sad.employeeId
//                                                 LEFT JOIN(
//                                                     SELECT
//                                                         staff_fine_data.employeeId,
//                                                         SUM(
//                                                             staff_fine_data.remainFineAmount
//                                                         ) AS fineAmount
//                                                     FROM
//                                                         staff_fine_data
//                                                     WHERE
//                                                         staff_fine_data.remainFineAmount != 0
//                                                     GROUP BY
//                                                         staff_fine_data.employeeId
//                                                 ) AS sfd
//                                                 ON
//                                                     sed.employeeId = sfd.employeeId
//                                                 LEFT JOIN(
//                                                     SELECT
//                                                         staff_salary_data.employeeId,
//                                                         SUM(staff_salary_data.salaryAmount) totalPaidSalary
//                                                     FROM
//                                                         staff_salary_data
//                                                     WHERE
//                                                         staff_salary_data.salaryDate BETWEEN(
//                                                         SELECT
//                                                             DATE_ADD(
//                                                                 DATE_FORMAT(employeeJoiningDate, '%Y-%m-01'),
//                                                                 INTERVAL 1 MONTH
//                                                             )
//                                                         FROM
//                                                             staff_employee_data sed
//                                                         WHERE
//                                                             sed.employeeId = staff_salary_data.employeeId
//                                                     ) AND CURDATE()
//                                                 GROUP BY
//                                                     staff_salary_data.employeeId) AS esd
//                                                 ON
//                                                     sed.employeeId = esd.employeeId
//                                                 WHERE sed.employeeId = '${employeeId}'`
//                                 pool.query(sql_get_SAFPS, (err, data) => {
//                                     if (err) {
//                                         console.error("An error occurd in SQL Queery", err);
//                                         return res.status(500).send('Database Error');
//                                     }
//                                     console.log('d', data);
//                                     const allSalaryData = {
//                                         employeeId: data[0].employeeId,
//                                         employeeName: data[0].employeeName,
//                                         nickName: data[0].nickName,
//                                         category: data[0].category,
//                                         employeeStatus: data[0].employeeStatus,
//                                         imageLink: data[0].imageLink,
//                                         totalSalary: data[0].totalSalary,
//                                         advanceAmount: data[0].advaceAmount,
//                                         fineAmount: data[0].fineAmount,
//                                         totalPaidSalary: data[0].totalPaidSalary,
//                                         sumOfLeaveSalary: sumOfLeaveSalary,
//                                         totalMaxLeave: totalMaxLeave,
//                                         totalLeaveTaken: totalLeaveTaken,
//                                         paymentDue: data[0].totalSalary - data[0].advaceAmount - data[0].fineAmount - data[0].totalPaidSalary + sumOfLeaveSalary

//                                     }
//                                     console.log('All Salary', allSalaryData);
//                                     resolve(allSalaryData);
//                                 })
//                             } catch (error) {
//                                 console.error('Error:', error);
//                             }
//                         })();
//                     })
//                 })
//             });
//         } catch (error) {
//             console.error('An error occurred', error);
//             reject('Internal Server Error');
//         }
//     });
// };

// calculateDueSalary('employee_1690190732291')
//     .then((allSalaryData) => {
//         console.log("Vikalp Chavda:", allSalaryData);
//     })
//     .catch((error) => {
//         console.error("Error:", error);
//         // The code inside this block is executed when the Promise is rejected with an error
//     });

// module.exports = {
//     calculateDueSalary
// }