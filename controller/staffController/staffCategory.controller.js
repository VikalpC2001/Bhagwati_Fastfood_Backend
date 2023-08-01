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
                sql_querry_getdetails = `SELECT staffCategoryId, staffCategoryName, staffCategoryPosition FROM staff_category_data ORDER BY staffCategoryPosition LIMIT ${limit}`;
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
        sql_querry_getStaffcategorywithempNum = `SELECT staffCategoryId, staffCategoryName, num As numberOfEmployee  FROM staff_category_data AS scd
                                                    LEFT JOIN (
                                                    	SELECT COUNT(employeeId) AS num,staff_employee_data.category FROM staff_employee_data
                                                        GROUP BY category
                                                    ) AS sed ON scd.staffCategoryId = sed.category`;
        pool.query(sql_querry_getStaffcategorywithempNum, (err, data) => {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
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
    getStaffCategoryWithEmployeeNumber
}

// [
//     'Manager',
//     'Asistant Manager',
//     'Accoutant',
//     'sa'
// ]