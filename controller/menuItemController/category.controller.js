const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Get Manufacture Product Category List

const getMainCategory = async (req, res) => {
    try {
        var sql_queries_getCategoryTable = `SELECT
                                                imcd.categoryId,
                                                imcd.categoryName
                                            FROM
                                                item_mainCategory_data AS imcd
                                            ORDER BY imcd.categoryName`;

        pool.query(sql_queries_getCategoryTable, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                return res.status(200).send(rows);
            }
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Manufacture Product Category API

const addMainCategory = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const uid1 = new Date();
                const categoryId = String("Category_" + uid1.getTime());

                const data = {
                    categoryName: req.body.categoryName.trim(),
                }
                if (!data.categoryName) {
                    return res.status(400).send("Please Add Category");
                } else {
                    req.body.productName = pool.query(`SELECT categoryName FROM item_mainCategory_data WHERE categoryName = '${data.categoryName}'`, function (err, row) {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        if (row && row.length) {
                            return res.status(400).send('Category is Already In Use');
                        } else {
                            const sql_querry_addCategory = `INSERT INTO item_mainCategory_data (categoryId, categoryName)  
                                                            VALUES ('${categoryId}','${data.categoryName}')`;
                            pool.query(sql_querry_addCategory, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                return res.status(200).send("Category Added Successfully");
                            })
                        }
                    })
                }
            } else {
                return res.status(400).send('You are Not Authorised');
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Manufacture Product Category API

const removeMainCategory = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const categoryId = req.query.categoryId.trim();
                req.query.categoryId = pool.query(`SELECT categoryId FROM item_mainCategory_data WHERE categoryId = '${categoryId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM item_mainCategory_data WHERE categoryId = '${categoryId}'`;
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
            } else {
                return res.status(400).send('You are Not Authorised');
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Manufacture Product Category API

const updateMainCategory = async (req, res) => {
    try {
        const data = {
            categoryId: req.body.categoryId.trim(),
            categoryName: req.body.categoryName.trim()
        }
        if (!data.categoryName) {
            return res.status(400).send("Please Add Category");
        }
        const sql_querry_updatedetails = `UPDATE item_mainCategory_data SET categoryName = '${data.categoryName}'
                                          WHERE categoryId = '${data.categoryId}'`;
        pool.query(sql_querry_updatedetails, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send("Category Updated Successfully");
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getMainCategory,
    addMainCategory,
    removeMainCategory,
    updateMainCategory
}