const pool = require('../../database');
const excelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Get InCome Source List

const getIncomeSourceList = (req, res) => {
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
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM incomeSource_data`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);

                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `SELECT
                                                    isd.sourceId,
                                                    isd.sourceName,
                                                    COALESCE(SUM(ctd.creditAmount),0) AS creditAmt
                                                FROM
                                                    incomeSource_data AS isd
                                                    LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                    GROUP BY isd.sourceId
                                                ORDER BY sourceName 
                                                limit ${limit}`;
                } else {
                    sql_queries_getdetails = `SELECT
                                                    isd.sourceId,
                                                    isd.sourceName,
                                                    COALESCE(SUM(ctd.creditAmount),0) AS creditAmt
                                                FROM
                                                    incomeSource_data AS isd
                                                    LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                    GROUP BY isd.sourceId
                                                ORDER BY sourceName 
                                                limit ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
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

// Add Main Category

const addIncomeSource = (req, res) => {
    try {
        const uid1 = new Date();
        const sourceId = String('incomeSource_' + uid1.getTime());
        const data = {
            sourceName: req.body.sourceName.trim(),
        }
        if (!data.sourceName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.sourceName = pool.query(`SELECT sourceName FROM incomeSource_data WHERE sourceName = '${data.sourceName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('In-Come Source is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO incomeSource_data(sourceId, sourceName)
                                                VALUES('${sourceId}', '${data.sourceName}')`;
                    pool.query(sql_querry_addDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("In-Come Source Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Main Category Data

const removeIncomeSource = async (req, res) => {

    try {
        var sourceId = req.query.sourceId.trim();
        if (!sourceId) {
            return res.status(404).send('sourceId Not Found');
        }
        req.query.sourceId = pool.query(`SELECT sourceId FROM incomeSource_data WHERE sourceId = '${sourceId}'`, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM incomeSource_data WHERE sourceId = '${sourceId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("In-Come Source Deleted Successfully");
                })
            } else {
                return res.status(404).send('sourceId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Main Category Data

const updateInComeSource = (req, res) => {
    try {
        const sourceId = req.body.sourceId;
        const data = {
            sourceName: req.body.sourceName.trim(),
        }
        if (!data.sourceName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            pool.query(`SELECT sourceName FROM incomeSource_data WHERE sourceId NOT IN ('${sourceId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const sourceNameList = rowarr.map(e => e.sourceName.toLowerCase())
                if (sourceNameList.includes(data.sourceName.toLowerCase())) {
                    return res.status(400).send('In-Come Source is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                        incomeSource_data
                                                      SET
                                                        sourceName = '${data.sourceName}'
                                                      WHERE
                                                        sourceId = '${sourceId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("In-Come Source Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Dropdown List For From

const ddlFromData = (req, res) => {
    try {
        const sql_query_getDDlData = `SELECT fromId, fromName, status
                                      FROM (
                                          SELECT bankId AS fromId, bankDisplayName AS fromName, true AS status FROM bank_data
                                          UNION
                                          SELECT sourceId AS fromId, sourceName AS fromName, false AS status FROM incomeSource_data
                                      ) AS combined_data
                                      ORDER BY fromName;`;
        pool.query(sql_query_getDDlData, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            // const mergedObject = data[0].concat(data[1]);
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const ddlFilterBankData = (req, res) => {
    try {
        const bankId = req.query.bankId;
        const sql_query_getDDlData = `SELECT sourceId AS Id, sourceName AS Name FROM incomeSource_data;
                                      SELECT bankId AS Id, bankDisplayName AS Name  FROM bank_data WHERE bankId NOT IN ('${bankId}')`;
        pool.query(sql_query_getDDlData, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const mergedObject = data[0].concat(data[1]);
            return res.status(200).send(mergedObject);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Import Excel For Income Source

const exportExcelForIncomeData = (req, res) => {

    const now = new Date();
    now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
    const currentDate = now.toDateString().slice(4, 15);
    console.log(currentDate);
    const data = {
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
    }
    const commanQuarry = `SELECT
                              isd.sourceId,
                              isd.sourceName,
                              COALESCE(SUM(ctd.creditAmount),0) AS creditAmt
                          FROM
                              incomeSource_data AS isd`;
    if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    GROUP BY isd.sourceId
                                    ORDER BY sourceName`;
    } else {
        sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    GROUP BY isd.sourceId
                                    ORDER BY sourceName`;
    }
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Income Source Data"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'C1');
            worksheet.getCell('A1').value = `Income Data From ${data.startDate} To ${data.endDate}`;
        } else {
            worksheet.mergeCells('A1', 'C1');
            worksheet.getCell('A1').value = `Income Data For Date : - ${currentDate}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Source Name', 'Amount'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "sourceName", width: 30 },
            { key: "creditAmt", width: 30 }
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
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
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

// Export PDF For Income Data

const exportPdfForIncomeData = (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        const commanQuarry = `SELECT
                              isd.sourceName AS "Source Name",
                              COALESCE(SUM(ctd.creditAmount),0) AS "Amount"
                          FROM
                              incomeSource_data AS isd`;
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    GROUP BY isd.sourceId
                                    ORDER BY sourceName`;
        } else {
            sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    GROUP BY isd.sourceId
                                    ORDER BY sourceName`;
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


            if (req.query.startDate && req.query.endDate) {
                tableHeading = `Income Source Data From ${data.startDate} To ${data.endDate}`;
            } else {
                tableHeading = `Income Source Data For Date : - ${currentDate}`;
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
    addIncomeSource,
    updateInComeSource,
    removeIncomeSource,
    ddlFromData,
    getIncomeSourceList,
    ddlFilterBankData,
    exportExcelForIncomeData,
    exportPdfForIncomeData
}