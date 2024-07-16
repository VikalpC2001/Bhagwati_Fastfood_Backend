const pool = require('../../database');
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require('jspdf');
const { table } = require('console');
require('jspdf-autotable');

// Get Bank Transaction By Id

const getBankTransactionById = (req, res) => {
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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_combinedData = `SELECT transactionId, enterBy, userName, fromId, toId, amount, transactionType, status, comment, displayTransactionDate, displayTransactionDateTime, transactionDate`;
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
                        console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Bank Credit Transaction All

const getBankCreditTransaction = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        function getCurrentDate() {
            const now = new Date();
            const hours = now.getHours();

            if (hours <= 4) { // If it's 4 AM or later, increment the date
                now.setDate(now.getDate() - 1);
            }
            return now.toDateString().slice(4, 15);
        }


        const currentDate = getCurrentDate();
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT COUNT(*) as numRows FROM credit_transaction_data WHERE credit_transaction_data.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else {
            sql_querry_getCountdetails = `SELECT COUNT(*) as numRows FROM credit_transaction_data WHERE credit_transaction_data.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }

        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commonQueryForCredit = ` SELECT
                                                    ctd.transactionId,
                                                    user_details.userName AS enterBy,
                                            	    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                     COALESCE(isd.sourceName, bd2.bankDisplayName) AS fromId,
                                                    bd.bankDisplayName AS toID,
                                                    ctd.creditAmount AS amount,
                                                    ctd.creditComment AS comment,
                                                    ctd.creditDate AS dateCredit,
                                                    DATE_FORMAT(ctd.creditDate,'%a, %b %d, %Y') AS transactionDate,
                                                    DATE_FORMAT(ctd.creditCreationDate,'%h:%i %p') AS transactionDateTime
                                                FROM credit_transaction_data AS ctd
                                                LEFT JOIN incomeSource_data AS isd ON isd.sourceId = ctd.fromId
                                                LEFT JOIN bank_data AS bd ON bd.bankId = ctd.toId
                                                LEFT JOIN bank_data AS bd2 ON bd2.bankId = ctd.fromId
                                                LEFT JOIN user_details ON user_details.userId = ctd.userId`;
                if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commonQueryForCredit}
                                              WHERE ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                              ORDER BY ctd.creditDate DESC, ctd.creditCreationDate DESC
                                              LIMIT ${limit}`;
                } else {
                    sql_queries_getdetails = `${commonQueryForCredit}
                                              WHERE ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                              ORDER BY ctd.creditDate DESC, ctd.creditCreationDate DESC
                                              LIMIT ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add Bank Transaction

const addTransactionData = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const creditId = String("credit_" + uid1.getTime());
            const debitId = String("debit_" + (uid1.getTime() + 1));
            const transactionId = String("transaction_" + (uid1.getTime() + 2));
            const data = {
                fromId: req.body.fromId.trim(),
                toId: req.body.toId.trim(),
                transactionAmount: req.body.transactionAmount,
                comment: req.body.comment ? req.body.comment.trim() : null,
                transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate).toString().slice(4, 15) : null,
                transactionStatus: req.body.transactionStatus
            }
            console.log(data.transactionDate);
            if (!data.fromId || !data.toId || !data.transactionAmount || !data.transactionDate) {
                return res.status(400).send("Please Fill All The Fields");
            } else {
                // Bank To Bank
                if (data.transactionStatus == true) {
                    sql_querry_addData = `-- ADD CREDIT DATA
                                                INSERT INTO credit_transaction_data (creditId, userId, transactionId, fromId, toId, creditAmount, creditComment, creditDate)
                                                VALUES ('${creditId}', '${userId}', '${transactionId}', '${data.fromId}', '${data.toId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'));
                                          -- ADD DEBIT DATA
                                                INSERT INTO debit_transaction_data (debitId, userId, transactionId, fromId, toId, debitAmount, debitComment, debitDate)
                                                VALUES ('${debitId}', '${userId}', '${transactionId}', '${data.fromId}', '${data.toId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'));
                                          -- UPDATE CREDIT AVAILBALE BALANCE
                                                UPDATE bank_data SET availableBalance = availableBalance + ${data.transactionAmount}  WHERE bankId = '${data.toId}';
                                          -- UPDATE DEBIT AVAILBALE BALANCE
                                                UPDATE bank_data SET availableBalance = availableBalance - ${data.transactionAmount}  WHERE bankId = '${data.fromId}'`;
                } else {
                    sql_querry_addData = `-- ADD CREDIT DATA
                                                INSERT INTO credit_transaction_data (creditId, userId, transactionId, fromId, toId, creditAmount, creditComment, creditDate)
                                                VALUES ('${creditId}', '${userId}', '${transactionId}', '${data.fromId}', '${data.toId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'));
                                                UPDATE bank_data SET availableBalance = availableBalance + ${data.transactionAmount}  WHERE bankId = '${data.toId}'`;
                }
                pool.query(sql_querry_addData, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Data Added Successfully");
                })
            }
        } else {
            res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Bank Transaction

const removeTransactionData = (req, res) => {
    try {
        const transactionId = req.query.transactionId.trim();
        if (!transactionId) {
            return res.status(404).send('transactionId Not Found');
        }
        sql_querry_getBankId = `SELECT toId, creditAmount FROM credit_transaction_data WHERE transactionId = '${transactionId}';
                                SELECT fromId, debitAmount FROM debit_transaction_data WHERE transactionId = '${transactionId}'`;
        pool.query(sql_querry_getBankId, (err, result) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const creditBankId = result && result[0][0] && result[0][0].toId ? result[0][0].toId : null;
            const debitBankId = result && result[1][0] && result[1][0].fromId ? result[1][0].fromId : null;
            const creditAmt = result && result[0][0] && result[0][0].creditAmount ? result[0][0].creditAmount : 0;
            const debitAmt = result && result[1][0] && result[1][0].debitAmount ? result[1][0].debitAmount : 0;
            const sql_querry_removedetails = `UPDATE bank_data SET availableBalance = availableBalance - ${creditAmt} WHERE bankId = '${creditBankId}';
                                              UPDATE bank_data SET availableBalance = availableBalance + ${debitAmt} WHERE bankId = '${debitBankId}';
                                              DELETE FROM credit_transaction_data WHERE transactionId = '${transactionId}';
                                              DELETE FROM debit_transaction_data WHERE transactionId = '${transactionId}';
                                              DELETE FROM transactionId_with_date WHERE transactionId = '${transactionId}'`;
            pool.query(sql_querry_removedetails, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                return res.status(200).send("Transaction Deleted Successfully");
            })
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Bank Transaction

const updateBankTransaction = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const transactionId = req.body.transactionId;
            const data = {
                transactionAmount: req.body.transactionAmount,
                comment: req.body.comment ? req.body.comment.trim() : null,
                transactionDate: new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15),
            }
            if (!data.transactionAmount || !data.transactionDate) {
                return res.status(400).send("Please Fill All The Fields");
            } else {
                sql_querry_getOldAmt = `SELECT toId, creditAmount FROM credit_transaction_data WHERE transactionId = '${transactionId}';
                                        SELECT fromId, debitAmount FROM debit_transaction_data WHERE transactionId = '${transactionId}'`;
                pool.query(sql_querry_getOldAmt, (err, result) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const creditBankId = result && result[0][0] && result[0][0].toId ? result[0][0].toId : null;
                    const debitBankId = result && result[1][0] && result[1][0].fromId ? result[1][0].fromId : null;
                    const creditAmt = result && result[0][0] && result[0][0].creditAmount ? data.transactionAmount - result[0][0].creditAmount : 0;
                    const debitAmt = result && result[1][0] && result[1][0].debitAmount ? data.transactionAmount - result[1][0].debitAmount : 0;
                    console.log("creditBankId", creditBankId, creditAmt);
                    console.log("debitBankId", debitBankId, debitAmt);
                    //Bank To Bank
                    sql_querry_updateData = `-- UPDATE CREDIT DATA
                                            UPDATE bank_data SET availableBalance = availableBalance + ${creditAmt} WHERE bankId = '${creditBankId}';
                                            UPDATE
                                                credit_transaction_data
                                            SET
                                                userId = '${userId}',
                                                creditAmount = ${data.transactionAmount},
                                                creditComment = ${data.comment ? `'${data.comment}'` : null},
                                                creditDate = STR_TO_DATE('${data.transactionDate}','%b %d %Y')
                                            WHERE transactionId = '${transactionId}';
                                         -- UPDATE DEBIT DATA
                                         UPDATE bank_data SET availableBalance = availableBalance - ${debitAmt} WHERE bankId = '${debitBankId}';
                                            UPDATE
                                                debit_transaction_data
                                            SET
                                                userId = '${userId}',
                                                debitAmount = ${data.transactionAmount},
                                                debitComment = ${data.comment ? `'${data.comment}'` : null},
                                                debitDate = STR_TO_DATE('${data.transactionDate}','%b %d %Y')
                                            WHERE transactionId = '${transactionId}';
                                            UPDATE transactionId_with_date SET transactionValue = ${data.transactionAmount} WHERE transactionId = '${transactionId}'`;
                    pool.query(sql_querry_updateData, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Transaction Updated Successfully");
                    })
                })
            }
        } else {
            res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export Excel For TransactionData

const exportExcelForBankTransactionById = (req, res) => {

    const bankId = req.query.bankId;
    const currentDate = new Date();
    const FirestDate = currentDate.setMonth(currentDate.getMonth() - 1);
    console.log(FirestDate, currentDate);
    var firstDay = new Date().toString().slice(4, 15);
    var lastDay = new Date(FirestDate).toString().slice(4, 15);
    console.log(firstDay, lastDay);
    const data = {
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
        transactionType: req.query.transactionType,
        bankId2: req.query.bankId2,
        expenseId: req.query.expenseId
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
                                           WHEN toId IN (SELECT bankId FROM bank_data) THEN 'B to B'
                                           WHEN toId IN (SELECT subCategoryId FROM expense_subcategory_data) THEN 'B to E'
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
                                             WHEN toId IN (SELECT bankId FROM bank_data) THEN 'B to B'
                                             WHEN toId IN (SELECT subCategoryId FROM expense_subcategory_data) THEN 'B to E'
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
    const sql_query_combinedData = `SELECT transactionId, enterBy, userName, fromId, toId, amount, transactionType, status, comment, displayTransactionDate, displayTransactionDateTime`;
    const sql_query_orderAndLimit = `ORDER BY transactionDate DESC, transactionDateTime DESC`;
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
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Bank Transaction"); // New Worksheet
        sql_query_getParamsDetails = `SELECT fromId, fromName, status
                                      FROM (
                                          SELECT bankId AS fromId, bankDisplayName AS fromName, true AS status FROM bank_data
                                          UNION
                                          SELECT sourceId AS fromId, sourceName AS fromName, false AS status FROM incomeSource_data
                                      ) AS combined_data
                                      WHERE fromId = '${data.bankId2}';
                                      SELECT categoryName FROM expense_category_data WHERE categoryId = '${data.expenseId}';
                                      SELECT bankDisplayName FROM bank_data WHERE bankId = '${bankId}'`;
        pool.query(sql_query_getParamsDetails, async (err, result) => {
            if (err) return res.status(404).send(err);

            if (req.query.startDate && req.query.endDate && req.query.bankId2 && req.query.transactionType) {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${data.startDate} To ${data.endDate} For ${result[0][0].fromName} (${req.query.transactionType})`;
            } else if (req.query.startDate && req.query.endDate && req.query.bankId2) {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${data.startDate} To ${data.endDate} For ${result[0][0].fromName}`;
            } else if (req.query.startDate && req.query.endDate && req.query.transactionType) {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${data.startDate} To ${data.endDate} For Type ${req.query.transactionType}`;
            } else if (req.query.startDate && req.query.endDate && req.query.expenseId) {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${data.startDate} To ${data.endDate} For ${result[1][0].categoryName}`;
            } else if (req.query.bankId2 && req.query.transactionType) {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()} For ${result[0][0].fromName} (${req.query.transactionType})`;
            } else if (req.query.bankId2) {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()} For ${result[0][0].fromName}`;
            } else if (req.query.expenseId) {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()} For ${result[1][0].categoryName}`;
            } else if (req.query.transactionType) {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()} For ${req.query.transactionType}`;
            } else {
                worksheet.mergeCells('A1', 'I1');
                worksheet.getCell('A1').value = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()}`;
            }

            /*Column headers*/
            worksheet.getRow(2).values = ['Sr.No', 'Date', 'Source', 'Destination', 'Amount', 'Type', 'Comment', 'Time', 'Enter By'];

            // Column for data in excel. key must match data key
            worksheet.columns = [
                { key: "s_no", width: 10, },
                { key: "displayTransactionDate", width: 20 },
                { key: "fromId", width: 25 },
                { key: "toId", width: 25 },
                { key: "amount", width: 10 },
                { key: "transactionType", width: 10 },
                { key: "comment", width: 40 },
                { key: "displayTransactionDateTime", width: 15 },
                { key: "userName", width: 20 }
            ]
            //Looping through User data
            const arr = rows
            console.log(">>>", arr);
            let counter = 1;
            arr.forEach((user) => {
                user.s_no = counter;
                const row = worksheet.addRow(user); // Add data in worksheet
                // Get the stock status value for the current row
                const transactionType = user.transactionType;
                console.log(transactionType);
                // Set color based on stock status
                let textColor;
                switch (transactionType) {
                    case 'CREDIT':
                        textColor = '008000'; // Green color
                        break;
                    case 'DEBIT':
                        textColor = 'FF0000'; // Red color
                        break;
                    default:
                        textColor = '000000'; // Black color (default)
                        break;
                }
                // Apply the color to the cells in the current row
                row.eachCell((cell) => {
                    cell.font = {
                        color: {
                            argb: textColor
                        }
                    };
                });
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
            if (req.query.transactionType == 'Credit' || req.query.transactionType == 'Debit' || req.query.expenseId) {
                worksheet.getRow(arr.length + 3).values = [
                    'Total:',
                    '',
                    '',
                    '',
                    { formula: `SUM(E3: E${arr.length + 2})` }
                ];
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
                res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                res.type = 'blob';
                res.send(data)
            } catch (err) {
                throw new Error(err);
            }
        })
    })
}

// Export PDF Function

async function createPDF(res, datas, sumFooterArray, tableHeading) {
    try {
        // Create a new PDF document
        // console.log(';;;;;;', datas);
        // console.log('?????', sumFooterArray);
        // console.log('?????', tableHeading);
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
        const splitText = doc.splitTextToSize(tableHeading, 190);
        // Check if splitText has more than one line
        const isSplit = splitText.length > 1;

        // Add auto table to the PDF document
        doc.text(15, 15, splitText);
        doc.autoTable({
            startY: isSplit == true ? 25 : 20,
            head: [columns.map(col => col.header)], // Extract headers correctly
            body: data,
            theme: 'striped',
            didParseCell: function (data) {
                const columnIndex = data.column.index;
                const rowIndex = data.row.index - 1; // Adjust for header row

                if (columnIndex === 5) { // Assuming 'Type' is in the sixth column (index 5)
                    const type = data.cell.raw;

                    if (type === 'DEBIT') {
                        data.cell.styles.textColor = [255, 0, 0]; // Red color for 'DEBIT'
                    } else if (type === 'CREDIT') {
                        data.cell.styles.textColor = [0, 128, 0]; // Green color for 'CREDIT'
                    }
                }
            },
            styles: {
                cellPadding: 2, // Add padding to cells for better appearance
                halign: 'center', // Horizontally center-align content
                fontSize: 10,
                lineColor: [0, 0, 0], // Border color
                lineWidth: 0.1, // Border width
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
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Export PDF For BankTransaction By ID

const exportPdfForBankTransactionById = (req, res) => {
    try {
        const bankId = req.query.bankId;
        const currentDate = new Date();
        const FirestDate = currentDate.setMonth(currentDate.getMonth() - 1);
        console.log(FirestDate, currentDate);
        var firstDay = new Date().toString().slice(4, 15);
        var lastDay = new Date(FirestDate).toString().slice(4, 15);
        console.log(firstDay, lastDay);
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            transactionType: req.query.transactionType,
            bankId2: req.query.bankId2,
            expenseId: req.query.expenseId
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
                                           WHEN toId IN (SELECT bankId FROM bank_data) THEN 'B to B'
                                           WHEN toId IN (SELECT subCategoryId FROM expense_subcategory_data) THEN 'B to E'
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
                                             WHEN toId IN (SELECT bankId FROM bank_data) THEN 'B to B'
                                             WHEN toId IN (SELECT subCategoryId FROM expense_subcategory_data) THEN 'B to E'
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
        const sql_query_combinedData = `SELECT displayTransactionDate AS "Date", fromId AS "Source", toId AS "Destination", amount AS "Amount", transactionType AS "Type", comment AS "Comment", displayTransactionDateTime AS "Time", userName AS "Enter By"`;
        const sql_query_orderAndLimit = `ORDER BY transactionDate DESC, transactionDateTime DESC`;
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
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumAmount = abc.reduce((total, item) => total + (item['Amount'] || 0), 0);
            const sumFooterArray = ['Total', '', '', '', (sumAmount).toLocaleString('en-IN')];
            sql_query_getParamsDetails = `SELECT fromId, fromName, status
                                      FROM (
                                          SELECT bankId AS fromId, bankDisplayName AS fromName, true AS status FROM bank_data
                                          UNION
                                          SELECT sourceId AS fromId, sourceName AS fromName, false AS status FROM incomeSource_data
                                      ) AS combined_data
                                      WHERE fromId = '${data.bankId2}';
                                      SELECT categoryName FROM expense_category_data WHERE categoryId = '${data.expenseId}';
                                      SELECT bankDisplayName FROM bank_data WHERE bankId = '${bankId}'`;
            pool.query(sql_query_getParamsDetails, (err, result) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (req.query.startDate && req.query.endDate && req.query.bankId2 && req.query.transactionType) {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${data.startDate} To ${data.endDate} For ${result[0][0].fromName} (${req.query.transactionType})`;
                } else if (req.query.startDate && req.query.endDate && req.query.bankId2) {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${data.startDate} To ${data.endDate} For ${result[0][0].fromName}`;
                } else if (req.query.startDate && req.query.endDate && req.query.transactionType) {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${data.startDate} To ${data.endDate} For Type ${req.query.transactionType}`;
                } else if (req.query.startDate && req.query.endDate && req.query.expenseId) {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${data.startDate} To ${data.endDate} For ${result[1][0].categoryName}`;
                } else if (req.query.bankId2 && req.query.transactionType) {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()} For ${result[0][0].fromName} (${req.query.transactionType})`;
                } else if (req.query.bankId2) {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()} For ${result[0][0].fromName}`;
                } else if (req.query.expenseId) {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()} For ${result[1][0].categoryName}`;
                } else if (req.query.transactionType) {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()} For ${req.query.transactionType}`;
                } else {
                    tableHeading = `${result[2][0].bankDisplayName} Transaction From ${lastDay.trim()} To ${firstDay.trim()}`;
                }
                createPDF(res, abc, (req.query.transactionType) == 'Credit' || req.query.transactionType == 'Debit' || req.query.expenseId ? sumFooterArray : '', tableHeading)
                    .then(() => {
                        console.log('PDF created successfully');
                        res.status(200);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send('Error creating PDF');
                    });
            })
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export Excel For TransactionData

const exportExcelForFundTransfer = (req, res) => {

    function getCurrentDate() {
        const now = new Date();
        const hours = now.getHours();

        if (hours <= 4) { // If it's 4 AM or later, increment the date
            now.setDate(now.getDate() - 1);
        }
        return now.toDateString().slice(4, 15);
    }
    const currentDate = getCurrentDate();
    const data = {
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
    }

    const commonQueryForCredit = ` SELECT
                                       ctd.transactionId,
                                       CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                       COALESCE(isd.sourceName, bd2.bankDisplayName) AS fromId,
                                       bd.bankDisplayName AS toID,
                                       ctd.creditAmount AS amount,
                                       ctd.creditComment AS comment,
                                       ctd.creditDate AS dateCredit,
                                       DATE_FORMAT(ctd.creditDate,'%a, %b %d, %Y') AS transactionDate,
                                       DATE_FORMAT(ctd.creditCreationDate,'%h:%i %p') AS transactionDateTime
                                   FROM credit_transaction_data AS ctd
                                   LEFT JOIN incomeSource_data AS isd ON isd.sourceId = ctd.fromId
                                   LEFT JOIN bank_data AS bd ON bd.bankId = ctd.toId
                                   LEFT JOIN bank_data AS bd2 ON bd2.bankId = ctd.fromId
                                   LEFT JOIN user_details ON user_details.userId = ctd.userId`;
    if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commonQueryForCredit}
                                    WHERE ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY ctd.creditDate DESC, ctd.creditCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commonQueryForCredit}
                                    WHERE ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    ORDER BY ctd.creditDate DESC, ctd.creditCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Common Bank Transactions"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Common Bank Transaction From ${data.startDate} To ${data.endDate}`;
        } else {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Common Bank Transaction Date : ${currentDate}`;
        }
        /*Column headers*/
        worksheet.getRow(2).values = ['Sr.No', 'Date', 'Source', 'Destination', 'Amount', 'Comment', 'Time', 'Enter By'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "transactionDate", width: 20 },
            { key: "fromId", width: 25 },
            { key: "toID", width: 25 },
            { key: "amount", width: 10 },
            { key: "comment", width: 40 },
            { key: "transactionDateTime", width: 15 },
            { key: "userName", width: 20 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
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
        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            '',
            '',
            { formula: `SUM(E3: E${arr.length + 2})` }
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
}

// Export PDF Function

async function createPDFforFunds(res, datas, sumFooterArray, tableHeading) {
    try {
        // Create a new PDF document
        // console.log(';;;;;;', datas);
        // console.log('?????', sumFooterArray);
        // console.log('?????', tableHeading);
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
        const splitText = doc.splitTextToSize(tableHeading, 190);
        // Check if splitText has more than one line
        const isSplit = splitText.length > 1;

        // Add auto table to the PDF document
        doc.text(15, 15, splitText);
        doc.autoTable({
            startY: isSplit == true ? 25 : 20,
            head: [columns.map(col => col.header)], // Extract headers correctly
            body: data,
            theme: 'striped',
            styles: {
                cellPadding: 2, // Add padding to cells for better appearance
                halign: 'center', // Horizontally center-align content
                fontSize: 10,
                lineColor: [0, 0, 0], // Border color
                lineWidth: 0.1, // Border width
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
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Export PDF For BankTransaction By ID

const exportPdfForFundTransfer = (req, res) => {
    try {
        function getCurrentDate() {
            const now = new Date();
            const hours = now.getHours();

            if (hours <= 4) { // If it's 4 AM or later, increment the date
                now.setDate(now.getDate() - 1);
            }
            return now.toDateString().slice(4, 15);
        }
        const currentDate = getCurrentDate();
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }

        const commonQueryForCredit = ` SELECT
                                            DATE_FORMAT(ctd.creditDate,'%a, %b %d, %Y') AS "Date",
                                            COALESCE(isd.sourceName, bd2.bankDisplayName) AS "Source",
                                            bd.bankDisplayName AS "Destination",
                                            ctd.creditAmount AS "Amount",
                                            ctd.creditComment AS "comment",
                                            DATE_FORMAT(ctd.creditCreationDate,'%h:%i %p') AS "Time",
                                            CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Enter By"
                                        FROM credit_transaction_data AS ctd
                                        LEFT JOIN incomeSource_data AS isd ON isd.sourceId = ctd.fromId
                                        LEFT JOIN bank_data AS bd ON bd.bankId = ctd.toId
                                        LEFT JOIN bank_data AS bd2 ON bd2.bankId = ctd.fromId
                                        LEFT JOIN user_details ON user_details.userId = ctd.userId`;
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commonQueryForCredit}
                                        WHERE ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        ORDER BY ctd.creditDate DESC, ctd.creditCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${commonQueryForCredit}
                                        WHERE ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        ORDER BY ctd.creditDate DESC, ctd.creditCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumAmount = abc.reduce((total, item) => total + (item['Amount'] || 0), 0);
            const sumFooterArray = ['Total', '', '', '', (sumAmount).toLocaleString('en-IN')];


            if (req.query.startDate && req.query.endDate) {
                tableHeading = `Common Bank Transaction From ${data.startDate} To ${data.endDate}`;
            } else {
                tableHeading = `Common Bank Transaction For Date ${currentDate}`;
            }
            createPDFforFunds(res, abc, sumFooterArray, tableHeading)
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
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Month Wise Transaction In Bank

const getMonthWiseTransaction = (req, res) => {
    try {
        const bankId = req.query.bankId;
        let page = req.query.page; // Page number
        let numPerPage = req.query.numPerPage; // Number of items per page
        if (!bankId || !page || !numPerPage) {
            return res.status(404).send('Not Found')
        }

        // Calculate the start and end indices for the current page
        let startIndex = (page - 1) * numPerPage;
        let endIndex = startIndex + numPerPage;
        let sql_query_getMonthWiseData = `SELECT
                                              SUM(creditAmount) AS amount,
                                              SUM(creditAmount) AS amt,
                                              CONCAT(MONTHNAME(creditDate), '-', YEAR(creditDate)) AS date
                                          FROM
                                              credit_transaction_data
                                          WHERE toId = '${bankId}'
                                          GROUP BY YEAR(creditDate), MONTH(creditDate)
                                          ORDER BY YEAR(creditDate) ASC, MONTH(creditDate) ASC;
                                          SELECT SUM(debitAmount) AS debitAmt FROM debit_transaction_data WHERE fromId = '${bankId}'`;
        pool.query(sql_query_getMonthWiseData, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const creditAmtJson = data && data[0] ? Object.values(JSON.parse(JSON.stringify(data[0]))) : [];
                const debitAmtSum = data && data[1] ? data[1][0].debitAmt : 0;
                const arr = catrersMonthWiseData(creditAmtJson, debitAmtSum);
                const result = arr.sort((a, b) => {
                    let dateA = new Date(a.date);
                    let dateB = new Date(b.date);
                    return dateB - dateA;
                });
                const rows = result.slice(startIndex, endIndex);
                const numRows = arr.length
                return res.status(200).send({ rows, numRows });
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
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

module.exports = {
    addTransactionData,
    removeTransactionData,
    updateBankTransaction,
    getBankTransactionById,
    getBankCreditTransaction,
    exportExcelForBankTransactionById,
    exportPdfForBankTransactionById,
    exportExcelForFundTransfer,
    exportPdfForFundTransfer,
    getMonthWiseTransaction
}