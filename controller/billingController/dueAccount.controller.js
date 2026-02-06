const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { writeFileSync, readFileSync } = require("fs");
const fs = require('fs');
const { Readable } = require('stream');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Get Due Customer Account

const getCustomerAccountList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const searchWord = req.query.searchWord ? req.query.searchWord : '';
        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_account_data WHERE due_account_data.customerName LIKE '%` + searchWord + `%'`;
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const staticLeftJoin = `LEFT JOIN(
                                                  SELECT due_billAmount_data.accountId,
                                                      ROUND(
                                                          SUM(
                                                              due_billAmount_data.billAmount
                                                          )
                                                      ) AS total_due
                                                  FROM
                                                      due_billAmount_data
                                                  GROUP BY
                                                      due_billAmount_data.accountId
                                              ) AS dbd
                                              ON
                                                  dad.accountId = dbd.accountId
                                              LEFT JOIN(
                                                  SELECT due_transaction_data.accountId,
                                                      ROUND(
                                                          SUM(
                                                              due_transaction_data.paidAmount
                                                          )
                                                      ) AS total_paid
                                                  FROM
                                                      due_transaction_data
                                                  GROUP BY
                                                      due_transaction_data.accountId
                                              ) AS dtd
                                              ON
                                                  dad.accountId = dtd.accountId`;
                const sql_query_getDetails = `SELECT
                                                  dad.accountId,
                                                  dad.customerName,
                                                  dad.customerNumber,
                                              	COALESCE(dbd.total_due, 0) - COALESCE(dtd.total_paid, 0) AS dueBalace
                                              FROM
                                                  due_account_data AS dad
                                              ${staticLeftJoin}
                                              WHERE dad.customerName LIKE '%` + searchWord + `%'
                                              ORDER BY dad.CustomerName ASC
                                              LIMIT ${limit};
                                              SELECT
                                                  SUM(COALESCE(dbd.total_due, 0) - COALESCE(dtd.total_paid, 0)) AS totalDueAmt
                                              FROM
                                                  due_account_data AS dad
                                              ${staticLeftJoin}`;
                pool.query(sql_query_getDetails, (err, rows, fields) => {
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
                            const newJson = {
                                "rows": rows[0],
                                "numRows": numRows,
                                "totalDueAmt": rows && rows[1].length ? rows[1][0].totalDueAmt : 0
                            }
                            return res.status(200).send(newJson);
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

// Get Customer Details By Id

const getDueCustomerDataById = (req, res) => {
    try {
        let accountId = req.query && req.query.accountId ? req.query.accountId : null;
        if (!accountId) {

        } else {
            var sql_queries_getDetails = `SELECT 
                                            accountId,
                                            customerName,
                                            customerNumber
                                          FROM 
                                            due_account_data
                                          WHERE accountId = '${accountId}'`;

            pool.query(sql_queries_getDetails, (err, rows) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');;
                } else {
                    return res.status(200).send(rows[0]);
                }
            });
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add Account API

const addCustomerAccount = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const uid1 = new Date();
            const accountId = String("dueCustomer_" + uid1.getTime());

            const data = {
                customerName: req.body.customerName ? req.body.customerName.trim() : null,
                customerNumber: req.body.customerNumber ? req.body.customerNumber.trim() : null
            }
            if (!data.customerName || !data.customerNumber) {
                return res.status(400).send("Please Fill All The Fields...!");
            } else {
                pool.query(`SELECT customerName FROM due_account_data WHERE customerName = '${data.customerName}'`, function (err, row) {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else if (row && row.length) {
                        return res.status(400).send('Account is Already In Use');
                    } else {
                        const sql_querry_addCategory = `INSERT INTO due_account_data (accountId, customerName, customerNumber)  
                                                        VALUES ('${accountId}','${data.customerName}', '${data.customerNumber}')`;
                        pool.query(sql_querry_addCategory, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send({
                                accountId: accountId,
                                customerName: req.body.customerName ? req.body.customerName.trim() : null,
                                customerNumber: req.body.customerNumber ? req.body.customerNumber.trim() : null
                            });
                        })
                    }
                })
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Account API

const removeCustomerAccount = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const accountId = req.query.accountId.trim();
                req.query.accountId = pool.query(`SELECT accountId FROM due_account_data WHERE accountId = '${accountId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM due_account_data WHERE accountId = '${accountId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Account Deleted Successfully");
                        })
                    } else {
                        return res.send('AccountId Not Found');
                    }
                })
            } else {
                return res.status(400).send('You are Not Authorised');
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Account API

const updateCustomerAccount = async (req, res) => {
    try {
        const data = {
            accountId: req.body.accountId ? req.body.accountId.trim() : null,
            customerName: req.body.customerName ? req.body.customerName.trim() : null,
            customerNumber: req.body.customerNumber ? req.body.customerNumber.trim() : null
        }
        if (!data.customerName || !data.customerNumber) {
            return res.status(400).send("Please Add Account");
        } else {
            pool.query(`SELECT customerName FROM due_account_data WHERE customerName = '${data.customerName}' AND accountId != '${data.accountId}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Account is Already In Use');
                } else {
                    const sql_querry_updatedetails = `UPDATE 
                                                        due_account_data 
                                                      SET 
                                                        customerName = '${data.customerName}',
                                                        customerNumber = '${data.customerNumber}'
                                                      WHERE accountId = '${data.accountId}'`;
                    pool.query(sql_querry_updatedetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Account Updated Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Statics For Due

const getDueStaticsById = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            accountId: req.query.accountId
        }
        const sql_querry_remainAmount = `SELECT COALESCE(dbad.total_price, 0) - COALESCE(dtd.total_paid, 0) AS remainingAmount FROM due_account_data AS dad
                                          LEFT JOIN (
                                                      SELECT
                                                            due_billAmount_data.accountId,
                                                            ROUND(SUM(due_billAmount_data.billAmount)) AS total_price
                                                      FROM
                                                            due_billAmount_data
                                                      GROUP BY
                                                            due_billAmount_data.accountId
                                                    ) AS dbad ON dad.accountId = dbad.accountId
                                          LEFT JOIN (
                                                      SELECT
                                                            due_transaction_data.accountId,
                                                            ROUND(SUM(due_transaction_data.paidAmount)) AS total_paid
                                                      FROM
                                                            due_transaction_data
                                                      GROUP BY
                                                            due_transaction_data.accountId
                                                      ) AS dtd ON dad.accountId = dtd.accountId
                                                      WHERE dad.accountId = '${data.accountId}'`;
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getDueCount = `SELECT COALESCE(ROUND(SUM(billAmount)),0) AS totalDueAmt FROM due_billAmount_data WHERE accountId = '${data.accountId}' AND dueDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y');
                                      SELECT COALESCE(ROUND(SUM(paidAmount)),0) AS totalPaidAmount FROM due_transaction_data WHERE accountId = '${data.accountId}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y');
                                      ${sql_querry_remainAmount}`;
        } else {
            sql_querry_getDueCount = `SELECT COALESCE(ROUND(SUM(billAmount)),0) AS totalDueAmt FROM due_billAmount_data WHERE accountId = '${data.accountId}';
                                      SELECT COALESCE(ROUND(SUM(paidAmount)),0) AS totalPaidAmount FROM due_transaction_data WHERE accountId = '${data.accountId}';
                                      ${sql_querry_remainAmount}`;
        }
        pool.query(sql_querry_getDueCount, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            else {
                const count = {
                    totalDue: data && data[0].length ? data[0][0].totalDueAmt : 0,
                    totalPaidAmount: data && data[1].length ? data[1][0].totalPaidAmount : 0,
                    balanceHeading: data && data[2].length ? data[2][0].remainingAmount > 0 ? "You will get" : data[2][0].remainingAmount < 0 ? "You will give" : "Settled Up" : 'No Data Found',
                    dueBalance: data && data[2].length ? Math.abs(data[2][0].remainingAmount) : 0,
                }
                return res.status(200).send(count);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Debit Bill Data

const addDueBillData = (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const cashier = decoded.id.firstName;
            const uid1 = new Date();
            const dabId = String("dab_" + uid1.getTime());
            const data = {
                accountId: req.body.accountId ? req.body.accountId : null,
                billId: req.body.billId ? req.body.billId : null,
                billAmount: req.body.billAmount ? req.body.billAmount : null,
                dueNote: req.body.dueNote ? req.body.dueNote : null,
                dueDate: new Date(req.body.dueDate ? req.body.dueDate : null).toString().slice(4, 15)
            }
            if (!data.accountId || !data.billAmount) {
                return res.status(400).send("Please Fill all the feilds");
            } else {
                let sql_queries_addDetails = `INSERT INTO due_billAmount_data(dabId, enterBy, accountId, billId, billAmount, dueNote, dueDate)
                                              VALUES('${dabId}','${cashier}','${data.accountId}',${data.billId ? `'${data.billId}'` : null},${data.billAmount},${data.dueNote ? `'${data.dueNote}'` : null}, STR_TO_DATE('${data.dueDate}','%b %d %Y'))`;
                pool.query(sql_queries_addDetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Due Amount Added Successfully");
                })
            }
        } else {
            return res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// ADD Debit Due Data

const addDebitDueTransactionData = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const cashier = decoded.id.firstName;
            const uid1 = new Date();
            const transactionId = String("Transaction_" + uid1.getTime());

            const accountId = req.body.accountId ? req.body.accountId : null;
            const givenBy = req.body.givenBy ? req.body.givenBy.trim() : null;
            const paidAmount = req.body.paidAmount ? req.body.paidAmount : 0;
            const transactionNote = req.body.transactionNote ? req.body.transactionNote.trim() : null;
            const transactionDate = new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15)

            if (!accountId || !paidAmount || !transactionDate) {
                return res.status(400).send("Please Fill all the feilds");
            }
            const get_remaining_amount = `SELECT COALESCE(dbad.total_price, 0) - COALESCE(dtd.total_paid, 0) AS remainingAmount FROM due_account_data AS dad
                                          LEFT JOIN (
                                                      SELECT
                                                            due_billAmount_data.accountId,
                                                            ROUND(SUM(due_billAmount_data.billAmount)) AS total_price
                                                      FROM
                                                            due_billAmount_data
                                                      GROUP BY
                                                            due_billAmount_data.accountId
                                                    ) AS dbad ON dad.accountId = dbad.accountId
                                          LEFT JOIN (
                                                      SELECT
                                                            due_transaction_data.accountId,
                                                            ROUND(SUM(due_transaction_data.paidAmount)) AS total_paid
                                                      FROM
                                                            due_transaction_data
                                                      GROUP BY
                                                            due_transaction_data.accountId
                                                      ) AS dtd ON dad.accountId = dtd.accountId
                                                      WHERE dad.accountId = '${accountId}'`;
            pool.query(get_remaining_amount, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const remainingAmount = data[0].remainingAmount

                const sql_querry_addTransaction = `INSERT INTO due_transaction_data (transactionId, accountId, receivedBy, givenBy, pendingAmount, paidAmount, transactionNote, transactionDate)  
                                                   VALUES ('${transactionId}', '${accountId}', '${cashier}', ${givenBy ? `'${givenBy}'` : null}, ${remainingAmount}, ${paidAmount}, ${transactionNote ? `'${transactionNote}'` : null}, STR_TO_DATE('${transactionDate}','%b %d %Y'))`;
                pool.query(sql_querry_addTransaction, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Transaction Added Successfully");
                })
            })
        } else {
            return res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurred', error);
        return res.status(500).json('Internal Server Error');
    }
}

// Get Month Wise Transaction In Bank

const getMonthWiseTransactionForDueAccount = (req, res) => {
    try {
        const accountId = req.query.accountId;
        let page = req.query.page; // Page number
        let numPerPage = Number(req.query.numPerPage);// Number of items per page
        if (!accountId || !page || !numPerPage) {
            return res.status(404).send('Not Found')
        }

        // Calculate the start and end indices for the current page
        let startIndex = (page - 1) * numPerPage;
        let endIndex = startIndex + numPerPage;
        let sql_query_getMonthWiseData = `SELECT
                                            COALESCE(ROUND(SUM(billAmount)),0) AS amount,
                                            COALESCE(ROUND(SUM(billAmount)),0) AS amt,
                                            CONCAT(MONTHNAME(dueDate), '-', YEAR(dueDate)) AS date
                                          FROM
                                            due_billAmount_data
                                          WHERE
                                            accountId = '${accountId}'
                                          GROUP BY YEAR(dueDate), MONTH(dueDate)
                                          ORDER BY YEAR(dueDate) ASC, MONTH(dueDate) ASC;
                                          SELECT COALESCE(ROUND(SUM(paidAmount)),0) AS totalPaidAmount FROM due_transaction_data WHERE accountId = '${accountId}'`;
        pool.query(sql_query_getMonthWiseData, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (!data[0].length) {
                const numRows = 0;
                const rows = [{
                    'msg': 'No Data Found'
                }]
                return res.status(200).send({ rows, numRows });
            } else {
                const creditAmtJson = data && data[0] ? Object.values(JSON.parse(JSON.stringify(data[0]))) : [];
                const debitAmtSum = data && data[1] ? data[1][0].totalPaidAmount : 0;
                const arr = catrersMonthWiseData(creditAmtJson, debitAmtSum);
                const result = arr.sort((a, b) => {
                    let dateA = new Date(a.date);
                    let dateB = new Date(b.date);
                    return dateB - dateA;
                });
                const rows = result.slice(startIndex, endIndex);
                const numRows = arr.length
                if (numRows != 0) {
                    return res.status(200).send({ rows, numRows });
                } else {
                    const rows = [{
                        'msg': 'No Data Found'
                    }]
                    return res.status(200).send({ rows, numRows });
                }
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Catrers Month Wise Data Function

function catrersMonthWiseData(arr, cutAmt) {
    let array = arr;
    let value = cutAmt;

    let newArray = array.map(item => {
        if (value > 0 && item.amt > 0) {
            if (item.amt >= value) {
                item.amt -= value;
                value = 0;
            } else {
                value -= item.amt;
                item.amt = 0;
            }
        }
        return item;
    });

    return newArray;
}

// Get Due Bill Transaction Data

const getDueBillDataById = (req, res) => {
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
            accountId: req.query.accountId
        }
        if (data.startDate && data.endDate) {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_billAmount_data WHERE accountId = '${data.accountId}' AND dueDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')`;
        } else {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_billAmount_data WHERE accountId = '${data.accountId}'`;
        }
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_staticQuery = `SELECT dabId, enterBy, accountId, billId, billAmount, dueNote, dueDate, DATE_FORMAT(dueDate, '%d %b %Y') AS displayDate, DATE_FORMAT(creationDate, '%h:%i %p') AS diplayTime FROM due_billAmount_data`;
                if (data.startDate && data.endDate) {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}' 
                                            AND dueDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')
                                            ORDER BY due_billAmount_data.dueDate DESC, due_billAmount_data.creationDate DESC
                                            LIMIT ${limit}`;
                } else {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}' 
                                            ORDER BY due_billAmount_data.dueDate DESC, due_billAmount_data.creationDate DESC
                                            LIMIT ${limit}`;
                }
                pool.query(sql_query_getDetails, (err, rows, fields) => {
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

// Get Due Debit Transaction Data

const getDueDebitTransactionListById = (req, res) => {
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
            accountId: req.query.accountId,
            searchInvoiceNumber: req.query.searchInvoiceNumber ? req.query.searchInvoiceNumber : ''
        }
        if (data.startDate && data.endDate) {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_transaction_data WHERE accountId = '${data.accountId}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')`;
        } if (data.searchInvoiceNumber) {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_transaction_data WHERE accountId = '${data.accountId}' AND transactionId LIKE '%` + data.searchInvoiceNumber + `%'`;
        } else {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_transaction_data WHERE accountId = '${data.accountId}'`;
        }
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_staticQuery = `SELECT transactionId, RIGHT(transactionId,9) AS invoiceNumber, accountId, receivedBy, givenBy, pendingAmount, paidAmount, transactionNote, transactionDate, DATE_FORMAT(transactionDate, '%d %b %Y') AS displayDate, DATE_FORMAT(creationDate, '%h:%i %p') AS diplayTime FROM due_transaction_data`;
                if (data.startDate && data.endDate) {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}' 
                                            AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')
                                            ORDER BY due_transaction_data.transactionDate DESC, due_transaction_data.creationDate DESC
                                            LIMIT ${limit}`;
                } else if (data.searchInvoiceNumber) {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}' 
                                            AND transactionId LIKE '%` + data.searchInvoiceNumber + `%'
                                            ORDER BY due_transaction_data.transactionDate DESC, due_transaction_data.creationDate DESC
                                            LIMIT ${limit}`;
                } else {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}'
                                            ORDER BY due_transaction_data.transactionDate DESC, due_transaction_data.creationDate DESC
                                            LIMIT ${limit}`;
                }
                pool.query(sql_query_getDetails, (err, rows, fields) => {
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

// Remove Due Bill Data

const removeDueBillDataById = (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;

            const dabId = req.query.dabId ? req.query.dabId.trim() : null;
            if (!dabId) {
                return res.status(404).send("dabId Not Found..!");
            } else {
                req.query.dabId = pool.query(`SELECT dabId FROM due_billAmount_data WHERE dabId = '${dabId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM due_billAmount_data WHERE dabId = '${dabId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Due Bill Deleted Successfully");
                        })
                    } else {
                        return res.status(404).send('dabId Not Found');
                    }
                })
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// remove Due Debit Transaction Data

const removeDueDebitTransactionById = (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;

            const transactionId = req.query.transactionId ? req.query.transactionId.trim() : null;
            if (!transactionId) {
                return res.status(404).send('transactionId Not Found..!');
            } else {
                req.query.transactionId = pool.query(`SELECT transactionId FROM due_transaction_data WHERE transactionId = '${transactionId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM due_transaction_data WHERE transactionId = '${transactionId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Transaction Deleted Successfully");
                        })
                    } else {
                        return res.status(404).send('transactionId Not Found');
                    }
                })
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Due Bill Data

const updateDueBillDataById = (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const cashier = decoded.id.firstName;
            const data = {
                dabId: req.body.dabId ? req.body.dabId : null,
                accountId: req.body.accountId ? req.body.accountId : null,
                billId: req.body.billId ? req.body.billId : null,
                billAmount: req.body.billAmount ? req.body.billAmount : null,
                dueNote: req.body.dueNote ? req.body.dueNote : null,
                dueDate: new Date(req.body.dueDate ? req.body.dueDate : null).toString().slice(4, 15)
            }
            if (!data.dabId || !data.accountId || !data.billAmount) {
                return res.status(400).send("Please Fill all the feilds");
            } else {
                req.query.dabId = pool.query(`SELECT dabId FROM due_billAmount_data WHERE dabId = '${data.dabId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_updateDetails = `UPDATE
                                                              due_billAmount_data
                                                          SET
                                                              enterBy = '${cashier}',
                                                              billAmount = ${data.billAmount},
                                                              dueNote = ${data.dueNote ? `'${data.dueNote}'` : null},
                                                              dueDate = STR_TO_DATE('${data.dueDate}','%b %d %Y')
                                                          WHERE dabId = '${data.dabId}' AND accountId = '${data.accountId}'`;
                        pool.query(sql_querry_updateDetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Due Bill Updated Successfully");
                        })
                    } else {
                        return res.send('dabId Not Found');
                    }
                })
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Customer Transaction Data

const getDueTransactionDataById = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const data = {
            accountId: req.query.accountId,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (!data.accountId) {
            return res.status(404).send('accountId Not Found');
        } else {
            const commonQueryForDebit = `SELECT
                                              dabId AS transactionId,
                                              enterBy AS enterBy,
                                              accountId AS accountId,
                                              "debit" AS transactionType,
                                              billAmount AS transactionAmt,
                                              dueNote AS transactionNote,
                                              dueDate AS transactionDate,
                                              DATE_FORMAT(dueDate, '%d %b %Y') AS displayDate,
                                              DATE_FORMAT(creationDate, '%h:%i %p') AS diplayTime,
                                              creationDate AS transactionDateTime
                                          FROM
                                              due_billAmount_data
                                          WHERE accountId = '${data.accountId}'`;

            const commonQueryForCredit = `SELECT
                                              transactionId AS transactionId,
                                              receivedBy AS enterBy,
                                              accountId AS accountId,
                                              "credit" AS transactionType,
                                              paidAmount AS transactionAmt,
                                              transactionNote AS transactionNote,
                                              transactionDate AS transactionDate,
                                              DATE_FORMAT(transactionDate, '%d %b %Y') AS displayDate,
                                              DATE_FORMAT(creationDate, '%h:%i %p') AS diplayTime,
                                              creationDate AS transactionDateTime
                                          FROM
                                              due_transaction_data
                                          WHERE accountId = '${data.accountId}'`;

            if (data.startDate && data.endDate) {
                sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                                ${commonQueryForCredit}
                                                UNION ALL
                                                ${commonQueryForDebit}
                                              ) AS combined_data
                                              WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`
            } else {
                sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                                ${commonQueryForCredit}
                                                UNION ALL
                                                ${commonQueryForDebit}
                                              ) AS combined_data`;
            }
            pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    const numRows = rows[0].numRows;
                    const numPages = Math.ceil(numRows / numPerPage);

                    const sql_query_combinedData = `SELECT transactionId, enterBy, accountId, transactionType, transactionAmt, transactionNote, transactionDate, displayDate, diplayTime,
                                                    ((SELECT COALESCE(SUM(ctd.paidAmount), 0) FROM due_transaction_data AS ctd
                                                     WHERE ctd.accountId = '${data.accountId}'
                                                       AND (
                                                            ctd.transactionDate < combined_data.transactionDate
                                                            OR (ctd.transactionDate = combined_data.transactionDate AND ctd.creationDate <= combined_data.transactionDateTime)
                                                       )
                                                    ) -      
                                                    (SELECT COALESCE(SUM(dtd.billAmount), 0) FROM due_billAmount_data AS dtd
                                                     WHERE dtd.accountId = '${data.accountId}'
                                                       AND (
                                                            dtd.dueDate < combined_data.transactionDate
                                                            OR (dtd.dueDate = combined_data.transactionDate AND dtd.creationDate <= combined_data.transactionDateTime)
                                                       )
                                                    )) AS balance`;
                    const sql_query_orderAndLimit = `ORDER BY transactionDate DESC, transactionDateTime DESC LIMIT ${limit}`;
                    if (data.startDate && data.endDate) {
                        sql_queries_getdetails = `${sql_query_combinedData}
                                                  FROM (
                                                        ${commonQueryForCredit}
                                                        UNION ALL
                                                        ${commonQueryForDebit}
                                                       ) AS combined_data
                                                  WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                  ${sql_query_orderAndLimit}`;
                    } else {
                        sql_queries_getdetails = `${sql_query_combinedData}
                                                  FROM (
                                                        ${commonQueryForCredit}
                                                        UNION ALL
                                                        ${commonQueryForDebit}
                                                       ) AS combined_data
                                                        ${sql_query_orderAndLimit}`;
                    }
                    pool.query(sql_queries_getdetails, (err, rows, fields) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        } else {
                            if (numRows === 0) {
                                const rows = []
                                return res.status(200).send({ rows, numRows });
                            } else {
                                return res.status(200).send({ rows, numRows });
                            }
                        }
                    });
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// DDL Account Data

const ddlDueAccountData = (req, res) => {
    try {
        var sql_queries_getDetails = `SELECT 
                                        accountId,
                                        customerName
                                      FROM 
                                        due_account_data
                                      ORDER BY customerName ASC`;

        pool.query(sql_queries_getDetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                return res.status(200).send(rows);
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export PDF of Transaction Invoice

async function createPDF(res, data) {
    try {
        const details = {
            invoiceNumber: data[0].invoiceNumber ? data[0].invoiceNumber.toString() : '',
            paidBy: data[0].paidBy ? data[0].paidBy : '',
            customerName: data[0].customerName ? data[0].customerName : '',
            customerNumber: data[0].customerNumber ? data[0].customerNumber : '',
            receivedBy: data[0].receivedBy ? data[0].receivedBy : '',
            pendingAmount: data[0].pendingAmount ? data[0].pendingAmount.toString() : '',
            paidAmount: data[0].paidAmount ? data[0].paidAmount.toString() : '',
            remainingAmount: data[0].remainingAmount ? data[0].remainingAmount.toString() : '',
            transactionNote: data[0].transactionNote ? data[0].transactionNote : '',
            transactionDate: data[0].transactionDate ? data[0].transactionDate : '',
            transactionTime: data[0].transactionTime ? data[0].transactionTime : '',
        }
        const document = await PDFDocument.load(readFileSync(process.env.INVOICE_BHAGWATI_URL));
        const helveticaFont = await document.embedFont(StandardFonts.Helvetica);
        const HelveticaBold = await document.embedFont(StandardFonts.HelveticaBold);
        const firstPage = document.getPage(0);

        // Load the image data synchronously using readFileSync
        const draftImageData = fs.readFileSync(process.env.DRAFT_LOGO_IMAGE_URL);

        // Embed the image data in the PDF document
        const draftImage = await document.embedPng(draftImageData);

        // Draw the image on the desired page
        const draftImageDims = draftImage.scale(0.6); // Adjust the scale as needed
        firstPage.drawImage(draftImage, {
            x: 50, // Adjust the X position as needed
            y: 100, // Adjust the Y position as needed
            width: draftImageDims.width + 50,
            height: draftImageDims.height + 100,
            opacity: 0.09, // Apply transparency (0.0 to 1.0)
        });

        firstPage.moveTo(105, 530);
        firstPage.drawText(details.invoiceNumber, {
            x: 140,
            y: 635,
            size: 10,
            fontSize: 100,
            font: HelveticaBold
        })

        firstPage.drawText(details.transactionDate, {
            x: 140,
            y: 621,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.transactionTime, {
            x: 140,
            y: 606,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.customerName, {
            x: 300,
            y: 635,
            size: 10,
            fontSize: 100,
            font: HelveticaBold
        })

        firstPage.drawText(details.customerNumber, {
            x: 300,
            y: 621,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.receivedBy, {
            x: 50,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.paidBy, {
            x: 159,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.pendingAmount, {
            x: 295,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.paidAmount, {
            x: 404,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.remainingAmount, {
            x: 476,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.transactionNote, {
            x: 85,
            y: 435,
            size: 9,
            font: helveticaFont
        })

        const pdfBytes = await document.save();

        const stream = new Readable();
        stream.push(pdfBytes);
        stream.push(null);

        const fileName = 'jane-doe.pdf'; // Set the desired file name

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        stream.pipe(res);
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
    // writeFileSync("jane-doe.pdf", await document.save());
}

const exportDueTransactionInvoice = async (req, res) => {
    try {
        const transactionId = req.query.transactionId;
        const sql_queries_getInvoiceDetails = `SELECT RIGHT(dtd.transactionId,9) AS invoiceNumber, dad.customerName, dad.customerNumber, receivedBy AS receivedBy, givenBy AS paidBy, pendingAmount, paidAmount, (pendingAmount - paidAmount) AS remainingAmount, transactionNote, DATE_FORMAT(transactionDate,'%d %M %Y, %W') AS transactionDate, DATE_FORMAT(creationDate,'%h:%i %p') AS transactionTime FROM due_transaction_data AS dtd
                                                INNER JOIN 
                                                (
                                                	SELECT
                                                        accountId,
                                                        customerName,
                                                       customerNumber
                                                    FROM
                                                        due_account_data
                                                ) AS dad ON dtd.accountId = dad.accountId
                                                WHERE dtd.transactionId = '${transactionId}'`;
        pool.query(sql_queries_getInvoiceDetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (!data.length) {
                return res.status(404).send('No data Found');
            } else {
                createPDF(res, data)
                    .then(() => {
                        console.log('PDF created successfully');
                        res.status(200);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send('Error creating PDF');
                    });
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Export PDF Function

async function createPDFList(res, datas, sumFooterArray, tableHeading) {
    try {
        // Create a new PDF document
        const doc = new jsPDF();

        // JSON data
        const jsonData = datas;

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

// Export PDF For Due Bill Data

const exportPdfForDueBillData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            accountId: req.query.accountId
        }
        const sql_query_getAccountName = `SELECT customerName FROM due_account_data WHERE accountId = '${data.accountId}'`;
        const sql_query_staticQuery = `SELECT enterBy AS "Enter By", billAmount AS "Due Amount", dueNote AS Note, DATE_FORMAT(dueDate, '%d %b %Y') AS Date, DATE_FORMAT(creationDate, '%h:%i %p') AS Time FROM due_billAmount_data`;

        let sql_query_getDetails = `${sql_query_staticQuery}
                                    WHERE accountId = '${data.accountId}' 
                                    AND dueDate BETWEEN STR_TO_DATE('${data.startDate ? data.startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${data.endDate ? data.endDate : lastDay}', '%b %d %Y')
                                    ORDER BY due_billAmount_data.dueDate DESC, due_billAmount_data.creationDate DESC;
                                    ${sql_query_getAccountName}`;

        pool.query(sql_query_getDetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[0].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[0])));
            const sumBonusAmount = abc.reduce((total, item) => total + (item['Due Amount'] || 0), 0);
            const sumFooterArray = ['Total', '', sumBonusAmount];

            let tableHeading = `${rows[1][0].customerName} Due From ${data.startDate ? data.startDate : firstDay} To ${data.endDate ? data.endDate : lastDay}`;


            createPDFList(res, abc, sumFooterArray, tableHeading)
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

// Export Pdf For Due Bill Transaction

const exportPdfForDueBillTransactionData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            accountId: req.query.accountId
        }
        const sql_query_getAccountName = `SELECT customerName FROM due_account_data WHERE accountId = '${data.accountId}'`;
        const sql_query_staticQuery = `SELECT RIGHT(transactionId,9) AS "Invoice No", receivedBy AS "Received By", pendingAmount AS "Pending Amt", paidAmount AS "Paid Amt", transactionNote AS "Note", DATE_FORMAT(transactionDate, '%d %b %Y') AS "Date", DATE_FORMAT(creationDate, '%h:%i %p') AS "Time" FROM due_transaction_data`;

        let sql_query_getDetails = `${sql_query_staticQuery}
                                    WHERE accountId = '${data.accountId}' 
                                    AND transactionDate BETWEEN STR_TO_DATE('${data.startDate ? data.startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${data.endDate ? data.endDate : lastDay}', '%b %d %Y')
                                    ORDER BY due_transaction_data.transactionDate DESC, due_transaction_data.creationDate DESC;
                                    ${sql_query_getAccountName}`;

        pool.query(sql_query_getDetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[0].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[0])));
            const sumBonusAmount = abc.reduce((total, item) => total + (item['Paid Amt'] || 0), 0);
            const sumFooterArray = ['Total', '', '', '', sumBonusAmount];

            let tableHeading = `${rows[1][0].customerName} Paid Data From ${data.startDate ? data.startDate : firstDay} To ${data.endDate ? data.endDate : lastDay}`;


            createPDFList(res, abc, sumFooterArray, tableHeading)
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
    getCustomerAccountList,
    getDueCustomerDataById,
    addCustomerAccount,
    removeCustomerAccount,
    updateCustomerAccount,
    getDueStaticsById,
    addDueBillData,
    addDebitDueTransactionData,
    getMonthWiseTransactionForDueAccount,
    getDueBillDataById,
    getDueDebitTransactionListById,
    removeDueBillDataById,
    removeDueDebitTransactionById,
    updateDueBillDataById,
    ddlDueAccountData,
    exportDueTransactionInvoice,
    exportPdfForDueBillData,
    exportPdfForDueBillTransactionData,
    getDueTransactionDataById
}