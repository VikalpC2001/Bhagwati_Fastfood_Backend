const pool = require('../../database');

// Get Bank Dash Board Data

const getBankDashboardData = (req, res) => {
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

// Get Bank List

const getBankList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM bank_data`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);


                sql_queries_getdetails = `SELECT bankId, bankName, bankShortForm, bankAccountNumber, ifscCode, bankDisplayName, bankIconName FROM bank_data 
                                          Order BY bankName limit ${limit}`;
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

const addBankData = (req, res) => {
    try {
        const uid1 = new Date();
        const bankId = String('bank_' + uid1.getTime());
        const data = {
            bankName: req.body.bankName.trim(),
            bankDisplayName: req.body.bankDisplayName.trim(),
            bankIconName: req.body.bankIconName.trim(),
            bankShortForm: req.body.bankShortForm ? req.body.bankShortForm.trim() : null,
            bankAccountNumber: req.body.bankAccountNumber ? req.body.bankAccountNumber.trim() : null,
            ifscCode: req.body.ifscCode ? req.body.ifscCode.trim() : null,
        }
        if (!data.bankName || !data.bankDisplayName || !data.bankIconName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.bankDisplayName = pool.query(`SELECT bankDisplayName FROM bank_data WHERE bankDisplayName = '${data.bankDisplayName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Bank is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO bank_data(bankId, bankName, bankDisplayName, bankShortForm, bankIconName, bankAccountNumber, ifscCode, availableBalance)
                                                   VALUES('${bankId}', '${data.bankName}', '${data.bankDisplayName}', ${data.bankShortForm ? `'${data.bankShortForm}'` : null}, '${data.bankIconName}', ${data.bankAccountNumber ? `'${data.bankAccountNumber}'` : null}, ${data.ifscCode ? `'${data.ifscCode}'` : null}, 0)`;
                    pool.query(sql_querry_addDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Bank Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Bank Data

const removeBankData = async (req, res) => {
    try {
        var bankId = req.query.bankId.trim();
        if (!bankId) {
            return res.status(404).send('bankId Not Found');
        }
        req.query.bankId = pool.query(`SELECT bankId FROM bank_data WHERE bankId = '${bankId}'`, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM bank_data WHERE bankId = '${bankId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Bank Deleted Successfully");
                })
            } else {
                return res.status(404).send('bankId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Main Category Data

const updateBankData = (req, res) => {
    try {
        const bankId = req.body.bankId;
        const data = {
            bankName: req.body.bankName.trim(),
            bankDisplayName: req.body.bankDisplayName.trim(),
            bankIconName: req.body.bankIconName.trim(),
            bankShortForm: req.body.bankShortForm.trim(),
            bankAccountNumber: req.body.bankAccountNumber ? req.body.bankAccountNumber.trim() : null,
            ifscCode: req.body.ifscCode ? req.body.ifscCode.trim() : null
        }
        if (!data.bankName || !data.bankDisplayName || !data.bankIconName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            pool.query(`SELECT bankDisplayName FROM bank_data WHERE bankId NOT IN ('${bankId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const bankNameList = rowarr.map(e => e.bankDisplayName ? e.bankDisplayName.toLowerCase() : '')
                if (bankNameList.includes(data.bankDisplayName.toLowerCase())) {
                    return res.status(400).send('Bank is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                        bank_data
                                                      SET
                                                        bankName = '${data.bankName}',
                                                        bankDisplayName = '${data.bankDisplayName}',
                                                        bankIconName = '${data.bankIconName}',
                                                        bankShortForm = '${data.bankShortForm}',
                                                        bankAccountNumber = ${data.bankAccountNumber ? `'${data.bankAccountNumber}'` : null},
                                                        ifscCode = ${data.ifscCode ? `'${data.ifscCode}'` : null}
                                                      WHERE
                                                        bankId = '${bankId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Bank Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Display Bank Details

const getBankDetailsById = (req, res) => {
    try {
        const bankId = req.query.bankId;
        sql_quey_getBankDetails = `SELECT bankName, bankDisplayName, bankShortForm, bankAccountNumber, ifscCode FROM bank_data
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

// Dropdown List For Bank

const ddlToData = (req, res) => {
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

// Get Statics By ID

const getBankStaticsById = (req, res) => {
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

// Get Expense Amount By Main CategoryId

const getDebitAmtForCategory = (req, res) => {
    try {
        const bankId = req.query.bankId;
        if (!bankId) {
            return res.status(404).send('bankId Not Found');
        }
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getAllCategoryStatics = `SELECT
                                                     ecd.categoryId,
                                                     ecd.categoryName,
                                                     ecd.categoryIconName,
                                                     COALESCE(SUM(dtd.debitAmount), 0) AS expAmt
                                                 FROM
                                                     expense_category_data AS ecd
                                                 LEFT JOIN
                                                     expense_subcategory_data AS esd ON esd.categoryId = ecd.categoryId
                                                 LEFT JOIN
                                                     debit_transaction_data AS dtd ON dtd.toId = COALESCE(esd.subCategoryId, NULL) AND dtd.fromId = '${bankId}' AND dtd.debitDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                 GROUP BY
                                                     ecd.categoryId, ecd.categoryName`;
        } else {
            sql_queries_getAllCategoryStatics = `SELECT
                                                     ecd.categoryId,
                                                     ecd.categoryName,
                                                     ecd.categoryIconName,
                                                     COALESCE(SUM(dtd.debitAmount), 0) AS expAmt
                                                 FROM
                                                     expense_category_data AS ecd
                                                 LEFT JOIN
                                                     expense_subcategory_data AS esd ON esd.categoryId = ecd.categoryId
                                                 LEFT JOIN
                                                     debit_transaction_data AS dtd ON dtd.toId = COALESCE(esd.subCategoryId, NULL) AND dtd.fromId = '${bankId}' AND dtd.debitDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND dtd.debitDate <= CURDATE()
                                                 GROUP BY
                                                     ecd.categoryId, ecd.categoryName`;
        }
        pool.query(sql_queries_getAllCategoryStatics, (err, data) => {
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
    addBankData,
    updateBankData,
    removeBankData,
    ddlToData,
    getBankList,
    getBankDetailsById,
    getBankDashboardData,
    getDebitAmtForCategory,
    getBankStaticsById
}