const pool = require('../../database');
const jwt = require("jsonwebtoken");

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
    updateExpenseData
}