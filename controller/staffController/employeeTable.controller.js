const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { route } = require('../../routs/inventoryRouts/inventory.routs');

function convertDaysToYearsMonthsDays(days) {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remainingDays = days % 30;

    return `${years > 0 ? `${years} year${years > 1 ? 's' : ''}` : ''}${months > 0 ? `${years > 0 ? ', ' : ''}${months} month${months > 1 ? 's' : ''}` : ''}${remainingDays > 0 ? `${years > 0 || months > 0 ? ', ' : ''}${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
}

// All Table Data By EmployeeId

const getEmployeeMonthlySalaryById = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;

        if (req.query.startMonth && req.query.endMonth) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_monthlySalary_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(msEndDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_monthlySalary_data WHERE employeeId = '${employeeId}'`;
        }
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commonQuery = `SELECT
                                        smsd.monthlySalaryId,
                                        smsd.totalSalary,
                                        smsd.remainSalary,
                                        smsd.maxLeave,
                                        COALESCE(FLOOR(e.salary / DAY(msEndDate)),0) AS perDaySalary,
                                        DATE_FORMAT(msStartDate, '%d-%m-%Y') AS startDate,
                                        DATE_FORMAT(smsd.msStartDate, '%M %Y') AS salaryMonth,
                                        CONCAT(
                                            DATE_FORMAT(msStartDate, '%d-%b-%Y'),
                                            ' To ',
                                            DATE_FORMAT(msEndDate, '%d-%b-%Y')
                                        ) AS monthDate,
                                        COALESCE(
                                            (
                                            SELECT
                                                SUM(sld.numLeave)
                                            FROM
                                                staff_leave_data AS sld
                                            WHERE
                                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                        ),
                                        0
                                        ) AS takenLeaves,
                                        COALESCE(
                                            (
                                            SELECT
                                                (
                                                    DATEDIFF(
                                                        smsd.msEndDate,
                                                        smsd.msStartDate
                                                    ) + 1 - COALESCE(SUM(sld.numLeave),
                                                    0)
                                                )
                                            FROM
                                                staff_leave_data AS sld
                                            WHERE
                                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                        ),
                                        0
                                        ) AS presentDays,
                                        COALESCE(
                                            (
                                            SELECT
                                                SUM(sad.advanceAmount)
                                            FROM
                                                staff_advance_data AS sad
                                            WHERE
                                                sad.employeeId = '${employeeId}' AND sad.advanceDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                        ),
                                        0
                                        ) AS amountOfAdvance,
                                        COALESCE(
                                            (
                                            SELECT
                                                SUM(sfd.fineAmount)
                                            FROM
                                                staff_fine_data AS sfd
                                            WHERE
                                                sfd.employeeId = '${employeeId}' AND sfd.fineDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                        ),
                                        0
                                        ) AS amountOfFine,
                                    -- Calculate remaining available leave days (maxLeave - takenLeaves)
                                    CASE WHEN smsd.maxLeave -(
                                        SELECT
                                            COALESCE(SUM(sld.numLeave),
                                            0)
                                        FROM
                                            staff_leave_data AS sld
                                        WHERE
                                            sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                    ) < 0 THEN ABS(
                                        smsd.maxLeave -(
                                        SELECT
                                            COALESCE(SUM(sld.numLeave),
                                            0)
                                        FROM
                                            staff_leave_data AS sld
                                        WHERE
                                            sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                    )
                                    ) ELSE 0
                                    END AS extraLeaves,
                                    -- Calculate total remaining salary
                                    (
                                        CASE WHEN smsd.maxLeave -(
                                        SELECT
                                            COALESCE(SUM(sld.numLeave),
                                            0)
                                        FROM
                                            staff_leave_data AS sld
                                        WHERE
                                            sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                    ) < 0 THEN ABS(
                                        smsd.maxLeave -(
                                        SELECT
                                            COALESCE(SUM(sld.numLeave),
                                            0)
                                        FROM
                                            staff_leave_data AS sld
                                        WHERE
                                            sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                    )
                                    ) ELSE 0
                                    END
                                    ) *(
                                        COALESCE(FLOOR(e.salary / 30),
                                        0)
                                    ) AS deductionSalaryOfLeave
                                    FROM
                                        staff_monthlySalary_data AS smsd
                                    JOIN staff_employee_data AS e
                                    ON
                                        smsd.employeeId = e.employeeId`;
                if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commonQuery} 
                                                WHERE smsd.employeeId = '${employeeId}' AND DATE_FORMAT(msEndDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                                ORDER BY smsd.msStartDate DESC 
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commonQuery} 
                                                WHERE smsd.employeeId = '${employeeId}' 
                                                ORDER BY smsd.msStartDate DESC 
                                                LIMIT ${limit}`;
                }
                console.log(sql_queries_getdetails);
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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

const getAdvanceDataById = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        if (req.query.startMonth && req.query.endMonth) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_advance_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(advanceDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_advance_data WHERE employeeId = '${employeeId}'`;
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
                                                    advanceAmount,
                                                    remainAdvanceAmount,
                                                    advanceComment,
                                                    DATE_FORMAT(advanceDate,'%d-%b-%Y') AS advanceDate,
                                                    DATE_FORMAT(advanceCreationDate,'%h:%i %p') AS givenTime
                                                FROM
                                                    staff_advance_data
                                                LEFT JOIN user_details ON user_details.userId = staff_advance_data.userId`;
                if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commanQuarryOfAdvance}
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(advanceDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                                ORDER BY advanceDate DESC, advanceCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfAdvance}
                                                WHERE employeeId = '${employeeId}'
                                                ORDER BY advanceDate DESC, advanceCreationDate DESC
                                                LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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

const getFineDataById = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const fineStatus = req.query.fineStatus;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        if (req.query.startMonth && req.query.endMonth && req.query.fineStatus) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE employeeId = '${employeeId}' AND fineStatus = ${fineStatus} AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'`;
        } else if (req.query.startMonth && req.query.endMonth) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'`;
        } else if (req.query.fineStatus) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE employeeId = '${employeeId}' AND fineStatus = ${fineStatus}`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE employeeId = '${employeeId}'`;
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
                                                fineAmount,
                                                remainFineAmount,
                                                fineStatus,
                                                IF(fineStatus = 1, 'Consider', 'Ignore') AS fineStatusName,
                                                CONCAT(COALESCE(reason,''),IF(reason != '' AND reduceFineReson != '',', ',''),COALESCE(reduceFineReson,'')) AS Reason,
                                                DATE_FORMAT(fineDate, '%d-%b-%Y') AS fineDate,
                                                DATE_FORMAT(fineCreationDate, '%h:%i %p') AS givenTime
                                            FROM
                                                staff_fine_data
                                            LEFT JOIN user_details ON user_details.userId = staff_fine_data.userId`;
                if (req.query.startMonth && req.query.endMonth && req.query.fineStatus) {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE employeeId = '${employeeId}' AND fineStatus = ${fineStatus} AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                                ORDER BY fineDate DESC ,fineCreationDate DESC 
                                                LIMIT ${limit}`;
                } else if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                                ORDER BY fineDate DESC ,fineCreationDate DESC 
                                                LIMIT ${limit}`;
                } else if (req.query.fineStatus) {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE employeeId = '${employeeId}' AND fineStatus = ${fineStatus}
                                                ORDER BY fineDate DESC ,fineCreationDate DESC 
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE employeeId = '${employeeId}'
                                                ORDER BY fineDate DESC ,fineCreationDate DESC 
                                                LIMIT ${limit}`;
                }
                console.log(sql_queries_getdetails)
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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

const getBonusDataById = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        if (req.query.startMonth && req.query.endMonth) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_bonus_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(bonusDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_bonus_data WHERE employeeId = '${employeeId}'`;
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
                                                bonusAmount,
                                                bonusComment,
                                                DATE_FORMAT(bonusDate, '%d-%b-%Y') AS bonusDate,
                                                DATE_FORMAT(bonusCreationDate, '%h:%i %p') AS givenTime
                                            FROM
                                                staff_bonus_data
                                            LEFT JOIN user_details ON user_details.userId = staff_bonus_data.userId`;
                if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commanQuarryOfBonus}
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(bonusDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                                ORDER BY bonusDate DESC, bonusCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfBonus}
                                                WHERE employeeId = '${employeeId}'
                                                ORDER BY bonusDate DESC, bonusCreationDate DESC
                                                LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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

const getCreditDataById = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        if (req.query.startMonth && req.query.endMonth) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_creditAdvanceFine_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(creditDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_creditAdvanceFine_data WHERE employeeId = '${employeeId}'`;
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
                                                    creditAmount,
                                                    creditType,
                                                    creditComent,
                                          	        DATE_FORMAT(creditDate, '%d-%b-%Y') AS creditDate,
                                        	        DATE_FORMAT(creditCreationDate, '%h:%i %p') AS givenTime 
                                                FROM
                                                    staff_creditAdvanceFine_data
                                                LEFT JOIN user_details ON user_details.userId = staff_creditAdvanceFine_data.userId`;
                if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commanQuarryOfCreditData}
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(creditDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                                ORDER BY creditDate DESC ,creditCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfCreditData}
                                                WHERE employeeId = '${employeeId}'
                                                ORDER BY creditDate DESC ,creditCreationDate DESC
                                                LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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

const getLeaveDataById = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        if (req.query.startMonth) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_leave_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(leaveDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_leave_data WHERE employeeId = '${employeeId}'`;
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
                                                numLeave,
                                                leaveReason,
                                                DATE_FORMAT(leaveDate,'%d-%m-%Y') AS dateLeave,
                                                DATE_FORMAT(leaveDate,'%W, %d %M %Y') AS leaveDate,
                                                leaveDate AS OriginalDate
                                            FROM
                                                staff_leave_data
                                            LEFT JOIN user_details ON user_details.userId = staff_leave_data.userId`;
                if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commanQuarryOfLeave}
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(leaveDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                                ORDER BY OriginalDate DESC, leaveCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfLeave}
                                                WHERE employeeId = '${employeeId}'
                                                ORDER BY OriginalDate DESC, leaveCreationDate DESC
                                                LIMIT ${limit}`;
                }

                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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

const getTransactionDataById = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const searchNumber = req.query.searchNumber;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        if (req.query.startMonth && req.query.endMonth) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (SELECT remainSalaryId FROM staff_salary_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(staff_salary_data.salaryDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}' GROUP BY remainSalaryId) AS transactionCount`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (SELECT remainSalaryId FROM staff_salary_data WHERE employeeId = '${employeeId}' AND remainSalaryId LIKE '%` + searchNumber + `%' GROUP BY remainSalaryId) AS transactionCount`;
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
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryId END),null) AS cutAdvanceId,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryId END),null) AS cutFineId,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryId END),null) AS salaryId,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END),0) AS advanceCut,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END),0) AS fineCut,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END),0) AS salaryPay,
                                                    salaryComment,
                                                    DATE_FORMAT(salaryDate,'%W, %d %M %Y') AS salaryDate,
                                                    DATE_FORMAT(salaryCreationDate,'%h:%i %p') AS salaryTime
                                                FROM
                                                    staff_salary_data
                                                LEFT JOIN user_details ON user_details.userId = staff_salary_data.userId`;
                if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(staff_salary_data.salaryDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                                GROUP BY remainSalaryId
                                                ORDER BY salaryDate DESC, salaryCreationDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE employeeId = '${employeeId}' AND remainSalaryId LIKE '%` + searchNumber + `%'
                                                GROUP BY remainSalaryId
                                                ORDER BY salaryDate DESC, salaryCreationDate DESC
                                                LIMIT ${limit}`;
                }
                console.log(sql_queries_getdetails);
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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

// CutSalary Report By SalaryId

const getCutSalaryDataById = (req, res) => {
    try {
        const remainSalaryId = req.query.remainSalaryId;
        console.log(!remainSalaryId)
        if (!remainSalaryId) {
            res.status(400).send('SalaryId Not Found');
        }
        sql_query_getRemainSalaryId = `SELECT remainSalaryId FROM staff_salary_data WHERE remainSalaryId = '${remainSalaryId}'`;
        pool.query(sql_query_getRemainSalaryId, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row[0] && row[0].remainSalaryId) {
                sql_queries_getRemainSalaryData = `SELECT
                                                    remainSalaryAmt,
                                                    lastRemainAmt,
                                                    remainAdvanceAmt,
                                                    lastAdvanceAmt,
                                                    remainFineAmt,
                                                    lastFineAmt
                                                FROM
                                                    staff_remainSalaryHistory_data
                                                WHERE remainSalaryId = '${remainSalaryId}'`;
                pool.query(sql_queries_getRemainSalaryData, (err, result) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const remainSalaryAmt = result[0].lastRemainAmt;
                    const remainAdvanceAmt = result[0].lastAdvanceAmt;
                    const remainFineAmt = result[0].lastFineAmt;
                    sql_queries_getCutSalaryData = `SELECT
                                                        staff_msWiseSalaryId_data.monthlySalaryId,
                                                        DATE_FORMAT(
                                                            staff_monthlySalary_data.msStartDate,
                                                            '%b %Y'
                                                        ) AS monthYear,
                                                        staff_monthlySalary_data.totalSalary AS originalTotalSalary,
                                                        staff_monthlySalary_data.totalSalary AS totalSalary,
                                                        COALESCE(MAX(CASE WHEN staff_salary_data.salaryType = 'Advance Cut' THEN cutSalaryAmount END),0) AS cutAdvance,
                                                        COALESCE(MAX(CASE WHEN staff_salary_data.salaryType = 'Fine Cut' THEN cutSalaryAmount END),0) AS cutFine,
                                                        COALESCE(MAX(CASE WHEN staff_salary_data.salaryType = 'Salary Pay' THEN cutSalaryAmount END),0) AS salary
                                                    FROM
                                                        staff_msWiseSalaryId_data
                                                    INNER JOIN staff_monthlySalary_data ON staff_monthlySalary_data.monthlySalaryId = staff_msWiseSalaryId_data.monthlySalaryId
                                                    INNER JOIN staff_salary_data ON staff_salary_data.salaryId = staff_msWiseSalaryId_data.salaryId
                                                    WHERE staff_msWiseSalaryId_data.salaryId IN (SELECT COALESCE(salaryId,null) FROM staff_salary_data WHERE staff_salary_data.remainSalaryId = '${remainSalaryId}')
                                                    GROUP BY staff_msWiseSalaryId_data.monthlySalaryId;
                                                    SELECT
                                                        salary_salaryWiseAdvanceId_data.advanceId,
                                                        staff_advance_data.advanceAmount,
                                                        staff_advance_data.advanceAmount AS remainAdvanceAmount,
                                                        cutAdvanceAmount,
                                                        DATE_FORMAT(staff_advance_data.advanceDate,'%d-%b-%Y') AS advanceDate
                                                    FROM
                                                        salary_salaryWiseAdvanceId_data
                                                    INNER JOIN staff_advance_data ON staff_advance_data.advanceId = salary_salaryWiseAdvanceId_data.advanceId
                                                    WHERE salaryId IN (SELECT COALESCE(salaryId,null) FROM staff_salary_data WHERE staff_salary_data.remainSalaryId = '${remainSalaryId}');
                                                    SELECT
                                                        salary_salaryWiseFineId_data.fineId,
                                                        staff_fine_data.fineAmount,
                                                        staff_fine_data.fineAmount AS remainFineAmount,
                                                        cutFineAmount,
                                                        DATE_FORMAT(staff_fine_data.fineDate,'%d-%b-%Y') AS fineDate
                                                    FROM
                                                        salary_salaryWiseFineId_data
                                                    INNER JOIN staff_fine_data ON staff_fine_data.fineId = salary_salaryWiseFineId_data.fineId
                                                    WHERE salaryId IN (SELECT COALESCE(salaryId,null) FROM staff_salary_data WHERE staff_salary_data.remainSalaryId = '${remainSalaryId}');
                                                    SELECT remainSalaryAmt, remainAdvanceAmt, remainFineAmt FROM staff_remainSalaryHistory_data
                                                    WHERE remainSalaryId = '${remainSalaryId}'`;
                    console.log(sql_queries_getCutSalaryData)
                    pool.query(sql_queries_getCutSalaryData, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const monthlySalaryCut = data[0];
                        if (monthlySalaryCut && monthlySalaryCut.length > 0) {
                            monthlySalaryCut[0].totalSalary = remainSalaryAmt;
                        }
                        const advanceSalaryCut = data[1];
                        console.log(advanceSalaryCut);
                        if (advanceSalaryCut && advanceSalaryCut.length > 0) {
                            advanceSalaryCut[0].remainAdvanceAmount = remainAdvanceAmt;
                        }
                        const fineSalaryCut = data[2];
                        if (fineSalaryCut && fineSalaryCut.length > 0) {
                            fineSalaryCut[0].remainFineAmount = remainFineAmt;
                        }
                        const remainSalaryAmount = data[3][0].remainSalaryAmt;
                        const remainAdvanceAmount = data[3][0].remainAdvanceAmt;
                        const remainFineAmount = data[3][0].remainFineAmt;

                        return res.status(200).send({
                            monthlySalaryCut,
                            advanceSalaryCut,
                            fineSalaryCut,
                            remainSalaryAmount,
                            remainAdvanceAmount,
                            remainFineAmount
                        });
                    })
                })
            }
            else {
                return res.status(400).send('SalaryId not found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getCutCreditDataById = (req, res) => {
    try {
        const cafId = req.query.cafId;
        if (!cafId) {
            return res.status(400).send('cafId Not Found');
        }
        sql_query_getcafId = `SELECT cafId, creditType FROM staff_creditAdvanceFine_data WHERE cafId = '${cafId}'`;
        pool.query(sql_query_getcafId, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row?.[0]?.cafId?.length) {
                const creditType = row[0].creditType;
                if (creditType == 'Advance') {
                    sql_queries_getCutCreditData = `SELECT
                                                        staff_advance_data.advanceAmount AS Amount,
                                                        cutCreditAmount AS cutCreditAmount,
                                                        DATE_FORMAT(
                                                            staff_advance_data.advanceDate,
                                                            '%d-%b-%Y'
                                                        ) AS Date
                                                    FROM
                                                        staff_creditWiseAdvanceId_data
                                                    INNER JOIN staff_advance_data ON staff_advance_data.advanceId = staff_creditWiseAdvanceId_data.advanceId
                                                    WHERE creditId = '${cafId}'`;
                } else if (creditType == 'Fine') {
                    sql_queries_getCutCreditData = `SELECT
                                                        staff_fine_data.fineAmount AS Amount,
                                                        cutCreditAmount AS cutCreditAmount,
                                                        DATE_FORMAT(
                                                            staff_fine_data.fineDate,
                                                            '%d-%b-%Y'
                                                        ) AS Date
                                                    FROM
                                                        staff_creditWiseFineId_data
                                                    INNER JOIN staff_fine_data ON staff_fine_data.fineId = staff_creditWiseFineId_data.fineId
                                                    WHERE creditId = '${cafId}'`;
                } else {
                    return res.status(401).send('Credit Type Not Found');
                }
                pool.query(sql_queries_getCutCreditData, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send(data);
                })
            } else {
                return res.status(400).send('cafId Not Found');
            }
        })

    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get All Payment Statistics Count By Id

const getAllPaymentStatisticsCountById = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        console.log(startMonth, endMonth);
        if (req.query.startMonth && req.query.endMonth) {
            sql_queries_getStatisticsCountById = `SELECT 
                                                    COALESCE(SUM(advanceAmount),0) AS totalAdvance
                                            FROM 
                                                    staff_advance_data 
                                            WHERE employeeId = '${employeeId}' AND DATE_FORMAT(advanceDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';
                                            SELECT
                                                COALESCE(SUM(fineAmount),0) AS totalFine,
                                                COALESCE(SUM(CASE WHEN fineStatus = 1 THEN fineAmount ELSE 0 END), 0) AS totalConsiderFine,
                                                COALESCE(SUM(CASE WHEN fineStatus = 0 THEN remainFineAmount ELSE 0 END), 0) AS totalIgnoreFine
                                            FROM 
                                                staff_fine_data
                                            WHERE employeeId = '${employeeId}' AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';
                                            SELECT
                                                COALESCE(SUM(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount ELSE 0 END), 0) AS totalSalaryPay,
                                                COALESCE(SUM(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount ELSE 0 END), 0) AS totalFineCut,
                                                COALESCE(SUM(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount ELSE 0 END), 0) AS totalAdvanceCut
                                            FROM
                                                staff_salary_data
                                            WHERE
                                                employeeId = '${employeeId}' AND DATE_FORMAT(staff_salary_data.salaryDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';
                                            SELECT 
                                                COALESCE(SUM(creditAmount),0) AS totalCreditAmount
                                            FROM
                                                staff_creditAdvanceFine_data 
                                            WHERE employeeId = '${employeeId}' AND DATE_FORMAT(creditDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';
                                            SELECT 
                                                COALESCE(SUM(bonusAmount),0) AS totalBonusAmount 
                                            FROM 
                                                staff_bonus_data 
                                            WHERE employeeId = '${employeeId}' AND DATE_FORMAT(bonusDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';
                                            SELECT COALESCE(SUM(remainSalary),0) AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${employeeId}';
                                            SELECT COALESCE(SUM(remainFineAmount),0) AS totalRemainFine FROM staff_fine_data WHERE employeeId = '${employeeId}' AND fineStatus = 1;
                                            SELECT COALESCE(SUM(remainAdvanceAmount),0) AS totalRemainAdvance FROM staff_advance_data WHERE employeeId = '${employeeId}'`;
        }
        else {
            sql_queries_getStatisticsCountById = `SELECT 
                                                    COALESCE(SUM(advanceAmount),0) AS totalAdvance
                                            FROM 
                                                    staff_advance_data 
                                            WHERE employeeId = '${employeeId}';
                                            SELECT
                                                COALESCE(SUM(fineAmount),0) AS totalFine,
                                                COALESCE(SUM(CASE WHEN fineStatus = 1 THEN fineAmount ELSE 0 END), 0) AS totalConsiderFine,
                                                COALESCE(SUM(CASE WHEN fineStatus = 0 THEN remainFineAmount ELSE 0 END), 0) AS totalIgnoreFine
                                            FROM staff_fine_data
                                            WHERE employeeId = '${employeeId}';
                                           SELECT
                                                COALESCE(SUM(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END), 0) AS advanceCutSum,
                                                COALESCE(SUM(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END), 0) AS fineCutSum,
                                                COALESCE(SUM(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END), 0) AS salaryPaySum
                                            FROM
                                                staff_salary_data
                                            WHERE
                                                employeeId = '${employeeId}';
                                            SELECT 
                                                COALESCE(SUM(creditAmount),0) AS totalCreditAmount
                                            FROM 
                                                staff_creditAdvanceFine_data 
                                            WHERE employeeId = '${employeeId}';
                                            SELECT 
                                                COALESCE(SUM(bonusAmount),0) AS totalBonusAmount 
                                            FROM 
                                                staff_bonus_data 
                                            WHERE employeeId = '${employeeId}';
                                            SELECT COALESCE(SUM(remainSalary),0) AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${employeeId}';
                                            SELECT COALESCE(SUM(remainFineAmount),0) AS totalRemainFine FROM staff_fine_data WHERE employeeId = '${employeeId}' AND fineStatus = 1;
                                            SELECT COALESCE(SUM(remainAdvanceAmount),0) AS totalRemainAdvance FROM staff_advance_data WHERE employeeId = '${employeeId}'`;
        }
        pool.query(sql_queries_getStatisticsCountById, (err, date) => {
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

const getPresentDaysByEmployeeId = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        if (!employeeId) {
            res.status(401).send('EmployeeId Is Not Found');
        }
        sql_queries_countDay = `SELECT  
                                    SUM(
                                        DATEDIFF(
                                            smsd.msEndDate,
                                            smsd.msStartDate
                                        ) + 1 -(
                                        SELECT
                                            COALESCE(SUM(sl.numLeave),
                                            0)
                                        FROM
                                            staff_leave_data sl
                                        WHERE
                                            sl.employeeId = smsd.employeeId AND sl.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                    )
                                    ) AS daysOfSalary
                                FROM
                                    staff_monthlySalary_data smsd
                                WHERE smsd.employeeId = '${employeeId}';
                                SELECT
                                    DATEDIFF(
                                        CURDATE(), DATE_ADD(msEndDate, INTERVAL 1 DAY)) -(
                                        SELECT
                                            COALESCE(SUM(sl.numLeave),
                                            0)
                                        FROM
                                            staff_leave_data sl
                                        WHERE
                                            sl.employeeId = smsd.employeeId AND sl.leaveDate BETWEEN DATE_ADD(msEndDate, INTERVAL 1 DAY) AND CURDATE()) AS currentMonthPresentDays
                                FROM
                                    staff_monthlySalary_data AS smsd
                                WHERE smsd.employeeId = '${employeeId}'
                                ORDER BY
                                    msEndDate DESC
                                LIMIT 1;
                                SELECT
                                    SUM(
                                      DATEDIFF(
                                        smsd.msEndDate,
                                        smsd.msStartDate
                                      ) + 1 - (
                                        SELECT
                                                COALESCE(SUM(sl.numLeave),
                                          0)
                                            FROM
                                                staff_leave_data sl
                                            WHERE
                                                sl.employeeId = smsd.employeeId AND sl.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                                    )
                                        ) AS daysOfSalaryAlert
                                    FROM
                                        staff_monthlySalary_data smsd
                                    LEFT JOIN(
                                      SELECT
                                            salary_history_data.employeeId,
                                      salary_history_data.startDate AS lastUpdateSalaryDate
                                        FROM
                                            salary_history_data
                                        WHERE
                                            salary_history_data.employeeId = '${employeeId}'
                                        ORDER BY
                                            salary_history_data.startDate
                                        DESC
                                    LIMIT 1
                                    ) AS shDate
                                    ON
                                    smsd.employeeId = shDate.employeeId
                                    WHERE
                                    smsd.employeeId = '${employeeId}' AND smsd.msStartDate >= shDate.lastUpdateSalaryDate;`;
        pool.query(sql_queries_countDay, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const daysOfSalary = data && data[0][0].daysOfSalary ? data[0][0].daysOfSalary : 0;
            const currentMonthPresentDays = data && data[1][0].currentMonthPresentDays ? data[1][0].currentMonthPresentDays : 0;
            const alertDay = data && data[2][0].daysOfSalaryAlert ? data[1][0].daysOfSalaryAlert : 0;
            const totalPresentDays = daysOfSalary + currentMonthPresentDays;
            const days = totalPresentDays;
            const totalPresentDaysInword = convertDaysToYearsMonthsDays(days);
            return res.status(200).send({
                totalPresentDaysInword: totalPresentDaysInword ? `${totalPresentDaysInword}` : '0 days',
                totalPresentDays: totalPresentDays ? `${totalPresentDays} days` : '0 days',
                alertDay: alertDay + currentMonthPresentDays ? alertDay + currentMonthPresentDays : 0
            });

        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getEmployeeMonthlySalaryById,
    getAdvanceDataById,
    getFineDataById,
    getBonusDataById,
    getCreditDataById,
    getLeaveDataById,
    getTransactionDataById,
    getCutSalaryDataById,
    getAllPaymentStatisticsCountById,
    getCutCreditDataById,
    getPresentDaysByEmployeeId
}