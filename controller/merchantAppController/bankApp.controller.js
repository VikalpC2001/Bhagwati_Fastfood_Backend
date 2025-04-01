const pool = require('../../database');

// Get Bank Dash Board Data For App

const getBankDashboardDataForApp = (req, res) => {
    try {
        sql_queries_getBankDetails = `SELECT
                                        bd.bankId,
                                        bd.bankDisplayName,
                                        bd.availableBalance + COALESCE(SUM(dtd.debitAmount),0) - COALESCE(SUM(ctd.creditAmount),0) AS availableBalance,
                                        bd.bankIconName
                                     FROM
                                        bank_data AS bd
                                        LEFT JOIN credit_transaction_data AS ctd ON ctd.toId = bd.bankId AND ctd.creditDate > CURDATE()
                                        LEFT JOIN debit_transaction_data AS dtd ON dtd.fromId = bd.bankId AND dtd.debitDate > CURDATE()
                                        WHERE bd.isActive = 1
                                        GROUP BY bd.bankId
                                        ORDER BY bankDisplayName ASC`;
        pool.query(sql_queries_getBankDetails, (err, data) => {
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

// Display Bank Details

const getBankDetailsByIdForApp = (req, res) => {
    try {
        const bankId = req.query.bankId;
        sql_quey_getBankDetails = `SELECT bankName, bankDisplayName, bankShortForm, bankAccountNumber, ifscCode, isActive, isViewMonthlyTransaction FROM bank_data
                                   WHERE bankId = '${bankId}'`;
        pool.query(sql_quey_getBankDetails, (err, data) => {
            if (err) {
                onsole.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data[0]);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Statics By ID

const getBankStaticsByIdForApp = (req, res) => {
    try {
        const bankId = req && req.query.bankId ? req.query.bankId : null;
        if (!bankId) {
            return res.status(404).send('bankId Not Found');
        }
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getAllStatics = `SELECT bd.availableBalance + COALESCE(SUM(dtd.debitAmount),0) - COALESCE(SUM(ctd.creditAmount),0) AS availableBalance FROM bank_data AS bd
                                         LEFT JOIN credit_transaction_data AS ctd ON ctd.toId = bd.bankId AND ctd.creditDate > CURDATE()
                                         LEFT JOIN debit_transaction_data AS dtd ON dtd.fromId = bd.bankId AND dtd.debitDate > CURDATE()
                                         WHERE bd.bankId = '${bankId}'
                                         GROUP BY bd.bankId;
                                         SELECT COALESCE(SUM(creditAmount),0) AS creditAmt FROM credit_transaction_data WHERE toId = '${bankId}' AND creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                         SELECT COALESCE(SUM(debitAmount),0) AS debitAmt FROM debit_transaction_data WHERE fromId = '${bankId}' AND debitDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                         SELECT COALESCE(SUM(debitAmount),0) AS expenseAmt FROM debit_transaction_data WHERE fromId = '${bankId}' AND toId IN (SELECT COALESCE(expense_subcategory_data.subCategoryId,null) FROM expense_subcategory_data) AND debitDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                         SELECT COALESCE(SUM(debitAmount),0) AS futureDebitAmt FROM debit_transaction_data WHERE fromId = '${bankId}' AND debitDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');`;
        } else {
            sql_queries_getAllStatics = `SELECT bd.availableBalance + COALESCE(SUM(dtd.debitAmount),0) - COALESCE(SUM(ctd.creditAmount),0) AS availableBalance FROM bank_data AS bd
                                         LEFT JOIN credit_transaction_data AS ctd ON ctd.toId = bd.bankId AND ctd.creditDate > CURDATE()
                                         LEFT JOIN debit_transaction_data AS dtd ON dtd.fromId = bd.bankId AND dtd.debitDate > CURDATE()
                                         WHERE bd.bankId = '${bankId}'
                                         GROUP BY bd.bankId;
                                         SELECT COALESCE(SUM(creditAmount),0) AS creditAmt FROM credit_transaction_data WHERE toId = '${bankId}' AND creditDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND creditDate <= CURDATE();
                                         SELECT COALESCE(SUM(debitAmount),0) AS debitAmt FROM debit_transaction_data WHERE fromId = '${bankId}' AND debitDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND debitDate <= CURDATE();
                                         SELECT COALESCE(SUM(debitAmount),0) AS expenseAmt FROM debit_transaction_data WHERE fromId = '${bankId}' AND toId IN (SELECT COALESCE(expense_subcategory_data.subCategoryId,null) FROM expense_subcategory_data) AND debitDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND debitDate <= CURDATE();
                                         SELECT COALESCE(SUM(debitAmount),0) AS futureDebitAmt FROM debit_transaction_data WHERE fromId = '${bankId}' AND debitDate > CURDATE() AND debitDate <= DATE_ADD(CURDATE(), INTERVAL 1 MONTH)`;
        }
        pool.query(sql_queries_getAllStatics, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const staticsData = {
                "availableBalance": data[0][0].availableBalance,
                "creditAmt": data[1][0].creditAmt,
                "debitAmt": data[2][0].debitAmt,
                "expenseAmt": data[3][0].expenseAmt,
                "futureDebitAmt": data[4][0].futureDebitAmt
            }
            return res.status(200).send(staticsData);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Bank Transaction By Id

const getBankTransactionByIdForApp = (req, res) => {
    try {
        const bankId = req.query.bankId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            transactionType: req.query.transactionType,
            bankId2: req.query.bankId2,
            expenseId: req.query.expenseId
        }
        if (data.bankId2 && data.expenseId) {
            return res.status(404).send('Can not Send Both');
        }
        const commonQueryForCredit = `SELECT
                                           ctd.transactionId,
                                           user_details.userName AS enterBy,
                                           CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                           COALESCE(isd.sourceName, bd2.bankDisplayName) AS fromId,
                                           bd.bankDisplayName AS toID,
                                           ctd.creditAmount AS amount,
                                           "CREDIT" AS transactionType,
                                           CASE
                                                WHEN toId IN (SELECT bankId FROM bank_data) THEN 1
                                                WHEN toId IN (SELECT subCategoryId FROM expense_subcategory_data) THEN 0
                                                ELSE 'Unknown'
                                            END AS status,
                                           ctd.creditComment AS comment,
                                           DATE_FORMAT(ctd.creditDate,'%a, %b %d, %Y') AS displayTransactionDate,
                                           DATE_FORMAT(ctd.creditCreationDate,'%h:%i %p') AS displayTransactionDateTime,
                                           ctd.creditDate AS transactionDate,
                                           ctd.creditCreationDate AS transactionDateTime
                                       FROM credit_transaction_data AS ctd
                                       LEFT JOIN incomeSource_data AS isd ON isd.sourceId = ctd.fromId
                                       LEFT JOIN bank_data AS bd ON bd.bankId = ctd.toId
                                       LEFT JOIN bank_data AS bd2 ON bd2.bankId = ctd.fromId
                                       LEFT JOIN user_details ON user_details.userId = ctd.userId
                                       WHERE ctd.toId = '${bankId}'`;
        const commonQueryForDebit = `SELECT
                                         dtd.transactionId,
                                         user_details.userName AS enterBy,
                                         CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                         bd.bankDisplayName AS fromId,
                                         COALESCE(escd.subCategoryName, bd2.bankDisplayName) AS toId,
                                         dtd.debitAmount AS amount,
                                         "DEBIT" AS transactionType,
                                         CASE
                                                WHEN toId IN (SELECT bankId FROM bank_data) THEN 1
                                                WHEN toId IN (SELECT subCategoryId FROM expense_subcategory_data) THEN 0
                                                ELSE 'Unknown'
                                            END AS status,
                                         dtd.debitComment AS comment,
                                         DATE_FORMAT(dtd.debitDate,'%a, %b %d, %Y') AS displayTransactionDate,
                                         DATE_FORMAT(dtd.debitCreationDate,'%h:%i %p') AS displayTransactionDateTime,
                                         dtd.debitDate AS transactionDate,
                                         dtd.debitCreationDate AS transactionDateTime
                                     FROM debit_transaction_data AS dtd
                                     LEFT JOIN bank_data AS bd ON bd.bankId = dtd.fromId
                                     LEFT JOIN bank_data AS bd2 ON bd2.bankId = dtd.toId
                                     LEFT JOIN expense_subcategory_data AS escd ON escd.subCategoryId = dtd.toId
                                     LEFT JOIN user_details ON user_details.userId = dtd.userId
                                    WHERE dtd.fromId = '${bankId}'`;
        if (req.query.startDate && req.query.endDate && req.query.bankId2 && req.query.transactionType) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForCredit} AND fromId = '${data.bankId2}'
                                              UNION ALL
                                              ${commonQueryForDebit} AND toId = '${data.bankId2}'
                                          ) AS combined_data
                                          WHERE transactionType = '${data.transactionType}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate && req.query.bankId2) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForCredit} AND fromId = '${data.bankId2}'
                                              UNION ALL
                                              ${commonQueryForDebit} AND toId = '${data.bankId2}'
                                          ) AS combined_data
                                          WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate && req.query.transactionType) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForCredit}
                                              UNION ALL
                                              ${commonQueryForDebit}
                                          ) AS combined_data
                                          WHERE transactionType = '${data.transactionType}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate && req.query.expenseId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForDebit} AND toId IN (SELECT COALESCE(subCategoryId,null) FROM expense_subcategory_data WHERE categoryId = '${data.expenseId}')
                                          ) AS combined_data
                                          WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForCredit}
                                              UNION ALL
                                              ${commonQueryForDebit}
                                          ) AS combined_data
                                          WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.bankId2 && req.query.transactionType) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForCredit} AND fromId = '${data.bankId2}'
                                              UNION ALL
                                              ${commonQueryForDebit} AND toId = '${data.bankId2}'
                                          ) AS combined_data
                                          WHERE transactionType = '${data.transactionType}' AND transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()`;
        } else if (req.query.expenseId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForDebit} AND toId IN (SELECT COALESCE(subCategoryId,null) FROM expense_subcategory_data WHERE categoryId = '${data.expenseId}')
                                          ) AS combined_data
                                          WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()`;
        } else if (req.query.bankId2) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForCredit} AND fromId = '${data.bankId2}'
                                              UNION ALL
                                              ${commonQueryForDebit} AND toId = '${data.bankId2}'
                                          ) AS combined_data
                                          WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()`;
        } else if (req.query.transactionType) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForCredit}
                                              UNION ALL
                                              ${commonQueryForDebit}
                                          ) AS combined_data
                                          WHERE transactionType = '${data.transactionType}' AND transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              ${commonQueryForCredit}
                                              UNION ALL
                                              ${commonQueryForDebit}
                                          ) AS combined_data
                                          WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()`;
        }

        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_combinedData = `SELECT transactionId, enterBy, userName, fromId, toId, amount, transactionType, status, comment, displayTransactionDate, displayTransactionDateTime, transactionDate,
                                                ((SELECT COALESCE(SUM(ctd.creditAmount), 0)
                                                 FROM credit_transaction_data AS ctd
                                                 WHERE ctd.toId = '${bankId}'
                                                   AND (
                                                        ctd.creditDate < combined_data.transactionDate
                                                        OR (ctd.creditDate = combined_data.transactionDate AND ctd.creditCreationDate <= combined_data.transactionDateTime)
                                                   )
                                                ) -      
                                                (SELECT COALESCE(SUM(dtd.debitAmount), 0)
                                                 FROM debit_transaction_data AS dtd
                                                 WHERE dtd.fromId = '${bankId}'
                                                   AND (
                                                        dtd.debitDate < combined_data.transactionDate
                                                        OR (dtd.debitDate = combined_data.transactionDate AND dtd.debitCreationDate <= combined_data.transactionDateTime)
                                                   )
                                                )) AS balance`;
                const sql_query_orderAndLimit = `ORDER BY transactionDate DESC, transactionDateTime DESC LIMIT ${limit}`;
                if (req.query.startDate && req.query.endDate && req.query.bankId2 && req.query.transactionType) {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForCredit} AND fromId = '${data.bankId2}'
                                                    UNION ALL
                                                    ${commonQueryForDebit} AND toId = '${data.bankId2}'
                                          ) AS combined_data
                                          WHERE transactionType = '${data.transactionType}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                          ${sql_query_orderAndLimit}`;
                } else if (req.query.startDate && req.query.endDate && req.query.bankId2) {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForCredit} AND fromId = '${data.bankId2}'
                                                    UNION ALL
                                                    ${commonQueryForDebit} AND toId = '${data.bankId2}'
                                          ) AS combined_data
                                          WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                          ${sql_query_orderAndLimit}`;
                } else if (req.query.startDate && req.query.endDate && req.query.transactionType) {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForCredit}
                                                    UNION ALL
                                                    ${commonQueryForDebit}
                                          ) AS combined_data
                                          WHERE transactionType = '${data.transactionType}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                          ${sql_query_orderAndLimit}`;
                } else if (req.query.startDate && req.query.endDate && req.query.expenseId) {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForDebit} AND toId IN (SELECT COALESCE(subCategoryId,null) FROM expense_subcategory_data WHERE categoryId = '${data.expenseId}')
                                          ) AS combined_data
                                          WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                          ${sql_query_orderAndLimit}`;
                } else if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForCredit}
                                                    UNION ALL
                                                    ${commonQueryForDebit}
                                          ) AS combined_data
                                          WHERE transactionDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                          ${sql_query_orderAndLimit}`;
                } else if (req.query.bankId2 && req.query.transactionType) {
                    sql_queries_getdetails = `${sql_query_combinedData} 
                                              FROM (
                                                ${commonQueryForCredit} AND fromId = '${data.bankId2}'
                                                UNION ALL
                                                ${commonQueryForDebit} AND toId = '${data.bankId2}'
                                            ) AS combined_data
                                            WHERE transactionType = '${data.transactionType}' AND transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()
                                            ${sql_query_orderAndLimit}`;
                } else if (req.query.expenseId) {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForDebit} AND toId IN (SELECT COALESCE(subCategoryId,null) FROM expense_subcategory_data WHERE categoryId = '${data.expenseId}')
                                          ) AS combined_data
                                          WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()
                                          ${sql_query_orderAndLimit}`;
                } else if (req.query.bankId2) {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForCredit} AND fromId = '${data.bankId2}'
                                                    UNION ALL
                                                    ${commonQueryForDebit} AND toId = '${data.bankId2}'
                                          ) AS combined_data
                                          WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()
                                          ${sql_query_orderAndLimit}`;
                } else if (req.query.transactionType) {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForCredit}
                                                    UNION ALL
                                                    ${commonQueryForDebit}
                                                ) AS combined_data
                                                WHERE transactionType = '${data.transactionType}' AND transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()
                                                ${sql_query_orderAndLimit}`;
                } else {
                    sql_queries_getdetails = `${sql_query_combinedData}
                                              FROM (
                                                    ${commonQueryForCredit}
                                                    UNION ALL
                                                    ${commonQueryForDebit}
                                                ) AS combined_data
                                                WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND transactionDate <= CURDATE()
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
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Dropdown List For Bank

const ddlToDataForApp = (req, res) => {
    try {
        const sql_query_getDDlData = `SELECT
                                          bd.bankId AS toId,
                                          bd.bankDisplayName AS toName,
                                          bd.availableBalance + COALESCE(SUM(dtd.debitAmount),0) - COALESCE(SUM(ctd.creditAmount),0) AS availableBalance
                                      FROM
                                          bank_data AS bd
                                          LEFT JOIN credit_transaction_data AS ctd ON ctd.toId = bd.bankId AND ctd.creditDate > CURDATE()
                                          LEFT JOIN debit_transaction_data AS dtd ON dtd.fromId = bd.bankId AND dtd.debitDate > CURDATE()
                                          GROUP BY bd.bankId
                                      ORDER BY bankDisplayName ASC`;
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

// Dropdown List Of Main Category

const ddlMainCategoryDataForApp = (req, res) => {
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

module.exports = {
    getBankDashboardDataForApp,
    getBankDetailsByIdForApp,
    getBankStaticsByIdForApp,
    getBankTransactionByIdForApp,
    ddlToDataForApp,
    ddlMainCategoryDataForApp
}