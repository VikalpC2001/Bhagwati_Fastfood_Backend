const pool = require('../../database');


// Get Main Category List

const getMainCategoryList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_category_data`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);


                sql_queries_getdetails = `SELECT categoryId, categoryName, categoryIconName FROM expense_category_data 
                                          Order BY categoryName limit ${limit}`;
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

// Add Main Category

const addMainCategory = (req, res) => {
    try {
        const uid1 = new Date();
        const mainCategoryId = String('mainCategory_' + uid1.getTime());
        const data = {
            categoryName: req.body.categoryName.trim(),
            categoryIconName: req.body.categoryIconName.trim(),
        }
        if (!data.categoryName || !data.categoryIconName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.categoryName = pool.query(`SELECT categoryName FROM expense_category_data WHERE categoryName = '${data.categoryName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Category is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO expense_category_data(categoryId, categoryName, categoryIconName)
                                                VALUES('${mainCategoryId}', '${data.categoryName}', '${data.categoryIconName}')`;
                    pool.query(sql_querry_addDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Category Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Remove Main Category Data

const removeMainCategory = async (req, res) => {

    try {
        var mainCategoryId = req.query.mainCategoryId.trim();
        if (!mainCategoryId) {
            return res.status(404).send('Main CategoryId Not Found');
        }
        req.query.mainCategoryId = pool.query(`SELECT categoryId FROM expense_category_data WHERE categoryId = '${mainCategoryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM expense_category_data WHERE categoryId = '${mainCategoryId}'`;
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

// Update Main Category Data

const updateMainCategory = (req, res) => {
    try {
        const mainCategoryId = req.body.mainCategoryId;
        const data = {
            categoryName: req.body.categoryName.trim(),
            categoryIconName: req.body.categoryIconName.trim(),
        }
        if (!data.categoryName || !data.categoryIconName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.categoryName = pool.query(`SELECT categoryName FROM expense_category_data WHERE categoryId NOT IN ('${mainCategoryId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const categoryNameList = rowarr.map(e => e.categoryName.toLowerCase())
                if (categoryNameList.includes(data.categoryName.toLowerCase())) {
                    return res.status(400).send('Category is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                    expense_category_data
                                                SET
                                                    categoryName = '${data.categoryName}',
                                                    categoryIconName = '${data.categoryIconName}'
                                                WHERE
                                                    categoryId = '${mainCategoryId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Category Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Dropdown List Of Main Category

const ddlMainCategoryData = (req, res) => {
    try {
        const sql_query_getDDlData = `SELECT categoryId, categoryName FROM expense_category_data`;
        pool.query(sql_query_getDDlData, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = { getMainCategoryList, addMainCategory, updateMainCategory, removeMainCategory, ddlMainCategoryData }