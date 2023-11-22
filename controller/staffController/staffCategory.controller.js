const pool = require('../../database');

// Add Staff Category

const addStaffCategory = (req, res) => {
    try {
        const { body } = req;
        const requiredFields = ['staffCategoryName', 'staffCategoryPosition'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return res.status(400).send(`Please provide a value for ${field}`);
            }
        }

        const uid1 = new Date();
        const staffCategoryId = 'staffCategory_' + uid1.getTime();
        const staffCategoryName = body.staffCategoryName.trim();
        const staffCategoryPosition = body.staffCategoryPosition;
        pool.query(`SELECT staffCategoryName FROM staff_category_data WHERE staffCategoryName = '${staffCategoryName}';
                    SELECT staffCategoryPosition FROM staff_category_data WHERE staffCategoryPosition = ${staffCategoryPosition}`, function (err, rows) {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }
            if (rows[0].length > 0) {
                return res.status(400).send('CategoryName is Already Added');
            } else if (rows[1].length > 0) {
                return res.status(400).send('Position is Already Added');
            } else {
                sql_query_addStaffCategory = `INSERT INTO staff_category_data(
                                                                                staffCategoryId,
                                                                                staffCategoryName,
                                                                                staffCategoryPosition
                                                                            )
                                                                            VALUES(
                                                                                '${staffCategoryId}',
                                                                                '${staffCategoryName}',
                                                                                ${staffCategoryPosition}
                                                                            )`;
                pool.query(sql_query_addStaffCategory, (err, data) => {
                    if (err) {
                        console.error('An error occurred in SQL Query', err);
                        return res.status(500).send('Database Error');
                    }
                    console.log('Data inserted successfully');
                    res.status(200).send('Data uploaded successfully');
                })
            }
        })
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove StaffC ategory

const removeStaffCategory = async (req, res) => {

    try {
        var staffCategoryId = req.query.staffCategoryId.trim();
        req.query.staffCategoryId = pool.query(`SELECT staffCategoryId FROM staff_category_data WHERE staffCategoryId = '${staffCategoryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM staff_category_data WHERE staffCategoryId = '${staffCategoryId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Category Deleted Successfully");
                })
            } else {
                return res.send('CategoryId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// DDL API For staffCategory

const ddlStaffCategory = (req, res) => {
    try {
        sql_query_getddlCategory = `SELECT staffCategoryId, staffCategoryName FROM staff_category_data ORDER BY staffCategoryPosition`;
        pool.query(sql_query_getddlCategory, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getStaffCategoryList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        sql_query_getTotallCategory = `SELECT count(*) AS numRows FROM staff_category_data`;
        pool.query(sql_query_getTotallCategory, (err, rows) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                sql_querry_getdetails = `SELECT
                                            scd.staffCategoryId,
                                            scd.staffCategoryName,
                                            SUM(CASE WHEN sed.employeeStatus = 1 THEN sed.salary ELSE 0 END) AS totalSalary,
                                            COUNT(CASE WHEN sed.employeeStatus = 1 THEN sed.employeeId END) AS numberOfActiveEmployee,
                                            COUNT(CASE WHEN sed.employeeStatus = 0 THEN sed.employeeId END) AS numberOfInActiveEmployee,
                                            CONCAT(CAST((SUM(CASE WHEN sed.employeeStatus = 1 THEN sed.salary ELSE 0 END) / activeTotal.totalActiveSalary) * 100 AS UNSIGNED),' %') AS percentageOfTotalSalary,
                                            scd.staffCategoryPosition
                                        FROM
                                            staff_category_data AS scd
                                        LEFT JOIN staff_employee_data AS sed ON scd.staffCategoryId = sed.category
                                        LEFT JOIN (
                                            SELECT SUM(salary) AS totalActiveSalary
                                            FROM staff_employee_data
                                            WHERE employeeStatus = 1
                                        ) AS activeTotal ON 1 = 1
                                        GROUP BY
                                            scd.staffCategoryId, scd.staffCategoryName, scd.staffCategoryPosition, activeTotal.totalActiveSalary
                                        ORDER BY
                                            scd.staffCategoryPosition
                                        LIMIT ${limit}`;
                pool.query(sql_querry_getdetails, (err, rows) => {
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
                })
            }
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Staff Category

const updateStaffCategory = (req, res) => {
    try {
        const { body } = req;
        const requiredFields = ['staffCategoryName', 'staffCategoryPosition'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return res.status(400).send(`Please provide a value for ${field}`);
            }
        }

        const staffCategoryId = req.body.staffCategoryId;
        const staffCategoryName = body.staffCategoryName.trim();
        const staffCategoryPosition = body.staffCategoryPosition;
        pool.query(`SELECT staffCategoryName FROM staff_category_data WHERE staffCategoryName NOT IN ('${staffCategoryName}');
                    SELECT staffCategoryPosition FROM staff_category_data WHERE staffCategoryPosition NOT IN (${staffCategoryPosition})`, function (err, rows) {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }
            var staffCategoryData = rows[0];
            var staffCategoryPositionData = rows[1];
            const staffCategoryNames = staffCategoryData.map((row) => row.staffCategoryName);
            const staffCategoryPositionNumber = staffCategoryPositionData.map((row) => row.staffCategoryPosition);
            console.log('???', staffCategoryName, staffCategoryPositionNumber)
            const isCategoryNameExists = staffCategoryNames.includes(staffCategoryName);
            const isCategoryPositionExists = staffCategoryPositionNumber.includes(staffCategoryPosition);
            console.log('?>>.', isCategoryNameExists, isCategoryPositionExists);
            if (isCategoryNameExists) {
                return res.status(400).send('CategoryName is Already Added Or No Change');
            } else if (isCategoryPositionExists) {
                return res.status(400).send('Position is Already Added Or No Change');
            } else {
                sql_query_updateStaffCategory = `UPDATE
                                                        staff_category_data
                                                    SET
                                                        staffCategoryName = '${staffCategoryName}',
                                                        staffCategoryPosition = ${staffCategoryPosition}
                                                    WHERE
                                                        staffCategoryId = '${staffCategoryId}'`;
                pool.query(sql_query_updateStaffCategory, (err, data) => {
                    if (err) {
                        console.error('An error occurred in SQL Query', err);
                        return res.status(500).send('Database Error');
                    }
                    console.log('Data inserted successfully');
                    res.status(200).send('Data updated successfully');
                })
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get staffCategory with Employe Number

const getStaffCategoryWithEmployeeNumber = (req, res) => {
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
        console.log('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const getEmployeeStatisticsByCategoryId = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const categoryId = req.query.categoryId;
        const employeeStatus = req.query.employeeStatus;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        if (req.query.categoryId && req.query.startMonth && req.query.endMonth) {
            sql_querry_getEmployeeStatistics = `SELECT COALESCE(SUM(salary),0) AS totalSalary FROM staff_employee_data 
                                                WHERE employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_monthlySalary_data.remainSalary),0) AS remainSalary FROM staff_monthlySalary_data 
                                                WHERE staff_monthlySalary_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_advance_data.remainAdvanceAmount),0) AS remainAdvance FROM staff_advance_data 
                                                WHERE staff_advance_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_fine_data.remainFineAmount),0) AS remainFine FROM staff_fine_data 
                                                WHERE staff_fine_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus}) AND staff_fine_data.fineStatus = 1;

                                                SELECT COALESCE(SUM(staff_advance_data.advanceAmount),0) AS advanceAmount FROM staff_advance_data 
                                                WHERE staff_advance_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus}) AND DATE_FORMAT(advanceDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';

                                                SELECT COALESCE(SUM(staff_fine_data.fineAmount),0) AS fineAmount, COALESCE(SUM(CASE WHEN fineStatus = 1 THEN fineAmount ELSE 0 END), 0) AS totalConsiderFine, COALESCE(SUM(CASE WHEN fineStatus = 0 THEN remainFineAmount ELSE 0 END), 0) AS totalIgnoreFine FROM staff_fine_data 
                                                WHERE staff_fine_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus}) AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';

                                                SELECT COALESCE(SUM(staff_bonus_data.bonusAmount),0) AS bonusAmount FROM staff_bonus_data
                                                WHERE staff_bonus_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus}) AND DATE_FORMAT(bonusDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';
                                                
                                                SELECT COALESCE(SUM(paymentDue), 0) AS remainPaySalary
                                                FROM (
                                                    -- Your original query here
                                                    SELECT
                                                        sed.employeeId,
                                                        COALESCE(SUM(smsd.remainSalary), 0) - COALESCE(SUM(sad.remainAdvanceAmount), 0) - COALESCE(SUM(sfd.remainFineAmount), 0) AS paymentDue
                                                    FROM
                                                        staff_employee_data AS sed
                                                    LEFT JOIN staff_advance_data AS sad ON sed.employeeId = sad.employeeId AND sad.remainAdvanceAmount != 0
                                                    LEFT JOIN staff_fine_data AS sfd ON sed.employeeId = sfd.employeeId AND sfd.remainFineAmount != 0 AND sfd.fineStatus = 1
                                                    LEFT JOIN staff_monthlySalary_data AS smsd ON sed.employeeId = smsd.employeeId AND smsd.remainSalary != 0
                                                    WHERE sed.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus})
                                                    GROUP BY sed.employeeId
                                                    HAVING paymentDue > 0
                                                ) AS subquery`;
        } else if (req.query.startMonth && req.query.endMonth && req.query.employeeStatus) {
            sql_querry_getEmployeeStatistics = `SELECT COALESCE(SUM(salary),0) AS totalSalary FROM staff_employee_data 
                                                WHERE employeeStatus = ${employeeStatus};

                                                SELECT COALESCE(SUM(staff_monthlySalary_data.remainSalary),0) AS remainSalary FROM staff_monthlySalary_data
                                                WHERE staff_monthlySalary_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_advance_data.remainAdvanceAmount),0) AS remainAdvance FROM staff_advance_data
                                                WHERE staff_advance_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_fine_data.remainFineAmount),0) AS remainFine FROM staff_fine_data 
                                                WHERE staff_fine_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus}) AND staff_fine_data.fineStatus = 1;

                                                SELECT COALESCE(SUM(staff_advance_data.advanceAmount),0) AS advanceAmount FROM staff_advance_data 
                                                WHERE staff_advance_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus}) AND DATE_FORMAT(advanceDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';

                                                SELECT COALESCE(SUM(staff_fine_data.fineAmount),0) AS fineAmount,COALESCE(SUM(CASE WHEN fineStatus = 1 THEN fineAmount ELSE 0 END), 0) AS totalConsiderFine, COALESCE(SUM(CASE WHEN fineStatus = 0 THEN remainFineAmount ELSE 0 END), 0) AS totalIgnoreFine FROM staff_fine_data 
                                                WHERE staff_fine_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus}) AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';

                                                SELECT COALESCE(SUM(staff_bonus_data.bonusAmount),0) AS bonusAmount FROM staff_bonus_data
                                                WHERE staff_bonus_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus}) AND DATE_FORMAT(bonusDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}';
                                                
                                                SELECT COALESCE(SUM(paymentDue), 0) AS remainPaySalary
                                                FROM (
                                                    -- Your original query here
                                                    SELECT
                                                        sed.employeeId,
                                                        COALESCE(SUM(smsd.remainSalary), 0) - COALESCE(SUM(sad.remainAdvanceAmount), 0) - COALESCE(SUM(sfd.remainFineAmount), 0) AS paymentDue
                                                    FROM
                                                        staff_employee_data AS sed
                                                    LEFT JOIN staff_advance_data AS sad ON sed.employeeId = sad.employeeId AND sad.remainAdvanceAmount != 0
                                                    LEFT JOIN staff_fine_data AS sfd ON sed.employeeId = sfd.employeeId AND sfd.remainFineAmount != 0 AND sfd.fineStatus = 1
                                                    LEFT JOIN staff_monthlySalary_data AS smsd ON sed.employeeId = smsd.employeeId AND smsd.remainSalary != 0
                                                    WHERE employeeStatus = ${employeeStatus}
                                                    GROUP BY sed.employeeId
                                                    HAVING paymentDue > 0
                                                ) AS subquery;`;
        } else if (req.query.categoryId) {
            sql_querry_getEmployeeStatistics = `SELECT COALESCE(SUM(salary),0) AS totalSalary FROM staff_employee_data 
                                                WHERE employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = 1);

                                                SELECT COALESCE(SUM(staff_monthlySalary_data.remainSalary),0) AS remainSalary FROM staff_monthlySalary_data 
                                                WHERE staff_monthlySalary_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_advance_data.remainAdvanceAmount),0) AS remainAdvance FROM staff_advance_data 
                                                WHERE staff_advance_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_fine_data.remainFineAmount),0) AS remainFine FROM staff_fine_data 
                                                WHERE staff_fine_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus}) AND staff_fine_data.fineStatus = 1;

                                                SELECT COALESCE(SUM(staff_advance_data.advanceAmount),0) AS advanceAmount FROM staff_advance_data 
                                                WHERE staff_advance_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus}) AND advanceDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');

                                                SELECT COALESCE(SUM(staff_fine_data.fineAmount),0) AS fineAmount, COALESCE(SUM(CASE WHEN fineStatus = 1 THEN fineAmount ELSE 0 END), 0) AS totalConsiderFine, COALESCE(SUM(CASE WHEN fineStatus = 0 THEN remainFineAmount ELSE 0 END), 0) AS totalIgnoreFine FROM staff_fine_data 
                                                WHERE staff_fine_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus}) AND fineDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');

                                                SELECT COALESCE(SUM(staff_bonus_data.bonusAmount),0) AS bonusAmount FROM staff_bonus_data
                                                WHERE staff_bonus_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = ${employeeStatus}) AND bonusDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                                
                                                SELECT COALESCE(SUM(paymentDue), 0) AS remainPaySalary
                                                FROM (
                                                    -- Your original query here
                                                    SELECT
                                                        sed.employeeId,
                                                        COALESCE(SUM(smsd.remainSalary), 0) - COALESCE(SUM(sad.remainAdvanceAmount), 0) - COALESCE(SUM(sfd.remainFineAmount), 0) AS paymentDue
                                                    FROM
                                                        staff_employee_data AS sed
                                                    LEFT JOIN staff_advance_data AS sad ON sed.employeeId = sad.employeeId AND sad.remainAdvanceAmount != 0
                                                    LEFT JOIN staff_fine_data AS sfd ON sed.employeeId = sfd.employeeId AND sfd.remainFineAmount != 0 AND sfd.fineStatus = 1
                                                    LEFT JOIN staff_monthlySalary_data AS smsd ON sed.employeeId = smsd.employeeId AND smsd.remainSalary != 0
                                                    WHERE sed.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE category = '${categoryId}' AND employeeStatus = 1)
                                                    GROUP BY sed.employeeId
                                                    HAVING paymentDue > 0
                                                ) AS subquery`;
        } else {
            sql_querry_getEmployeeStatistics = `SELECT COALESCE(SUM(salary),0) AS totalSalary FROM staff_employee_data 
                                                WHERE employeeStatus = ${employeeStatus};

                                                SELECT COALESCE(SUM(staff_monthlySalary_data.remainSalary),0) AS remainSalary FROM staff_monthlySalary_data 
                                                WHERE staff_monthlySalary_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_advance_data.remainAdvanceAmount),0) AS remainAdvance FROM staff_advance_data 
                                                WHERE staff_advance_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus});

                                                SELECT COALESCE(SUM(staff_fine_data.remainFineAmount),0) AS remainFine FROM staff_fine_data 
                                                WHERE staff_fine_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus}) AND staff_fine_data.fineStatus = 1;

                                                SELECT COALESCE(SUM(staff_advance_data.advanceAmount),0) AS advanceAmount FROM staff_advance_data 
                                                WHERE staff_advance_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus}) AND advanceDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');

                                                SELECT COALESCE(SUM(staff_fine_data.fineAmount),0) AS fineAmount,COALESCE(SUM(CASE WHEN fineStatus = 1 THEN fineAmount ELSE 0 END), 0) AS totalConsiderFine, COALESCE(SUM(CASE WHEN fineStatus = 0 THEN remainFineAmount ELSE 0 END), 0) AS totalIgnoreFine FROM staff_fine_data 
                                                WHERE staff_fine_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus}) AND fineDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');

                                                SELECT COALESCE(SUM(staff_bonus_data.bonusAmount),0) AS bonusAmount FROM staff_bonus_data
                                                WHERE staff_bonus_data.employeeId IN (SELECT COALESCE(employeeId,null) FROM staff_employee_data WHERE employeeStatus = ${employeeStatus}) AND bonusDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                                
                                                SELECT COALESCE(SUM(paymentDue), 0) AS remainPaySalary
                                                FROM (
                                                    -- Your original query here
                                                    SELECT
                                                        sed.employeeId,
                                                        COALESCE(SUM(smsd.remainSalary), 0) - COALESCE(SUM(sad.remainAdvanceAmount), 0) - COALESCE(SUM(sfd.remainFineAmount), 0) AS paymentDue
                                                    FROM
                                                        staff_employee_data AS sed
                                                    LEFT JOIN staff_advance_data AS sad ON sed.employeeId = sad.employeeId AND sad.remainAdvanceAmount != 0
                                                    LEFT JOIN staff_fine_data AS sfd ON sed.employeeId = sfd.employeeId AND sfd.remainFineAmount != 0 AND sfd.fineStatus = 1
                                                    LEFT JOIN staff_monthlySalary_data AS smsd ON sed.employeeId = smsd.employeeId AND smsd.remainSalary != 0
                                                    WHERE employeeStatus = ${employeeStatus}
                                                    GROUP BY sed.employeeId
                                                    HAVING paymentDue > 0
                                                ) AS subquery`;
        }
        pool.query(sql_querry_getEmployeeStatistics, (err, data) => {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }
            const staticsJson = {
                "totalSalary": data[0][0].totalSalary,
                "remainSalary": data[1][0].remainSalary,
                "remainAdvance": data[2][0].remainAdvance,
                "remainFine": data[3][0].remainFine,
                "totalDueSalary": data[1][0].remainSalary - data[2][0].remainAdvance - data[3][0].remainFine,
                "advanceAmount": data[4][0].advanceAmount,
                "fineAmount": data[5][0].fineAmount,
                "totalConsiderFine": data[5][0].totalConsiderFine,
                "totalIgnoreFine": data[5][0].totalIgnoreFine,
                "bonusAmount": data[6][0].bonusAmount,
                "remainPaySalary": data[7][0].remainPaySalary,
            }
            return res.status(200).send(staticsJson);
        })
    } catch (error) {
        console.log('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    addStaffCategory,
    removeStaffCategory,
    ddlStaffCategory,
    getStaffCategoryList,
    updateStaffCategory,
    getStaffCategoryWithEmployeeNumber,
    getEmployeeStatisticsByCategoryId
}