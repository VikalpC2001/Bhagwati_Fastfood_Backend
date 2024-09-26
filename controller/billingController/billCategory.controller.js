const pool = require('../../database');

// Get Bill Category Data

const getBillCategory = (req, res) => {
    try {
        let sql_query_getCategory = `SELECT
                                         bcd.categoryId AS categoryId,
                                         bcd.categoryName AS categoryName,
                                         bcd.menuId AS menuId,
                                         imc.menuCategoryName AS offlineMenuName,
                                         bcd.onlineMenuId AS onlineMenuId,
                                         oimc.menuCategoryName AS onlineMenuName,
                                         bcd.firmId AS firmId,
                                         bfd.firmName AS firmName,
                                         bcd.isOfficial AS isOfficial,
                                         bcd.onlineStoreStatus AS onlineStoreStatus,
                                         bcd.storeStartTime AS storeStartTime,
                                         bcd.storeEndTime AS storeEndTime,
                                         bcd.amountRange AS amountRange,
                                         bcd.stopAutoAcceptStartTime AS stopAutoAcceptStartTime,
                                         bcd.stopAutoAcceptCloseTime AS stopAutoAcceptCloseTime,
                                         bcd.billFooterNote AS billFooterNote,
                                         bcd.kotFooterNote AS kotFooterNote
                                     FROM
                                         billing_category_data AS bcd
                                     LEFT JOIN item_menuCategory_data AS imc ON imc.menuCategoryId = bcd.menuId
                                     LEFT JOIN item_menuCategory_data AS oimc ON oimc.menuCategoryId = bcd.onlineMenuId
                                     LEFT JOIN billing_firm_data AS bfd ON bfd.firmId = bcd.firmId
                                     WHERE bcd.categoryId IN ('pickUp', 'delivery', 'dineIn', 'hotel')`;
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

// Update Bill Category Data

const updateBillCategoryData = (req, res) => {
    try {
        const data = {
            categoryId: req.body.categoryId ? req.body.categoryId : null,
            menuId: req.body.menuId ? req.body.menuId : null,
            onlineMenuId: req.body.onlineMenuId ? req.body.onlineMenuId : null,
            firmId: req.body.firmId ? req.body.firmId : null,
            isOfficial: req.body.isOfficial ? req.body.isOfficial : false,
            onlineStoreStatus: req.body.onlineStoreStatus ? req.body.onlineStoreStatus : false,
            storeStartTime: req.body.storeStartTime ? req.body.storeStartTime : '00:00:00',
            storeEndTime: req.body.storeEndTime ? req.body.storeEndTime : '00:00:00',
            amountRange: req.body.amountRange ? req.body.amountRange : 0,
            stopAutoAcceptStartTime: req.body.stopAutoAcceptStartTime ? req.body.stopAutoAcceptStartTime : '00:00:00',
            stopAutoAcceptCloseTime: req.body.stopAutoAcceptCloseTime ? req.body.stopAutoAcceptCloseTime : '00:00:00',
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
                                            onlineMenuId = '${data.onlineMenuId}',
                                            firmId = '${data.firmId}',
                                            isOfficial = ${data.isOfficial},
                                            onlineStoreStatus = ${data.onlineStoreStatus},
                                            storeStartTime = '${data.storeStartTime}',
                                            storeEndTime = '${data.storeEndTime}',
                                            amountRange = ${data.amountRange},
                                            stopAutoAcceptStartTime = '${data.stopAutoAcceptStartTime}',
                                            stopAutoAcceptCloseTime = '${data.stopAutoAcceptCloseTime}',
                                            billFooterNote = ${data.billFooterNote ? `'${data.billFooterNote}'` : null},
                                            kotFooterNote = ${data.kotFooterNote ? `'${data.kotFooterNote}'` : null}
                                        WHERE 
                                            categoryId = '${data.categoryId}'`;
            pool.query(sql_query_updateData, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    return res.status(200).send('Record Updated Successfully');
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getBillCategory,
    updateBillCategoryData
}