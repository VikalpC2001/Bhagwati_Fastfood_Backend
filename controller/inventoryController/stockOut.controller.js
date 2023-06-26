const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Add StockOut API

const addStockOutDetails = async (req, res) => {
    try {

        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const stockOutId = String("stockOut_" + uid1.getTime());
            console.log("...", stockOutId);

            const productId = req.body.productId;
            const productQty = req.body.productQty;
            const productUnit = req.body.productUnit.trim();
            const stockOutCategory = req.body.stockOutCategory.trim();
            const stockOutComment = req.body.stockOutComment ? req.body.stockOutComment.trim() : null;
            const stockOutDate = new Date(req.body.stockOutDate ? req.body.stockOutDate : "10/10/1001").toString().slice(4, 15)

            if (!productId || !productQty || !productUnit || !stockOutCategory || !stockOutDate) {
                return res.status(400).send("Please Fill all the feilds");
            }
            const get_remaining_stock = `SELECT COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock FROM inventory_product_data AS p
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
                                        WHERE p.productId = '${productId}'`;
            pool.query(get_remaining_stock, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const remainStock = data[0].remainingStock
                console.log("./././", remainStock);
                if (remainStock < productQty) {
                    return res.status(400).send(`Remaining Stock is ${remainStock} ${productUnit}. You Can Not Able To Out Stock`);
                } else {
                    const sql_querry_addStockOut = `INSERT INTO inventory_stockOut_data (stockOutId, userId, productId, productQty, productUnit, stockOutCategory, stockOutComment, stockOutDate)  
                                                    VALUES ('${stockOutId}', '${userId}', '${productId}', ${productQty}, '${productUnit}', '${stockOutCategory}', NULLIF('${stockOutComment}','null'), STR_TO_DATE('${stockOutDate}','%b %d %Y'))`;
                    pool.query(sql_querry_addStockOut, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Data Added Successfully");
                    })
                }
            })
        } else {
            res.status(401);
            res.send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Remove StockOut API

const removeStockOutTransaction = async (req, res) => {

    try {
        const stockOutId = req.query.stockOutId
        req.query.stockOutId = pool.query(`SELECT stockOutId FROM inventory_stockOut_data WHERE stockOutId = '${stockOutId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM inventory_stockOut_data WHERE stockOutId = '${stockOutId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Transaction Deleted Successfully");
                })
            } else {
                return res.send('Transaction Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Fill StockOut Transaction API

const fillStockOutTransaction = (req, res) => {
    try {
        const stockOutId = req.query.stockOutId
        sql_querry_fillUser = `SELECT stockOutId, userId, productId, productQty, productUnit, stockOutCategory, stockOutComment, stockOutDate FROM inventory_stockOut_data WHERE stockOutId = '${stockOutId}'`;
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

// Update StockOut API

const updateStockOutTransaction = async (req, res) => {
    try {

        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const stockOutId = req.body.stockOutId;
            const productId = req.body.productId;
            const productQty = req.body.productQty;
            const productUnit = req.body.productUnit.trim();
            const stockOutCategory = req.body.stockOutCategory.trim();
            const stockOutComment = req.body.stockOutComment ? req.body.stockOutComment.trim() : null;
            const stockOutDate = new Date(req.body.stockOutDate ? req.body.stockOutDate : "10/10/1001").toString().slice(4, 15)
            if (!productId || !productQty || !productUnit || !stockOutCategory || !stockOutDate) {
                return res.status(400).send("Please Fill all the feilds");
            }
            const get_remaining_stock = `SELECT COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock FROM inventory_product_data AS p
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
                                        WHERE p.productId = '${productId}'`;
            pool.query(get_remaining_stock, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const remainStock = data[0].remainingStock
                console.log("./././", remainStock);
                if (remainStock < productQty) {
                    return res.status(400).send(`Remaining Stock is ${remainStock} ${productUnit}. You Can Not Able To Out Stock`);
                } else {
                    const sql_querry_updatedetails = `UPDATE inventory_stockOut_data SET userId = '${userId}',
                                                                                         productId = '${productId}',
                                                                                         productQty = ${productQty},
                                                                                         productUnit = '${productUnit}',
                                                                                         stockOutCategory = '${stockOutCategory}',
                                                                                         stockOutComment = NULLIF('${stockOutComment}','null'),
                                                                                         stockOutDate = STR_TO_DATE('${stockOutDate}','%b %d %Y') 
                                                                                   WHERE stockOutId = '${stockOutId}'`;
                    pool.query(sql_querry_updatedetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Transaction Updated Successfully");
                    })
                }
            })


        } else {
            res.status(401);
            res.send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    addStockOutDetails,
    removeStockOutTransaction,
    fillStockOutTransaction,
    updateStockOutTransaction
}
