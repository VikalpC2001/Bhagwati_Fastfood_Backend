const pool = require('../../database');
const excelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Get Main Category List

const getMainCategoryList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            moneySourceId: req.query.moneySourceId,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_category_data`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
                    sql_queries_getdetails = `SELECT
                                                    ecd.categoryId,
                                                    ecd.categoryName,
                                                    ecd.categoryIconName,
                                                    COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt,
                                                    (SELECT COALESCE(SUM(expense_data.expenseAmount),0) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) AS TotalExpAmt,
                                                    CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) * 100,0),2),' ','%') AS categoryPercentage
                                                FROM
                                                    expense_category_data AS ecd
                                                LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY ecd.categoryId
                                                Order BY categoryName ASC
                                                limit ${limit}`;
                } else if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `SELECT
                                                    ecd.categoryId,
                                                    ecd.categoryName,
                                                    ecd.categoryIconName,
                                                    COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt,
                                                    (SELECT COALESCE(SUM(expense_data.expenseAmount),0) FROM expense_data WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) AS TotalExpAmt,
                                                    CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) * 100,0),2),' ','%') AS categoryPercentage
                                                FROM
                                                    expense_category_data AS ecd
                                                LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY ecd.categoryId
                                                Order BY categoryName ASC
                                                limit ${limit}`;
                } else if (req.query.moneySourceId) {
                    sql_queries_getdetails = `SELECT
                                                    ecd.categoryId,
                                                    ecd.categoryName,
                                                    ecd.categoryIconName,
                                                    COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt,
                                                    (SELECT COALESCE(SUM(expense_data.expenseAmount),0) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) AS TotalExpAmt,
                                                    CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) * 100,0),2),' ','%') AS categoryPercentage
                                                FROM
                                                    expense_category_data AS ecd
                                                LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                GROUP BY ecd.categoryId
                                                Order BY categoryName ASC
                                                limit ${limit}`;
                } else {
                    sql_queries_getdetails = `SELECT
                                                    ecd.categoryId,
                                                    ecd.categoryName,
                                                    ecd.categoryIconName,
                                                    COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt,
                                                    (SELECT COALESCE(SUM(expense_data.expenseAmount),0) FROM expense_data WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) AS TotalExpAmt,
                                                    CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) * 100,0),2),' ','%') AS categoryPercentage
                                                FROM
                                                    expense_category_data AS ecd
                                                LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                GROUP BY ecd.categoryId
                                                Order BY categoryName ASC
                                                limit ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        const totalExpense = rows && rows[0] && rows[0].TotalExpAmt ? rows[0].TotalExpAmt : 0;
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows, totalExpense });
                        } else {
                            return res.status(200).send({ rows, numRows, totalExpense });
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

// Add Main Category

const addMainCategory = (req, res) => {
    try {
        const uid1 = new Date();
        const mainCategoryId = String('mainCategory_' + uid1.getTime());
        const data = {
            categoryName: req.body.categoryName.trim(),
            categoryIconName: req.body.categoryIconName.trim(),
        }
        if (!data.categoryName || !data.categoryIconName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.categoryName = pool.query(`SELECT categoryName FROM expense_category_data WHERE categoryName = '${data.categoryName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Category is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO expense_category_data(categoryId, categoryName, categoryIconName)
                                                VALUES('${mainCategoryId}', '${data.categoryName}', '${data.categoryIconName}')`;
                    pool.query(sql_querry_addDetails, (err, data) => {
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
        res.status(500).json('Internal Server Error');
    }
}

// Remove Main Category Data

const removeMainCategory = async (req, res) => {

    try {
        var mainCategoryId = req.query.mainCategoryId.trim();
        if (!mainCategoryId) {
            return res.status(404).send('Main CategoryId Not Found');
        }
        req.query.mainCategoryId = pool.query(`SELECT categoryId FROM expense_category_data WHERE categoryId = '${mainCategoryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM expense_category_data WHERE categoryId = '${mainCategoryId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Category Deleted Successfully");
                })
            } else {
                return res.status(404).send('CategoryId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Main Category Data

const updateMainCategory = (req, res) => {
    try {
        const mainCategoryId = req.body.mainCategoryId;
        const data = {
            categoryName: req.body.categoryName.trim(),
            categoryIconName: req.body.categoryIconName.trim(),
        }
        if (!data.categoryName || !data.categoryIconName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.categoryName = pool.query(`SELECT categoryName FROM expense_category_data WHERE categoryId NOT IN ('${mainCategoryId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const categoryNameList = rowarr.map(e => e.categoryName.toLowerCase())
                if (categoryNameList.includes(data.categoryName.toLowerCase())) {
                    return res.status(400).send('Category is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                    expense_category_data
                                                SET
                                                    categoryName = '${data.categoryName}',
                                                    categoryIconName = '${data.categoryIconName}'
                                                WHERE
                                                    categoryId = '${mainCategoryId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Category Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Dropdown List Of Main Category

const ddlMainCategoryData = (req, res) => {
    try {
        const sql_query_getDDlData = `SELECT categoryId, categoryName FROM expense_category_data`;
        pool.query(sql_query_getDDlData, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Category DashBoard

const getMainCategoryDashboard = (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_query_getStaticsData = `SELECT
                                          ecd.categoryId,
                                          ecd.categoryName,
                                          ecd.categoryIconName,
                                          COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                      FROM
                                          expense_category_data AS ecd
                                      LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                      GROUP BY ecd.categoryId
                                      ORDER BY ecd.categoryName ASC`;
        } else {
            sql_query_getStaticsData = `SELECT
                                          ecd.categoryId,
                                          ecd.categoryName,
                                          ecd.categoryIconName,
                                          COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                      FROM
                                          expense_category_data AS ecd
                                      LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                      GROUP BY ecd.categoryId
                                      ORDER BY ecd.categoryName ASC`;
        }
        pool.query(sql_query_getStaticsData, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Import Excel For Main Category Data

const exportExcelForMainCategoryData = (req, res) => {

    const now = new Date();
    now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
    const currentDate = now.toDateString().slice(4, 15);
    console.log(currentDate);
    const data = {
        moneySourceId: req.query.moneySourceId,
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
    }
    if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
        sql_queries_getdetails = `SELECT
                                      ecd.categoryId,
                                      ecd.categoryName,
                                      ecd.categoryIconName,
                                      COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt,
                                      (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) AS TotalExpAmt,
                                      CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) * 100,0),2),' ','%') AS categoryPercentage
                                  FROM
                                      expense_category_data AS ecd
                                  LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                  GROUP BY ecd.categoryId
                                  Order BY categoryName ASC`;
    } else if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `SELECT
                                      ecd.categoryId,
                                      ecd.categoryName,
                                      ecd.categoryIconName,
                                      COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt,
                                      (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) AS TotalExpAmt,
                                      CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) * 100,0),2),' ','%') AS categoryPercentage
                                  FROM
                                      expense_category_data AS ecd
                                  LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                  GROUP BY ecd.categoryId
                                  Order BY categoryName ASC`;
    } else if (req.query.moneySourceId) {
        sql_queries_getdetails = `SELECT
                                      ecd.categoryId,
                                      ecd.categoryName,
                                      ecd.categoryIconName,
                                      COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt,
                                      (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) AS TotalExpAmt,
                                      CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) * 100,0),2),' ','%') AS categoryPercentage
                                  FROM
                                      expense_category_data AS ecd
                                  LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                  GROUP BY ecd.categoryId
                                  Order BY categoryName ASC`;
    } else {
        sql_queries_getdetails = `SELECT
                                      ecd.categoryId,
                                      ecd.categoryName,
                                      ecd.categoryIconName,
                                      COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt,
                                      (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) AS TotalExpAmt,
                                      CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) * 100,0),2),' ','%') AS categoryPercentage
                                  FROM
                                      expense_category_data AS ecd
                                  LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                  GROUP BY ecd.categoryId
                                  Order BY categoryName ASC`;
    }
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Category Data"); // New Worksheet
        sql_queries_getIncomeSourceData = `SELECT bankDisplayName FROM bank_data WHERE bankId = '${data.moneySourceId}'`;
        pool.query(sql_queries_getIncomeSourceData, async (err, result) => {
            if (err) return res.status(404).send(err);

            if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
                worksheet.mergeCells('A1', 'D1');
                worksheet.getCell('A1').value = `Category Data From ${data.startDate} To ${data.endDate} For ${result && result[0] && result[0].bankDisplayName ? result[0].bankDisplayName : ''}`;
            } else if (req.query.startDate && req.query.endDate) {
                worksheet.mergeCells('A1', 'D1');
                worksheet.getCell('A1').value = `Category Data From ${data.startDate} To ${data.endDate}`;
            } else if (req.query.moneySourceId) {
                worksheet.mergeCells('A1', 'D1');
                worksheet.getCell('A1').value = `Category Data For Date : - ${currentDate} (${result && result[0] && result[0].bankDisplayName ? result[0].bankDisplayName : ''})`;
            } else {
                worksheet.mergeCells('A1', 'D1');
                worksheet.getCell('A1').value = `Category Data For Date : - ${currentDate}`;
            }
            /*Column headers*/
            worksheet.getRow(2).values = ['S no.', 'Category Name', 'Amount', 'Usage (%)'];

            // Column for data in excel. key must match data key
            worksheet.columns = [
                { key: "s_no", width: 10, },
                { key: "categoryName", width: 30 },
                { key: "expenseAmt", width: 30 },
                { key: "categoryPercentage", width: 30 }
            ]
            //Looping through User data
            const arr = rows;
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

            worksheet.getRow(arr.length + 3).values = [
                'Total:',
                '',
                { formula: `SUM(C3:C${arr.length + 2})` }
            ];
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
                res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                res.type = 'blob';
                res.send(data)
            } catch (err) {
                throw new Error(err);
            }
        })
    })
};

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
        const splitText = doc.splitTextToSize(tableHeading, 190);
        // Check if splitText has more than one line
        const isSplit = splitText.length > 1;

        // Add auto table to the PDF document
        doc.text(15, 15, splitText);
        doc.autoTable({
            startY: isSplit == true ? 25 : 20,
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

// Export PDF For Main Category Data

const exportPdfForMainCategoryData = (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            moneySourceId: req.query.moneySourceId,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        const commanColumnQuery = `SELECT
                                      ecd.categoryName AS "Category",
                                      COALESCE(SUM(ed.expenseAmount), 0) AS "Amount"`
        if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
            sql_queries_getdetails = `${commanColumnQuery},
                                            CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) * 100,0),2),' ','%') AS "Usage (%)"
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId
                                        Order BY categoryName ASC`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanColumnQuery},
                                        CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')) * 100,0),2),' ','%') AS "Usage (%)"
                                      FROM
                                        expense_category_data AS ecd
                                    LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    GROUP BY ecd.categoryId
                                    Order BY categoryName ASC`;
        } else if (req.query.moneySourceId) {
            sql_queries_getdetails = `${commanColumnQuery},
                                            CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) * 100,0),2),' ','%') AS "Usage (%)"
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId
                                        Order BY categoryName ASC`;
        } else {
            sql_queries_getdetails = `${commanColumnQuery},
                                        CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount), 0) / (SELECT SUM(expense_data.expenseAmount) FROM expense_data WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')) * 100,0),2),' ','%') AS "Usage (%)"
                                    FROM
                                        expense_category_data AS ecd
                                    LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    GROUP BY ecd.categoryId
                                    Order BY categoryName ASC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumExpenseAmount = abc.reduce((total, item) => total + (item['Amount'] || 0), 0);
            const sumFooterArray = ['Total', '', sumExpenseAmount];

            sql_queries_getIncomeSourceData = `SELECT bankDisplayName FROM bank_data WHERE bankId = '${data.moneySourceId}'`;
            pool.query(sql_queries_getIncomeSourceData, async (err, result) => {
                if (err) return res.status(404).send(err);

                if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
                    tableHeading = `Category Data From ${data.startDate} To ${data.endDate} For ${result && result[0] && result[0].bankDisplayName ? result[0].bankDisplayName : ''}`;
                } else if (req.query.startDate && req.query.endDate) {
                    tableHeading = `Category Data From ${data.startDate} To ${data.endDate}`;
                } else if (req.query.moneySourceId) {
                    tableHeading = `Category Data For Date : - ${currentDate} (${result && result[0] && result[0].bankDisplayName ? result[0].bankDisplayName : ''})`;
                } else {
                    tableHeading = `Category Data For Date : - ${currentDate}`;
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
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getMainCategoryList,
    addMainCategory,
    updateMainCategory,
    removeMainCategory,
    ddlMainCategoryData,
    getMainCategoryDashboard,
    exportExcelForMainCategoryData,
    exportPdfForMainCategoryData
}