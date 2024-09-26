const pool = require('../../database');

// Get Business Category List

const getBusinessCategoryList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM business_category_data`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);


                sql_queries_getdetails = `SELECT businessCategoryId, businessName, businessType FROM business_category_data 
                                          Order BY businessName limit ${limit}`;
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
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
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add Business Category

const addBusinessCategory = (req, res) => {
    try {
        const uid1 = new Date();
        const businessCategoryId = String('businessCategory_' + uid1.getTime());
        const data = {
            businessName: req.body.businessName.trim(),
            businessType: req.body.businessType.trim()
        }
        if (!data.businessName || !data.businessType) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.businessName = pool.query(`SELECT businessName FROM business_category_data WHERE businessName = '${data.businessName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Business is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO business_category_data(businessCategoryId, businessName, businessType)
                                                   VALUES('${businessCategoryId}', '${data.businessName}', '${data.businessType}')`;
                    pool.query(sql_querry_addDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Business Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Business Category

const removeBusinessCategory = (req, res) => {
    try {
        var businessCategoryId = req.query.businessCategoryId;
        if (!businessCategoryId) {
            return res.status(404).send('Business CategoryId Not Found');
        }
        req.query.mainCategoryId = pool.query(`SELECT businessCategoryId FROM business_category_data WHERE businessCategoryId = '${businessCategoryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM business_category_data WHERE businessCategoryId = '${businessCategoryId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Business Category Deleted Successfully");
                })
            } else {
                return res.status(404).send('Business Category Id Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Business Category

const updateBusinessCategory = (req, res) => {
    try {
        const businessCategoryId = req.body.businessCategoryId;
        const data = {
            businessName: req.body.businessName.trim(),
            businessType: req.body.businessType.trim()
        }
        if (!data.businessName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.categoryName = pool.query(`SELECT businessName FROM business_category_data WHERE businessCategoryId NOT IN ('${businessCategoryId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const BusinesscategoryNameList = rowarr.map(e => e.businessName.toLowerCase())
                if (BusinesscategoryNameList.includes(data.businessName.toLowerCase())) {
                    return res.status(400).send('Business Category is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                          business_category_data
                                                      SET
                                                          businessName = '${data.businessName}',
                                                          businessType = '${data.businessType}'
                                                      WHERE businessCategoryId = '${businessCategoryId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Business Category Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Business Category Textbox Loop Data

const getBusinessCategory = (req, res) => {
    try {
        sql_queries_getdetails = `SELECT businessCategoryId, businessName FROM business_category_data ORDER BY businessName ASC`;
        pool.query(sql_queries_getdetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    addBusinessCategory,
    removeBusinessCategory,
    updateBusinessCategory,
    getBusinessCategoryList,
    getBusinessCategory
}