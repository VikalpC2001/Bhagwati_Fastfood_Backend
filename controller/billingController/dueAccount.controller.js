const pool = require('../../database');

// Get Due Customer Account

const getCustomerAccountList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_account_data`;
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_getDetails = `SELECT 
                                                accountId,
                                                customerName,
                                                customerNumber
                                              FROM 
                                                due_account_data
                                              LIMIT ${limit}`;
                pool.query(sql_query_getDetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
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
        res.status(500).json('Internal Server Error');
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
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else if (row && row.length) {
                        return res.status(400).send('Account is Already In Use');
                    } else {
                        const sql_querry_addCategory = `INSERT INTO due_account_data (accountId, customerName, customerNumber)  
                                                        VALUES ('${accountId}','${data.customerName}', '${data.customerNumber}')`;
                        pool.query(sql_querry_addCategory, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Account Added Successfully");
                        })
                    }
                })
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurd', error);
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
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM due_account_data WHERE accountId = '${accountId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
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
                    console.error("An error occurd in SQL Queery", err);
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
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Account Updated Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
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
            sql_querry_getDueCount = `SELECT COALESCE(ROUND(SUM(billAmount)),0) AS totalDueAmt FROM due_billAmount_data WHERE accountId = '${data.accountId}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y');
                                      SELECT COALESCE(ROUND(SUM(paidAmount)),0) AS totalPaidAmount FROM due_transaction_data WHERE accountId = '${data.accountId}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y');
                                      ${sql_querry_remainAmount}`;
        } else {
            sql_querry_getDueCount = `SELECT COALESCE(ROUND(SUM(billAmount)),0) AS totalDueAmt FROM due_billAmount_data WHERE accountId = '${data.accountId}' AND transactionDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y');
                                      SELECT COALESCE(ROUND(SUM(paidAmount)),0) AS totalPaidAmount FROM due_transaction_data WHERE accountId = '${data.accountId}' AND transactionDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y');
                                      ${sql_querry_remainAmount}`;
        }
        pool.query(sql_querry_getDueCount, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            else {
                const count = {
                    totalDue: data && data[0].length ? data[0][0].totalDueAmt : 0,
                    totalPaidAmount: data && data[1].length ? data[1][0].totalPaidAmount : 0,
                    balanceHeading: data && data[2].length ? data[2][0].remainingAmount > 0 ? "you will get" : data[2][0].remainingAmount < 0 ? "you will give" : "settled up" : 'No Data Found',
                    dueBalance: data && data[2].length ? Math.abs(data[2][0].remainingAmount) : 0,
                }
                return res.status(200).send(count);
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
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
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Due Amount Added Successfully");
                })
            }
        } else {
            return res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
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
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const remainingAmount = data[0].remainingAmount

                const sql_querry_addTransaction = `INSERT INTO due_transaction_data (transactionId, accountId, receivedBy, givenBy, pendingAmount, paidAmount, transactionNote, transactionDate)  
                                                   VALUES ('${transactionId}', '${accountId}', '${cashier}', ${givenBy ? `'${givenBy}'` : null}, ${remainingAmount}, ${paidAmount}, ${transactionNote ? `'${transactionNote}'` : null}, STR_TO_DATE('${transactionDate}','%b %d %Y'))`;
                pool.query(sql_querry_addTransaction, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Transaction Added Successfully");
                })
            })
        } else {
            return res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        return res.status(500).json('Internal Server Error');
    }
}

// Get Month Wise Transaction In Bank

const getMonthWiseTransaction = (req, res) => {
    try {
        const accountId = req.query.accountId;
        let page = req.query.page; // Page number
        let numPerPage = req.query.numPerPage; // Number of items per page
        if (!accountId || !page || !numPerPage) {
            return res.status(404).send('Not Found')
        }

        // Calculate the start and end indices for the current page
        let startIndex = (page - 1) * numPerPage;
        let endIndex = startIndex + numPerPage;
        let sql_query_getMonthWiseData = `SELECT
                                            COALESCE(ROUND(SUM(billAmount)),0) AS totalDueAmt,
                                            CONCAT(MONTHNAME(dueDate), '-', YEAR(dueDate)) AS date
                                          FROM
                                            due_billAmount_data
                                          WHERE
                                            accountId = '98989ihihj'
                                          GROUP BY YEAR(dueDate), MONTH(dueDate)
                                          ORDER BY YEAR(dueDate) ASC, MONTH(dueDate) ASC;
                                          SELECT COALESCE(ROUND(SUM(paidAmount)),0) AS totalPaidAmount FROM due_transaction_data WHERE accountId = '${accountId}'`;
        pool.query(sql_query_getMonthWiseData, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
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
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_billAmount_data WHERE accountId = '${data.accountId}' AND dueDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y')`;
        }
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_staticQuery = `SELECT dabId, enterBy, accountId, billId, billAmount, dueNote, dueDate FROM due_billAmount_data`;
                if (data.startDate && data.endDate) {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}' 
                                            AND dueDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')
                                            ORDER BY due_billAmount_data.dueDate DESC
                                            LIMIT ${limit}`;
                } else {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}' 
                                            AND dueDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y')
                                            ORDER BY due_billAmount_data.dueDate DESC
                                            LIMIT ${limit}`;
                }
                pool.query(sql_query_getDetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
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
            accountId: req.query.accountId
        }
        if (data.startDate && data.endDate) {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_transaction_data WHERE accountId = '${data.accountId}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')`;
        } else {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM due_transaction_data WHERE accountId = '${data.accountId}' AND transactionDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y')`;
        }
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_staticQuery = `SELECT transactionId, accountId, receivedBy, givenBy, pendingAmount, paidAmount, transactionNote, transactionDate FROM due_transaction_data`;
                if (data.startDate && data.endDate) {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}' 
                                            AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')
                                            ORDER BY transactionDate DESC
                                            LIMIT ${limit}`;
                } else {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE accountId = '${data.accountId}' 
                                            AND transactionDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y')
                                            ORDER BY transactionDate DESC
                                            LIMIT ${limit}`;
                }
                pool.query(sql_query_getDetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
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
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM due_billAmount_data WHERE dabId = '${dabId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Due Bill Deleted Successfully");
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
        console.error('An error occurd', error);
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
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM due_transaction_data WHERE transactionId = '${transactionId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Transaction Deleted Successfully");
                        })
                    } else {
                        return res.send('transactionId Not Found');
                    }
                })
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurd', error);
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
                        console.error("An error occurd in SQL Queery", err);
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
                                console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getCustomerAccountList,
    addCustomerAccount,
    removeCustomerAccount,
    updateCustomerAccount,
    getDueStaticsById,
    addDueBillData,
    addDebitDueTransactionData,
    getMonthWiseTransaction,
    getDueBillDataById,
    getDueDebitTransactionListById,
    removeDueBillDataById,
    removeDueDebitTransactionById,
    updateDueBillDataById
}