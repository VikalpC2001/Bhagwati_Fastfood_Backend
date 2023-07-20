const pool = require('../../database');

const addStaffCategory = (req, res) => {
    try {
        const { body } = req;
        const requiredFields = ['staffCategoryName', 'positionNumber'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return res.status(400).send(`Please provide a value for ${field}`);
            }
        }

        const uid1 = new Date();
        const staffCategoryId = 'staffCategory_' + uid1.getTime();
        const staffCategoryName = body.staffCategoryName.trim();
        const positionNumber = body.positionNumber;
        pool.query(`SELECT staffCategoryName, staffCategoryPosition FROM staff_category_data WHERE staffCategoryName = '${staffCategoryName}'`, function (err, rows) {
            if (err) {
                console.error('An error occurred in SQL Query', err);
                return res.status(500).send('Database Error');
            }

            if (rows[0].staffCategoryName.length > 0 || rows[0].staffCategoryName.length > 0) {
                return res.status(400).send('Employee is Already Added');
            } else {
                sql_query_addStaffCategory = `INSERT INTO staff_category_data(
                                                                                staffCategoryId,
                                                                                staffCategoryName,
                                                                                staffCategoryPosition
                                                                            )
                                                                            VALUES(
                                                                                '${staffCategoryId}',
                                                                                '${staffCategoryName}',
                                                                                ${positionNumber}
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

module.exports = {
    addStaffCategory
}