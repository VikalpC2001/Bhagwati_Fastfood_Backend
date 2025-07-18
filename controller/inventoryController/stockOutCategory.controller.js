const pool = require('../../database');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Get Category List

const getCategoryList = async (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
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
                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getCategoryTable = `SELECT
                                                        iscd.stockOutCategoryId,
                                                        iscd.stockOutCategoryName,
                                                        COALESCE(ROUND(socd.categoryStockOutPrice), 0) AS outPrice,
                                                        ROUND(total.totalCategoryStockOutPrice) AS totalCategoryStockOutPrice,
                                                        CONCAT(
                                                            ROUND(COALESCE(ROUND(socd.categoryStockOutPrice), 0) / total.totalCategoryStockOutPrice * 100),
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
                                                            inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${startDate}', '%b %d %Y') AND STR_TO_DATE('${endDate}', '%b %d %Y')
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
                                                                inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${startDate}', '%b %d %Y') AND STR_TO_DATE('${endDate}', '%b %d %Y')
                                                            GROUP BY
                                                                inventory_stockOut_data.stockOutCategory
                                                        ) AS temp
                                                    ) AS total ON 1=1
                                                    LIMIT ${limit}`;
                } else {
                    sql_queries_getCategoryTable = `SELECT
                                                        iscd.stockOutCategoryId,
                                                        iscd.stockOutCategoryName,
                                                        COALESCE(ROUND(socd.categoryStockOutPrice), 0) AS outPrice,
                                                        ROUND(total.totalCategoryStockOutPrice) AS totalCategoryStockOutPrice,
                                                        CONCAT(
                                                            ROUND(COALESCE(ROUND(socd.categoryStockOutPrice), 0) / total.totalCategoryStockOutPrice * 100),
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
                                                            MONTH(inventory_stockOut_data.stockOutDate) = MONTH(CURDATE()) AND YEAR(inventory_stockOut_data.stockOutDate) = YEAR(CURDATE())
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
                                                                MONTH(inventory_stockOut_data.stockOutDate) = MONTH(CURDATE()) AND YEAR(inventory_stockOut_data.stockOutDate) = YEAR(CURDATE())
                                                            GROUP BY
                                                                inventory_stockOut_data.stockOutCategory
                                                        ) AS temp
                                                    ) AS total ON 1=1
                                                    LIMIT ${limit}`;
                }
                pool.query(sql_queries_getCategoryTable, (err, rows, fields) => {
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
                            return res.status(200).send({ rows, numRows, totalCategoryStockOutPrice: rows[0].totalCategoryStockOutPrice });
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

// Add stockOut Category API

const addstockOutCategory = async (req, res) => {
    try {

        const uid1 = new Date();
        const stockOutCategoryId = String("stockOutCategory_" + uid1.getTime());
        console.log("...", stockOutCategoryId);

        const data = {
            stockOutCategoryName: req.body.stockOutCategoryName.trim(),
        }
        if (!data.stockOutCategoryName) {
            return res.status(400).send("Please Add Category");
        } else {
            req.body.productName = pool.query(`SELECT stockOutCategoryName FROM inventory_stockOutCategory_data WHERE stockOutCategoryName = '${data.stockOutCategoryName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Category is Already In Use');
                } else {
                    const sql_querry_addCategory = `INSERT INTO inventory_stockOutCategory_data (stockOutCategoryId, stockOutCategoryName)  
                                                    VALUES ('${stockOutCategoryId}','${data.stockOutCategoryName}')`;
                    pool.query(sql_querry_addCategory, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Category Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove stockOutCategory API

const removeStockOutCategory = async (req, res) => {
    try {
        const stockOutCategoryId = req.query.stockOutCategoryId.trim();
        req.query.stockOutCategoryId = pool.query(`SELECT stockOutCategoryId FROM inventory_stockOutCategory_data WHERE stockOutCategoryId = '${stockOutCategoryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM inventory_stockOutCategory_data WHERE stockOutCategoryId = '${stockOutCategoryId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Category Deleted Successfully");
                })
            } else {
                return res.send('CategoryId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update stockOut Category API

const updateStockOutCategory = async (req, res) => {
    try {
        const data = {
            stockOutCategoryId: req.body.stockOutCategoryId.trim(),
            stockOutCategoryName: req.body.stockOutCategoryName.trim()
        }
        if (!data.stockOutCategoryName) {
            res.status(400).send("Please Add Category");
        }
        const sql_querry_updatedetails = `UPDATE inventory_stockOutCategory_data SET stockOutCategoryName = '${data.stockOutCategoryName}'
                                          WHERE stockOutCategoryId = '${data.stockOutCategoryId}'`;
        pool.query(sql_querry_updatedetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send("Category Updated Successfully");
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export PDF Function

async function createPDF(res, datas, sumFooterArray, tableHeading) {
    try {
        // Create a new PDF document
        const doc = new jsPDF();

        // JSON data
        const jsonData = datas;
        // console.log(jsonData);

        // Get the keys from the first JSON object to set as columns
        const keys = Object.keys(jsonData[0]);

        // Define columns for the auto table, including a "Serial No." column
        const columns = [
            { header: 'Sr.', dataKey: 'serialNo' }, // Add Serial No. column
            ...keys.map(key => ({ header: key, dataKey: key }))
        ]

        // Convert JSON data to an array of arrays (table rows) and add a serial number
        const data = jsonData.map((item, index) => [index + 1, ...keys.map(key => item[key]), '', '']);

        // Initialize the sum columns with empty strings
        if (sumFooterArray) {
            data.push(sumFooterArray);
        }

        // Add auto table to the PDF document
        doc.text(15, 15, tableHeading);
        doc.autoTable({
            startY: 20,
            head: [columns.map(col => col.header)], // Extract headers correctly
            body: data,
            theme: 'grid',
            styles: {
                cellPadding: 2, // Add padding to cells for better appearance
                halign: 'center', // Horizontally center-align content
                fontSize: 10
            },
        });

        const pdfBytes = await doc.output();
        const fileName = 'jane-doe.pdf'; // Set the desired file name

        // Set the response headers for the PDF download
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        // Stream the PDF to the client for download
        res.send(pdfBytes);


        // Save the PDF to a file
        // const pdfFilename = 'output.pdf';
        // fs.writeFileSync(pdfFilename, doc.output());
        // console.log(`PDF saved as ${pdfFilename}`);
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

const exportPdfForInventoryCategoryData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

        if (req.query.startDate && req.query.endDate) {
            sql_queries_getCategoryTable = `SELECT
                                               iscd.stockOutCategoryName AS "Category Name",
                                                COALESCE(ROUND(socd.categoryStockOutPrice),0) AS "Out Price",
                                                CONCAT(
                                                    ROUND(COALESCE(ROUND(socd.categoryStockOutPrice), 0) / total.totalCategoryStockOutPrice * 100),
                                                    ' %'
                                                ) AS "Out Ratio(%)"
                                            FROM
                                                inventory_stockOutCategory_data AS iscd
                                            LEFT JOIN (
                                                SELECT
                                                    inventory_stockOut_data.stockOutCategory,
                                                    SUM(inventory_stockOut_data.stockOutPrice) AS categoryStockOutPrice
                                                FROM
                                                    inventory_stockOut_data
                                                WHERE
                                                    inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${startDate}', '%b %d %Y') AND STR_TO_DATE('${endDate}', '%b %d %Y')
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
                                                        inventory_stockOut_data.stockOutDate BETWEEN STR_TO_DATE('${startDate}', '%b %d %Y') AND STR_TO_DATE('${endDate}', '%b %d %Y')
                                                    GROUP BY
                                                        inventory_stockOut_data.stockOutCategory
                                                ) AS temp
                                            ) AS total ON 1=1`;
        } else {
            sql_queries_getCategoryTable = `SELECT
                                                iscd.stockOutCategoryName AS "Category Name",
                                                COALESCE(ROUND(socd.categoryStockOutPrice),0) AS "Out Price",
                                                CONCAT(
                                                    ROUND(COALESCE(ROUND(socd.categoryStockOutPrice), 0) / total.totalCategoryStockOutPrice * 100),
                                                    ' %'
                                                ) AS "Out Ratio(%)"
                                            FROM
                                                inventory_stockOutCategory_data AS iscd
                                            LEFT JOIN (
                                                SELECT
                                                    inventory_stockOut_data.stockOutCategory,
                                                    SUM(inventory_stockOut_data.stockOutPrice) AS categoryStockOutPrice
                                                FROM
                                                    inventory_stockOut_data
                                                WHERE
                                                    MONTH(inventory_stockOut_data.stockOutDate) = MONTH(CURDATE()) AND YEAR(inventory_stockOut_data.stockOutDate) = YEAR(CURDATE())
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
                                                        MONTH(inventory_stockOut_data.stockOutDate) = MONTH(CURDATE()) AND YEAR(inventory_stockOut_data.stockOutDate) = YEAR(CURDATE())
                                                    GROUP BY
                                                        inventory_stockOut_data.stockOutCategory
                                                ) AS temp
                                            ) AS total ON 1=1`;
        }
        pool.query(sql_queries_getCategoryTable, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumOutPrice = abc.reduce((total, item) => total + (item['Out Price'] || 0), 0);
            const sumFooterArray = ['Total', '', sumOutPrice];

            if (req.query.startDate && req.query.endDate) {
                tableHeading = `Stock Out Data From ${startDate} To ${endDate}`;
            } else {
                tableHeading = `Stock Out From ${firstDay} To ${lastDay}`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getCategoryList,
    addstockOutCategory,
    removeStockOutCategory,
    updateStockOutCategory,
    exportPdfForInventoryCategoryData
}