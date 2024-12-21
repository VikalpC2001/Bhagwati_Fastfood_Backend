const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { varientDatas } = require('../menuItemController/menuFunction.controller');

// Get Item Data

const getItemDataForApp = (req, res) => {
    try {
        const sql_query_staticQuery = `SELECT
                                           imd.itemId AS itemId,
                                           imd.itemName AS itemName,
                                           imd.itemGujaratiName AS itemGujaratiName,
                                           imd.itemCode AS itemCode,
                                           imd.itemShortKey AS itemShortKey,
                                           imd.itemSubCategory AS itemSubCategory,
                                           iscd.subCategoryName AS subCategoryName,
                                           imd.spicyLevel AS spicyLevel,
                                           imd.isJain AS isJain,
                                           imd.isPureJain AS isPureJain,
                                           imd.itemDescription AS itemDescription
                                       FROM
                                           item_menuList_data AS imd
                                       INNER JOIN item_subCategory_data AS iscd ON iscd.subCategoryId = imd.itemSubCategory`;
        const sql_query_getMenuId = `SELECT menuId FROM billing_category_data WHERE categoryName = 'Dine In'`;
        let sql_querry_getItem = `${sql_query_staticQuery}
                                  ORDER BY imd.itemCode ASC;
                                  ${sql_query_getMenuId}`;

        pool.query(sql_querry_getItem, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const datas = Object.values(JSON.parse(JSON.stringify(rows[0])));
                const menuId = rows && rows[1].length ? rows[1][0].menuId : 'base_2001'
                if (datas.length) {
                    varientDatas(datas, menuId)
                        .then((data) => {
                            const combinedData = datas.map((item, index) => (
                                {
                                    ...item,
                                    variantsList: data[index].varients,
                                    allVariantsList: data[index].allVariantsList,
                                    periods: data[index].periods,
                                    status: data[index].status
                                }
                            ))

                            const result = Object.values(combinedData.reduce((acc, item) => {
                                const key = item.subCategoryName;
                                if (!acc[key]) {
                                    acc[key] = { categoryName: key, listOfItems: [] };
                                }
                                acc[key].listOfItems.push(item);
                                return acc;
                            }, {}));


                            const newJson = {
                                category: result.map((e) => e.categoryName),
                                categoryWiseItem: result

                            }
                            return res.status(200).send(newJson);
                        }).catch(error => {
                            console.error('Error in processing datas :', error);
                            return res.status(500).send('Internal Error');
                        });
                } else {
                    return res.status(400).send('No Data Found');
                }
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    getItemDataForApp
}