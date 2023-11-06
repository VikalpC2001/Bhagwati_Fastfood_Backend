const pool = require('../../database');

// Get Sub Category List By Id

const getSubCategoryListById = (req, res) => {
    try {
        const mainCategoryId = req.query.mainCategoryId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_subcategory_data WHERE categoryId = '${mainCategoryId}'`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                sql_queries_getdetails = `SELECT subCategoryId, categoryId, subCategoryName FROM expense_subcategory_data 
                                          WHERE categoryId = '${mainCategoryId}'
                                          ORDER BY subCategoryName limit ${limit}`;
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

// Add Sub Category

const addSubCategory = (req, res) => {
    try {
        const uid1 = new Date();
        const subCategoryId = String('subCategory_' + uid1.getTime());
        const data = {
            categoryId: req.body.categoryId.trim(),
            subCategoryName: req.body.subCategoryName
        }
        if (!data.categoryId || !data.subCategoryName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.subCategoryName = pool.query(`SELECT subCategoryName FROM expense_subcategory_data WHERE subCategoryName = '${data.subCategoryName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Sub Category is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO expense_subcategory_data(subCategoryId, categoryId, subCategoryName)
                                                VALUES('${subCategoryId}', '${data.categoryId}', '${data.subCategoryName}')`;
                    pool.query(sql_querry_addDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Sub Category Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Remove Sub Category Data

const removeSubCategory = async (req, res) => {

    try {
        var subCategoryId = req.query.subCategoryId.trim();
        if (!subCategoryId) {
            return res.status(404).send('subCategoryId Not Found');
        }
        req.query.subCategoryId = pool.query(`SELECT subCategoryId FROM expense_subcategory_data WHERE subCategoryId = '${subCategoryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM expense_subcategory_data WHERE subCategoryId = '${subCategoryId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Sub Category Deleted Successfully");
                })
            } else {
                return res.send('subCategoryId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Sub Category Data

const updateSubCategory = (req, res) => {
    try {
        const subCategoryId = req.body.subCategoryId;
        const data = {
            subCategoryName: req.body.subCategoryName.trim()
        }
        if (!data.subCategoryName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.categoryName = pool.query(`SELECT subCategoryName FROM expense_subcategory_data WHERE subCategoryId NOT IN ('${subCategoryId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const subCategoryNameList = rowarr.map(e => e.subCategoryName.toLowerCase())
                if (subCategoryNameList.includes(data.subCategoryName.toLowerCase())) {
                    return res.status(400).send('Sub Category is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                    expense_subcategory_data
                                                SET
                                                    subCategoryName = '${data.subCategoryName}'
                                                WHERE
                                                    subCategoryId = '${subCategoryId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Sub Category Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Dropdown List Of SubCategory

const ddlSubCategoryData = (req, res) => {
    try {
        const categoryId = req.query.categoryId.trim();
        if (!categoryId) {
            return res.status(404).send('CategoryId Not Found');
        }
        const sql_query_getDDlData = `SELECT subCategoryId, subCategoryName FROM expense_subcategory_data WHERE categoryId = '${categoryId}'`;
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

module.exports = { addSubCategory, updateSubCategory, removeSubCategory, ddlSubCategoryData, getSubCategoryListById }