const pool = require('../../database');

// Get Bill Category Data

const getBillCategory = (req, res) => {
    try {
        // Use a single query with an IN clause to get all categories at once
        let sql_query_getCategory = `SELECT categoryId, categoryName, menuId, firmId, isOfficial, billFooterNote, kotFooterNote 
                                     FROM billing_category_data 
                                     WHERE categoryId IN ('pickUp', 'delivery', 'dineIn', 'hotel')`;

        pool.query(sql_query_getCategory, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Query", err);
                return res.status(500).send('Database Error');
            } else {
                // Create an object to hold the results
                const categories = {};

                // Loop through the results and populate the categories object
                data.forEach(row => {
                    categories[row.categoryName] = row;
                });
                return res.status(200).send(categories);
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const updateBillCategoryData = (req, res) => {
    try {
        const data = {
            categoryId: req.body.categoryId ? req.body.categoryId : null,
            menuId: req.body.menuId ? req.body.menuId : null,
            firmId: req.body.firmId ? req.body.firmId : null,
            isOfficial: req.body.isOfficial ? req.body.isOfficial : false,
            billFooterNote: req.body.billFooterNote ? req.body.billFooterNote : null,
            kotFooterNote: req.body.kotFooterNote ? req.body.kotFooterNote : null
        }
        if (!data.categoryId || !data.menuId || !data.firmId) {
            return res.status(404).send("Pleasr Provide All Fields...!")
        } else {
            let sql_query_updateData = `UPDATE
                                            billing_category_data
                                        SET
                                            menuId = '${data.menuId}',
                                            firmId = '${data.firmId}',
                                            isOfficial = ${data.isOfficial},
                                            billFooterNote = ${data.billFooterNote ? `'${data.billFooterNote}'` : null},
                                            kotFooterNote = ${data.kotFooterNote ? `'${data.kotFooterNote}'` : null}
                                        WHERE 
                                            categoryId = '${data.categoryId}'`;
            pool.query(sql_query_updateData, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    return res.status(200).send('Record Updated Successfully');
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getBillCategory,
    updateBillCategoryData
}