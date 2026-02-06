const pool = require('../../database');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Get Date Function 4 Hour

function getCurrentDate() {
    const now = new Date();
    const hours = now.getHours();

    if (hours <= 4) { // If it's 4 AM or later, increment the date
        now.setDate(now.getDate() - 1);
    }
    return now.toDateString().slice(4, 15);
}

// Get Category List

const getThreeCategorDashBoardData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

        let sql_queries_getInventoryCategory = `SELECT 
                                                    iscd.stockOutCategoryId AS categoryId,
                                                    iscd.stockOutCategoryName AS categoryName,
                                                    COALESCE(ROUND(SUM(sod.stockOutPrice), 0), 0) AS totalRs
                                                FROM 
                                                    inventory_stockOutCategory_data AS iscd
                                                LEFT JOIN inventory_stockOut_data AS sod ON iscd.stockOutCategoryId = sod.stockOutCategory AND sod.stockOutDate BETWEEN STR_TO_DATE('${startDate ? startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${endDate ? endDate : lastDay}', '%b %d %Y')
                                                GROUP BY iscd.stockOutCategoryId, iscd.stockOutCategoryName
                                                ORDER BY iscd.stockOutCategoryName ASC`;

        let sql_querry_getStaffCategory = `SELECT
                                               scd.staffCategoryId AS categoryId,
                                               scd.staffCategoryName AS categoryName,
                                               SUM(CASE WHEN sed.employeeStatus = 1 THEN sed.salary ELSE 0 END) AS totalRs
                                           FROM
                                               staff_category_data AS scd
                                           LEFT JOIN staff_employee_data AS sed ON scd.staffCategoryId = sed.category
                                           GROUP BY scd.staffCategoryId, scd.staffCategoryName
                                           ORDER BY scd.staffCategoryName ASC`;

        let sql_querry_getBusinessCategory = `SELECT 
                                                  imcd.categoryId AS categoryId,
                                                  imcd.categoryName AS categoryName,
                                                  COALESCE(SUM(bbd.price), 0) AS totalRs
                                              FROM 
                                                  item_mainCategory_data AS imcd
                                              LEFT JOIN item_subCategory_data AS iscd ON iscd.categoryId = imcd.categoryId
                                              LEFT JOIN item_menuList_data AS imld ON imld.itemSubCategory = iscd.subCategoryId
                                              LEFT JOIN (
                                                  SELECT 
                                                      itemId, 
                                                      SUM(price) AS price
                                                  FROM 
                                                      billing_billWiseItem_data
                                                  WHERE 
                                                      billDate BETWEEN STR_TO_DATE('${startDate ? startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${endDate ? endDate : lastDay}', '%b %d %Y')
                                                      AND billPayType NOT IN ('Cancel', 'complimentary')
                                                      AND billStatus != 'Cancel'
                                                  GROUP BY itemId
                                              ) AS bbd ON bbd.itemId = imld.itemId
                                              GROUP BY imcd.categoryId, imcd.categoryName
                                              ORDER BY imcd.categoryName ASC;`;

        const sql_queries_getAllCategoryData = `${sql_queries_getInventoryCategory};
                                                ${sql_querry_getStaffCategory};
                                                ${sql_querry_getBusinessCategory}`;

        pool.query(sql_queries_getAllCategoryData, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                const inventoryCategorySum = rows[0].reduce((acc, item) => acc + item.totalRs, 0);
                const staffCategorySum = rows[1].reduce((acc, item) => acc + item.totalRs, 0);
                const businessCategorySum = rows[2].reduce((acc, item) => acc + item.totalRs, 0);
                const allCategory = {
                    inventoryCategory: { categoryList: rows[0], categorySum: inventoryCategorySum },
                    staffCategory: { categoryList: rows[1], categorySum: staffCategorySum },
                    businessCategory: { categoryList: rows[2], categorySum: businessCategorySum }
                }
                return res.status(200).send(allCategory);
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get All orders

const getAllOrdersData = (req, res) => {
    try {
        const billType = req.query.billType;
        const billDate = (req.query.billDate ? req.query.billDate : '').slice(4, 15);
        const currentDate = getCurrentDate();
        if (!billType) {
            return res.status(404).send('Bill Type Not Found');
        } else {
            let sql_query_getRecentBill = `SELECT 
                                                bd.billId AS billId, 
                                                CASE
                                                    WHEN bd.billType = 'Hotel' THEN CONCAT('H',btd.tokenNo)
                                                    WHEN bd.billType = 'Pick Up' THEN CONCAT('P',btd.tokenNo)
                                                    WHEN bd.billType = 'Delivery' THEN CONCAT('D',btd.tokenNo)
                                                    WHEN bd.billType = 'Dine In' THEN CONCAT('R',btd.tokenNo)
                                                ELSE NULL
                                                END AS tokenNo,
                                                bd.cashier AS cashier,
                                                bd.menuStatus AS menuStatus,
                                                CASE
                                                    WHEN bd.billPayType = 'Complimentary' THEN 'Comp'
                                                    WHEN bd.billPayType = 'CancelToken' THEN '❌ Token'
                                                    ELSE bd.billPayType
                                                END AS billPayType,
                                                bd.totalAmount AS totalAmount,
                                                bd.settledAmount AS settledAmount,
                                                bd.billStatus AS billStatus,
                                                DATE_FORMAT(bd.billDate,'%d/%m/%Y') AS billDate,
                                                DATE_FORMAT(bd.billCreationDate,'%h:%i %p') AS billCreationDate
                                           FROM billing_data AS bd
                                           LEFT JOIN billing_token_data AS btd ON btd.billId = bd.billId
                                           WHERE bd.billType = '${billType}' 
                                           ${billType == 'Dine In' ? `AND bd.billStatus NOT IN ('running','print')` : ''} 
                                           AND bd.billDate = STR_TO_DATE('${billDate ? billDate : currentDate}','%b %d %Y')
                                           ORDER BY btd.tokenNo DESC`;
            pool.query(sql_query_getRecentBill, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    if (data && data.length) {
                        return res.status(200).send(data);
                    } else {
                        return res.status(404).send('No Data Found');
                    }
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    getThreeCategorDashBoardData,
    getAllOrdersData
}