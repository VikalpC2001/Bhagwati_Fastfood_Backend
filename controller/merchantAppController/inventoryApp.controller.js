const pool = require('../../database');

// get Product's Data For App

const getProductData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        const data = {
            productStatus: req.query.productStatus,
            searchProduct: req.query.searchProduct
        }
        const sql_querry_staticQuery = `SELECT
                                            p.productId,
                                            UCASE(p.productName) AS productName,
                                            COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock,
                                            P.minProductUnit AS unit,
                                            CASE 
                                                WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty THEN 'In-Stock' 
                                                WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 THEN 'Low-Stock' 
                                                ELSE 'Out-Stock'
                                            END AS stockStatus
                                        FROM
                                            inventory_product_data AS p
                                        LEFT JOIN(
                                                    SELECT
                                                        inventory_stockIn_data.productId,
                                                        ROUND(SUM(inventory_stockIn_data.productQty),2) AS total_quantity
                                                    FROM
                                                        inventory_stockIn_data
                                                    GROUP BY
                                                        inventory_stockIn_data.productId
                                        ) AS si ON p.productId = si.productId
                                        LEFT JOIN(
                                                    SELECT
                                                        inventory_stockOut_data.productId,
                                                        ROUND(SUM(inventory_stockOut_data.productQty),2) AS total_quantity
                                                    FROM
                                                        inventory_stockOut_data
                                                    GROUP BY
                                                    inventory_stockOut_data.productId
                                        ) AS so ON p.productId = so.productId`;
        const sql_querry_joins = `LEFT JOIN(
                                            SELECT
                                                inventory_stockIn_data.productId,
                                                ROUND(SUM(inventory_stockIn_data.productQty),2) AS total_quantity
                                            FROM
                                                inventory_stockIn_data
                                            GROUP BY
                                                inventory_stockIn_data.productId
                                  ) AS si ON p.productId = si.productId
                                  LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(inventory_stockOut_data.productQty),2) AS total_quantity
                                            FROM
                                                inventory_stockOut_data
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                  ) AS so ON p.productId = so.productId`;
        if (req.query.productStatus == 1) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows FROM inventory_product_data AS p
                                  ${sql_querry_joins}
                                  WHERE p.productName LIKE '%` + data.searchProduct + `%' AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty`;
        } else if (req.query.productStatus == 2) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows FROM inventory_product_data AS p
                                  ${sql_querry_joins}
                                  WHERE p.productName LIKE '%` + data.searchProduct + `%' AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0`;
        } else if (req.query.productStatus == 3) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows FROM inventory_product_data AS p
                                  ${sql_querry_joins}
                                  WHERE p.productName LIKE '%` + data.searchProduct + `%' AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) = 0`;
        } else {
            sql_get_pagination = `SELECT COUNT(*) AS numRows FROM inventory_product_data AS p
                                  ${sql_querry_joins}
                                  WHERE p.productName LIKE '%` + data.searchProduct + `%'`;
        };
        pool.query(sql_get_pagination, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                if (req.query.productStatus == 1) {
                    sql_queries_getdetails = `${sql_querry_staticQuery}
                                                WHERE p.productName LIKE '%` + data.searchProduct + `%' AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty 
                                                ORDER BY p.productName LIMIT ${limit}`;
                } else if (req.query.productStatus == 2) {
                    sql_queries_getdetails = `${sql_querry_staticQuery}
                                                WHERE p.productName LIKE '%` + data.searchProduct + `%' AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0
                                                ORDER BY p.productName LIMIT ${limit}`;
                } else if (req.query.productStatus == 3) {
                    sql_queries_getdetails = `${sql_querry_staticQuery}
                                                WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) = 0
                                                ORDER BY p.productName LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${sql_querry_staticQuery}
                                                WHERE p.productName LIKE '%` + data.searchProduct + `%'
                                                ORDER BY p.productName LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        if (numRows === 0) {
                            const rows = []
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

// Get Category Data For App

const getOutCategoryForApp = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        sql_querry_getdetails = `SELECT count(*) as numRows FROM inventory_stockOutCategory_data`;
        pool.query(sql_querry_getdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);

                let sql_queries_getCategoryTable = `SELECT
                                                        iscd.stockOutCategoryId,
                                                        iscd.stockOutCategoryName,
                                                        COALESCE(ROUND(socd.categoryStockOutPrice), 0) AS outPrice,
                                                        COALESCE(ROUND(total.totalCategoryStockOutPrice),0) AS totalCategoryStockOutPrice,
                                                        CONCAT(
                                                            COALESCE(ROUND(COALESCE(ROUND(socd.categoryStockOutPrice), 0) / total.totalCategoryStockOutPrice * 100),0),
                                                            ' %'
                                                        ) AS percentage
                                                    FROM
                                                        inventory_stockOutCategory_data AS iscd
                                                    LEFT JOIN (
                                                        SELECT
                                                            inventory_stockOut_data.stockOutCategory,
                                                            SUM(inventory_stockOut_data.stockOutPrice) AS categoryStockOutPrice
                                                        FROM
                                                            inventory_stockOut_data
                                                        WHERE
                                                            inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${startDate ? startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${endDate ? endDate : lastDay}', '%b %d %Y')
                                                        GROUP BY
                                                            inventory_stockOut_data.stockOutCategory
                                                    ) AS socd ON iscd.stockOutCategoryId = socd.stockOutCategory
                                                    LEFT JOIN (
                                                        SELECT SUM(categoryStockOutPrice) AS totalCategoryStockOutPrice
                                                        FROM (
                                                            SELECT
                                                                inventory_stockOut_data.stockOutCategory,
                                                                SUM(inventory_stockOut_data.stockOutPrice) AS categoryStockOutPrice
                                                            FROM
                                                                inventory_stockOut_data
                                                            WHERE
                                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${startDate ? startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${endDate ? endDate : lastDay}', '%b %d %Y')
                                                            GROUP BY
                                                                inventory_stockOut_data.stockOutCategory
                                                        ) AS temp
                                                    ) AS total ON 1=1
                                                    ORDER BY socd.categoryStockOutPrice DESC
                                                    LIMIT ${limit}`;
                pool.query(sql_queries_getCategoryTable, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        if (numRows === 0) {
                            const rows = []
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
        res.status(500).json('Internal Server Error');
    }
}

// Get Supplier Data For App

const getSupplierdataForApp = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const searchWord = req.query.searchWord;
        if (req.query.searchWord) {
            sql_querry_getdetails = `SELECT count(*) as numRows FROM inventory_supplier_data WHERE supplierFirmName LIKE '%` + searchWord + `%' OR supplierNickName LIKE'%` + searchWord + `%'`;
        } else {
            sql_querry_getdetails = `SELECT count(*) as numRows FROM inventory_supplier_data`;
        }
        pool.query(sql_querry_getdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                if (req.query.searchWord) {
                    sql_querry_getSupplierData = `SELECT sd.supplierId, supplierFirstName AS supplierName, sd.supplierFirmName, sd.supplierNickName, sd.supplierPhoneNumber, GROUP_CONCAT(inventory_product_data.productName SEPARATOR ', ') as productList,
                                                    COALESCE(sisd.total_price, 0) - COALESCE(sosd.total_paid, 0) AS remainingAmount FROM inventory_supplier_data AS sd
                                                    INNER JOIN inventory_supplierProducts_data ON inventory_supplierProducts_data.supplierId = sd.supplierId
                                                    INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_supplierProducts_data.productId
                                                    LEFT JOIN
                                                                (
                                                                    SELECT
                                                                        inventory_stockIn_data.supplierId,
                                                                        ROUND(SUM(inventory_stockIn_data.totalPrice)) AS total_price
                                                                    FROM
                                                                        inventory_stockIn_data
                                                                    WHERE inventory_stockIn_data.stockInPaymentMethod = 'debit'
                                                                    GROUP BY
                                                                        inventory_stockIn_data.supplierId
                                                                ) AS sisd ON sd.supplierId = sisd.supplierId
                                                    LEFT JOIN
                                                                (
                                                                    SELECT
                                                                        inventory_supplierTransaction_data.supplierId,
                                                                        ROUND(SUM(inventory_supplierTransaction_data.paidAmount)) AS total_paid
                                                                    FROM
                                                                        inventory_supplierTransaction_data
                                                                    GROUP BY
                                                                        inventory_supplierTransaction_data.supplierId
                                                                ) AS sosd ON sd.supplierId = sosd.supplierId
                                                    WHERE sd.supplierFirmName LIKE '%` + searchWord + `%' OR sd.supplierNickName LIKE '%` + searchWord + `%'
                                                    GROUP BY inventory_supplierProducts_data.supplierId
                                                    ORDER BY sd.supplierFirmName LIMIT  ${limit}`;
                } else {
                    sql_querry_getSupplierData = `SELECT sd.supplierId, supplierFirstName AS supplierName, sd.supplierFirmName, sd.supplierNickName, sd.supplierPhoneNumber, GROUP_CONCAT(inventory_product_data.productName SEPARATOR ', ') as productList,
                                                    COALESCE(sisd.total_price, 0) - COALESCE(sosd.total_paid, 0) AS remainingAmount FROM inventory_supplier_data AS sd
                                                    INNER JOIN inventory_supplierProducts_data ON inventory_supplierProducts_data.supplierId = sd.supplierId
                                                    INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_supplierProducts_data.productId
                                                    LEFT JOIN
                                                                (
                                                                    SELECT
                                                                        inventory_stockIn_data.supplierId,
                                                                        ROUND(SUM(inventory_stockIn_data.totalPrice)) AS total_price
                                                                    FROM
                                                                        inventory_stockIn_data
                                                                    WHERE inventory_stockIn_data.stockInPaymentMethod = 'debit'
                                                                    GROUP BY
                                                                        inventory_stockIn_data.supplierId
                                                                ) AS sisd ON sd.supplierId = sisd.supplierId
                                                    LEFT JOIN
                                                                (
                                                                    SELECT
                                                                        inventory_supplierTransaction_data.supplierId,
                                                                        ROUND(SUM(inventory_supplierTransaction_data.paidAmount)) AS total_paid
                                                                    FROM
                                                                        inventory_supplierTransaction_data
                                                                    GROUP BY
                                                                        inventory_supplierTransaction_data.supplierId
                                                                ) AS sosd ON sd.supplierId = sosd.supplierId
                                                    GROUP BY inventory_supplierProducts_data.supplierId 
                                                    ORDER BY sd.supplierFirmName LIMIT ${limit} `;
                }
                console.log('>>>', sql_querry_getSupplierData);
                pool.query(sql_querry_getSupplierData, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        if (numRows === 0) {
                            const rows = []
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                })
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Product Statics For App By ID

const getProductStaticsByIdForApp = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productId: req.query.productId
        }
        if (data.productId) {
            const sql_querry_StatickCCount = `SELECT
                                               p.minProductQty,
                                               COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock,
                                               COALESCE(ROUND(siLu.productPrice,2), 0) AS lastPrice,
                                               COALESCE(si.total_siPrice, 0) - COALESCE(so.total_soPrice, 0) AS remainPrice
                                           FROM
                                               inventory_product_data AS p
                                           LEFT JOIN(
                                               SELECT
                                                   inventory_stockIn_data.productId,
                                                   ROUND(SUM(
                                                       inventory_stockIn_data.productQty
                                                   ),2) AS total_quantity,
                                                   ROUND(SUM(
                                                    inventory_stockIn_data.totalPrice
                                                   )) AS total_siPrice
                                               FROM
                                                   inventory_stockIn_data
                                               GROUP BY
                                                   inventory_stockIn_data.productId
                                           ) AS si
                                           ON
                                               p.productId = si.productId
                                           LEFT JOIN(
                                               SELECT
                                                   inventory_stockOut_data.productId,
                                                   ROUND(SUM(
                                                       inventory_stockOut_data.productQty
                                                   ),2) AS total_quantity,
                                                   ROUND(SUM(
                                                       inventory_stockOut_data.stockOutPrice
                                                   )) AS total_soPrice
                                               FROM
                                                   inventory_stockOut_data
                                               GROUP BY
                                                   inventory_stockOut_data.productId
                                           ) AS so
                                           ON
                                               p.productId = so.productId
                                           LEFT JOIN(
                                               SELECT
                                                   productId,
                                                   stockInDate,
                                                   productQty,
                                                   productPrice
                                               FROM
                                                   inventory_stockIn_data
                                               WHERE
                                                   (productId, stockInCreationDate) IN(
                                                   SELECT
                                                       productId,
                                                       MAX(stockInCreationDate)
                                                   FROM
                                                       inventory_stockIn_data
                                                   GROUP BY
                                                       productId
                                               )
                                           ) AS siLu
                                           ON
                                               p.productId = siLu.productId
                                          WHERE p.productId = '${data.productId}'`;
            if (req.query.startDate && req.query.endDate) {
                sql_querry_getProductCount = `SELECT COALESCE(ROUND(SUM(productQty),2),0) AS purchase, COALESCE(ROUND(SUM(totalPrice)),0) AS totalRs FROM inventory_stockIn_data WHERE inventory_stockIn_data.productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                          SELECT COALESCE(ROUND(SUM(productQty),2),0) AS used, COALESCE(ROUND(SUM(stockOutPrice)),0) AS totalUsedPrice FROM inventory_stockOut_data WHERE inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                          ${sql_querry_StatickCCount}`;
            } else {
                sql_querry_getProductCount = `SELECT COALESCE(ROUND(SUM(productQty),2),0) AS purchase, COALESCE(ROUND(SUM(totalPrice)),0) AS totalRs FROM inventory_stockIn_data WHERE inventory_stockIn_data.productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                          SELECT COALESCE(ROUND(SUM(productQty),2),0) AS used, COALESCE(ROUND(SUM(stockOutPrice)),0) AS totalUsedPrice FROM inventory_stockOut_data WHERE inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                          ${sql_querry_StatickCCount}`;
            }
            pool.query(sql_querry_getProductCount, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                else {
                    const count = {
                        totalPurchase: data[0][0].purchase,
                        totalRs: data[0][0].totalRs,
                        totalUsed: data[1][0].used,
                        totalUsedPrice: data[1][0].totalUsedPrice,
                        remainingStock: data[2][0].remainingStock,
                        remainUsedPrice: data[2][0].remainingStock != 0 ? data[2][0].remainPrice : 0,
                        lastPrice: data[2][0].lastPrice,
                        minProductQty: data[2][0].minProductQty
                    }
                    return res.status(200).send(count);
                }
            })
        } else {
            return res.status(404).send('ProductId Not Found.....!')
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    getProductData,
    getOutCategoryForApp,
    getSupplierdataForApp,
    getProductStaticsByIdForApp
}