const pool = require('../../database');
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");

// StockIn List API

const getStockInList = async (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productId: req.query.productId,
            supplierId: req.query.supplierId,
            payType: req.query.payType
        }
        if (req.query.supplierId && req.query.payType && req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockIn_data WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInPaymentMethod = '${data.payType}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.supplierId && req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockIn_data WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.productId && req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockIn_data WHERE inventory_stockIn_data.productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockIn_data WHERE inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.supplierId && req.query.payType) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockIn_data WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInPaymentMethod = '${data.payType}'`;
        } else if (req.query.productId) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockIn_data WHERE inventory_stockIn_data.productId = '${data.productId}'`;
        } else if (req.query.supplierId) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockIn_data WHERE inventory_stockIn_data.supplierId = '${data.supplierId}'`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockIn_data`;
        }
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanQuarry = `SELECT
                                          stockInId,
                                          user_details.userName AS enteredBy,
                                          CONCAT(
                                              user_details.userFirstName,
                                              ' ',
                                              user_details.userLastName
                                          ) AS userName,
                                          UPPER(inventory_product_data.productName) AS productName,
                                          CONCAT(productQty, ' ', productUnit) AS Quantity,
                                          ROUND(productPrice,2) AS productPrice,
                                          totalPrice,
                                          billNumber,
                                          inventory_supplier_data.supplierNickName AS supplier,
                                          stockInPaymentMethod,
                                          stockInComment,
                                          productQty,
                                          remainingQty,
                                          CONCAT(DATE_FORMAT(stockInDate, '%d-%m-%Y'),' ',DATE_FORMAT(stockInCreationDate, '%h:%i %p')) AS stockInDate
                                      FROM
                                          inventory_stockIn_data
                                      INNER JOIN user_details ON user_details.userId = inventory_stockIn_data.userId
                                      INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_stockIn_data.productId
                                      INNER JOIN inventory_supplier_data ON inventory_supplier_data.supplierId = inventory_stockIn_data.supplierId`;
                if (req.query.supplierId && req.query.payType && req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarry}
                                                WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInPaymentMethod = '${data.payType}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                ORDER BY inventory_stockIn_data.stockInDate DESC, inventory_stockIn_data.stockInCreationDate DESC LIMIT ${limit}`;
                } else if (req.query.supplierId && req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarry}
                                                WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                ORDER BY inventory_stockIn_data.stockInDate DESC, inventory_stockIn_data.stockInCreationDate DESC LIMIT ${limit}`;
                } else if (req.query.productId && req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarry}
                                                WHERE inventory_stockIn_data.productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                ORDER BY inventory_stockIn_data.stockInDate DESC, inventory_stockIn_data.stockInCreationDate DESC LIMIT ${limit}`;
                } else if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarry}
                                                WHERE  inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y') 
                                                ORDER BY inventory_stockIn_data.stockInDate DESC, inventory_stockIn_data.stockInCreationDate DESC LIMIT ${limit}`;
                } else if (req.query.supplierId && req.query.payType) {
                    sql_queries_getdetails = `${commanQuarry}
                                                WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInPaymentMethod = '${data.payType}'
                                                ORDER BY inventory_stockIn_data.stockInDate DESC, inventory_stockIn_data.stockInCreationDate DESC LIMIT ${limit}`;
                } else if (req.query.productId) {
                    sql_queries_getdetails = `${commanQuarry}
                                                WHERE inventory_stockIn_data.productId = '${data.productId}'
                                                ORDER BY inventory_stockIn_data.stockInDate DESC, inventory_stockIn_data.stockInCreationDate DESC LIMIT ${limit}`;
                } else if (req.query.supplierId) {
                    sql_queries_getdetails = `${commanQuarry}
                                                WHERE inventory_stockIn_data.supplierId = '${data.supplierId}'
                                                ORDER BY inventory_stockIn_data.stockInDate DESC, inventory_stockIn_data.stockInCreationDate DESC LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarry}
                                                ORDER BY inventory_stockIn_data.stockInDate DESC, inventory_stockIn_data.stockInCreationDate DESC LIMIT ${limit}`;
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
        res.status(500).json('Internal Server Error');
    }
}

// Export Excel for StockIn

const exportExcelSheetForStockin = (req, res) => {

    var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
    var firstDay = new Date(y, m, 1).toString().slice(4, 15);
    var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

    const data = {
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
        productId: req.query.productId,
        supplierId: req.query.supplierId,
        payType: req.query.payType
    }
    const commanQuarry = `SELECT
                            stockInId,
                            CONCAT(
                                user_details.userFirstName,
                                ' ',
                                user_details.userLastName
                            ) AS enteredBy,
                            UPPER(inventory_product_data.productName) AS productName,
                            productQty,
                            productUnit,
                            productPrice,
                            totalPrice,
                            billNumber,
                            inventory_supplier_data.supplierNickName AS supplier,
                            stockInPaymentMethod,
                            stockInComment,
                            DATE_FORMAT(stockInDate, '%d-%m-%Y') AS stockInDate
                        FROM
                            inventory_stockIn_data
                        INNER JOIN user_details ON user_details.userId = inventory_stockIn_data.userId
                        INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_stockIn_data.productId
                        INNER JOIN inventory_supplier_data ON inventory_supplier_data.supplierId = inventory_stockIn_data.supplierId`;
    if (req.query.supplierId && req.query.payType && req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarry}
                                    WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInPaymentMethod = '${data.payType}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY inventory_stockIn_data.stockInCreationDate DESC`;
    } else if (req.query.supplierId && req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarry}
                                    WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY inventory_stockIn_data.stockInCreationDate DESC`;
    } else if (req.query.productId && req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarry}
                                    WHERE inventory_stockIn_data.productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY inventory_stockIn_data.stockInCreationDate DESC`;
    } else if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarry}
                                    WHERE  inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y') 
                                    ORDER BY inventory_stockIn_data.stockInCreationDate DESC`;
    } else if (req.query.supplierId && req.query.payType) {
        sql_queries_getdetails = `${commanQuarry}
                                    WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInPaymentMethod = '${data.payType}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY inventory_stockIn_data.stockInCreationDate DESC`;
    } else if (req.query.productId) {
        sql_queries_getdetails = `${commanQuarry}
                                    WHERE inventory_stockIn_data.productId = '${data.productId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY inventory_stockIn_data.stockInCreationDate DESC`;
    } else if (req.query.supplierId) {
        sql_queries_getdetails = `${commanQuarry}
                                    WHERE inventory_stockIn_data.supplierId = '${data.supplierId}' AND inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY inventory_stockIn_data.stockInCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarry}
                                    WHERE inventory_stockIn_data.stockInDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY inventory_stockIn_data.stockInCreationDate DESC`;
    }


    console.log('find me', sql_queries_getdetails)
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        console.log(":::", rows)
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("StockIn List"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'L1');
            worksheet.getCell('A1').value = `Stock In From ${data.startDate} To ${data.endDate}`;
        } else {
            worksheet.mergeCells('A1', 'L1');
            worksheet.getCell('A1').value = `Stock In From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Entered By', 'Product', 'Quantity', 'Unit', 'Price', 'Total', 'Bill Number', 'Supplier', 'Pay Type', 'Comment', 'Date'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "enteredBy", width: 20 },
            { key: "productName", width: 30 },
            { key: "productQty", width: 10 },
            { key: "productUnit", width: 10 },
            { key: "productPrice", width: 10 },
            { key: "totalPrice", width: 10 },
            { key: "billNumber", width: 30 },
            { key: "supplier", width: 20 },
            { key: "stockInPaymentMethod", width: 10 },
            { key: "stockInComment", width: 30 },
            { key: "stockInDate", width: 10 }
        ];
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user, index) => {
            user.s_no = counter;
            const row = worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;
        if (req.query.productId || req.query.productId && req.query.startDate && req.query.endDate) {
            worksheet.getRow(arr.length + 3).values = ['Total:', '', '', { formula: `SUM(D3:D${arr.length + 2})` }, '', '', { formula: `SUM(G3:G${arr.length + 2})` }];
        } else {
            worksheet.getRow(arr.length + 3).values = ['Total:', '', '', '', '', '', { formula: `SUM(G3:G${arr.length + 2})` }];
        }
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
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
                productPrice: Number(req.body.productPrice).toFixed(2),
                totalPrice: Number(req.body.totalPrice).toFixed(2),
                billNumber: req.body.billNumber ? req.body.billNumber.trim() : null,
                supplierId: req.body.supplierId,
                stockInPaymentMethod: req.body.stockInPaymentMethod,
                stockInComment: req.body.stockInComment ? req.body.stockInComment.trim() : null,
                stockInDate: new Date(req.body.stockInDate ? req.body.stockInDate : null).toString().slice(4, 15)
            }
            if (!data.productId || !data.productQty || !data.productUnit || !data.productPrice || !data.totalPrice || !data.supplierId || !data.stockInPaymentMethod || !data.stockInDate) {
                return res.status(400).send("Please Fill all the feilds");
            } else {
                const sql_querry_addStockIn = `INSERT INTO inventory_stockIn_data (stockInId, userId, productId, productQty, productUnit, productPrice, totalPrice, billNumber, supplierId, stockInPaymentMethod, stockInComment, remainingQty, stockInDate)  
                                                VALUES ('${stockInId}', '${userId}', '${data.productId}', ${data.productQty}, '${data.productUnit}', ${data.totalPrice / data.productQty}, ${data.totalPrice}, NULLIF('${data.billNumber}','null'), '${data.supplierId}', '${data.stockInPaymentMethod}', NULLIF('${data.stockInComment}','null') ,${data.productQty}, STR_TO_DATE('${data.stockInDate}','%b %d %Y'))`;
                pool.query(sql_querry_addStockIn, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Data Added Successfully");
                })
            }

        } else {
            res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Remove StockIn API

const removeStockInTransaction = async (req, res) => {
    try {
        const stockInId = req.query.stockInId
        req.query.stockInId = pool.query(`SELECT stockInId, productQty, remainingQty FROM inventory_stockIn_data WHERE stockInId = '${stockInId}'`, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            console.log('jay jojjojojo', row[0].stockInId, row[0].productQty, row[0].remainingQty);
            if (row && row[0].stockInId.length) {
                if (row[0].productQty == row[0].remainingQty) {
                    const sql_querry_removedetails = `DELETE FROM inventory_stockIn_data WHERE stockInId = '${stockInId}'`;
                    pool.query(sql_querry_removedetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Transaction Deleted Successfully");
                    })
                } else {
                    return res.status(400).send("You Can Not Delete This Entry Because It is Already Used");
                }
            } else {
                return res.status(400).send('Transaction Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Fill StockIn Transaction API

const fillStockInTransaction = (req, res) => {
    try {
        const stockInId = req.query.stockInId
        sql_querry_fillUser = `SELECT inventory_stockIn_data.productId, inventory_product_data.productName, productQty, productUnit, productPrice, totalPrice, billNumber, supplierId, stockInPaymentMethod, stockInComment, stockInDate FROM inventory_stockIn_data
                                INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_stockIn_data.productId 
                                WHERE stockInId = '${stockInId}'`;
        pool.query(sql_querry_fillUser, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data[0]);
        })
    } catch (error) {
        console.error('An error occurred', error);
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
                productPrice: Number(req.body.productPrice).toFixed(2),
                totalPrice: Number(req.body.totalPrice).toFixed(2),
                billNumber: req.body.billNumber ? req.body.billNumber.trim() : null,
                supplierId: req.body.supplierId,
                stockInPaymentMethod: req.body.stockInPaymentMethod,
                stockInComment: req.body.stockInComment ? req.body.stockInComment.trim() : null,
                stockInDate: new Date(req.body.stockInDate ? req.body.stockInDate : "10/10/1001").toString().slice(4, 15)
            }
            if (!data.productId || !data.productQty || !data.productUnit || !data.productPrice || !data.totalPrice || !data.supplierId || !data.stockInPaymentMethod || !data.stockInDate) {
                return res.status(400).send("Please Fill all the feilds");
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
                                                                                remainingQty = ${data.productQty},
                                                                                stockInDate = STR_TO_DATE('${data.stockInDate}','%b %d %Y') 
                                                                          WHERE stockInId = '${stockInId}'`;
            pool.query(sql_querry_updatedetails, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                return res.status(200).send("Transaction Updated Successfully");
            })

        } else {
            res.status(401);
            res.send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}


module.exports = {
    addStockInDetails,
    getStockInList,
    removeStockInTransaction,
    updateStockInTransaction,
    fillStockInTransaction,
    exportExcelSheetForStockin
}