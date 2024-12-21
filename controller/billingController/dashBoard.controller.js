const pool = require('../../database');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Get Category List

const getThreeCategorDashBoardData = async (req, res) => {
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
                                                  COALESCE(SUM(bbd.price),0) AS totalRs
                                              FROM 
                                                  item_mainCategory_data AS imcd
                                              LEFT JOIN item_subCategory_data AS iscd ON iscd.categoryId = imcd.categoryId
                                              LEFT JOIN item_menuList_data AS imld ON imld.itemSubCategory = iscd.subCategoryId
                                              LEFT JOIN billing_billWiseItem_data AS bbd ON bbd.itemId = imld.itemId AND bbd.billDate BETWEEN STR_TO_DATE('${startDate ? startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${endDate ? endDate : lastDay}', '%b %d %Y') 
                                              AND bbd.billPayType NOT IN ('Cancel','complimentary') AND bbd.billStatus != 'Cancel'
                                              GROUP BY imcd.categoryId, imcd.categoryName
                                              ORDER BY imcd.categoryName ASC`;

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

module.exports = {
    getThreeCategorDashBoardData
}