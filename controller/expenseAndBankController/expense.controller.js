const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Get Expense List
const getExpenseTransactionData = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_data`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                sql_queries_getdetails = `SELECT
                                              expenseId,
                                              transactionId,
                                              user_details.userName AS enterBy,
                                              CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                              bank_data.bankName AS moneySource,
                                              expense_category_data.categoryName AS mainCategory,
                                              expense_subcategory_data.subCategoryName AS subCategory,
                                              expenseAmount,
                                              expenseComment,
                                              DATE_FORMAT(expenseDate, '%a, %b %d, %Y') AS expenseDate,
                                              DATE_FORMAT(expenseCreationDate, '%h:%i %p') AS expenseTime
                                          FROM 
                                              expense_data
                                          LEFT JOIN bank_data ON bank_data.bankId = expense_data.moneySourceId
                                          LEFT JOIN user_details ON user_details.userId = expense_data.userId
                                          LEFT JOIN expense_category_data ON expense_category_data.categoryId = expense_data.categoryId
                                          LEFT JOIN expense_subcategory_data ON expense_subcategory_data.subCategoryId = expense_data.subcategoryId
                                          ORDER BY expense_data.expenseDate limit ${limit}`;
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
                                                VALUES ('${debitId}', '${userId}', '${transactionId}', '${data.moneySourceId}', '${data.subcategoryId}', ${data.transactionAmount}, ${data.comment ? `'${data.comment}'` : null}, STR_TO_DATE('${data.transactionDate}','%b %d %Y'))`;
                console.log('QQQ', sql_querry_addData);
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
        res.status(500).json('Internal Server Error');
    }
}

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
                const sql_querry_removedetails = `DELETE FROM expense_data WHERE transactionId = '${transactionId}';
                                                  DELETE FROM debit_transaction_data WHERE transactionId = '${transactionId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Expense Deleted Successfully");
                })
            } else {
                return res.send('TransactionId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

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
            if (!data.moneySourceId || !data.categoryId || !data.subcategoryId || !data.transactionAmount || !data.transactionDate) {
                return res.status(400).send("Please Fill All The Fields");
            } else {
                const sql_querry_addData = `-- UPDATE EXPENSE DATA
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
                                            WHERE transactionId = '${transactionId}'`;
                pool.query(sql_querry_addData, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Expense Update Successfully");
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
    addExpenseData,
    removeExpenseData,
    updateExpenseData,
    getExpenseTransactionData
}