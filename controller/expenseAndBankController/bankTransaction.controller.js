const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Get Bank Transaction By Id

const getBankTransactionById = (req, res) => {
    try {
        const bankId = req.query.bankId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM (
                                              SELECT * FROM credit_transaction_data WHERE toId = '${bankId}'
                                              UNION ALL
                                              SELECT * FROM debit_transaction_data WHERE fromId = '${bankId}'
                                          ) AS combined_data`;
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
                                                    COALESCE(isd.sourceName, bd.bankDisplayName) AS fromId,
                                                    bd.bankDisplayName AS toID,
                                                    ctd.creditAmount AS amount,
                                                    "CREDIT" AS transactionType,
                                                    ctd.creditComment AS comment,
                                                    DATE_FORMAT(ctd.creditDate,'%a, %b %d, %Y') AS displayTransactionDate,
                                                    DATE_FORMAT(ctd.creditCreationDate,'%h:%i %p') AS displayTransactionDateTime,
                                                    ctd.creditDate AS transactionDate,
                                                    ctd.creditCreationDate AS transactionDateTime
                                                FROM credit_transaction_data AS ctd
                                                LEFT JOIN incomeSource_data AS isd ON isd.sourceId = ctd.fromId
                                                LEFT JOIN bank_data AS bd ON bd.bankId = ctd.toId
                                                LEFT JOIN user_details ON user_details.userId = ctd.userId
                                                WHERE ctd.toId = '${bankId}'`;
                const commonQueryForDebit = `SELECT
                                                    dtd.transactionId,
                                                    user_details.userName AS enterBy,
                                            	    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                                    bd.bankDisplayName AS fromId,
                                                    COALESCE(escd.subCategoryName, bd.bankDisplayName) AS toId,
                                                    dtd.debitAmount AS amount,
                                                    "DEBIT" AS transactionType,
                                                    dtd.debitComment AS comment,
                                                    DATE_FORMAT(dtd.debitDate,'%a, %b %d, %Y') AS displayTransactionDate,
                                                    DATE_FORMAT(dtd.debitCreationDate,'%h:%i %p') AS displayTransactionDateTime,
                                                    dtd.debitDate AS transactionDate,
                                                    dtd.debitCreationDate AS transactionDateTime
                                                FROM debit_transaction_data AS dtd
                                                LEFT JOIN bank_data AS bd ON bd.bankId = dtd.fromId
                                                LEFT JOIN expense_subcategory_data AS escd ON escd.subCategoryId = dtd.toId
                                                LEFT JOIN user_details ON user_details.userId = dtd.userId
                                                 WHERE dtd.fromId = '${bankId}'`;
                sql_queries_getdetails = `SELECT transactionId, enterBy, userName, fromId, toId, amount, transactionType, comment, displayTransactionDate, displayTransactionDateTime 
                                            FROM (
                                               ${commonQueryForCredit}
                                                UNION ALL
                                               ${commonQueryForDebit}
                                            ) AS combined_data
                                            ORDER BY transactionDate, transactionDateTime
                                            LIMIT ${limit}`;
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
                transactionDate: new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15),
                transactionStatus: req.body.transactionStatus
            }
            if (!data.fromId || !data.toId || !data.transactionAmount || !data.transactionDate) {
                return res.status(400).send("Please Fill All The Fields");
            } else {
                // Bank To Bank
                if (data.transactionStatus == true) {
                    sql_querry_addData = `-- ADD CREDIT DATA
                                                INSERT INTO credit_transaction_data (creditId, userId, transactionId, fromId, toId, creditAmount, creditComment, creditDate)
                                                VALUES ('${creditId}', '${userId}', '${transactionId}', '${data.fromId}', '${data.toId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'));
                                          -- ADD DEBIT DATA
                                                INSERT INTO debit_transaction_data(debitId, userId, transactionId, fromId, toId, debitAmount, debitComment, debitDate)
                                                VALUES ('${debitId}', '${userId}', '${transactionId}', '${data.fromId}', '${data.toId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'))`;
                } else {
                    sql_querry_addData = `-- ADD CREDIT DATA
                                                INSERT INTO credit_transaction_data (creditId, userId, transactionId, fromId, toId, creditAmount, creditComment, creditDate)
                                                VALUES ('${creditId}', '${userId}', '${transactionId}', '${data.fromId}', '${data.toId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'))`;
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
        res.status(500).json('Internal Server Error');
    }
}

// Remove Bank Transaction

const removeTransactionData = (req, res) => {
    try {
        const transactionId = req.query.transactionId.trim();
        if (!transactionId) {
            return res.status(404).send('transactionId Not Found');
        }
        const sql_querry_removedetails = `DELETE FROM credit_transaction_data WHERE transactionId = '${transactionId}';
                                          DELETE FROM debit_transaction_data WHERE transactionId = '${transactionId}'`;
        pool.query(sql_querry_removedetails, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send("Transaction Deleted Successfully");
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
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
                // Bank To Bank
                sql_querry_updateData = `-- UPDATE CREDIT DATA
                                            UPDATE
                                                credit_transaction_data
                                            SET
                                                userId = '${userId}',
                                                creditAmount = ${data.transactionAmount},
                                                creditComment = ${data.comment ? `'${data.comment}'` : null},
                                                creditDate = STR_TO_DATE('${data.transactionDate}','%b %d %Y')
                                            WHERE transactionId = '${transactionId}';
                                         -- UPDATE DEBIT DATA
                                            UPDATE
                                                debit_transaction_data
                                            SET
                                                userId = '${userId}',
                                                debitAmount = ${data.transactionAmount},
                                                debitComment = ${data.comment ? `'${data.comment}'` : null},
                                                debitDate = STR_TO_DATE('${data.transactionDate}','%b %d %Y')
                                            WHERE transactionId = '${transactionId}'`;
                pool.query(sql_querry_updateData, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Transaction Updated Successfully");
                })
            }
        } else {
            res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}


module.exports = {
    addTransactionData,
    removeTransactionData,
    updateBankTransaction,
    getBankTransactionById
}