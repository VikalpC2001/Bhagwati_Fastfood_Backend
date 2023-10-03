const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { route } = require('../../routs/inventoryRouts/inventory.routs');

const getAllEmployeeTransactionData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const searchNumber = req.query.searchNumber;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (SELECT remainSalaryId FROM staff_salary_data WHERE staff_salary_data.salaryDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y') GROUP BY remainSalaryId) AS transactionCount`;
        } else if (req.query.searchNumber) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (SELECT remainSalaryId FROM staff_salary_data WHERE remainSalaryId LIKE '%` + searchNumber + `%' GROUP BY remainSalaryId) AS transactionCount`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (SELECT remainSalaryId FROM staff_salary_data WHERE staff_salary_data.salaryDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y') GROUP BY remainSalaryId) AS transactionCount`;
        }

        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanTransactionQuarry = `SELECT
                                                    remainSalaryId,
                                                    RIGHT(remainSalaryId,10) AS trasactionId,
                                                    user_details.userName AS givenBy,
                                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                    sed.employeeNickName AS employeeName,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryId END),null) AS cutAdvanceId,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryId END),null) AS cutFineId,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryId END),null) AS salaryId,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END),0) AS advanceCut,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END),0) AS fineCut,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END),0) AS salaryPay,
                                                    salaryComment,
                                                    salaryDate AS sortSalaryDate,
                                                    DATE_FORMAT(salaryDate,'%W, %d %M %Y') AS salaryDate,
                                                    DATE_FORMAT(salaryCreationDate,'%h:%i %p') AS salaryTime
                                                FROM
                                                    staff_salary_data
                                                LEFT JOIN user_details ON user_details.userId = staff_salary_data.userId
                                                INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_salary_data.employeeId`;
                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE staff_salary_data.salaryDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                GROUP BY remainSalaryId
                                                ORDER BY sortSalaryDate DESC, salaryCreationDate DESC
                                                LIMIT ${limit}`;
                } else if (req.query.searchNumber) {
                    sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE remainSalaryId LIKE '%` + searchNumber + `%'
                                                GROUP BY remainSalaryId
                                                ORDER BY sortSalaryDate DESC, salaryCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE staff_salary_data.salaryDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY remainSalaryId
                                                ORDER BY sortSalaryDate DESC, salaryCreationDate DESC
                                                LIMIT ${limit}`
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getAllEmployeeLeaveData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_leave_data WHERE leaveDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_leave_data WHERE leaveDate = CURDATE()`;
        }
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanQuarryOfLeave = `SELECT
                                                leaveId,
                                               	user_details.userName AS givenBy,
                                            	CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                sed.employeeId,
                                                sed.employeeNickName AS employeeName,
                                                CONCAT(scd.staffCategoryName,' (',sed.designation,')') AS employeeCategory,
                                                numLeave,
                                                leaveReason,
                                                leaveDate AS sortLeaveDate,
                                                DATE_FORMAT(leaveDate,'%d-%m-%Y') dateLeave,
                                                DATE_FORMAT(leaveDate,'%W, %d %M %Y') leaveDate
                                            FROM
                                                staff_leave_data
                                            LEFT JOIN user_details ON user_details.userId = staff_leave_data.userId
                                            INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_leave_data.employeeId
                                            LEFT JOIN staff_category_data AS scd ON scd.staffCategoryId = sed.category`;
                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarryOfLeave}
                                                WHERE leaveDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                ORDER BY sortLeaveDate DESC, leaveCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfLeave}
                                                WHERE leaveDate = CURDATE()
                                                ORDER BY sortLeaveDate DESC, leaveCreationDate DESC
                                                LIMIT ${limit}`;
                }

                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }];
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getAllEmployeeBonusData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_bonus_data WHERE bonusDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_bonus_data WHERE bonusDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')`;
        }
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanQuarryOfBonus = `SELECT
                                                bonusId,
                                                user_details.userName AS givenBy,
                                                CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                sed.employeeNickName AS employeeName,
                                                bonusAmount,
                                                bonusComment,
                                                bonusDate AS sortBonusDate,
                                                DATE_FORMAT(bonusDate, '%d-%b-%Y') AS bonusDate,
                                                DATE_FORMAT(bonusCreationDate, '%h:%i %p') AS givenTime
                                            FROM
                                                staff_bonus_data
                                            LEFT JOIN user_details ON user_details.userId = staff_bonus_data.userId
                                            INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_bonus_data.employeeId`;
                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarryOfBonus}
                                                WHERE bonusDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                ORDER BY sortBonusDate DESC, bonusCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfBonus}
                                                WHERE bonusDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                ORDER BY sortBonusDate DESC, bonusCreationDate DESC
                                                LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getAllEmployeeCreditData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_creditAdvanceFine_data WHERE creditDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_creditAdvanceFine_data WHERE creditDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')`;
        }

        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanQuarryOfCreditData = `SELECT
                                                    cafId,
                                                    user_details.userName AS givenBy,
                                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                    sed.employeeNickName AS employeeName,
                                                    creditAmount,
                                                    creditType,
                                                    creditComent,
                                                    creditDate AS sortCredit,
                                          	        DATE_FORMAT(creditDate, '%d-%b-%Y') AS creditDate,
                                        	        DATE_FORMAT(creditCreationDate, '%h:%i %p') AS givenTime 
                                                FROM
                                                    staff_creditAdvanceFine_data
                                                LEFT JOIN user_details ON user_details.userId = staff_creditAdvanceFine_data.userId
                                                INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_creditAdvanceFine_data.employeeId`;
                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarryOfCreditData}
                                                WHERE creditDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                ORDER BY sortCredit DESC ,creditCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfCreditData}
                                                WHERE creditDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                ORDER BY sortCredit DESC ,creditCreationDate DESC
                                                LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getAllEmployeeFineData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const fineStatus = req.query.fineStatus;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        if (req.query.startDate && req.query.endDate && req.query.fineStatus) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE fineStatus = ${fineStatus} AND fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')`;
        } else if (req.query.fineStatus) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE fineStatus = ${fineStatus}`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE fineDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')`;
        }
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanQuarryOfFine = `SELECT
                                                fineId,
                                                user_details.userName AS givenBy,
                                                CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                sed.employeeNickName AS employeeName,
                                                staff_fine_data.employeeId AS employeeId,
                                                fineAmount,
                                                remainFineAmount,
                                                fineStatus,
                                                IF(fineStatus = 1, 'Consider', 'Ignore') AS fineStatusName,
                                                reason,
                                                reduceFineReson,
                                                fineDate AS sortFine,
                                                DATE_FORMAT(fineDate, '%d-%b-%Y') AS fineDate,
                                                DATE_FORMAT(fineCreationDate, '%h:%i %p') AS givenTime
                                            FROM
                                                staff_fine_data
                                            LEFT JOIN user_details ON user_details.userId = staff_fine_data.userId
                                            INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_fine_data.employeeId`;
                if (req.query.startDate && req.query.endDate && req.query.fineStatus) {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE fineStatus = ${fineStatus} AND fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                ORDER BY sortFine DESC ,fineCreationDate DESC 
                                                LIMIT ${limit}`;
                } else if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                ORDER BY sortFine DESC ,fineCreationDate DESC 
                                                LIMIT ${limit}`;
                } else if (req.query.fineStatus) {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE fineStatus = ${fineStatus}
                                                ORDER BY sortFine DESC ,fineCreationDate DESC 
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE fineDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                ORDER BY sortFine DESC ,fineCreationDate DESC 
                                                LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })

    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getAllEmployeeAdvanceData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_advance_data WHERE advanceDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_advance_data WHERE advanceDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')`;
        }
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanQuarryOfAdvance = `SELECT
                                                    advanceId,
                                                    user_details.userName AS givenBy,
                                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                    sed.employeeNickName AS employeeName,
                                                    advanceAmount,
                                                    remainAdvanceAmount,
                                                    advanceComment,
                                                    advanceDate AS sortAdvance,
                                                    DATE_FORMAT(advanceDate,'%d-%b-%Y') AS advanceDate,
                                                    DATE_FORMAT(advanceCreationDate,'%h:%i %p') AS givenTime
                                                FROM
                                                    staff_advance_data
                                                LEFT JOIN user_details ON user_details.userId = staff_advance_data.userId
                                                INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_advance_data.employeeId`;
                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarryOfAdvance}
                                                WHERE advanceDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                ORDER BY sortAdvance DESC, advanceCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfAdvance}
                                                WHERE advanceDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                ORDER BY sortAdvance DESC, advanceCreationDate DESC
                                                LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })

    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getAllPaymentStatisticsCount = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getStatisticsCount = `SELECT 
                                                    COALESCE(SUM(advanceAmount),0) AS totalAdvance,
                                                    COALESCE(SUM(remainAdvanceAmount),0) AS totalRemainAdvance 
                                            FROM 
                                                    staff_advance_data 
                                            WHERE advanceDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y');
                                            SELECT
                                                COALESCE(SUM(fineAmount),0) AS totalFine,
                                                COALESCE(SUM(remainFineAmount),0) AS totalRemainFine,
                                                COALESCE(SUM(CASE WHEN fineStatus = 1 THEN fineAmount ELSE 0 END), 0) AS totalConsiderFine,
                                                COALESCE(SUM(CASE WHEN fineStatus = 0 THEN remainFineAmount ELSE 0 END), 0) AS totalIgnoreFine
                                            FROM staff_fine_data
                                            WHERE fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y');
                                            SELECT
                                                COALESCE(SUM(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END), 0) AS advanceCutSum,
                                                COALESCE(SUM(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END), 0) AS fineCutSum,
                                                COALESCE(SUM(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END), 0) AS salaryPaySum
                                            FROM
                                                staff_salary_data
                                            WHERE
                                                salaryDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y');
                                            SELECT 
                                                COALESCE(SUM(creditAmount),0) AS totalCreditAmount
                                            FROM 
                                                staff_creditAdvanceFine_data 
                                            WHERE creditDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y');
                                            SELECT 
                                                COALESCE(SUM(bonusAmount),0) AS totalBonusAmount 
                                            FROM 
                                                staff_bonus_data 
                                            WHERE bonusDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')`;
        }
        else {
            sql_queries_getStatisticsCount = `SELECT 
                                                    COALESCE(SUM(advanceAmount),0) AS totalAdvance,
                                                    COALESCE(SUM(remainAdvanceAmount),0) AS totalRemainAdvance 
                                            FROM 
                                                    staff_advance_data 
                                            WHERE advanceDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                            SELECT
                                                COALESCE(SUM(fineAmount),0) AS totalFine,
                                                COALESCE(SUM(remainFineAmount),0) AS totalRemainFine,
                                                COALESCE(SUM(CASE WHEN fineStatus = 1 THEN fineAmount ELSE 0 END), 0) AS totalConsiderFine,
                                                COALESCE(SUM(CASE WHEN fineStatus = 0 THEN remainFineAmount ELSE 0 END), 0) AS totalIgnoreFine
                                            FROM staff_fine_data
                                            WHERE fineDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                            SELECT
                                                COALESCE(SUM(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END), 0) AS advanceCutSum,
                                                COALESCE(SUM(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END), 0) AS fineCutSum,
                                                COALESCE(SUM(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END), 0) AS salaryPaySum
                                            FROM
                                                staff_salary_data
                                            WHERE
                                                salaryDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                            SELECT 
                                                COALESCE(SUM(creditAmount),0) AS totalCreditAmount
                                            FROM 
                                                staff_creditAdvanceFine_data 
                                            WHERE creditDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                            SELECT 
                                                COALESCE(SUM(bonusAmount),0) AS totalBonusAmount 
                                            FROM 
                                                staff_bonus_data 
                                            WHERE bonusDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')`;
        }
        pool.query(sql_queries_getStatisticsCount, (err, date) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const mergedObject = Object.assign({}, ...date.map(arr => arr[0] || {}));
            return res.status(200).send(mergedObject);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getAllEmployeeHolidayData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toString().slice(4, 15);
        const lastDayOfYear = new Date(new Date().getFullYear(), 11, 31).toString().slice(4, 15);

        console.log("First day of the current year:", firstDayOfYear);
        console.log("Last day of the current year:", lastDayOfYear);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_holiday_data WHERE holidayDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_holiday_data WHERE holidayDate BETWEEN STR_TO_DATE('${firstDayOfYear}','%b %d %Y') AND STR_TO_DATE('${lastDayOfYear}','%b %d %Y')`;
        }
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanQuarryOfLeave = `SELECT
                                                holidayId,
                                                user_details.userName AS givenBy,
                                                CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                numLeave,
                                                holidayReason,
                                                holidayDate AS sortHoliday,
                                                DATE_FORMAT(holidayDate,'%d-%m-%Y') AS holidayLeaveDate,
                                                DATE_FORMAT(holidayDate,'%W, %d %M %Y') AS holidayDate
                                            FROM
                                                staff_holiday_data
                                                LEFT JOIN user_details ON user_details.userId = staff_holiday_data.userId`;
                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarryOfLeave}
                                                WHERE holidayDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                ORDER BY sortHoliday DESC, holidayCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfLeave}
                                                WHERE holidayDate BETWEEN STR_TO_DATE('${firstDayOfYear}','%b %d %Y') AND STR_TO_DATE('${lastDayOfYear}','%b %d %Y')
                                                ORDER BY sortHoliday DESC, holidayCreationDate DESC
                                                LIMIT ${limit}`;
                }

                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }];
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getAllEmployeeTransactionData,
    getAllEmployeeLeaveData,
    getAllEmployeeBonusData,
    getAllEmployeeCreditData,
    getAllEmployeeFineData,
    getAllEmployeeAdvanceData,
    getAllPaymentStatisticsCount,
    getAllEmployeeHolidayData
}