const pool = require('../../database');
const jwt = require("jsonwebtoken");

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
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_monthlySalary_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(msEndDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'`;
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
                                        COALESCE(FLOOR(e.salary / 30),
                                        0) AS perDaySalary,
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
                                                WHERE smsd.employeeId = '${employeeId}' AND DATE_FORMAT(msEndDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'
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
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_advance_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(advanceDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'`;
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
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(advanceDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'
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
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        if (req.query.startMonth && req.query.endMonth) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_fine_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(fineDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'`;
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
                                                reason,
                                                DATE_FORMAT(fineDate, '%d-%b-%Y') AS fineDate,
                                                DATE_FORMAT(fineCreationDate, '%h:%i %p') AS givenTime
                                            FROM
                                                staff_fine_data
                                            LEFT JOIN user_details ON user_details.userId = staff_fine_data.userId`;
                if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commanQuarryOfFine}
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(fineDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'
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
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_bonus_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(bonusDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'`;
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
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(bonusDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'
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
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_creditAdvanceFine_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(creditDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'`;
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
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(creditDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'
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
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM staff_leave_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(leaveDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'`;
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
                                                DATE_FORMAT(leaveDate,'%W, %d %M %Y') leaveDate
                                            FROM
                                                staff_leave_data
                                            LEFT JOIN user_details ON user_details.userId = staff_leave_data.userId`;
                if (req.query.startMonth && req.query.endMonth) {
                    sql_queries_getdetails = `${commanQuarryOfLeave}
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(leaveDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'
                                                ORDER BY leaveDate DESC
                                                LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarryOfLeave}
                                                WHERE employeeId = '${employeeId}'
                                                ORDER BY leaveDate DESC
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
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (SELECT remainSalaryId FROM staff_salary_data WHERE employeeId = '${employeeId}' AND DATE_FORMAT(staff_salary_data.salaryDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}' GROUP BY remainSalaryId) AS transactionCount`;
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
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryId END),0) AS cutAdvanceId,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryId END),0) AS cutFineId,
                                                    COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryId END),0) AS salaryId,
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
                                                WHERE employeeId = '${employeeId}' AND DATE_FORMAT(staff_salary_data.salaryDate,'%m-%Y') BETWEEN '${startMonth}' AND '${endMonth}'
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

module.exports = {
    getEmployeeMonthlySalaryById,
    getAdvanceDataById,
    getFineDataById,
    getBonusDataById,
    getCreditDataById,
    getLeaveDataById,
    getTransactionDataById
}