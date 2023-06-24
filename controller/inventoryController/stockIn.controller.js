const pool = require('../../database');
const jwt = require("jsonwebtoken");

// StockIn Add API

const addStockInDetails = async (req, res) => {
    try {

        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const stockInId = String("stockIn_" + uid1.getTime());
            console.log("...", stockInId);

            const data = {
                productId: req.body.productId,
                productQty: req.body.productQty,
                productUnit: req.body.productUnit.trim(),
                productPrice: req.body.productPrice,
                totalPrice: req.body.totalPrice,
                billNumber: req.body.billNumber ? req.body.billNumber.trim() : null,
                supplierId: req.body.supplierId,
                stockInPaymentMethod: req.body.stockInPaymentMethod,
                stockInComment: req.body.stockInComment ? req.body.stockInComment.trim() : null,
                stockInDate: new Date(req.body.stockInDate ? req.body.stockInDate : "10/10/1001").toString().slice(4, 15)
            }
            if (!data.productId || !data.productQty || !data.productUnit || !data.productPrice || !data.totalPrice || !data.supplierId || !data.stockInPaymentMethod || !data.stockInDate) {
                res.status(400);
                res.send("Please Fill all the feilds")
            } else {
                const sql_querry_addStockIn = `INSERT INTO inventory_stockIn_data (stockInId, userId, productId, productQty, productUnit, productPrice, totalPrice, billNumber, supplierId, stockInPaymentMethod, stockInComment, stockInDate)  
                                            VALUES ('${stockInId}', '${userId}', '${data.productId}', ${data.productQty}, '${data.productUnit}', ${data.productPrice}, ${data.totalPrice}, NULLIF('${data.billNumber}','null'), '${data.supplierId}', '${data.stockInPaymentMethod}', NULLIF('${data.stockInComment}','null'), STR_TO_DATE('${data.stockInDate}','%b %d %Y'))`;
                pool.query(sql_querry_addStockIn, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Data Added Successfully");
                })
            }

        } else {
            res.status(401);
            res.send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Remove Supplier API

const removeStockInTransaction = async (req, res) => {

    try {
        const stockInId = req.query.stockInId
        req.query.userId = pool.query(`SELECT stockInId FROM inventory_stockIn_data WHERE stockInId = '${stockInId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM inventory_stockIn_data WHERE stockInId = '${stockInId}'`;
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

// Fill StockIn Transaction API

const fillStockInTransaction = (req, res) => {
    try {
        const stockInId = req.query.stockInId
        sql_querry_fillUser = `SELECT productId, productQty, productUnit, productPrice, totalPrice, billNumber, supplierId, stockInPaymentMethod, stockInComment, stockInDate FROM inventory_stockIn_data WHERE stockInId = '${stockInId}'`;
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

// Update User API

const updateStockInTransaction = async (req, res) => {
    try {

        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const stockInId = req.body.stockInId;
            const data = {
                productId: req.body.productId,
                productQty: req.body.productQty,
                productUnit: req.body.productUnit.trim(),
                productPrice: req.body.productPrice,
                totalPrice: req.body.totalPrice,
                billNumber: req.body.billNumber ? req.body.billNumber.trim() : null,
                supplierId: req.body.supplierId,
                stockInPaymentMethod: req.body.stockInPaymentMethod,
                stockInComment: req.body.stockInComment ? req.body.stockInComment.trim() : null,
                stockInDate: new Date(req.body.stockInDate ? req.body.stockInDate : "10/10/1001").toString().slice(4, 15)
            }
            const sql_querry_updatedetails = `UPDATE inventory_stockIn_data SET userId = '${userId}',
                                                                                productId = '${data.productId}',
                                                                                productQty = ${data.productQty},
                                                                                productUnit = '${data.productUnit}',
                                                                                productPrice = ${data.productPrice},
                                                                                totalPrice = ${data.totalPrice},
                                                                                billNumber = NULLIF('${data.billNumber}','null'),
                                                                                supplierId = '${data.supplierId}',
                                                                                stockInPaymentMethod = '${data.stockInPaymentMethod}',
                                                                                stockInComment = NULLIF('${data.stockInComment}','null'),
                                                                                stockInDate = STR_TO_DATE('${data.stockInDate}','%b %d %Y') 
                                                                          WHERE stockInId = '${stockInId}'`;
            pool.query(sql_querry_updatedetails, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                return res.status(200).send("Transaction Updated Successfully");
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
    addStockInDetails,
    removeStockInTransaction,
    updateStockInTransaction,
    fillStockInTransaction,
}