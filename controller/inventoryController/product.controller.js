const pool = require('../../database');

// Get Product Counter Details

const getProductCountDetailsById = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        console.log("1111>>>>", firstDay);
        console.log("1111>>>>", lastDay);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productId: req.query.productId
        }
        const sql_querry_StatickCCount = `SELECT
                                               p.minProductQty,
                                               COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock,
                                               COALESCE(silu.productPrice, 0) AS lastPrice
                                           FROM
                                               inventory_product_data AS p
                                           LEFT JOIN(
                                               SELECT
                                                   inventory_stockIn_data.productId,
                                                   SUM(
                                                       inventory_stockIn_data.productQty
                                                   ) AS total_quantity
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
                                                   SUM(
                                                       inventory_stockOut_data.productQty
                                                   ) AS total_quantity
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
            sql_querry_getProductCount = `SELECT COALESCE(SUM(productQty),0) AS purchase, COALESCE(SUM(totalPrice),0) AS totalRs FROM inventory_stockIn_data WHERE inventory_stockIn_data.productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                            SELECT COALESCE(SUM(productQty),0) AS used FROM inventory_stockOut_data WHERE inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                            ${sql_querry_StatickCCount}`;
        } else {
            sql_querry_getProductCount = `SELECT COALESCE(SUM(productQty),0) AS purchase, COALESCE(SUM(totalPrice),0) AS totalRs FROM inventory_stockIn_data WHERE inventory_stockIn_data.productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                            SELECT COALESCE(SUM(productQty),0) AS used FROM inventory_stockOut_data WHERE inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y');
                                            ${sql_querry_StatickCCount}`;
        }
        pool.query(sql_querry_getProductCount, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            else {
                const count = {
                    totalPurchase: data[0][0].purchase,
                    totalRs: data[0][0].totalRs,
                    totalUsed: data[1][0].used,
                    remainingStock: data[2][0].remainingStock,
                    lastPrice: data[2][0].lastPrice,
                    minProductQty: data[2][0].minProductQty
                }
                return res.status(200).send(count);
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Product wise Supplier Api

const getSupplierByProductId = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        console.log("1111>>>>", firstDay);
        console.log("1111>>>>", lastDay);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productId: req.query.productId
        }
        if (req.query.startDate && req.query.endDate) {
            var sql_querry_getSupplierByProductId = `SELECT
                                                    inventory_supplier_data.supplierNickName,
                                                    COALESCE(si.quantity,0) AS Quantity
                                                FROM
                                                    inventory_supplierProducts_data AS ispd
                                                    INNER JOIN inventory_supplier_data ON inventory_supplier_data.supplierId = ispd.supplierId
                                                LEFT JOIN
                                                    (
                                                        SELECT
                                                            inventory_stockIn_data.supplierId,
                                                            SUM(
                                                                inventory_stockIn_data.productQty
                                                            ) AS quantity
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
                                                    COALESCE(si.quantity,0) AS Quantity
                                                FROM
                                                    inventory_supplierProducts_data AS ispd
                                                    INNER JOIN inventory_supplier_data ON inventory_supplier_data.supplierId = ispd.supplierId
                                                LEFT JOIN
                                                    (
                                                        SELECT
                                                            inventory_stockIn_data.supplierId,
                                                            SUM(
                                                                inventory_stockIn_data.productQty
                                                            ) AS quantity
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

// Product List with Search Api

const getProductList = (req, res) => {
    try {
        req.query.productStatus
        const sql_querry_getProductListwithStatus = `SELECT
                                                         p.productId,
                                                         UCASE(p.productName) AS productName,
                                                         p.minProductQty,
                                                         p.minProductUnit,
                                                         COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock,
                                                         COALESCE(silu.productPrice, 0) AS lastPrice,
                                                         COALESCE(siLu.productQty, 0) AS lastUpdatedQty,
                                                         COALESCE(
                                                             DATE_FORMAT(siLu.stockInDate, '%d-%m-%Y'),
                                                             "No Update"
                                                         ) AS lastUpdatedStockInDate,
                                                         CASE WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) > p.minProductQty THEN 'In Stock' WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) < p.minProductQty AND COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) != 0 THEN 'Under Stocked' ELSE 'Out of Stock'
                                                     END AS stockStatus
                                                     FROM
                                                         inventory_product_data AS p
                                                     LEFT JOIN(
                                                         SELECT inventory_stockIn_data.productId,
                                                             SUM(
                                                                 inventory_stockIn_data.productQty
                                                             ) AS total_quantity
                                                         FROM
                                                             inventory_stockIn_data
                                                         GROUP BY
                                                             inventory_stockIn_data.productId
                                                     ) AS si
                                                     ON
                                                         p.productId = si.productId
                                                     LEFT JOIN(
                                                         SELECT inventory_stockOut_data.productId,
                                                             SUM(
                                                                 inventory_stockOut_data.productQty
                                                             ) AS total_quantity
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
                                            WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) > p.minProductQty 
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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            else if (data == '') {
                return res.status(400).send('No Data Available');
            } else {
                return res.status(200).send(data);
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
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
                                        SUM(inventory_stockIn_data.productQty) AS total_quantity
                                                            FROM
                                                                inventory_stockIn_data
                                                            GROUP BY
                                                                inventory_stockIn_data.productId
                                    ) AS si ON p.productId = si.productId
                                                      LEFT JOIN
                                    (
                                        SELECT
                                                                inventory_stockOut_data.productId,
                                        SUM(inventory_stockOut_data.productQty) AS total_quantity
                                                            FROM
                                                                inventory_stockOut_data
                                                            GROUP BY
                                                                inventory_stockOut_data.productId
                                    ) AS so ON p.productId = so.productId`;
        sql_querry_getProductList = `SELECT COUNT(*) AS inStockProduct
                                        FROM
                                            inventory_product_data AS p
                                        ${sql_querry_joins}
                                        WHERE COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) > p.minProductQty;
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
                console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Select Unit Using ProductId API

const fillProductWiseUnit = (req, res) => {
    try {

        const productId = req.query.productId;
        sql_querry_getddlandUnit = `SELECT minProductUnit AS productUnit  FROM inventory_product_data WHERE productId = '${productId}'`;
        pool.query(sql_querry_getddlandUnit, (err, data) => {
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

// Add Product API

const addProduct = async (req, res) => {
    try {

        const uid1 = new Date();
        const productId = String("product_" + uid1.getTime());
        console.log("...", productId);

        const data = {
            productName: req.body.productName.trim(),
            minProductQty: req.body.minProductQty,
            minProductUnit: req.body.minProductUnit.trim()
        }
        console.log(">>?>?>?>", data.productName);
        if (!data.productName || !data.minProductQty || !data.minProductUnit) {
            res.status(400);
            res.send("Please Fill All The Fields")
        } else {
            req.body.productName = pool.query(`SELECT productName FROM inventory_product_data WHERE productName = '${data.productName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Product is Already In Use');
                } else {
                    const sql_querry_addUser = `INSERT INTO inventory_product_data(productId, productName, minProductQty, minProductUnit)
            VALUES('${productId}', '${data.productName}', ${data.minProductQty}, '${data.minProductUnit}')`;
                    pool.query(sql_querry_addUser, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Product Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Product API

const removeProduct = async (req, res) => {

    try {
        var productId = req.query.productId.trim();
        req.query.productId = pool.query(`SELECT productId FROM inventory_product_data WHERE productId = '${productId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM inventory_product_data WHERE productId = '${productId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Product Deleted Successfully");
                })
            } else {
                return res.send('ProductId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send("Product Updated Successfully");
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    addProduct,
    fillProductWiseUnit,
    getProductListCounter,
    updateProduct,
    removeProduct,
    getProductList,
    getProductCountDetailsById,
    getSupplierByProductId
}
