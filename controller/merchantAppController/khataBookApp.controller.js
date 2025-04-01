const pool = require('../../database');
const jwt = require("jsonwebtoken");

/* Custome CURD Data */

// Get Due Customer Account

const getCustomerAccountListForApp = (req, res) => {
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
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
                        if (numRows === 0) {
                            const rows = []
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

// const Get Statics Data for KhataBook Dashboard

const getStaticsForAllCustomer = (req, res) => {
    try {
        let sql_query_getstaticsData = `SELECT 
                                            SUM(GREATEST(0, COALESCE(dtd.creditAmt, 0) - COALESCE(dba.debitAmt, 0))) AS "You Will Give",
                                            SUM(LEAST(0, COALESCE(dtd.creditAmt, 0) - COALESCE(dba.debitAmt, 0))) AS "You Will Get"
                                        FROM due_account_data AS dad
                                        LEFT JOIN (
                                            SELECT accountId, SUM(billAmount) AS debitAmt FROM due_billAmount_data
                                            GROUP BY accountId
                                        ) AS dba ON dba.accountId = dad.accountId
                                        LEFT JOIN (
                                            SELECT accountId, SUM(paidAmount) AS creditAmt FROM due_transaction_data
                                            GROUP BY accountId
                                        ) AS dtd ON dtd.accountId = dad.accountId`;
        pool.query(sql_query_getstaticsData, (err, data) => {
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

// Add Account API

const addCustomerAccountForApp = async (req, res) => {
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
                            return res.status(200).send("Customer Added Succeesful");
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

const removeCustomerAccountForApp = async (req, res) => {
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

const updateCustomerAccountForApp = async (req, res) => {
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

/* Transaction CURD */

// Add Amount to You Gave

const addYouGaveDataForApp = (req, res) => {
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
                transactionAmount: req.body.transactionAmount ? req.body.transactionAmount : null,
                transactionNote: req.body.transactionNote ? req.body.transactionNote : null,
                transactionDate: new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15)
            }
            if (!data.accountId || !data.transactionAmount) {
                return res.status(400).send("Please Fill all the feilds");
            } else {
                let sql_queries_addDetails = `INSERT INTO due_billAmount_data(dabId, enterBy, accountId, billId, billAmount, dueNote, dueDate)
                                              VALUES('${dabId}','${cashier}','${data.accountId}',${data.billId ? `'${data.billId}'` : null},${data.transactionAmount},${data.transactionNote ? `'${data.transactionNote}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'))`;
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

// Add Amount to You Got

const addYouGotDataForApp = async (req, res) => {
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
            const transactionAmount = req.body.transactionAmount ? req.body.transactionAmount : 0;
            const transactionNote = req.body.transactionNote ? req.body.transactionNote.trim() : null;
            const transactionDate = new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15)

            if (!accountId || !transactionAmount || !transactionDate) {
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
                                                   VALUES ('${transactionId}', '${accountId}', '${cashier}', ${givenBy ? `'${givenBy}'` : null}, ${remainingAmount}, ${transactionAmount}, ${transactionNote ? `'${transactionNote}'` : null}, STR_TO_DATE('${transactionDate}','%b %d %Y'))`;
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

// Get Customer Transaction Data

const getCustomerTransactionData = (req, res) => {
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
                                              WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y') `
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

// Get Statics For Due

const getCustomerStaticsById = (req, res) => {
    try {

        const accountId = req.query.accountId ? req.query.accountId : null;
        if (!accountId) {
            return res.status(404).send('accountId Not Found...!')
        } else {
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
                                             WHERE dad.accountId = '${accountId}'`;

            pool.query(sql_querry_remainAmount, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                else {
                    const count = {
                        balanceHeading: data && data[0] ? data[0].remainingAmount > 0 ? "You will get" : data[0].remainingAmount < 0 ? "You will give" : "Settled Up" : 'No Data Found',
                        dueBalance: data && data[0] ? Math.abs(data[0].remainingAmount) : 0,
                    }
                    return res.status(200).send(count);
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Delete Customer Transacation Data

const removeCustomerTransactionData = (req, res) => {
    try {
        const transactionId = req.query.transactionId ? req.query.transactionId : null;
        const transactionType = req.query.transactionType ? req.query.transactionType : null;
        if (!transactionId || !transactionType) {
            return res.status(404).send('transactionId or transactionType Found..!');
        } else {
            if (transactionType == 'debit') {
                sql_query_findId = `SELECT dabId FROM due_billAmount_data WHERE dabId = '${transactionId}'`;
                sql_query_removeData = `DELETE FROM due_billAmount_data WHERE dabId = '${transactionId}'`;
            } else if (transactionType == 'credit') {
                sql_query_findId = `SELECT transactionId FROM due_transaction_data WHERE transactionId = '${transactionId}'`;
                sql_query_removeData = `DELETE FROM due_transaction_data WHERE transactionId = '${transactionId}'`;
            } else {
                return res.status(400).send('Transaction Type is Invalid');
            }
            pool.query(sql_query_findId, (err, row) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    pool.query(sql_query_removeData, (err, data) => {
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
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Update Customer Transaction Data

const updateCustomerTransactionData = (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const cashier = decoded.id.firstName;
            const data = {
                transactionType: req.body.transactionType ? req.body.transactionType.toLowerCase() : null,
                transactionId: req.body.transactionId ? req.body.transactionId : null,
                transactionAmount: req.body.transactionAmount ? req.body.transactionAmount : null,
                transactionNote: req.body.transactionNote ? req.body.transactionNote : null,
                transactionDate: new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15),
                givenBy: req.body.givenBy ? req.query.givenBy : null
            }
            if (!data.transactionType || !data.transactionId || !data.transactionAmount || !data.transactionDate) {
                return res.status(404).send("Please Fill All The Fields...!");
            } else {
                if (data.transactionType == 'debit') {
                    sql_query_updateTransaction = `UPDATE
                                                       due_billAmount_data
                                                   SET
                                                       enterBy = '${cashier}',
                                                       billAmount = ${data.transactionAmount},
                                                       dueNote =  ${data.transactionNote ? `'${data.transactionNote}'` : null},
                                                       dueDate = STR_TO_DATE('${data.transactionDate}','%b %d %Y')
                                                   WHERE dabId = '${data.transactionId}'`;
                } else if (data.transactionType == 'credit') {
                    sql_query_updateTransaction = `UPDATE
                                                       due_transaction_data
                                                   SET
                                                       receivedBy = '${cashier}',
                                                       givenBy = ${data.givenBy ? `'${data.givenBy}'` : null},
                                                       paidAmount = ${data.transactionAmount},
                                                       transactionNote = ${data.transactionNote ? `'${data.transactionNote}'` : null},
                                                       transactionDate = STR_TO_DATE('${data.transactionDate}','%b %d %Y')
                                                   WHERE transactionId = '${data.transactionId}'`;
                } else {
                    return res.status(400).send("Transaction Type  is Invalid");
                }
                pool.query(sql_query_updateTransaction, (err, result) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Transaction Updated Successfully");
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


module.exports = {
    // Customer CURD
    getCustomerAccountListForApp,
    addCustomerAccountForApp,
    removeCustomerAccountForApp,
    updateCustomerAccountForApp,
    getStaticsForAllCustomer,

    // Transaction CURD
    addYouGaveDataForApp,
    addYouGotDataForApp,
    getCustomerTransactionData,
    getCustomerStaticsById,
    removeCustomerTransactionData,
    updateCustomerTransactionData,
}