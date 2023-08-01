const pool = require('../../database');
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");
const { all } = require('../../routs/inventoryRouts/inventory.routs');

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
                const commonQuery = `SELECT stockOutId, user_details.userName AS outBy, CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,inventory_product_data.productName AS productName, CONCAT(productQty,' ',productUnit) AS Quantity, stockOutPrice, inventory_stockOutCategory_data.stockOutCategoryName AS stockOutCategoryName, stockOutComment, DATE_FORMAT(stockOutDate,'%d-%m-%Y') AS stockOutDate 
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
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
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

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            productId: req.query.productId
        }
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getCategoryUsed = `SELECT
                                                iscd.stockOutCategoryName,
                                                COALESCE(so.usedQty, 0) AS usedQty,
                                                COALESCE(so.usedPrice,0) AS usedPrice
                                            FROM
                                                inventory_stockOutCategory_data AS iscd
                                            LEFT JOIN(
                                                SELECT
                                                    inventory_stockOut_data.stockOutCategory,
                                                    SUM(
                                                        inventory_stockOut_data.productQty
                                                    ) AS usedQty,
                                                    SUM(
                                                        inventory_stockOut_data.stockOutPrice
                                                    ) AS usedPrice
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
                                                COALESCE(so.usedQty, 0) AS usedQty,
                                                COALESCE(so.usedPrice,0) AS usedPrice
                                            FROM
                                                inventory_stockOutCategory_data AS iscd
                                            LEFT JOIN(
                                                SELECT
                                                    inventory_stockOut_data.stockOutCategory,
                                                    SUM(
                                                        inventory_stockOut_data.productQty
                                                    ) AS usedQty,
                                                    SUM(
                                                        inventory_stockOut_data.stockOutPrice
                                                    ) AS usedPrice
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
        console.log(">>>><<??", sql_queries_getCategoryUsed);
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
                                  UPPER(inventory_product_data.productName) AS productName,
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

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
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
            const stockOutDate = new Date(req.body.stockOutDate ? req.body.stockOutDate : "10/10/1001").toString().slice(4, 15);

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
                    sql_querry_getStockIndetail = `SELECT stockInId, productId, productQty, productPrice AS stockInPrice, remainingQty AS stockInQuantity FROM inventory_stockIn_data WHERE productId = '${productId}' AND remainingQty != 0 ORDER BY stockInDate ASC`;
                    pool.query(sql_querry_getStockIndetail, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const stockInData = Object.values(JSON.parse(JSON.stringify(data)));
                        console.log(">>>", Object.values(JSON.parse(JSON.stringify(data))));
                        const stockOutData = [
                            { productId: req.body.productId, stockOutQuantity: req.body.productQty }
                        ];

                        // Desired quantity
                        const desiredQuantity = stockOutData[0].stockOutQuantity;
                        console.log("?????", desiredQuantity);

                        // Calculate total stock out price
                        let remainingQuantity = desiredQuantity;
                        let totalStockOutPrice = 0;

                        // Sort stock in data by stock in price in ascending order
                        const sortedStockInData = stockInData
                        // const sortedStockInData = stockInData.sort((a, b) => a.stockInPrice - b.stockInPrice);
                        for (const stockOut of stockOutData) {
                            let stockOutQuantity = stockOut.stockOutQuantity;

                            for (const stockIn of sortedStockInData) {
                                const { stockInQuantity, stockInPrice } = stockIn;

                                if (stockInQuantity > 0) {
                                    const quantityToUse = Math.min(stockOutQuantity, stockInQuantity, remainingQuantity);
                                    const stockOutPrice = stockInPrice * quantityToUse;

                                    totalStockOutPrice += stockOutPrice;
                                    remainingQuantity -= quantityToUse;
                                    stockOutQuantity -= quantityToUse;
                                    stockIn.stockInQuantity -= quantityToUse;

                                    if (remainingQuantity <= 0) {
                                        break;
                                    }
                                }
                            }

                            if (remainingQuantity <= 0) {
                                break;
                            }
                        }

                        // Print updated stockInData
                        console.log("Updated stockInData:", stockInData);

                        console.log("Total Stock Out Price:", totalStockOutPrice);
                        const stocokOutPrice = Number(totalStockOutPrice).toFixed(2);

                        const sopq = stockInData.filter((obj) => {
                            if (obj.stockInQuantity != obj.productQty) {
                                return obj;
                            }
                        })

                        function generateUpdateQuery(data) {
                            let query = 'UPDATE inventory_stockIn_data\nSET remainingQty = CASE\n';

                            data.forEach((item) => {
                                const { stockInId, stockInQuantity } = item;
                                query += `    WHEN stockInId = '${stockInId}' THEN ${stockInQuantity}\n`;
                            });

                            query += '    ELSE remainingQty\nEND\n';

                            const stockInIds = data.map((item) => `'${item.stockInId}'`).join(', ');
                            query += `WHERE stockInId IN (${stockInIds});`;

                            return query;
                        }

                        console.log(generateUpdateQuery(sopq))
                        const sql_qurey_updatedRemainQty = generateUpdateQuery(sopq);
                        pool.query(sql_qurey_updatedRemainQty, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            const sql_querry_addStockOut = `INSERT INTO inventory_stockOut_data (stockOutId, userId, productId, productQty, productUnit, stockOutPrice, stockOutCategory, stockOutComment, stockOutDate)  
                                                            VALUES ('${stockOutId}', '${userId}', '${productId}', ${productQty}, '${productUnit}', ${stocokOutPrice}, '${stockOutCategory}', NULLIF('${stockOutComment}','null'), STR_TO_DATE('${stockOutDate}','%b %d %Y'))`;
                            pool.query(sql_querry_addStockOut, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                const sowsiId = sopq.map((obj) => {
                                    if (obj.stockInQuantity != obj.productQty) {
                                        return obj.stockInId;
                                    }
                                })
                                console.log(">?>?>?<<<<.,,,", sowsiId);
                                const stockOutWiseStockInId = () => {

                                    var string = ''
                                    sowsiId.forEach((data, index) => {
                                        if (index == 0)
                                            string = "(" + "'" + stockOutId + "'" + "," + string + "'" + data + "'" + ")";
                                        else
                                            string = string + ",(" + "'" + stockOutId + "'" + "," + "'" + data + "'" + ")";
                                    });
                                    return string;

                                }
                                console.log(">?>?>/////", stockOutWiseStockInId())

                                sql_querry_addsowsiId = `INSERT INTO inventory_stockOutwiseStockInId_data (stockOutId, stockInId) VALUES ${stockOutWiseStockInId()}`;
                                pool.query(sql_querry_addsowsiId, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    return res.status(200).send("Data Added Successfully");
                                })
                            })
                        })
                    })
                }
            })
        } else {
            res.status(401).send("Please Login Firest.....!");
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
                sql_get_sowsoid = `SELECT stockInId, productId, productQty, productPrice AS stockInPrice, remainingQty AS remainingStock FROM inventory_stockIn_data WHERE stockInId IN (SELECT COALESCE(stockInId,null) FROM inventory_stockOutwiseStockInId_data WHERE stockOutId = '${stockOutId}') ORDER BY stockInCreationDate DESC`;
                console.log(">>><<<", sql_get_sowsoid);
                pool.query(sql_get_sowsoid, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const prevoiusQuantity = data[0].productQty;
                    console.log(">>>", Object.values(JSON.parse(JSON.stringify(data))));
                    const StockInData = Object.values(JSON.parse(JSON.stringify(data)));
                    console.log("::::::::", prevoiusQuantity - req.body.productQty);
                    const stockOutData = [
                        { productId: req.body.productId, stockOutQuantity: prevoiusQuantity }
                    ];

                    // const StockInData = [
                    //     { productId: 1, remainingStock: 5, productQty: 5, stockInPrice: 70 },
                    //     { productId: 1, remainingStock: 5, productQty: 5, stockInPrice: 60 },
                    //     { productId: 1, remainingStock: 2, productQty: 5, stockInPrice: 50 },
                    //     { productId: 1, remainingStock: 0, productQty: 5, stockInPrice: 40 },
                    //     { productId: 1, remainingStock: 0, productQty: 5, stockInPrice: 30 },
                    // ];

                    let desiredQuantity = stockOutData[0].stockOutQuantity; // Desired quantity to be inserted into the buckets
                    console.log("><?", desiredQuantity);
                    let totalCost = 0; // Total cost of filling the buckets

                    for (let i = 0; i < StockInData.length; i++) {
                        const stockIn = StockInData[i];
                        const availableSpace = stockIn.productQty - stockIn.remainingStock; // Calculate the available space for the product

                        if (desiredQuantity <= availableSpace) {
                            // If the desired quantity can fit completely in the current stock in entry
                            stockIn.remainingStock += desiredQuantity;
                            totalCost += desiredQuantity * stockIn.stockInPrice;
                            break; // Exit the loop since the desired quantity has been inserted
                        } else {
                            // If the desired quantity cannot fit completely in the current stock in entry
                            stockIn.remainingStock = stockIn.productQty;
                            totalCost += availableSpace * stockIn.stockInPrice;
                            desiredQuantity -= availableSpace;
                        }
                    }

                    console.log("Updated StockInData:", StockInData);
                    console.log("Total Cost of Filling: ", totalCost);

                    const sopq = StockInData.filter((obj) => {
                        if (obj.stockInQuantity != obj.productQty) {
                            return obj;
                        }
                    })

                    function generateUpdateQuery(data) {
                        let query = 'UPDATE inventory_stockIn_data\nSET remainingQty = CASE\n';

                        data.forEach((item) => {
                            const { stockInId, remainingStock } = item;
                            query += `    WHEN stockInId = '${stockInId}' THEN ${remainingStock}\n`;
                        });

                        query += '    ELSE remainingQty\nEND\n';

                        const stockInIds = data.map((item) => `'${item.stockInId}'`).join(', ');
                        query += `WHERE stockInId IN (${stockInIds});`;

                        return query;
                    }

                    console.log(generateUpdateQuery(sopq))
                    const sql_qurey_updatedRemainQty = generateUpdateQuery(sopq);
                    pool.query(sql_qurey_updatedRemainQty, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const sql_querry_removedetails = `DELETE FROM inventory_stockOut_data WHERE stockOutId = '${stockOutId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Transaction Deleted Successfully");
                        })
                    })
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
        sql_querry_fillUser = `SELECT inventory_stockOut_data.productId FROM inventory_stockOut_data 
                                WHERE stockOutId = '${stockOutId}'`;
        pool.query(sql_querry_fillUser, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const productId = data[0].productId
            sql_get_remainStockWithdata = ` SELECT inventory_stockOut_data.productId, inventory_product_data.productName,productQty, productUnit, stockOutCategory, stockOutComment, stockOutDate FROM inventory_stockOut_data 
                                                INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_stockOut_data.productId
                                                WHERE stockOutId = '${stockOutId}';
                                            SELECT COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock FROM inventory_product_data AS p
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
            pool.query(sql_get_remainStockWithdata, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const stockOutData = data[0][0];
                const remainStock = data[1][0].remainingStock + data[0][0].productQty;
                const fillData = {
                    ...stockOutData,
                    remainingStock: remainStock,
                }
                return res.status(200).send(fillData);
            })
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
            const uid1 = new Date();
            const stockOutHistoryId = String("modifiedSO_" + uid1.getTime());
            console.log("...", stockOutHistoryId);
            const stockOutId = req.body.stockOutId;
            const productId = req.body.productId;
            const productQty = req.body.productQty;
            const productUnit = req.body.productUnit.trim();
            const stockOutCategory = req.body.stockOutCategory.trim();
            const stockOutComment = req.body.stockOutComment ? req.body.stockOutComment.trim() : null;
            const stockOutDate = new Date(req.body.stockOutDate ? req.body.stockOutDate : "10/10/1001").toString().slice(4, 15);
            const reason = req.body.reason ? req.body.reason : null;
            const currentModifyDate = new Date().toString().slice(4, 24)
            if (!productId || !productQty || !productUnit || !stockOutCategory || !stockOutDate || !reason) {
                return res.status(400).send("Please Fill all the feilds");
            }
            get_remaining_stock = `SELECT COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock FROM inventory_product_data AS p
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
                                        WHERE p.productId = '${productId}';
                                    SELECT productQty FROM inventory_stockOut_data WHERE stockOutId = '${stockOutId}'`;
            pool.query(get_remaining_stock, (err, remaindata) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const remainStock = remaindata[0][0].remainingStock;
                const previousQty = remaindata[1][0].productQty;
                console.log("./././", remainStock + previousQty);
                const remainIngUpdateStock = remainStock + previousQty;
                if (remainIngUpdateStock < productQty) {
                    return res.status(400).send(`Remaining Stock is ${remainStock} ${productUnit}. You Can Not Able To Out Stock`);
                } else {
                    const get_previous_data = `SELECT inventory_stockOut_data.productId, productQty, productUnit, stockOutPrice, inventory_stockOutCategory_data.stockOutCategoryName AS stockOutCategory, stockOutComment, DATE_FORMAT(stockOutDate,'%b %d %Y') AS stockOutDate, stockOutModificationDate FROM inventory_stockOut_data
                                                INNER JOIN inventory_stockOutCategory_data ON inventory_stockOutCategory_data.stockOutCategoryId = inventory_stockOut_data.stockOutCategory
                                                WHERE stockOutId = '${stockOutId}';
                                                SELECT inventory_stockOutCategory_data.stockOutCategoryName FROM inventory_stockOutCategory_data
                                                WHERE stockOutCategoryId = '${stockOutCategory}'`;
                    pool.query(get_previous_data, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const previousStockOutPrice = data[0][0].stockOutPrice;
                        const prevoiusQuantity = data[0][0].productQty;
                        const stockOutModificationDate = data[0][0].stockOutModificationDate ? new Date(data[0][0].stockOutModificationDate).toString().slice(4, 24) : new Date().toString().slice(4, 24);
                        const previousData = {
                            productQty: data[0][0].productQty,
                            stockOutCategory: data[0][0].stockOutCategory,
                            stockOutComment: data[0][0].stockOutComment ? data[0][0].stockOutComment : null,
                            stockOutDate: data[0][0].stockOutDate,
                        }
                        const newData = {
                            productQty: req.body.productQty,
                            stockOutCategory: data[1][0].stockOutCategoryName,
                            stockOutComment: req.body.stockOutComment,
                            stockOutDate: new Date(req.body.stockOutDate).toString().slice(4, 15)
                        }
                        let dataEdited = {}
                        console.log(">>>", previousData);
                        console.log('/////???', Object.keys(previousData));
                        console.log(">>>.....", newData);
                        const previousKey = Object.keys(previousData);
                        const updatedField = previousKey.filter((key) => {
                            if (previousData[key] != newData[key]) {
                                dataEdited = { ...dataEdited, [key]: newData[key] }
                                return key;
                            }
                        })
                        if (updatedField.includes('productQty')) {
                            previousData.productQty = previousData.productQty + ' ' + productUnit;
                            newData.productQty = newData.productQty + ' ' + productUnit;
                        }
                        if (updatedField == null || updatedField == '') {
                            return res.status(500).send('No Change');
                        }

                        sql_querry_getStockIndetail = `SELECT stockInId, productId, productQty, productPrice AS stockInPrice, remainingQty AS stockInQuantity FROM inventory_stockIn_data WHERE productId = '${productId}' AND remainingQty != 0 ORDER BY stockInDate ASC`;
                        pool.query(sql_querry_getStockIndetail, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            console.log(">>>???", prevoiusQuantity);
                            console.log(">>>", req.body.productQty);
                            if (prevoiusQuantity < req.body.productQty) {
                                const stockInData = Object.values(JSON.parse(JSON.stringify(data)));
                                console.log(">>>", Object.values(JSON.parse(JSON.stringify(data))));
                                console.log("::::::::", req.body.productQty - prevoiusQuantity);
                                const stockOutData = [
                                    { productId: req.body.productId, stockOutQuantity: req.body.productQty - prevoiusQuantity }
                                ];

                                // Desired quantity
                                const desiredQuantity = stockOutData[0].stockOutQuantity;
                                console.log("?????", desiredQuantity);

                                // Calculate total stock out price
                                let remainingQuantity = desiredQuantity;
                                let totalStockOutPrice = 0;

                                // Sort stock in data by stock in price in ascending order
                                const sortedStockInData = stockInData
                                // const sortedStockInData = stockInData.sort((a, b) => a.stockInPrice - b.stockInPrice);
                                for (const stockOut of stockOutData) {
                                    let stockOutQuantity = stockOut.stockOutQuantity;

                                    for (const stockIn of sortedStockInData) {
                                        const { stockInQuantity, stockInPrice } = stockIn;

                                        if (stockInQuantity > 0) {
                                            const quantityToUse = Math.min(stockOutQuantity, stockInQuantity, remainingQuantity);
                                            const stockOutPrice = stockInPrice * quantityToUse;

                                            totalStockOutPrice += stockOutPrice;
                                            remainingQuantity -= quantityToUse;
                                            stockOutQuantity -= quantityToUse;
                                            stockIn.stockInQuantity -= quantityToUse;

                                            if (remainingQuantity <= 0) {
                                                break;
                                            }
                                        }
                                    }

                                    if (remainingQuantity <= 0) {
                                        break;
                                    }
                                }

                                // Print updated stockInData
                                console.log("Updated stockInData:", stockInData);

                                console.log("Total Stock Out Price:", totalStockOutPrice);
                                const totalofStockOutPrice = previousStockOutPrice + totalStockOutPrice;
                                const stockOutPrice = Number(totalofStockOutPrice).toFixed(2);

                                const sopq = stockInData.filter((obj) => {
                                    if (obj.stockInQuantity != obj.productQty) {
                                        return obj;
                                    }
                                })

                                function generateUpdateQuery(data) {
                                    let query = 'UPDATE inventory_stockIn_data\nSET remainingQty = CASE\n';

                                    data.forEach((item) => {
                                        const { stockInId, stockInQuantity } = item;
                                        query += `    WHEN stockInId = '${stockInId}' THEN ${stockInQuantity}\n`;
                                    });

                                    query += '    ELSE remainingQty\nEND\n';

                                    const stockInIds = data.map((item) => `'${item.stockInId}'`).join(', ');
                                    query += `WHERE stockInId IN (${stockInIds});`;

                                    return query;
                                }

                                console.log(generateUpdateQuery(sopq))
                                const sql_qurey_updatedRemainQty = generateUpdateQuery(sopq);
                                pool.query(sql_qurey_updatedRemainQty, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    const editFields = () => {
                                        var string = ''
                                        updatedField.forEach((data, index) => {
                                            if (index == 0)
                                                string = "(" + "'" + stockOutId + "'" + "," + "'" + userId + "'" + "," + "'" + productId + "'" + "," + "'" + previousData[data] + "'" + "," + "'" + newData[data] + "'" + "," + "'" + reason + "'" + "," + "STR_TO_DATE('" + stockOutModificationDate + "','%b %d %Y %H:%i:%s')" + "," + "STR_TO_DATE('" + currentModifyDate + "','%b %d %Y %H:%i:%s')" + ")";
                                            else
                                                string = string + ",(" + "'" + stockOutId + "'" + "," + "'" + userId + "'" + "," + "'" + productId + "'" + "," + "'" + previousData[data] + "'" + "," + "'" + newData[data] + "'" + "," + "'" + reason + "'" + "," + "STR_TO_DATE('" + stockOutModificationDate + "','%b %d %Y %H:%i:%s')" + "," + "STR_TO_DATE('" + currentModifyDate + "','%b %d %Y %H:%i:%s')" + ")";
                                        });
                                        return string;
                                    }

                                    console.log(">>>>>>>><<<<<<<<<", editFields());
                                    const sql_querry_addPreviousData = `INSERT INTO inventory_modified_history  (
                                                                                                stockOutId,
                                                                                                userId,
                                                                                                ProductId,
                                                                                                previous,
                                                                                                updated,
                                                                                                modifiedReason,
                                                                                                previousDateTime,
                                                                                                updatedDateTime
                                                                                            )
                                                                                            VALUES ${editFields()}`;
                                    console.log(">>.....", sql_querry_addPreviousData);
                                    pool.query(sql_querry_addPreviousData, (err, data) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
                                        console.log(">?>?>?>?,,,", stockOutCategory);
                                        const sql_querry_updatedetails = `UPDATE inventory_stockOut_data SET userId = '${userId}',
                                                                                         productId = '${productId}',
                                                                                         productQty = ${productQty},
                                                                                         productUnit = '${productUnit}',
                                                                                         stockOutPrice = ${stockOutPrice},
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
                                    })
                                })
                            } else if (prevoiusQuantity > req.body.productQty) {
                                sql_get_sowsoid = `SELECT stockInId, productId, productQty, productPrice AS stockInPrice, remainingQty AS remainingStock FROM inventory_stockIn_data WHERE stockInId IN (SELECT COALESCE(stockInId,null) FROM inventory_stockOutwiseStockInId_data WHERE stockOutId = '${stockOutId}') ORDER BY stockInCreationDate DESC`;
                                console.log(">>><<<", sql_get_sowsoid);
                                pool.query(sql_get_sowsoid, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    console.log(">>>", Object.values(JSON.parse(JSON.stringify(data))));
                                    const StockInData = Object.values(JSON.parse(JSON.stringify(data)));
                                    console.log("::::::::", prevoiusQuantity - req.body.productQty);
                                    const stockOutData = [
                                        { productId: req.body.productId, stockOutQuantity: prevoiusQuantity - req.body.productQty }
                                    ];

                                    // const StockInData = [
                                    //     { productId: 1, remainingStock: 5, productQty: 5, stockInPrice: 70 },
                                    //     { productId: 1, remainingStock: 5, productQty: 5, stockInPrice: 60 },
                                    //     { productId: 1, remainingStock: 2, productQty: 5, stockInPrice: 50 },
                                    //     { productId: 1, remainingStock: 0, productQty: 5, stockInPrice: 40 },
                                    //     { productId: 1, remainingStock: 0, productQty: 5, stockInPrice: 30 },
                                    // ];

                                    let desiredQuantity = stockOutData[0].stockOutQuantity; // Desired quantity to be inserted into the buckets
                                    console.log("><?", desiredQuantity);
                                    let totalCost = 0; // Total cost of filling the buckets

                                    for (let i = 0; i < StockInData.length; i++) {
                                        const stockIn = StockInData[i];
                                        const availableSpace = stockIn.productQty - stockIn.remainingStock; // Calculate the available space for the product

                                        if (desiredQuantity <= availableSpace) {
                                            // If the desired quantity can fit completely in the current stock in entry
                                            stockIn.remainingStock += desiredQuantity;
                                            totalCost += desiredQuantity * stockIn.stockInPrice;
                                            break; // Exit the loop since the desired quantity has been inserted
                                        } else {
                                            // If the desired quantity cannot fit completely in the current stock in entry
                                            stockIn.remainingStock = stockIn.productQty;
                                            totalCost += availableSpace * stockIn.stockInPrice;
                                            desiredQuantity -= availableSpace;
                                        }
                                    }

                                    console.log("Updated StockInData:", StockInData);
                                    console.log("Total Cost of Filling: ", totalCost);

                                    const totalofStockOutPrice = previousStockOutPrice - totalCost;
                                    const stockOutPrice = Number(totalofStockOutPrice).toFixed(2);

                                    const sopq = StockInData.filter((obj) => {
                                        if (obj.stockInQuantity != obj.productQty) {
                                            return obj;
                                        }
                                    })

                                    function generateUpdateQuery(data) {
                                        let query = 'UPDATE inventory_stockIn_data\nSET remainingQty = CASE\n';

                                        data.forEach((item) => {
                                            const { stockInId, remainingStock } = item;
                                            query += `    WHEN stockInId = '${stockInId}' THEN ${remainingStock}\n`;
                                        });

                                        query += '    ELSE remainingQty\nEND\n';

                                        const stockInIds = data.map((item) => `'${item.stockInId}'`).join(', ');
                                        query += `WHERE stockInId IN (${stockInIds});`;

                                        return query;
                                    }

                                    console.log(generateUpdateQuery(sopq))
                                    const sql_qurey_updatedRemainQty = generateUpdateQuery(sopq);
                                    pool.query(sql_qurey_updatedRemainQty, (err, data) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
                                        const editFields = () => {
                                            var string = ''
                                            updatedField.forEach((data, index) => {
                                                if (index == 0)
                                                    string = "(" + "'" + stockOutId + "'" + "," + "'" + userId + "'" + "," + "'" + productId + "'" + "," + "'" + previousData[data] + "'" + "," + "'" + newData[data] + "'" + "," + "'" + reason + "'" + "," + "STR_TO_DATE('" + stockOutModificationDate + "','%b %d %Y %H:%i:%s')" + "," + "STR_TO_DATE('" + currentModifyDate + "','%b %d %Y %H:%i:%s')" + ")";
                                                else
                                                    string = string + ",(" + "'" + stockOutId + "'" + "," + "'" + userId + "'" + "," + "'" + productId + "'" + "," + "'" + previousData[data] + "'" + "," + "'" + newData[data] + "'" + "," + "'" + reason + "'" + "," + "STR_TO_DATE('" + stockOutModificationDate + "','%b %d %Y %H:%i:%s')" + "," + "STR_TO_DATE('" + currentModifyDate + "','%b %d %Y %H:%i:%s')" + ")";
                                            });
                                            return string;
                                        }

                                        console.log(">>>>>>>><<<<<<<<<", editFields());
                                        const sql_querry_addPreviousData = `INSERT INTO inventory_modified_history  (
                                                                                                stockOutId,
                                                                                                userId,
                                                                                                ProductId,
                                                                                                previous,
                                                                                                updated,
                                                                                                modifiedReason,
                                                                                                previousDateTime,
                                                                                                updatedDateTime
                                                                                            )
                                                                                            VALUES ${editFields()}`;
                                        console.log(">>.....", sql_querry_addPreviousData);
                                        pool.query(sql_querry_addPreviousData, (err, data) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                return res.status(500).send('Database Error');
                                            }
                                            console.log(">?>?>?>?,,,", stockOutCategory);
                                            const sql_querry_updatedetails = `UPDATE inventory_stockOut_data SET userId = '${userId}',
                                                                                         productId = '${productId}',
                                                                                         productQty = ${productQty},
                                                                                         productUnit = '${productUnit}',
                                                                                         stockOutPrice = ${stockOutPrice},
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
                                        })
                                    })
                                })
                            } else {
                                const editFields = () => {
                                    var string = ''
                                    updatedField.forEach((data, index) => {
                                        if (index == 0)
                                            string = "(" + "'" + stockOutId + "'" + "," + "'" + userId + "'" + "," + "'" + productId + "'" + "," + "'" + previousData[data] + "'" + "," + "'" + newData[data] + "'" + "," + "'" + reason + "'" + "," + "STR_TO_DATE('" + stockOutModificationDate + "','%b %d %Y %H:%i:%s')" + "," + "STR_TO_DATE('" + currentModifyDate + "','%b %d %Y %H:%i:%s')" + ")";
                                        else
                                            string = string + ",(" + "'" + stockOutId + "'" + "," + "'" + userId + "'" + "," + "'" + productId + "'" + "," + "'" + previousData[data] + "'" + "," + "'" + newData[data] + "'" + "," + "'" + reason + "'" + "," + "STR_TO_DATE('" + stockOutModificationDate + "','%b %d %Y %H:%i:%s')" + "," + "STR_TO_DATE('" + currentModifyDate + "','%b %d %Y %H:%i:%s')" + ")";
                                    });
                                    return string;
                                }

                                console.log(">>>>>>>><<<<<<<<<", editFields());
                                const sql_querry_addPreviousData = `INSERT INTO inventory_modified_history  (
                                                                                                stockOutId,
                                                                                                userId,
                                                                                                ProductId,
                                                                                                previous,
                                                                                                updated,
                                                                                                modifiedReason,
                                                                                                previousDateTime,
                                                                                                updatedDateTime
                                                                                            )
                                                                                            VALUES ${editFields()}`;
                                console.log(">>.....", sql_querry_addPreviousData);
                                pool.query(sql_querry_addPreviousData, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    console.log(">?>?>?>?,,,", stockOutCategory);
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
                                })

                            }

                        })
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

// Get Edited Details List

const getUpdateStockOutList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        sql_queries_getNumberOFEdit = `SELECT count(*) as numRows FROM inventory_stockOut_data WHERE stockOutId IN (
                                        SELECT COALESCE(stockOutId,null) FROM inventory_modified_history GROUP BY stockOutId)`;
        pool.query(sql_queries_getNumberOFEdit, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                sql_queries_getdetails = `SELECT stockOutId, user_details.userName AS outBy, CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,inventory_product_data.productName AS productName, CONCAT(productQty,' ',productUnit) AS Quantity, inventory_stockOutCategory_data.stockOutCategoryName AS stockOutCategoryName, stockOutComment, DATE_FORMAT(stockOutDate,'%d-%m-%Y') AS stockOutDate ,DATE_FORMAT(stockOutCreationDate,'%d-%M-%y / %r') AS stockOutCreationDate ,DATE_FORMAT(stockOutModificationDate,'%d-%M-%y / %r') AS stockOutModificationDate 
                                                FROM inventory_stockOut_data
                                                INNER JOIN user_details ON user_details.userId = inventory_stockOut_data.userId
                                                INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_stockOut_data.productId
                                                INNER JOIN inventory_stockOutCategory_data ON inventory_stockOutCategory_data.stockOutCategoryId = inventory_stockOut_data.stockOutCategory
                                                WHERE stockOutId IN (SELECT COALESCE(stockOutId,null) FROM inventory_modified_history GROUP BY stockOutId) ORDER BY stockOutModificationDate DESC LIMIT ${limit}`;
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
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
        // return res.status(200).send(data);

    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// GET Updated StockOut List By Id

const getUpdateStockOutListById = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const stockOutId = req.query.stockOutId
        sql_queries_getNumberOFEdit = `SELECT count(*) as numRows FROM inventory_modified_history WHERE stockOutId = '${stockOutId}'`;
        console.log(">>>.", sql_queries_getNumberOFEdit);
        pool.query(sql_queries_getNumberOFEdit, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                sql_queries_getdetails = `SELECT user_details.userName AS userName,CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userFullName, inventory_product_data.productName AS productName, previous, updated, modifiedReason, DATE_FORMAT(previousDateTime,'%d-%M-%y / %r') AS previousDateTime, DATE_FORMAT(updatedDateTime,'%d-%M-%y / %r') AS updatedDateTime 
                                            FROM inventory_modified_history
                                            INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_modified_history.ProductId
                                            INNER JOIN user_details ON user_details.userId = inventory_modified_history.userId
                                            WHERE stockOutId = '${stockOutId}' ORDER BY updateHistoryCreationDate DESC LIMIT ${limit}`;

                console.log("aaaaa", sql_queries_getdetails);
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
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
        // return res.status(200).send(data);

    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

const categoryWcisedUsed = (req, res) => {
    sql_queries_getdetails = `SET @sql = NULL;
                            SELECT
                            GROUP_CONCAT(DISTINCT
                                CONCAT(
                                'COALESCE(MAX(CASE WHEN so.productId = ''',
                                p.productId,
                                ''' THEN so.usedQty END), 0) AS ',
                                QUOTE(p.productName)
                            )
                            ) INTO @sql
                            FROM inventory_product_data p;
                                
                            SET @sql = CONCAT(
                                'SELECT c.stockOutCategoryId, c.stockOutCategoryName, ', @sql, '
                               FROM inventory_stockOutCategory_data c
                               LEFT JOIN(
                                    SELECT so.stockOutCategory, so.productId, SUM(so.productQty) AS usedQty
                                 FROM inventory_stockOut_data so
                                 GROUP BY so.stockOutCategory, so.productId
                                ) so ON c.stockOutCategoryId = so.stockOutCategory
                               GROUP BY c.stockOutCategoryId, c.stockOutCategoryName'
                            );
                            
                            PREPARE stmt FROM @sql;
                            EXECUTE stmt;
                            DEALLOCATE PREPARE stmt;`;
    pool.query(sql_queries_getdetails, (err, data) => {
        if (err) {
            console.error("An error occurd in SQL Queery", err);
            return res.status(500).send('Database Error');;
        }
        return res.status(200).send(data[4]);
    })
}

const categoryWisedUsed = (req, res) => {

    var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
    var firstDay = new Date(y, m, 1).toString().slice(4, 15);
    var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);


    const data = {
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
        productId: req.query.productId
    }

    sql_queries_getdetails = `SET @sql = NULL;
                            SELECT
                            GROUP_CONCAT(DISTINCT
                                CONCAT(
                                'COALESCE(MAX(CASE WHEN so.productId = ''',
                                p.productId,
                                ''' THEN so.usedQty END), 0) AS ',
                                QUOTE(CONCAT(p.productName,' (',p.minProductUnit,')'))
                            )
                            ) INTO @sql
                            FROM inventory_product_data p;
                                
                            SET @sql = CONCAT(
                                'SELECT c.stockOutCategoryName AS "stockout Category", ', @sql, '
                               FROM inventory_stockOutCategory_data c
                               LEFT JOIN(
                                    SELECT so.stockOutCategory, so.productId, SUM(so.productQty) AS usedQty
                                 FROM inventory_stockOut_data so
                                 GROUP BY so.stockOutCategory, so.productId
                                ) so ON c.stockOutCategoryId = so.stockOutCategory
                               GROUP BY c.stockOutCategoryId, c.stockOutCategoryName'
                            );
                            
                            PREPARE stmt FROM @sql;
                            EXECUTE stmt;
                            DEALLOCATE PREPARE stmt;`;

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        console.log("::::::::::;;;;;;;;;;;;", rows[1])
        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet('Stock Out Data');

        const abs = rows[4];
        const headerName = rows[4][0];
        console.log("><><>", Object.keys(headerName).map(key => key.toUpperCase()));
        const headersName = Object.keys(headerName).map(key => key.toUpperCase());
        // Create the headers row
        const headersRow = headersName;
        console.log('headName', headersRow);
        worksheet.addRow(headersRow);

        // Populate the worksheet with data
        abs.forEach((row) => {
            const dataRow = [...Object.values(row)];
            worksheet.addRow(dataRow);
        });

        // Calculate the total for each column
        const totalRow = [];
        worksheet.columns.forEach((column) => {
            let columnTotal = 0;
            column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                // Skip the header row
                if (rowNumber !== 1) {
                    const value = parseFloat(cell.value) || 0;
                    columnTotal += value;
                }
            });
            totalRow.push(columnTotal);
        });
        totalRow[0] = "Total";
        // Add the total row to the worksheet
        const totalRowCell = worksheet.addRow(totalRow);
        totalRowCell.eachCell((cell) => {
            cell.font = { bold: true, color: { theme: 12 } }; // Set the font of the total row cells to bold
        });

        totalRowCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' },
        };

        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 11 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 300
        });

        // worksheet.views = [
        //     {
        //         state: 'frozen',
        //         xSplit: 1, // Number of columns to freeze (in this case, the first column)
        //         ySplit: 1, // Number of rows to freeze (0 means no rows are frozen)
        //         topLeftCell: 'B1', // Cell reference indicating the top-left visible cell after freezing
        //     },
        // ];

        worksheet.columns.forEach((column) => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? String(cell.value).length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 12 : maxLength;
        });

        worksheet.getColumn(1).eachCell((cell) => {
            cell.font = { bold: true };
        });

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });


        // Create a new worksheet for transposed data
        const transposedWorksheet = workbook.addWorksheet('Transposed Data');

        // Transpose the data from the original worksheet to the transposed worksheet
        for (let row = 1; row <= worksheet.rowCount; row++) {
            for (let col = 1; col <= worksheet.columnCount; col++) {
                const cell = worksheet.getCell(row, col);
                const transposedCell = transposedWorksheet.getCell(col, row);
                transposedCell.value = cell.value;
                transposedCell.style = Object.assign({}, cell.style); // Copy cell styles
            }
        }

        transposedWorksheet.columns.forEach((column) => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? String(cell.value).length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 12 : maxLength;
        });

        transposedWorksheet.eachRow((row) => {
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

module.exports = {
    addStockOutDetails,
    removeStockOutTransaction,
    fillStockOutTransaction,
    updateStockOutTransaction,
    getStockOutList,
    exportExcelSheetForStockout,
    getCategoryWiseUsedByProduct,
    getUpdateStockOutList,
    getUpdateStockOutListById,
    categoryWisedUsed
}

// SELECT
// p.productId,
//     p.productName,
//     iscd.stockOutCategoryId,
//     iscd.stockOutCategoryName,
//     COALESCE(so.usedQty, 0) AS usedQty
// FROM
//     inventory_product_data AS p
// LEFT JOIN(
//     SELECT
//         inventory_stockOut_data.productId,
//     inventory_stockOut_data.stockOutCategory,
//     SUM(inventory_stockOut_data.productQty) AS usedQty
//     FROM
//         inventory_stockOut_data
//     GROUP BY
//         inventory_stockOut_data.productId,
//     inventory_stockOut_data.stockOutCategory
// ) AS so
// ON
// p.productId = so.productId
// LEFT JOIN inventory_stockOutCategory_data AS iscd
// ON
// iscd.stockOutCategoryId = so.stockOutCategory
// ORDER BY
// p.productId;

// Finally Done

// SET @sql = NULL;

// SELECT
// GROUP_CONCAT(DISTINCT
//     CONCAT(
//     'COALESCE(MAX(CASE WHEN so.productId = ''',
//     p.productId,
//     ''' THEN so.usedQty END), 0) AS ',
//     QUOTE(p.productName)
// )
// ) INTO @sql
// FROM inventory_product_data p;

// SET @sql = CONCAT(
//     'SELECT c.stockOutCategoryId, c.stockOutCategoryName, ', @sql, '
//    FROM inventory_stockOutCategory_data c
//    LEFT JOIN(
//         SELECT so.stockOutCategory, so.productId, SUM(so.productQty) AS usedQty
//      FROM inventory_stockOut_data so
//      GROUP BY so.stockOutCategory, so.productId
//     ) so ON c.stockOutCategoryId = so.stockOutCategory
//    GROUP BY c.stockOutCategoryId, c.stockOutCategoryName'
// );

// PREPARE stmt FROM @sql;
// EXECUTE stmt;
// DEALLOCATE PREPARE stmt;
