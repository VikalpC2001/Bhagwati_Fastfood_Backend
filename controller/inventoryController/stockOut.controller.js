const pool = require('../../database');
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");

// StockOUT List API

const getStockOutList = async (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productId: req.query.productId
        }
        if (req.query.productId && req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockOut_data WHERE inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockOut_data WHERE  inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.productId) {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockOut_data WHERE inventory_stockOut_data.productId = '${data.productId}'`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) as numRows FROM inventory_stockOut_data`;
        }
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commonQuery = `SELECT stockOutId, user_details.userName AS outBy, CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,inventory_product_data.productName AS productName, CONCAT(productQty,' ',productUnit) AS Quantity, inventory_stockOutCategory_data.stockOutCategoryName AS stockOutCategoryName, stockOutComment, DATE_FORMAT(stockOutDate,'%d-%m-%Y') AS stockOutDate 
                                                FROM inventory_stockOut_data
                                                INNER JOIN user_details ON user_details.userId = inventory_stockOut_data.userId
                                                INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_stockOut_data.productId
                                                INNER JOIN inventory_stockOutCategory_data ON inventory_stockOutCategory_data.stockOutCategoryId = inventory_stockOut_data.stockOutCategory`;
                if (req.query.productId && req.query.startDate && req.query.endDate) {

                    sql_queries_getdetails = `${commonQuery}
                                                WHERE inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                ORDER BY inventory_stockOut_data.stockOutCreationDate DESC LIMIT ${limit}`;

                } else if (req.query.startDate && req.query.endDate) {

                    sql_queries_getdetails = `${commonQuery}
                                                WHERE  inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                ORDER BY inventory_stockOut_data.stockOutCreationDate DESC LIMIT ${limit}`;

                } else if (req.query.productId) {

                    sql_queries_getdetails = `${commonQuery}
                                                WHERE inventory_stockOut_data.productId = '${data.productId}'
                                                ORDER BY inventory_stockOut_data.stockOutCreationDate DESC LIMIT ${limit}`;

                } else {
                    sql_queries_getdetails = `${commonQuery}
                                                ORDER BY inventory_stockOut_data.stockOutCreationDate DESC LIMIT ${limit}`
                }
                console.log("aaaaa", sql_queries_getdetails);
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get StockOut Category Used API

const getCategoryWiseUsedByProduct = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
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
            sql_queries_getCategoryUsed = `SELECT
                                                iscd.stockOutCategoryName,
                                                COALESCE(so.usedQty, 0) AS usedQty
                                            FROM
                                                inventory_stockOutCategory_data AS iscd
                                            LEFT JOIN(
                                                SELECT
                                                    inventory_stockOut_data.stockOutCategory,
                                                    SUM(
                                                        inventory_stockOut_data.productQty
                                                    ) AS usedQty
                                                FROM
                                                    inventory_stockOut_data
                                                WHERE
                                                    inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockOut_data.stockOutCategory
                                            ) AS so
                                            ON
                                                iscd.stockOutCategoryId = so.stockOutCategory
                                            ORDER BY so.usedQty DESC`;
        } else {
            sql_queries_getCategoryUsed = `SELECT
                                                iscd.stockOutCategoryName,
                                                COALESCE(so.usedQty, 0) AS usedQty
                                            FROM
                                                inventory_stockOutCategory_data AS iscd
                                            LEFT JOIN(
                                                SELECT
                                                    inventory_stockOut_data.stockOutCategory,
                                                    SUM(
                                                        inventory_stockOut_data.productQty
                                                    ) AS usedQty
                                                FROM
                                                    inventory_stockOut_data
                                                WHERE
                                                    inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY
                                                    inventory_stockOut_data.stockOutCategory
                                            ) AS so
                                            ON
                                              iscd.stockOutCategoryId = so.stockOutCategory
                                            ORDER BY so.usedQty DESC`
        }
        console.log('>?>?>>?', sql_queries_getCategoryUsed);
        pool.query(sql_queries_getCategoryUsed, (err, data) => {
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

// EXPORT Excel For StockOut List

const exportExcelSheetForStockout = (req, res) => {

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
    const sql_common_qurey = `SELECT
                                  stockOutId,
                                  CONCAT(
                                      user_details.userFirstName,
                                      ' ',
                                      user_details.userLastName
                                  ) AS outBy,
                                  inventory_product_data.productName AS productName,
                                  productQty,
                                  productUnit,
                                  inventory_stockOutCategory_data.stockOutCategoryName AS stockOutCategoryName,
                                  stockOutComment,
                                  DATE_FORMAT(stockOutDate, '%d-%m-%Y') AS stockOutDate
                              FROM
                                  inventory_stockOut_data
                              INNER JOIN user_details ON user_details.userId = inventory_stockOut_data.userId
                              INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_stockOut_data.productId
                              INNER JOIN inventory_stockOutCategory_data ON inventory_stockOutCategory_data.stockOutCategoryId = inventory_stockOut_data.stockOutCategory`;
    if (req.query.productId && req.query.startDate && req.query.endDate) {

        sql_queries_getdetails = `${sql_common_qurey}
                                    WHERE inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY inventory_stockOut_data.stockOutCreationDate DESC`;

    } else if (req.query.startDate && req.query.endDate) {

        sql_queries_getdetails = `${sql_common_qurey}
                                   WHERE  inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                   ORDER BY inventory_stockOut_data.stockOutCreationDate DESC`;

    } else if (req.query.productId) {

        sql_queries_getdetails = `${commonQuery}
                                    WHERE inventory_stockOut_data.productId = '${data.productId}' AND inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY inventory_stockOut_data.stockOutCreationDate DESC`;

    } else {
        sql_queries_getdetails = `${sql_common_qurey}
                                   WHERE  inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                   ORDER BY inventory_stockOut_data.stockOutCreationDate DESC`;
    }

    console.log('find me', sql_queries_getdetails)
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        console.log(":::", rows)
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("StockOut List"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'G1');
            worksheet.getCell('A1').value = `Stock Out From ${data.startDate} To ${data.endDate}`;
        } else {
            worksheet.mergeCells('A1', 'G1');
            worksheet.getCell('A1').value = `Stock Out From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Out By', 'Product', 'Quantity', 'Unit', 'Category', 'Comment', 'Date'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "outBy", width: 20 },
            { key: "productName", width: 30 },
            { key: "productQty", width: 10 },
            { key: "productUnit", width: 10 },
            { key: "stockOutCategoryName", width: 20 },
            { key: "stockOutComment", width: 30 },
            { key: "stockOutDate", width: 20 },
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
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
            worksheet.getRow(arr.length + 3).values = ['Total:', '', '', { formula: `SUM(D3:D${arr.length + 2})` }];
            worksheet.getRow(arr.length + 3).eachCell((cell) => {
                cell.font = { bold: true, size: 14 }
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            })
        }
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
    updateStockOutTransaction,
    getStockOutList,
    exportExcelSheetForStockout,
    getCategoryWiseUsedByProduct
}
