const pool = require('../../database');

// Product List with Search Api

const getProductList = (req, res) => {
    try {
        const searchProduct = req.query.searchProduct
        sql_querry_getProductList = `SELECT p.productId, p.productName, CONCAT(p.minProductQty, " ", p.minProductUnit) AS minProductQty,
                                            CONCAT(COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0), " ", p.minProductUnit) AS remainingStock, 
                                            CONCAT(COALESCE(siLu.productQty, 0)," ",p.minProductUnit) AS lastUpdatedQty, COALESCE(DATE_FORMAT(siLu.stockInDate, '%d-%M-%Y'), "No data Available") AS lastUpdatedStockInDate,
                                            CASE WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty THEN 'In Stock'
                                                 ELSE 'Out of Stock'
                                            END AS stockStatus
                                    FROM
                                        inventory_product_data AS p
                                    LEFT JOIN
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
                                        ) AS so ON p.productId = so.productId
                                    LEFT JOIN
                                        (
                                            SELECT
                                                productId,
                                                productQty,
                                                stockInDate
                                            FROM
                                                inventory_stockIn_data
                                            WHERE
                                                (productId, stockInCreationDate) IN(SELECT productId, MAX(stockInCreationDate) FROM inventory_stockIn_data GROUP BY productId)
                                        ) AS siLu ON p.productId = siLu.productId
                                        WHERE p.productName LIKE'%` + searchProduct + `%'`;
        pool.query(sql_querry_getProductList, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            else if (data == '') {
                const msg = [{
                    'msg': 'No Data Found'
                }]
                return res.status(400).send(msg);
            } else {
                return res.status(200).send(data);
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
                    const sql_querry_addUser = `INSERT INTO inventory_product_data (productId, productName, minProductQty, minProductUnit)  
                                                 VALUES ('${productId}','${data.productName}',${data.minProductQty},'${data.minProductUnit}')`;
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
        req.query.productId = pool.query(`SELECT productId FROM inventory_product_data WHERE productId= '${productId}'`, (err, row) => {
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
// Fill Product API

const fillProduct = (req, res) => {
    try {
        const productId = req.query.productId
        sql_querry_fillUser = `SELECT productName, minProductQty, minProductUnit FROM inventory_product_data WHERE productId = '${productId}'`;
        pool.query(sql_querry_fillUser, (err, data) => {
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

// Update Product API

const updateProduct = async (req, res) => {
    try {
        const data = {
            productId: req.body.productId.trim(),
            productName: req.body.productName.trim(),
            minProductQty: req.body.minProductQty,
            minProductUnit: req.body.minProductUnit.trim()
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
    fillProduct,
    updateProduct,
    removeProduct,
    getProductList
}

