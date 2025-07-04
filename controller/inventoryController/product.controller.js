const pool = require('../../database');
const excelJS = require("exceljs");

// Get Product Counter Details

const getProductCountDetailsById = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productId: req.query.productId
        }
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
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Product wise Supplier Api

const getSupplierByProductId = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productId: req.query.productId
        }
        if (req.query.startDate && req.query.endDate) {
            var sql_querry_getSupplierByProductId = `SELECT
                                                    inventory_supplier_data.supplierNickName,
                                                    COALESCE(si.quantity,0) AS Quantity,
                                                    COALESCE(si.expense,0) AS expense
                                                FROM
                                                    inventory_supplierProducts_data AS ispd
                                                    INNER JOIN inventory_supplier_data ON inventory_supplier_data.supplierId = ispd.supplierId
                                                LEFT JOIN
                                                    (
                                                        SELECT
                                                            inventory_stockIn_data.supplierId,
                                                            ROUND(SUM(
                                                                inventory_stockIn_data.productQty
                                                            ),2) AS quantity,
                                                            ROUND(SUM(
                                                                inventory_stockIn_data.totalPrice
                                                            )) AS expense
                                                        FROM
                                                            inventory_stockIn_data
                                                        WHERE
                                                            productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                        GROUP BY
                                                            inventory_stockIn_data.supplierId
                                                    ) AS si
                                                    ON
                                                        ispd.supplierId = si.supplierId
                                                WHERE productId = '${data.productId}'`;
        } else {
            var sql_querry_getSupplierByProductId = `SELECT
                                                    inventory_supplier_data.supplierNickName,
                                                    COALESCE(si.quantity,0) AS Quantity,
                                                    COALESCE(si.expense,0) AS expense
                                                FROM
                                                    inventory_supplierProducts_data AS ispd
                                                    INNER JOIN inventory_supplier_data ON inventory_supplier_data.supplierId = ispd.supplierId
                                                LEFT JOIN
                                                    (
                                                        SELECT
                                                            inventory_stockIn_data.supplierId,
                                                            ROUND(SUM(
                                                                inventory_stockIn_data.productQty
                                                            ),2) AS quantity,
                                                            ROUND(SUM(
                                                                inventory_stockIn_data.totalPrice
                                                            )) AS expense
                                                        FROM
                                                            inventory_stockIn_data
                                                        WHERE
                                                            productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                        GROUP BY
                                                            inventory_stockIn_data.supplierId
                                                    ) AS si
                                                    ON
                                                        ispd.supplierId = si.supplierId
                                                WHERE productId = '${data.productId}'`;
        }
        pool.query(sql_querry_getSupplierByProductId, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })

    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Product List API

const getProductList = (req, res) => {
    try {
        req.query.productStatus
        const sql_querry_getProductListwithStatus = `SELECT
                                                         p.productId,
                                                         UPPER(p.productName) AS productName,
                                                         p.minProductQty,
                                                         p.minProductUnit,
                                                         COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock,
                                                         COALESCE(ROUND(siLu.productPrice,2), 0) AS lastPrice,
                                                         COALESCE(siLu.productQty, 0) AS lastUpdatedQty,
                                                         COALESCE(
                                                             DATE_FORMAT(siLu.stockInDate, '%d-%m-%Y'),
                                                             "No Update"
                                                         ) AS lastUpdatedStockInDate,
                                                         CASE WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty THEN 'In Stock' WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 THEN 'Under Stocked' ELSE 'Out of Stock'
                                                     END AS stockStatus
                                                     FROM
                                                         inventory_product_data AS p
                                                     LEFT JOIN(
                                                         SELECT inventory_stockIn_data.productId,
                                                             ROUND(SUM(
                                                                 inventory_stockIn_data.productQty
                                                             ),2) AS total_quantity
                                                         FROM
                                                             inventory_stockIn_data
                                                         GROUP BY
                                                             inventory_stockIn_data.productId
                                                     ) AS si
                                                     ON
                                                         p.productId = si.productId
                                                     LEFT JOIN(
                                                         SELECT inventory_stockOut_data.productId,
                                                             ROUND(SUM(
                                                                 inventory_stockOut_data.productQty
                                                             ),2) AS total_quantity
                                                         FROM
                                                             inventory_stockOut_data
                                                         GROUP BY
                                                             inventory_stockOut_data.productId
                                                     ) AS so
                                                     ON
                                                         p.productId = so.productId
                                                     LEFT JOIN(
                                                         SELECT productId,
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
                                                         p.productId = siLu.productId`;
        if (req.query.productStatus == 1) {
            sql_querry_getProductList = `${sql_querry_getProductListwithStatus}
                                            WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty 
                                            ORDER BY p.productName`;
        } else if (req.query.productStatus == 2) {
            sql_querry_getProductList = `${sql_querry_getProductListwithStatus}
                                            WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 
                                            ORDER BY p.productName`;
        } else if (req.query.productStatus == 3) {
            sql_querry_getProductList = `${sql_querry_getProductListwithStatus}
                                            WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) = 0
                                            ORDER BY p.productName`;
        } else {
            sql_querry_getProductList = `${sql_querry_getProductListwithStatus}
                                            ORDER BY p.productName`;
        }
        pool.query(sql_querry_getProductList, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            else if (data == '') {
                return res.status(400).send('No Data Available');
            } else {
                return res.status(200).send(data);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Product List Counter

const getProductListCounter = (req, res) => {
    try {
        const sql_querry_joins = `LEFT JOIN
                                    (
                                        SELECT
                                            inventory_stockIn_data.productId,
                                            ROUND(SUM(inventory_stockIn_data.productQty),2) AS total_quantity
                                        FROM
                                            inventory_stockIn_data
                                        GROUP BY
                                            inventory_stockIn_data.productId
                                    ) AS si ON p.productId = si.productId
                                  LEFT JOIN
                                    (
                                        SELECT
                                            inventory_stockOut_data.productId,
                                            ROUND(SUM(inventory_stockOut_data.productQty),2) AS total_quantity
                                        FROM
                                            inventory_stockOut_data
                                        GROUP BY
                                            inventory_stockOut_data.productId
                                    ) AS so ON p.productId = so.productId`;
        sql_querry_getProductList = `SELECT COUNT(*) AS inStockProduct
                                        FROM
                                            inventory_product_data AS p
                                        ${sql_querry_joins}
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty;
                                        SELECT COUNT(*) AS underStockedProduct
                                        FROM
                                            inventory_product_data AS p
                                        ${sql_querry_joins}
                                           WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0;
                                           SELECT COUNT(*) AS outOfStockProduct
                                        FROM
                                            inventory_product_data AS p
                                        ${sql_querry_joins}
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) = 0;
                                        SELECT COUNT(*) AS allProduct
                                        FROM
                                            inventory_product_data AS p
                                        ${sql_querry_joins} `;
        pool.query(sql_querry_getProductList, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            else if (data == '') {
                const msg = [{
                    'msg': 'No Data Available'
                }]
                return res.status(400).send(msg);
            } else {
                const count = {
                    instockProduct: data[0][0].inStockProduct,
                    underStockedProduct: data[1][0].underStockedProduct,
                    outOfStock: data[2][0].outOfStockProduct,
                    allProduct: data[3][0].allProduct
                }
                return res.status(200).send(count);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Product API

const addProduct = async (req, res) => {
    try {

        const uid1 = new Date();
        const productId = String("product_" + uid1.getTime());

        const data = {
            productName: req.body.productName.trim(),
            minProductQty: req.body.minProductQty,
            minProductUnit: req.body.minProductUnit.trim()
        }
        console.log(">>?>?>?>", data.productName);
        if (!data.productName || !data.minProductQty || !data.minProductUnit) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.productName = pool.query(`SELECT productName FROM inventory_product_data WHERE productName = '${data.productName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Product is Already In Use');
                } else {
                    const sql_querry_addUser = `INSERT INTO inventory_product_data(productId, productName, minProductQty, minProductUnit)
                                                VALUES('${productId}', '${data.productName}', ${data.minProductQty}, '${data.minProductUnit}')`;
                    pool.query(sql_querry_addUser, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Product Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// get Product Details Table

const getProductDetailsTable = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productStatus: req.query.productStatus,
            searchProduct: req.query.searchProduct
        }
        const sql_querry_staticQuery = `SELECT
                                    p.productId,
                                    UCASE(p.productName) AS productName,
                                    p.minProductQty,
                                    p.minProductUnit,
                                    COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock,
                                    COALESCE(ROUND(siLu.productPrice,2), 0) AS lastPrice,
                                    COALESCE(siLu.productQty, 0) AS lastUpdatedQty,
                                    COALESCE(
                                        DATE_FORMAT(siLu.stockInDate, '%d-%m-%Y'),
                                        "No Update"
                                    ) AS lastUpdatedStockInDate,
                                    CASE WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty THEN 'In-Stock' WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 THEN 'Low-Stock' ELSE 'Out-Stock'
                                END AS stockStatus
                                FROM
                                    inventory_product_data AS p
                                LEFT JOIN(
                                    SELECT
                                        inventory_stockIn_data.productId,
                                        ROUND(SUM(
                                            inventory_stockIn_data.productQty
                                        ),2) AS total_quantity
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
                                        ),2) AS total_quantity
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
                                    p.productId = siLu.productId`;
        const sql_querry_getMwSiSO = `SELECT
                                        p.productId,
                                        UCASE(p.productName) AS productName,
                                        p.minProductQty,
                                        p.minProductUnit,
                                        COALESCE(simw.total_quantity, 0) AS purchese,
                                        COALESCE(somw.total_quantity, 0) AS totalUsed,
                                        COALESCE(simw.totalExpense,0) AS totalExpense,
                                        COALESCE(somw.totalStockOutPrice,0) AS totalStockOutPrice,
                                        COALESCE(si.total_siPrice, 0) - COALESCE(so.total_soPrice, 0) AS remainPrice,
                                        COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock,
                                        COALESCE(ROUND(siLu.productPrice,2), 0) AS lastPrice,
                                        COALESCE(siLu.productQty, 0) AS lastUpdatedQty,
                                        COALESCE(
                                            DATE_FORMAT(siLu.stockInDate, '%d-%m-%Y'),
                                            "No Update"
                                        ) AS lastUpdatedStockInDate,
                                        CASE WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty THEN 'In-Stock' WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 THEN 'Low-Stock' ELSE 'Out-Stock'
                                    END AS stockStatus
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
                                            ),2) AS total_siPrice
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
                                            ),2) AS total_soPrice
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
                                                MAX(stockInCreationDate) As lastDate
                                            FROM
                                                inventory_stockIn_data
                                            GROUP BY
                                                productId
                                        )
                                    ) AS siLu
                                    ON
                                        p.productId = siLu.productId`;
        const sql_querry_joins = `LEFT JOIN
                                    (
                                        SELECT
                                                                inventory_stockIn_data.productId,
                                        ROUND(SUM(inventory_stockIn_data.productQty),2) AS total_quantity
                                                            FROM
                                                                inventory_stockIn_data
                                                            GROUP BY
                                                                inventory_stockIn_data.productId
                                    ) AS si ON p.productId = si.productId
                                                      LEFT JOIN
                                    (
                                        SELECT
                                                                inventory_stockOut_data.productId,
                                        ROUND(SUM(inventory_stockOut_data.productQty),2) AS total_quantity
                                                            FROM
                                                                inventory_stockOut_data
                                                            GROUP BY
                                                                inventory_stockOut_data.productId
                                    ) AS so ON p.productId = so.productId`;
        if (req.query.productStatus == 1) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows
                                        FROM
                                        inventory_product_data AS p
                                        ${sql_querry_joins}
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty`;
        } else if (req.query.productStatus == 2) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows
                                        FROM
                                            inventory_product_data AS p
                                        ${sql_querry_joins}
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0`;
        } else if (req.query.productStatus == 3) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows
                                        FROM
                                            inventory_product_data AS p
                                        ${sql_querry_joins}
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) = 0`;
        } else if (req.query.startDate && req.query.endDate && req.query.searchProduct) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows
                                        FROM
                                        inventory_product_data AS p
                                        ${sql_querry_joins}
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockIn_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockIn_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockIn_data.totalPrice
                                                )) AS totalExpense
                                            FROM
                                                inventory_stockIn_data
                                            WHERE
                                                inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockIn_data.productId
                                        ) AS simw
                                        ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                            p.productId = somw.productId
                                        WHERE p.productName LIKE '%` + data.searchProduct + `%'`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows
                                        FROM
                                        inventory_product_data AS p
                                        ${sql_querry_joins}
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockIn_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockIn_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockIn_data.totalPrice
                                                )) AS totalExpense
                                            FROM
                                                inventory_stockIn_data
                                            WHERE
                                                inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockIn_data.productId
                                        ) AS simw
                                        ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                            p.productId = somw.productId`;
        } else if (req.query.searchProduct) {
            sql_get_pagination = `SELECT COUNT(*) AS numRows
                                        FROM
                                        inventory_product_data AS p
                                        ${sql_querry_joins}
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockIn_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockIn_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockIn_data.totalPrice
                                                )) AS totalExpense
                                            FROM
                                                inventory_stockIn_data
                                            WHERE
                                                inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockIn_data.productId
                                        ) AS simw
                                        ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                            p.productId = somw.productId
                                        WHERE p.productName LIKE '%` + data.searchProduct + `%'`;
        } else {
            sql_get_pagination = `SELECT COUNT(*) AS numRows
                                        FROM
                                        inventory_product_data AS p
                                        ${sql_querry_joins}
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockIn_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockIn_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockIn_data.totalPrice
                                                )) AS totalExpense
                                            FROM
                                                inventory_stockIn_data
                                            WHERE
                                                inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockIn_data.productId
                                        ) AS simw
                                        ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                            p.productId = somw.productId`;
        }
        pool.query(sql_get_pagination, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                if (req.query.productStatus == 1) {
                    sql_queries_getdetails = `${sql_querry_staticQuery}
                                                WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty 
                                                ORDER BY p.productName LIMIT ${limit}`;
                } else if (req.query.productStatus == 2) {
                    sql_queries_getdetails = `${sql_querry_staticQuery}
                                                WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0
                                                ORDER BY p.productName LIMIT ${limit}`;
                } else if (req.query.productStatus == 3) {
                    sql_queries_getdetails = `${sql_querry_staticQuery}
                                                WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) = 0
                                                ORDER BY p.productName LIMIT ${limit}`;
                } else if (req.query.startDate && req.query.endDate && req.query.searchProduct) {
                    sql_queries_getdetails = `${sql_querry_getMwSiSO}
                                              LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS totalStockOutPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId 
                                        WHERE p.productName LIKE '%` + data.searchProduct + `%'
                                        ORDER BY p.productName LIMIT ${limit}`
                } else if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${sql_querry_getMwSiSO}
                                              LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                        inventory_stockOut_data.stockOutPrice
                                                )) AS totalStockOutPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        ORDER BY p.productName LIMIT ${limit}`
                } else if (req.query.searchProduct) {
                    sql_queries_getdetails = `${sql_querry_getMwSiSO}
                                              LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS totalStockOutPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        WHERE p.productName LIKE '%` + data.searchProduct + `%'
                                        ORDER BY p.productName LIMIT ${limit}`
                } else {
                    sql_queries_getdetails = `${sql_querry_getMwSiSO}
                                              LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS totalStockOutPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        ORDER BY p.productName LIMIT ${limit}`
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');;
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

// Remove Product API

const removeProduct = async (req, res) => {

    try {
        var productId = req.query.productId.trim();
        req.query.productId = pool.query(`SELECT productId FROM inventory_product_data WHERE productId = '${productId}'`, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM inventory_product_data WHERE productId = '${productId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Product Deleted Successfully");
                })
            } else {
                return res.send('ProductId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Product API

const updateProduct = async (req, res) => {
    try {
        const data = {
            productId: req.body.productId.trim(),
            productName: req.body.productName.trim(),
            minProductQty: req.body.minProductQty,
            minProductUnit: req.body.minProductUnit.trim()
        }
        if (!data.productName || !data.minProductQty || !data.minProductUnit) {
            return res.status(400).send("Please Fill All The Fields");
        }
        const sql_querry_updatedetails = `UPDATE inventory_product_data SET productName = '${data.productName}',
                                            minProductQty = ${data.minProductQty},
                                            minProductUnit = '${data.minProductUnit}'
                                            WHERE productId = '${data.productId}'`;
        pool.query(sql_querry_updatedetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send("Product Updated Successfully");
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export Excel Query for Product Table

const exportExcelSheetForProductTable = (req, res) => {

    var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
    var firstDay = new Date(y, m, 1).toString().slice(4, 15);
    var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

    const data = {
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
    }
    const commanQuarry = `SELECT
                            p.productId,
                            UCASE(p.productName) AS productName,
                            CONCAT(p.minProductQty,' ',p.minProductUnit) AS minQty,
                            CONCAT(COALESCE(simw.total_quantity, 0),' ',p.minProductUnit) AS purchase,
                            CONCAT(COALESCE(somw.total_quantity, 0),' ',p.minProductUnit) AS totalUsed,
                            COALESCE(simw.totalExpense,0) AS totalExpense,
                            COALESCE(somw.total_usedPrice,0) AS totalUsedPrice,
                            CONCAT(COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0),' ',p.minProductUnit) AS remainingStock,
                            COALESCE(si.total_siPrice, 0) - COALESCE(so.total_soPrice, 0) AS remainPrice,
                            COALESCE(ROUND(siLu.productPrice,2), 0) AS lastPrice,
                            CONCAT(COALESCE(siLu.productQty, 0),' ',p.minProductUnit) AS lastUpdatedQty,
                            COALESCE(
                                DATE_FORMAT(siLu.stockInDate, '%d-%m-%Y'),
                                "No Update"
                            ) AS lastUpdatedStockInDate,
                            CASE WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty THEN 'In-Stock' WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 THEN 'Low-Stock' ELSE 'Out-Stock'
                        END AS stockStatus
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
                            p.productId = siLu.productId`;
    if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarry}
                                        LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS total_usedPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId 
                                        ORDER BY p.productName;
                                        ${commanQuarry}
                                        LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS total_usedPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty  
                                        ORDER BY p.productName;
                                        ${commanQuarry}
                                        LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS total_usedPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 
                                        ORDER BY p.productName;
                                        ${commanQuarry}
                                        LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS total_usedPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) = 0
                                        ORDER BY p.productName;`;
    } else {
        sql_queries_getdetails = `${commanQuarry}
                                        LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS total_usedPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        ORDER BY p.productName;
                                        ${commanQuarry}
                                        LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS total_usedPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty  
                                        ORDER BY p.productName;
                                        ${commanQuarry}
                                        LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS total_usedPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 
                                        ORDER BY p.productName;
                                        ${commanQuarry}
                                        LEFT JOIN(
                                                SELECT
                                                    inventory_stockIn_data.productId,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.productQty
                                                    ),2) AS total_quantity,
                                                    ROUND(SUM(
                                                        inventory_stockIn_data.totalPrice
                                                    )) AS totalExpense
                                                FROM
                                                    inventory_stockIn_data
                                                WHERE
                                                    inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockIn_data.productId
                                            ) AS simw
                                            ON
                                            p.productId = simw.productId
                                        LEFT JOIN(
                                            SELECT
                                                inventory_stockOut_data.productId,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.productQty
                                                ),2) AS total_quantity,
                                                ROUND(SUM(
                                                    inventory_stockOut_data.stockOutPrice
                                                )) AS total_usedPrice
                                            FROM
                                                inventory_stockOut_data
                                            WHERE
                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            GROUP BY
                                                inventory_stockOut_data.productId
                                        ) AS somw
                                        ON
                                        p.productId = somw.productId
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) = 0
                                        ORDER BY p.productName;`;
    }
    console.log('find me', sql_queries_getdetails)
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);

        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("All Products"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'M1');
            worksheet.getCell('A1').value = `Product List From ${data.startDate} To ${data.endDate}`;
        } else {
            worksheet.mergeCells('A1', 'M1');
            worksheet.getCell('A1').value = `Product List From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Product Name', 'Total StockIn', 'Total Expense', 'Total Used', 'Total Used Price', 'Remaining Stock', 'Remaining Price', 'Last StockIn', 'Last Updated Price', 'Min ProductQty', 'Stock Status', 'LastIn DATE'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "productName", width: 30 },
            { key: "purchase", width: 20 },
            { key: "totalExpense", width: 20 },
            { key: "totalUsed", width: 20 },
            { key: "totalUsedPrice", width: 20 },
            { key: "remainingStock", width: 20 },
            { key: "remainPrice", width: 20 },
            { key: "lastUpdatedQty", width: 20 },
            { key: "lastPrice", width: 20 },
            { key: "minQty", width: 20 },
            { key: "stockStatus", width: 30 },
            { key: "lastUpdatedStockInDate", width: 15 }
        ];
        //Looping through User data
        const arr = rows[0];
        let counter = 1;
        arr.forEach((user, index) => {
            user.s_no = counter;
            const row = worksheet.addRow(user); // Add data in worksheet

            // Get the stock status value for the current row
            const stockStatus = user.stockStatus;

            // Set color based on stock status
            let textColor;
            switch (stockStatus) {
                case 'In-Stock':
                    textColor = '008000'; // Green color
                    break;
                case 'Low-Stock':
                    textColor = 'FFA500'; // Orange color
                    break;
                case 'Out-Stock':
                    textColor = 'FF0000'; // Red color
                    break;
                default:
                    textColor = '000000'; // Black color (default)
                    break;
            }

            // Apply the color to the cells in the current row
            row.eachCell((cell) => {
                cell.font = {
                    color: {
                        argb: textColor
                    }
                };
            });

            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13, color: { argb: '808080' } }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;
        worksheet.getRow(arr.length + 3).values = ['Total:', '', '', { formula: `SUM(D3:D${arr.length + 2})` }, '', { formula: `SUM(F3:F${arr.length + 2})` }, '', { formula: `SUM(H3:H${arr.length + 2})` }];

        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14, color: { argb: '808080' } }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });

        const worksheetInStock = workbook.addWorksheet("In Stock"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheetInStock.mergeCells('A1', 'M1');
            worksheetInStock.getCell('A1').value = `In-Stock Product List From ${data.startDate} To ${data.endDate}`;
        } else {
            worksheetInStock.mergeCells('A1', 'M1');
            worksheetInStock.getCell('A1').value = `In-Stock Product List From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheetInStock.getRow(2).values = ['S no.', 'Product Name', 'Total StockIn', 'Total Expense', 'Total Used', 'Total Used Price', 'Remaining Stock', 'Remaining Price', 'Last StockIn', 'Last Updated Price', 'Min ProductQty', 'Stock Status', 'LastIn DATE'];

        // Column for data in excel. key must match data key
        worksheetInStock.columns = [
            { key: "s_no", width: 10, },
            { key: "productName", width: 30 },
            { key: "purchase", width: 20 },
            { key: "totalExpense", width: 20 },
            { key: "totalUsed", width: 20 },
            { key: "totalUsedPrice", width: 20 },
            { key: "remainingStock", width: 20 },
            { key: "remainPrice", width: 20 },
            { key: "lastUpdatedQty", width: 20 },
            { key: "lastPrice", width: 20 },
            { key: "minQty", width: 20 },
            { key: "stockStatus", width: 30 },
            { key: "lastUpdatedStockInDate", width: 15 }
        ];
        //Looping through User data
        const arrstockIn = rows[1];
        let inStockcounter = 1;
        arrstockIn.forEach((user, index) => {
            user.s_no = inStockcounter;
            const row = worksheetInStock.addRow(user); // Add data in worksheet

            // Get the stock status value for the current row
            const stockStatus = user.stockStatus;

            // Set color based on stock status
            let textColor;
            switch (stockStatus) {
                case 'In-Stock':
                    textColor = '008000'; // Green color
                    break;
                case 'Low-Stock':
                    textColor = 'FFA500'; // Orange color
                    break;
                case 'Out-Stock':
                    textColor = 'FF0000'; // Red color
                    break;
                default:
                    textColor = '000000'; // Black color (default)
                    break;
            }

            // Apply the color to the cells in the current row
            row.eachCell((cell) => {
                cell.font = {
                    color: {
                        argb: textColor
                    }
                };
            });

            inStockcounter++;
        });
        // Making first line in excel bold
        worksheetInStock.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheetInStock.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13, color: { argb: '808080' } }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheetInStock.getRow(1).height = 30;
        worksheetInStock.getRow(2).height = 20;
        worksheetInStock.getRow(arrstockIn.length + 3).values = ['Total:', '', '', { formula: `SUM(D3:D${arrstockIn.length + 2})` }, '', { formula: `SUM(F3:F${arrstockIn.length + 2})` }, '', { formula: `SUM(H3:H${arrstockIn.length + 2})` }];

        worksheetInStock.getRow(arrstockIn.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14, color: { argb: '808080' } }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })
        worksheetInStock.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });

        const worksheetLowStock = workbook.addWorksheet("Low Stock"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheetLowStock.mergeCells('A1', 'M1');
            worksheetLowStock.getCell('A1').value = `Low-Stock Product List From ${data.startDate} To ${data.endDate}`;
        } else {
            worksheetLowStock.mergeCells('A1', 'M1');
            worksheetLowStock.getCell('A1').value = `Low-Stock Product List From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheetLowStock.getRow(2).values = ['S no.', 'Product Name', 'Total StockIn', 'Total Expense', 'Total Used', 'Total Used Price', 'Remaining Stock', 'Remaining Price', 'Last StockIn', 'Last Updated Price', 'Min ProductQty', 'Stock Status', 'LastIn DATE'];

        // Column for data in excel. key must match data key
        worksheetLowStock.columns = [
            { key: "s_no", width: 10, },
            { key: "productName", width: 30 },
            { key: "purchase", width: 20 },
            { key: "totalExpense", width: 20 },
            { key: "totalUsed", width: 20 },
            { key: "totalUsedPrice", width: 20 },
            { key: "remainingStock", width: 20 },
            { key: "remainPrice", width: 20 },
            { key: "lastUpdatedQty", width: 20 },
            { key: "lastPrice", width: 20 },
            { key: "minQty", width: 20 },
            { key: "stockStatus", width: 30 },
            { key: "lastUpdatedStockInDate", width: 15 }
        ];
        //Looping through User data
        const arrstockLow = rows[2];
        let lowStockcounter = 1;
        arrstockLow.forEach((user, index) => {
            if (Object.values(user).some((value) => value !== null && value !== "")) {
                user.s_no = lowStockcounter;
                const row = worksheetLowStock.addRow(user); // Add data in worksheet

                // Get the stock status value for the current row
                const stockStatus = user.stockStatus;

                // Set color based on stock status
                let textColor;
                switch (stockStatus) {
                    case 'In-Stock':
                        textColor = '008000'; // Green color
                        break;
                    case 'Low-Stock':
                        textColor = 'FFA500'; // Orange color
                        break;
                    case 'Out-Stock':
                        textColor = 'FF0000'; // Red color
                        break;
                    default:
                        textColor = '000000'; // Black color (default)
                        break;
                }

                // Apply the color to the cells in the current row
                row.eachCell((cell) => {
                    cell.font = {
                        color: {
                            argb: textColor
                        }
                    };
                });

                lowStockcounter++;
            }
        });
        // Making first line in excel bold
        worksheetLowStock.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheetLowStock.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13, color: { argb: '808080' } }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheetLowStock.getRow(1).height = 30;
        worksheetLowStock.getRow(2).height = 20;
        worksheetLowStock.getRow(arrstockLow.length + 3).values = ['Total:', '', '', { formula: `SUM(D3:D${arrstockLow.length + 2})` }, '', { formula: `SUM(F3:F${arrstockLow.length + 2})` }, '', { formula: `SUM(H3:H${arrstockLow.length + 2})` }];

        worksheetLowStock.getRow(arrstockLow.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14, color: { argb: '808080' } }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })
        worksheetLowStock.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });

        const worksheetOutStock = workbook.addWorksheet("Out Stock"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheetOutStock.mergeCells('A1', 'M1');
            worksheetOutStock.getCell('A1').value = `Out-Stock Product List From ${data.startDate} To ${data.endDate}`;
        } else {
            worksheetOutStock.mergeCells('A1', 'M1');
            worksheetOutStock.getCell('A1').value = `Out-Stock Product List From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheetOutStock.getRow(2).values = ['S no.', 'Product Name', 'Total StockIn', 'Total Expense', 'Total Used', 'Total Used Price', 'Remaining Stock', 'Remaining Price', 'Last StockIn', 'Last Updated Price', 'Min ProductQty', 'Stock Status', 'LastIn DATE'];

        // Column for data in excel. key must match data key
        worksheetOutStock.columns = [
            { key: "s_no", width: 10, },
            { key: "productName", width: 30 },
            { key: "purchase", width: 20 },
            { key: "totalExpense", width: 20 },
            { key: "totalUsed", width: 20 },
            { key: "totalUsedPrice", width: 20 },
            { key: "remainingStock", width: 20 },
            { key: "remainPrice", width: 20 },
            { key: "lastUpdatedQty", width: 20 },
            { key: "lastPrice", width: 20 },
            { key: "minQty", width: 20 },
            { key: "stockStatus", width: 30 },
            { key: "lastUpdatedStockInDate", width: 15 }
        ];
        //Looping through User data
        const arrstockOut = rows[3];
        let outStockcounter = 1;
        arrstockOut.forEach((user, index) => {
            user.s_no = outStockcounter;
            const row = worksheetOutStock.addRow(user); // Add data in worksheet

            // Get the stock status value for the current row
            const stockStatus = user.stockStatus;

            // Set color based on stock status
            let textColor;
            switch (stockStatus) {
                case 'In-Stock':
                    textColor = '008000'; // Green color
                    break;
                case 'Low-Stock':
                    textColor = 'FFA500'; // Orange color
                    break;
                case 'Out-Stock':
                    textColor = 'FF0000'; // Red color
                    break;
                default:
                    textColor = '000000'; // Black color (default)
                    break;
            }

            // Apply the color to the cells in the current row
            row.eachCell((cell) => {
                cell.font = {
                    color: {
                        argb: textColor
                    }
                };
            });

            outStockcounter++;
        });
        // Making first line in excel bold
        worksheetOutStock.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheetOutStock.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13, color: { argb: '808080' } }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheetOutStock.getRow(1).height = 30;
        worksheetOutStock.getRow(2).height = 20;
        worksheetOutStock.getRow(arrstockOut.length + 3).values = ['Total:', '', '', { formula: `SUM(D3:D${arrstockOut.length + 2})` }, '', { formula: `SUM(F3:F${arrstockOut.length + 2})` }, '', { formula: `SUM(H3:H${arrstockOut.length + 2})` }];

        worksheetOutStock.getRow(arrstockOut.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14, color: { argb: '808080' } }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })
        worksheetOutStock.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });

        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            // res.addHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename="+ fileName)
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
            // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            // res.setHeader("Content-Disposition", "attachment; filename=" + "Report.xlsx");
            // workbook.xlsx.write(res)
            // .then((data)=>{
            //     res.end();
            //         console.log('File write done........');
            //     });
        } catch (err) {
            throw new Error(err);
        }
    })
};

module.exports = {
    addProduct,
    getProductListCounter,
    updateProduct,
    removeProduct,
    getProductList,
    getProductCountDetailsById,
    getSupplierByProductId,
    getProductDetailsTable,
    exportExcelSheetForProductTable
}
