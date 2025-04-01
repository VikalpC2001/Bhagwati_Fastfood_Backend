const pool = require('../../database');

// get Employee Data For App

const getEmployeeDataForApp = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        const categoryId = req.query.categoryId;
        const employeeStatus = req.query.employeeStatus ? req.query.employeeStatus : 1;

        console.log(req.query.employeeStatus ? req.query.employeeStatus : 1, 'lllll');

        const sql_common_query = `SELECT
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
                                     ORDER BY sed.employeeFirstName
                                     LIMIT ${limit}`;
        } else {
            sql_query_getEmployee = `${sql_common_query}
                                     WHERE sed.employeeStatus = ${employeeStatus}
                                     ORDER BY sed.employeeFirstName
                                     LIMIT ${limit}`;
        }
        pool.query(sql_query_getEmployee, (err, data) => {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })

    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Employee Leaves List

const getAllEmployeeLeaveDataForApp = (req, res) => {
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
                console.error("An error occurred in SQL Queery", err);
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
                                                sed.imageLink AS imageLink,
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
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = []
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Employee Monthly Data By ID

const getEmployeeMonthlySalaryByIdForApp = (req, res) => {
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
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commonQuery = `SELECT
                                        smsd.monthlySalaryId,
                                        smsd.totalSalary,
                                        smsd.remainSalary,
                                        smsd.maxLeave,
                                        (SELECT salary FROM salary_history_data
                                         WHERE employeeId = '${employeeId}' AND (msEndDate BETWEEN startDate AND endDate
                                         OR (endDate = startDate AND msEndDate > endDate))
                                         ORDER BY startDate DESC
                                         LIMIT 1) AS thisMonthSalary,
                                        COALESCE(FLOOR(
                                                        (SELECT salary FROM salary_history_data
                                                         WHERE employeeId = '${employeeId}' AND (msEndDate BETWEEN startDate AND endDate
                                                         OR (endDate = startDate AND msEndDate > endDate))
                                                         ORDER BY startDate DESC
                                                         LIMIT 1)
                                                        / DAY(LAST_DAY(msEndDate))),0) AS perDaySalary,
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
                                        COALESCE(FLOOR( (SELECT salary FROM salary_history_data
                                                         WHERE employeeId = '${employeeId}' AND (msEndDate BETWEEN startDate AND endDate
                                                         OR (endDate = startDate AND msEndDate > endDate))
                                                         ORDER BY startDate DESC
                                                         LIMIT 1)/ DAY(LAST_DAY(msEndDate))),
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
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = []
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Employee Leave Data By Id

const getLeaveDataByIdForApp = (req, res) => {
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
                console.error("An error occurred in SQL Queery", err);
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
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
                        if (numRows === 0) {
                            const rows = []
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Category Data

const getStaffCategoryWithEmployeeNumberForApp = (req, res) => {
    try {
        sql_querry_getStaffcategorywithempNum = `SELECT '' AS staffCategoryId, "All" AS staffCategoryName, COALESCE(COUNT(employeeId),0) AS numberOfEmployee FROM staff_employee_data WHERE employeeStatus = 1;
                                                SELECT staffCategoryId, staffCategoryName, COALESCE(num,0) As numberOfEmployee  FROM staff_category_data AS scd
                                                    LEFT JOIN (
                                                    	SELECT COUNT(employeeId) AS num,staff_employee_data.category FROM staff_employee_data
                                                        WHERE staff_employee_data.employeeStatus = 1
                                                        GROUP BY category
                                                    ) AS sed ON scd.staffCategoryId = sed.category
                                                ORDER BY staffCategoryName;
                                                SELECT '9999' AS staffCategoryId, "InActive List" AS staffCategoryName, COALESCE(COUNT(employeeId),0) AS numberOfEmployee FROM staff_employee_data WHERE employeeStatus = 0`;
        pool.query(sql_querry_getStaffcategorywithempNum, (err, data) => {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }
            const categoryDataWithNum = data.flat(1);
            return res.status(200).send(categoryDataWithNum);
        })
    } catch (error) {
        console.log('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Employee Statics Data By Id

const getAllPaymentStatisticsCountByIdForApp = (req, res) => {
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
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const mergedObject = Object.assign({}, ...date.map(arr => arr[0] || {}));
            return res.status(200).send(mergedObject);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getEmployeeDataForApp,
    getAllEmployeeLeaveDataForApp,
    getEmployeeMonthlySalaryByIdForApp,
    getLeaveDataByIdForApp,
    getStaffCategoryWithEmployeeNumberForApp,
    getAllPaymentStatisticsCountByIdForApp
}