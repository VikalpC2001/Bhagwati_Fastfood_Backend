const pool = require('../../database');
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Get Expense List

const getExpenseTransactionData = (req, res) => {
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
            moneySourceId: req.query.moneySourceId,
            categoryId: req.query.categoryId,
            subCategoryId: req.query.subCategoryId,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
        }
        if (req.query.startDate && req.query.endDate && req.query.categoryId && req.query.moneySourceId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId && req.query.moneySourceId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate && req.query.categoryId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (req.query.categoryId && req.query.moneySourceId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()`;
        } else if (req.query.subCategoryId && req.query.moneySourceId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()`;
        } else if (req.query.categoryId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()`;
        } else if (req.query.subCategoryId) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }

        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commonQueryForExpense = `SELECT
                                              expenseId,
                                              transactionId,
                                              user_details.userName AS enterBy,
                                              CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                              bank_data.bankName AS moneySource,
                                              expense_category_data.categoryName AS mainCategory,
                                              expense_subcategory_data.subCategoryName AS subCategory,
                                              expenseAmount,
                                              expenseComment,
                                              expenseDate AS dateExpense,
                                              DATE_FORMAT(expenseDate, '%a, %b %d, %Y') AS expenseDate,
                                              DATE_FORMAT(expenseCreationDate, '%h:%i %p') AS expenseTime
                                          FROM 
                                              expense_data
                                          LEFT JOIN bank_data ON bank_data.bankId = expense_data.moneySourceId
                                          LEFT JOIN user_details ON user_details.userId = expense_data.userId
                                          LEFT JOIN expense_category_data ON expense_category_data.categoryId = expense_data.categoryId
                                          LEFT JOIN expense_subcategory_data ON expense_subcategory_data.subCategoryId = expense_data.subcategoryId`;
                if (req.query.startDate && req.query.endDate && req.query.categoryId && req.query.moneySourceId) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC 
                                              limit ${limit}`;
                } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId && req.query.moneySourceId) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC 
                                              limit ${limit}`;
                } else if (req.query.startDate && req.query.endDate && req.query.categoryId) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC 
                                              limit ${limit}`;
                } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC 
                                              limit ${limit}`;
                } else if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC 
                                              limit ${limit}`;
                } else if (req.query.categoryId && req.query.moneySourceId) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC 
                                              limit ${limit}`;
                } else if (req.query.subCategoryId && req.query.moneySourceId) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC 
                                              limit ${limit}`;
                } else if (req.query.categoryId) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC
                                              limit ${limit}`;
                } else if (req.query.subCategoryId) {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC
                                              limit ${limit}`;
                } else {
                    sql_queries_getdetails = `${commonQueryForExpense}
                                              WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                              ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC
                                              limit ${limit}`;
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
};

// Fill Expense Data By Id

const fillExpenseDataById = (req, res) => {
    try {
        const transactionId = req.query.transactionId;
        sql_queries_getFillDetails = `SELECT moneySourceId AS toId, bank_data.bankName AS toName FROM expense_data
                                      LEFT JOIN bank_data ON bank_data.bankId = expense_data.moneySourceId
                                      WHERE transactionId = '${transactionId}';
                                      SELECT expense_data.categoryId AS categoryId, expense_category_data.categoryName AS categoryName FROM expense_data
                                      LEFT JOIN expense_category_data ON expense_category_data.categoryId = expense_data.categoryId
                                      WHERE transactionId = '${transactionId}';
                                      SELECT expense_data.subcategoryId AS subcategoryId, expense_subcategory_data.subCategoryName AS subCategoryName FROM expense_data
                                      LEFT JOIN expense_subcategory_data ON expense_subcategory_data.subCategoryId = expense_data.subcategoryId
                                      WHERE transactionId = '${transactionId}';
                                `;
        pool.query(sql_queries_getFillDetails, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const jsons = {
                "moneySource": data[0][0],
                "mainCategory": data[1][0],
                "subCategory": data[2][0],
            }
            return res.status(200).send(jsons);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
};

// Add Expense Data

const addExpenseData = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const expenseId = String("expense_" + uid1.getTime());
            const debitId = String("debit_" + (uid1.getTime() + 1));
            const transactionId = String("transaction_" + (uid1.getTime() + 2));
            const data = {
                moneySourceId: req.body.moneySourceId.trim(),
                categoryId: req.body.categoryId.trim(),
                subcategoryId: req.body.subcategoryId.trim(),
                transactionAmount: req.body.transactionAmount,
                comment: req.body.comment ? req.body.comment.trim() : null,
                transactionDate: new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15),
            }
            if (!data.moneySourceId || !data.categoryId || !data.subcategoryId || !data.transactionAmount || !data.transactionDate) {
                return res.status(400).send("Please Fill All The Fields");
            } else {
                const sql_querry_addData = `-- ADD EXPENSE DATA
                                                INSERT INTO expense_data (expenseId, userId, transactionId, moneySourceId, categoryId, subcategoryId, expenseAmount, expenseComment, expenseDate)
                                                VALUES ('${expenseId}', '${userId}', '${transactionId}', '${data.moneySourceId}', '${data.categoryId}','${data.subcategoryId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'));
                                            -- ADD DEBIT DATA
                                                INSERT INTO debit_transaction_data (debitId, userId, transactionId, fromId, toId, debitAmount, debitComment, debitDate)
                                                VALUES ('${debitId}', '${userId}', '${transactionId}', '${data.moneySourceId}', '${data.subcategoryId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'));
                                            -- UPDATE DEBIT AVAILBALE BALANCE
                                                UPDATE bank_data SET availableBalance = availableBalance - ${data.transactionAmount}  WHERE bankId = '${data.moneySourceId}'`;
                pool.query(sql_querry_addData, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Expense Added Successfully");
                })
            }
        } else {
            res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
};

// Remove Expense Data

const removeExpenseData = async (req, res) => {
    try {
        var transactionId = req.query.transactionId.trim();
        if (!transactionId) {
            return res.status(404).send('transactionId Not Found');
        }
        req.query.transactionId = pool.query(`SELECT transactionId FROM expense_data WHERE transactionId = '${transactionId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                sql_querry_getBankId = `SELECT fromId, debitAmount FROM debit_transaction_data WHERE transactionId = '${transactionId}'`;
                pool.query(sql_querry_getBankId, (err, result) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const debitBankId = result && result[0] && result[0].fromId ? result[0].fromId : null;
                    const debitAmt = result && result[0] && result[0].debitAmount ? result[0].debitAmount : 0;
                    const sql_querry_removedetails = `UPDATE bank_data SET availableBalance = availableBalance + ${debitAmt} WHERE bankId = '${debitBankId}';
                                                      DELETE FROM expense_data WHERE transactionId = '${transactionId}';
                                                      DELETE FROM debit_transaction_data WHERE transactionId = '${transactionId}';
                                                      DELETE FROM transactionId_with_date WHERE transactionId = '${transactionId}'`;
                    pool.query(sql_querry_removedetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Expense Deleted Successfully");
                    })
                })
            } else {
                return res.status(404).send('TransactionId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
};

// Update Expense Data

const updateExpenseData = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const transactionId = req.body.transactionId.trim();
            const data = {
                moneySourceId: req.body.moneySourceId.trim(),
                categoryId: req.body.categoryId.trim(),
                subcategoryId: req.body.subcategoryId.trim(),
                transactionAmount: req.body.transactionAmount,
                comment: req.body.comment ? req.body.comment.trim() : null,
                transactionDate: new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15),
            }
            console.log(data);
            if (!data.moneySourceId || !data.categoryId || !data.subcategoryId || !data.transactionAmount || !data.transactionDate) {
                return res.status(400).send("Please Fill All The Fields");
            } else {
                sql_querry_getOldAmt = `SELECT fromId, debitAmount FROM debit_transaction_data WHERE transactionId = '${transactionId}'`;
                pool.query(sql_querry_getOldAmt, (err, result) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const debitBankId = result && result[0] && result[0].fromId ? result[0].fromId : null;
                    const debitAmt = result && result[0] && result[0].debitAmount ? result[0].debitAmount : 0;
                    if (debitBankId != data.moneySourceId) {
                        sql_query_updateAvailableBalance = `UPDATE bank_data SET availableBalance = availableBalance + ${debitAmt} WHERE bankId = '${debitBankId}';
                                                            UPDATE bank_data SET availableBalance = availableBalance - ${data.transactionAmount} WHERE bankId = '${data.moneySourceId}'`;
                    } else {
                        sql_query_updateAvailableBalance = `UPDATE bank_data SET availableBalance = availableBalance - (${data.transactionAmount} - ${debitAmt}) WHERE bankId = '${data.moneySourceId}'`;
                    }
                    const sql_querry_addData = `-- UPDATE AVAILABLE BALANCE
                                                ${sql_query_updateAvailableBalance};
                                                -- UPDATE EXPENSE DATA
                                                    UPDATE
                                                        expense_data
                                                    SET
                                                        userId = '${userId}',
                                                        moneySourceId = '${data.moneySourceId}',
                                                        categoryId = '${data.categoryId}',
                                                        subcategoryId = '${data.subcategoryId}',
                                                        expenseAmount = ${data.transactionAmount},
                                                        expenseComment = ${data.comment ? `'${data.comment}'` : null},
                                                        expenseDate = STR_TO_DATE('${data.transactionDate}','%b %d %Y')
                                                    WHERE transactionId = '${transactionId}';
                                                -- UPDATE DEBIT DATA
                                                    UPDATE
                                                        debit_transaction_data
                                                    SET
                                                        userId = '${userId}',
                                                        fromId = '${data.moneySourceId}',
                                                        toId = '${data.subcategoryId}',
                                                        debitAmount = ${data.transactionAmount},
                                                        debitComment = ${data.comment ? `'${data.comment}'` : null},
                                                        debitDate = STR_TO_DATE('${data.transactionDate}','%b %d %Y')
                                                    WHERE transactionId = '${transactionId}';
                                                    UPDATE transactionId_with_date SET transactionValue = ${data.transactionAmount} WHERE transactionId = '${transactionId}'`;
                    pool.query(sql_querry_addData, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Expense Update Successfully");
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
};

// Export Excel Data For Expense

const exportExcelSheetForExpenseData = (req, res) => {

    function getCurrentDate() {
        const now = new Date();
        const hours = now.getHours();

        if (hours <= 4) { // If it's 4 AM or later, increment the date
            now.setDate(now.getDate() - 1);
        }
        return now.toDateString().slice(4, 15);
    }
    const currentDate = getCurrentDate();
    const currentDates = new Date();
    const FirestDate = currentDates.setMonth(currentDates.getMonth() - 1);
    console.log(FirestDate, currentDates);
    var firstDay = new Date().toString().slice(4, 15);
    var lastDay = new Date(FirestDate).toString().slice(4, 15);
    console.log(firstDay, lastDay);
    const data = {
        moneySourceId: req.query.moneySourceId,
        categoryId: req.query.categoryId,
        subCategoryId: req.query.subCategoryId,
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
    }
    const commonQueryForExpense = `SELECT
                                        expenseId,
                                        transactionId,
                                        user_details.userName AS enterBy,
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                        bank_data.bankName AS moneySource,
                                        expense_category_data.categoryName AS mainCategory,
                                        expense_subcategory_data.subCategoryName AS subCategory,
                                        expenseAmount,
                                        expenseComment,
                                        expenseDate AS dateExpense,
                                        DATE_FORMAT(expenseDate, '%a, %b %d, %Y') AS expenseDate,
                                        DATE_FORMAT(expenseCreationDate, '%h:%i %p') AS expenseTime
                                    FROM 
                                        expense_data
                                    LEFT JOIN bank_data ON bank_data.bankId = expense_data.moneySourceId
                                    LEFT JOIN user_details ON user_details.userId = expense_data.userId
                                    LEFT JOIN expense_category_data ON expense_category_data.categoryId = expense_data.categoryId
                                    LEFT JOIN expense_subcategory_data ON expense_subcategory_data.subCategoryId = expense_data.subcategoryId`;
    if (req.query.startDate && req.query.endDate && req.query.categoryId && req.query.moneySourceId) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC `;
    } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId && req.query.moneySourceId) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC `;
    } else if (req.query.startDate && req.query.endDate && req.query.categoryId) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
    } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
    } else if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
    } else if (req.query.categoryId && req.query.moneySourceId) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
    } else if (req.query.subCategoryId && req.query.moneySourceId) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
    } else if (req.query.categoryId) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
    } else if (req.query.subCategoryId) {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
    }
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Expense Data"); // New Worksheet

        if (req.query.startDate && req.query.endDate && req.query.categoryId && req.query.moneySourceId) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${data.startDate} To ${data.endDate} For ${rows[0].mainCategory} (${rows[0].moneySource})`;
        } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId && req.query.moneySourceId) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${data.startDate} To ${data.endDate} For ${rows[0].subCategory} (${rows[0].moneySource})`;
        } else if (req.query.startDate && req.query.endDate && req.query.categoryId) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${data.startDate} To ${data.endDate} For ${rows[0].mainCategory}`;
        } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${data.startDate} To ${data.endDate} For ${rows[0].subCategory}`;
        } else if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${data.startDate} To ${data.endDate}`;
        } else if (req.query.categoryId && req.query.moneySourceId) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${lastDay} To ${firstDay} For  ${rows[0].mainCategory} (${rows[0].moneySource})`;
        } else if (req.query.subCategoryId && req.query.moneySourceId) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${lastDay} To ${firstDay} For ${rows[0].subCategory} (${rows[0].moneySource})`;
        } else if (req.query.categoryId) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${lastDay} To ${firstDay} For ${rows[0].mainCategory}`;
        } else if (req.query.subCategoryId) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data From ${lastDay} To ${firstDay} For ${rows[0].subCategory}`;
        } else {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Expense Data For Date : - ${currentDate}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Money Source', 'Category', 'Sub-Category', 'Amount', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 30 },
            { key: "moneySource", width: 30 },
            { key: "mainCategory", width: 30 },
            { key: "subCategory", width: 30 },
            { key: "expenseAmount", width: 20 },
            { key: "expenseComment", width: 40 },
            { key: "expenseDate", width: 20 },
            { key: "expenseTime", width: 10 }
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
            '',
            '',
            '',
            { formula: `SUM(F3:F${arr.length + 2})` }
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
        console.log(';;;;;;', datas);
        console.log('?????', sumFooterArray);
        console.log('?????', tableHeading);
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
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
};

// Export PDF For Expense Data

const exportPdfForExpenseData = (req, res) => {
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
        const currentDates = new Date();
        const FirestDate = currentDates.setMonth(currentDates.getMonth() - 1);
        console.log(FirestDate, currentDates);
        var firstDay = new Date().toString().slice(4, 15);
        var lastDay = new Date(FirestDate).toString().slice(4, 15);
        const data = {
            moneySourceId: req.query.moneySourceId,
            categoryId: req.query.categoryId,
            subCategoryId: req.query.subCategoryId,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
        }
        const commonQueryForExpense = `SELECT
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Enter By",
                                        bank_data.bankName AS "Source",
                                        expense_category_data.categoryName AS "Category",
                                        expense_subcategory_data.subCategoryName AS "Sub Category",
                                        expenseAmount AS "Amount",
                                        expenseComment AS "Comment",
                                        DATE_FORMAT(expenseDate, '%a, %b %d, %Y') AS "Date",
                                        DATE_FORMAT(expenseCreationDate, '%h:%i %p') AS "Time"
                                    FROM 
                                        expense_data
                                    LEFT JOIN bank_data ON bank_data.bankId = expense_data.moneySourceId
                                    LEFT JOIN user_details ON user_details.userId = expense_data.userId
                                    LEFT JOIN expense_category_data ON expense_category_data.categoryId = expense_data.categoryId
                                    LEFT JOIN expense_subcategory_data ON expense_subcategory_data.subCategoryId = expense_data.subcategoryId`;
        if (req.query.startDate && req.query.endDate && req.query.categoryId && req.query.moneySourceId) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC `;
        } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId && req.query.moneySourceId) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC `;
        } else if (req.query.startDate && req.query.endDate && req.query.categoryId) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
        } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
        } else if (req.query.categoryId && req.query.moneySourceId) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
        } else if (req.query.subCategoryId && req.query.moneySourceId) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
        } else if (req.query.categoryId) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.categoryId = '${data.categoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
        } else if (req.query.subCategoryId) {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.subcategoryId = '${data.subCategoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE()
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${commonQueryForExpense}
                                    WHERE expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    ORDER BY expense_data.expenseDate DESC, expense_data.expenseCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumExpenseAmount = abc.reduce((total, item) => total + (item['Amount'] || 0), 0);
            const sumFooterArray = ['Total', '', '', '', '', sumExpenseAmount];
            console.log(rows[0].Category, rows[0].Source)
            if (req.query.startDate && req.query.endDate && req.query.categoryId && req.query.moneySourceId) {
                tableHeading = `Expense Data From ${data.startDate} To ${data.endDate} For ${rows[0].Category} (${rows[0].Source})`;
                console.log('1');
            } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId && req.query.moneySourceId) {
                tableHeading = `Expense Data From ${data.startDate} To ${data.endDate} For ${rows[0]['Sub Category']} (${rows[0].Source})`;
                console.log('2');
            } else if (req.query.startDate && req.query.endDate && req.query.categoryId) {
                tableHeading = `Expense Data From ${data.startDate} To ${data.endDate} For ${rows[0].Category}`;
                console.log('3');
            } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId) {
                tableHeading = `Expense Data From ${data.startDate} To ${data.endDate} For ${rows[0]['Sub Category']}`;
                console.log('4');
            } else if (req.query.startDate && req.query.endDate) {
                tableHeading = `Expense Data From ${data.startDate} To ${data.endDate}`;
                console.log('5');
            } else if (req.query.categoryId && req.query.moneySourceId) {
                tableHeading = `Expense Data From ${lastDay} To ${firstDay} For  ${rows[0].Category} (${rows[0].Source})`;
                console.log('6');
            } else if (req.query.subCategoryId && req.query.moneySourceId) {
                tableHeading = `Expense Data From ${lastDay} To ${firstDay} For ${rows[0]['Sub Category']} (${rows[0].Source})`;
                console.log('7');
            } else if (req.query.categoryId) {
                tableHeading = `Expense Data From ${lastDay} To ${firstDay} For ${rows[0].Category}`;
                console.log('8');
            } else if (req.query.subCategoryId) {
                tableHeading = `Expense Data From ${lastDay} To ${firstDay} For ${rows[0]['Sub Category']}`;
                console.log('9');
            } else {
                tableHeading = `Expense Data For Date : - ${currentDate}`;
                console.log('10');
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
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    addExpenseData,
    removeExpenseData,
    updateExpenseData,
    getExpenseTransactionData,
    fillExpenseDataById,
    exportExcelSheetForExpenseData,
    exportPdfForExpenseData

}