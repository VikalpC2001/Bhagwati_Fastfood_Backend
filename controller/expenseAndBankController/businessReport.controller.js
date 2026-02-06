const pool = require('../../database');
const pool2 = require('../../databasePool');
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require('jspdf');
const { start } = require('repl');
require('jspdf-autotable');

// Get Date Function 4 Hour

function getCurrentDate() {
    const now = new Date();
    const hours = now.getHours();

    if (hours <= 4) { // If it's 4 AM or later, increment the date
        now.setDate(now.getDate() - 1);
    }
    return now.toDateString().slice(4, 15);
}

// Get Business Report Dashboard

const getBusinessReportDashBoard = (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessCategoryId, bcd.businessName, bcd.businessType, COALESCE(SUM(brd.businessAmount),0) AS businessAmt FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${process.env.STATIC_WALLETID}' AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId
                                        ORDER BY ecd.categoryName ASC;
                                     -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                     -- BALANCE COMMENT
                                            SELECT
                                                CASE
                                                    WHEN STR_TO_DATE('${data.startDate}','%b %d %Y') = STR_TO_DATE('${data.endDate}','%b %d %Y') 
                                                    THEN balanceComment
                                                    ELSE '' 
                                                END AS balanceComment 
                                            FROM 
                                                balance_data 
                                            WHERE 
                                                balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                     -- CLOSING BALANCE AMOUNT
                                            SELECT
                                                SUM(
                                                    (SELECT COALESCE(SUM(ctd.creditAmount), 0) 
                                                     FROM credit_transaction_data AS ctd 
                                                     WHERE ctd.toId = '${process.env.STATIC_WALLETID}' AND DATE(ctd.creditDate) <= date_list.Date) -
                                                    (SELECT COALESCE(SUM(dtd.debitAmount), 0) 
                                                     FROM debit_transaction_data AS dtd 
                                                     WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND DATE(dtd.debitDate) <= date_list.Date)
                                                ) AS closingBalance
                                            FROM (
                                                SELECT DATE(balanceDate) AS Date
                                                FROM balance_data 
                                                WHERE DATE(balanceDate) BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                GROUP BY balance_data.balanceDate
                                            ) AS date_list
                                            WHERE date_list.Date BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                    -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- Wallet To Other Bank Debit Transaction
                                            SELECT COALESCE(SUM(dtd.debitAmount),0) AS bankDebitAmt FROM debit_transaction_data AS dtd 
                                            WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.toId IN (SELECT COALESCE(bank_data.bankId,null) FROM bank_data WHERE NOT bank_data.bankId = '${process.env.STATIC_WALLETID}') 
                                            AND dtd.debitDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessCategoryId, bcd.businessName, bcd.businessType, COALESCE(SUM(brd.businessAmount),0) AS businessAmt FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${process.env.STATIC_WALLETID}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId
                                        ORDER BY ecd.categoryName ASC;
                                     -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y');
                                     -- BALANCE COMMENT
                                            SELECT balanceComment FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y');
                                     -- CLOSING BALANCE AMOUNT
                                            SELECT (
                                                (SELECT COALESCE(SUM(ctd.creditAmount), 0) FROM credit_transaction_data AS ctd WHERE ctd.toId = '${process.env.STATIC_WALLETID}' AND ctd.creditDate <= STR_TO_DATE('${currentDate}','%b %d %Y')) -
                                                (SELECT COALESCE(SUM(dtd.debitAmount), 0) FROM debit_transaction_data AS dtd WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.debitDate <= STR_TO_DATE('${currentDate}','%b %d %Y'))
                                            ) AS closingBalance;
                                     -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                     -- Wallet To Other Bank Debit Transaction
                                            SELECT COALESCE(SUM(dtd.debitAmount),0) AS bankDebitAmt FROM debit_transaction_data AS dtd
                                            WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.toId IN (SELECT COALESCE(bank_data.bankId,null) FROM bank_data WHERE NOT bank_data.bankId = '${process.env.STATIC_WALLETID}') 
                                            AND dtd.debitDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }
        pool.query(sql_querry_getDetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);

            const combinedData = {
                incomeSourceData: data[0],
                expenseData: data[1],
                openingBalanceAmt: data[2][0].openingBalanceAmt,
                openingBalanceComment: data && data[3][0] ? data[3][0].balanceComment : '',
                totalBusiness: cashAmtSum + debitAmtSum,
                totalCash: cashAmtSum - (onlineAmtSum + dueAmtSum),
                totalDebit: debitAmtSum,
                totalOnline: onlineAmtSum,
                closingBalance: data[4][0].closingBalance,
                mistakeCredit: data[5][0].mistakeCredit,
                isData: data && (data[2][0].openingBalanceAmt || data[2][0].openingBalanceAmt == 0) ? true : false,
            }
            combinedData.expenseData.push({
                categoryName: "Other Bank Transfer",
                expenseAmt: data[6][0].bankDebitAmt
            });
            return res.status(200).send(combinedData);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Business Report with Net Profit

const getBusinessReportDashBoardwithNetProfit = (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessCategoryId, bcd.businessName, bcd.businessType, COALESCE(SUM(brd.businessAmount),0) AS businessAmt FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId
                                        ORDER BY ecd.categoryName ASC;
                                    -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessCategoryId, bcd.businessName, bcd.businessType, COALESCE(SUM(brd.businessAmount),0) AS businessAmt FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId
                                        ORDER BY ecd.categoryName ASC;
                                    -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }
        pool.query(sql_querry_getDetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);
            const totalExpense = data[1].reduce((total, expense) => total + expense.expenseAmt, 0);
            const netProfit = cashAmtSum + debitAmtSum - totalExpense ? cashAmtSum + debitAmtSum - totalExpense : 0

            const combinedData = {
                incomeSourceData: data[0],
                expenseData: data[1],
                totalBusiness: cashAmtSum + debitAmtSum,
                totalCash: cashAmtSum - (onlineAmtSum + dueAmtSum),
                totalDebit: debitAmtSum,
                totalOnline: onlineAmtSum,
                mistakeCredit: data[2][0].mistakeCredit,
                totalExpense: totalExpense,
                NetProfit: netProfit,
                isData: data && (data[3][0].openingBalanceAmt || data[3][0].openingBalanceAmt == 0) ? true : false,
            }
            return res.status(200).send(combinedData);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add Business Report

const addBusinessReport = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return res.status(500).send('Database Error');
        }
        try {
            let token;
            token = req.headers && req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
            if (!token) {
                connection.release();
                return res.status(401).send("Please Login First.....!");
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const staticWalletId = process.env.STATIC_WALLETID;

            const uid1 = new Date();
            const balanceId = String('OpeningBalance_' + uid1.getTime());
            const businessReport = req.body.businessReport;

            const data = {
                openingBalanceAmt: req.body.openingBalanceAmt ? req.body.openingBalanceAmt : 0,
                openingBalanceComment: req.body.openingBalanceComment,
                closingBalance: req.body.closingBalance ? req.body.closingBalance : 0,
                reportDate: req.body.reportDate ? new Date(req.body.reportDate).toString().slice(4, 15) : null,
            };
            if (!businessReport || !data.reportDate) {
                connection.release();
                return res.status(400).send("Please Fill All The Fields");
            }

            connection.beginTransaction((err) => {
                if (err) {
                    console.error("Error beginning transaction:", err);
                    connection.release();
                    return res.status(500).send('Database Error');
                }

                // Validate: all firms with isSettlement=TRUE must be settled for today
                const sql_query_validateSettlement = `SELECT 
                                                         CASE 
                                                             WHEN COUNT(*) = 0 THEN TRUE
                                                             ELSE FALSE
                                                         END AS isValid
                                                     FROM billing_firm_data bfd
                                                     WHERE bfd.isSettlement = TRUE
                                                     AND NOT EXISTS (
                                                         SELECT 1 FROM billing_settlement_data bsd
                                                         WHERE bsd.firmId = bfd.firmId
                                                         AND bsd.settleDate = CURDATE()
                                                     )`;
                connection.query(sql_query_validateSettlement, (err, validateResult) => {
                    if (err) {
                        console.error("Error validating settlement:", err);
                        connection.rollback(() => {
                            connection.release();
                            return res.status(500).send('Database Error');
                        });
                    }
                    const isValid = validateResult && validateResult.length && validateResult[0].isValid;
                    if (!isValid) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(400).send("First settle firm");
                        });
                    }

                    // Check if business report already exists for this date
                    const sql_query_chkReportExist = `SELECT businessCategoryId FROM business_report_data WHERE businessDate = STR_TO_DATE('${data.reportDate}','%b %d %Y')`;
                    connection.query(sql_query_chkReportExist, (err, row) => {
                        if (err) {
                            console.error("An error occurred in SQL Query", err);
                            connection.rollback(() => {
                                connection.release();
                                return res.status(500).send('Database Error');
                            });
                        }
                        if (row && row.length) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(400).send(`Business is Already Added On Date ${data.reportDate}`);
                            });
                        }

                        const keys = Object.keys(businessReport);
                        let addBRdata = keys.map((item, index) => {
                            let uniqueId = `BRID_${Date.now() + index}`;
                            return `('${uniqueId}', '${item}', ${businessReport[item] ? businessReport[item] : 0} , STR_TO_DATE('${data.reportDate}','%b %d %Y'))`;
                        }).join(', ');

                        const sql_querry_addDetails = `INSERT INTO balance_data (balanceId, balanceAmount, balanceComment, balanceDate)
                                                       VALUES('${balanceId}', ${data.openingBalanceAmt}, ${data.openingBalanceComment ? `'${data.openingBalanceComment}'` : null}, STR_TO_DATE('${data.reportDate}','%b %d %Y'));
                                                       INSERT INTO business_report_data (brId, businessCategoryId, businessAmount, businessDate)
                                                       VALUES ${addBRdata}`;
                        connection.query(sql_querry_addDetails, (err, result) => {
                            if (err) {
                                console.error("An error occurred in SQL Query", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                                return;
                            }
                            // Get totalCash for reportDate (same transaction, same connection)
                            const sql_getIncomeForDate = `SELECT bcd.businessCategoryId, bcd.businessName, bcd.businessType, COALESCE(SUM(brd.businessAmount),0) AS businessAmt FROM business_category_data AS bcd
                                                          LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate = STR_TO_DATE('${data.reportDate}','%b %d %Y')
                                                          GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC`;
                            connection.query(sql_getIncomeForDate, (err, incomeRows) => {
                                if (err) {
                                    console.error("Error fetching income for totalCash", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                    return;
                                }
                                const cashAmtSum = (incomeRows || []).filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + (item.businessAmt || 0), 0);
                                const onlineAmtSum = (incomeRows || []).filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + (item.businessAmt || 0), 0);
                                const dueAmtSum = (incomeRows || []).filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + (item.businessAmt || 0), 0);
                                const totalCash = cashAmtSum - (onlineAmtSum + dueAmtSum);

                                const uid2 = new Date();
                                const creditId = String("credit_" + uid2.getTime());
                                const transactionId = String("transaction_" + (uid2.getTime() + 1));
                                const autoTransactionId = String("autoTransaction_" + (uid2.getTime() + 2));
                                const sql_addCredit = `INSERT INTO credit_transaction_data (creditId, userId, transactionId, fromId, toId, creditAmount, creditComment, creditDate)
                                                       VALUES ('${creditId}', '${userId}', '${transactionId}', '9978961515', '${staticWalletId}', ${totalCash}, 'Auto Credit By Business Report', STR_TO_DATE('${data.reportDate}','%b %d %Y'));
                                                       UPDATE bank_data SET availableBalance = availableBalance + ${totalCash} WHERE bankId = '${staticWalletId}';
                                                       INSERT INTO business_autoTrasactionId_data(autoTransactionId, transactionId, transactionAmount, autoTransactionDate)
                                                       VALUES ('${autoTransactionId}', '${transactionId}', ${totalCash}, STR_TO_DATE('${data.reportDate}','%b %d %Y'))`;
                                connection.query(sql_addCredit, (errCredit) => {
                                    if (errCredit) {
                                        console.error("Error adding cash credit", errCredit);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                        return;
                                    }
                                    connection.commit((err) => {
                                        if (err) {
                                            console.error("Error committing transaction:", err);
                                            connection.rollback(() => {
                                                connection.release();
                                                return res.status(500).send('Database Error');
                                            });
                                            return;
                                        }
                                        connection.release();
                                        return res.status(200).send("Business Report Added Successfully");
                                    });
                                });
                            });
                        });
                    });
                });
            });
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            });
        }
    });
}

// Remove Business Report

const removeBusinessReport = (req, res) => {
    try {
        var brDate = req.query.brDate ? new Date(req.query.brDate).toString().slice(4, 15) : null;
        if (!brDate) {
            return res.status(404).send('Date Not Found');
        }
        req.query.brDate = pool.query(`SELECT businessDate FROM business_report_data WHERE businessDate =  STR_TO_DATE('${brDate}','%b %d %Y')`, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM business_report_data WHERE businessDate = STR_TO_DATE('${brDate}','%b %d %Y');
                                                  DELETE FROM balance_data WHERE balanceDate =  STR_TO_DATE('${brDate}','%b %d %Y')`;

                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Business Report Deleted Successfully");
                });
            } else {
                return res.status(404).send('Business Report Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Business Report

const updateBusinessReport = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return res.status(500).send('Database Error');
        }
        try {
            let token;
            token = req.headers && req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
            if (!token) {
                connection.release();
                return res.status(401).send("Please Login First.....!");
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const staticWalletId = process.env.STATIC_WALLETID;
            const uid1 = new Date();
            const businessReport = req.body.businessReport;

            const datas = {
                openingBalanceAmt: req.body.openingBalanceAmt ? req.body.openingBalanceAmt : 0,
                openingBalanceComment: req.body.openingBalanceComment,
                closingBalance: req.body.closingBalance ? req.body.closingBalance : 0,
                reportDate: req.body.reportDate ? new Date(req.body.reportDate).toString().slice(4, 15) : null,
            };
            if (!businessReport || !datas.reportDate) {
                connection.release();
                return res.status(400).send("Please Fill All The Fields");
            }

            connection.beginTransaction((err) => {
                if (err) {
                    console.error("Error beginning transaction:", err);
                    connection.release();
                    return res.status(500).send('Database Error');
                }

                const keys = Object.keys(businessReport);
                function generateBrUpdateQuery(data) {
                    let query = 'UPDATE business_report_data\nSET businessAmount = CASE\n';

                    data.forEach((item) => {
                        query += `    WHEN businessCategoryId = '${item}' THEN ${businessReport && businessReport[item] ? businessReport[item] : 0}\n`;
                    });
                    query += '    ELSE businessAmount\nEND\n';

                    const businessCategoryIds = keys.map((item) => `'${item}'`).join(', ');
                    query += `WHERE businessCategoryId IN (${businessCategoryIds}) AND businessDate = STR_TO_DATE('${datas.reportDate}','%b %d %Y')`;

                    return query;
                }
                const sql_queries_updateData = `${generateBrUpdateQuery(keys)};
                                                UPDATE
                                                    balance_data
                                                SET
                                                    balanceAmount = '${datas && datas.openingBalanceAmt ? datas.openingBalanceAmt : 0}',
                                                    balanceComment = ${datas.openingBalanceComment ? `'${datas.openingBalanceComment}'` : null}
                                                WHERE balanceDate = STR_TO_DATE('${datas.reportDate}','%b %d %Y')`;

                connection.query(sql_queries_updateData, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Query", err);
                        connection.rollback(() => {
                            connection.release();
                            return res.status(500).send('Database Error');
                        });
                        return;
                    }
                    // Get totalCash for reportDate (same transaction, same connection)
                    const sql_getIncomeForDate = `SELECT bcd.businessCategoryId, bcd.businessName, bcd.businessType, COALESCE(SUM(brd.businessAmount),0) AS businessAmt FROM business_category_data AS bcd
                                                  LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate = STR_TO_DATE('${datas.reportDate}','%b %d %Y')
                                                  GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC`;
                    connection.query(sql_getIncomeForDate, (err, incomeRows) => {
                        if (err) {
                            console.error("Error fetching income for totalCash", err);
                            connection.rollback(() => {
                                connection.release();
                                return res.status(500).send('Database Error');
                            });
                            return;
                        }
                        const cashAmtSum = (incomeRows || []).filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + (item.businessAmt || 0), 0);
                        const onlineAmtSum = (incomeRows || []).filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + (item.businessAmt || 0), 0);
                        const dueAmtSum = (incomeRows || []).filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + (item.businessAmt || 0), 0);
                        const totalCash = cashAmtSum - (onlineAmtSum + dueAmtSum);

                        const sql_getAutoTransaction = `SELECT transactionId, transactionAmount, autoTransactionDate FROM business_autoTrasactionId_data WHERE autoTransactionDate = STR_TO_DATE('${datas.reportDate}','%b %d %Y')`;
                        connection.query(sql_getAutoTransaction, (err, autoTxnRows) => {
                            if (err) {
                                console.error("Error fetching auto transaction", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                                return;
                            }
                            const hasExisting = autoTxnRows && autoTxnRows.length && autoTxnRows[0];
                            const existingTransactionId = hasExisting ? autoTxnRows[0].transactionId : null;
                            const oldAmount = hasExisting && autoTxnRows[0].transactionAmount != null ? autoTxnRows[0].transactionAmount : 0;

                            const creditAmt = totalCash - oldAmount;
                            const sql_updateCredit = `UPDATE bank_data SET availableBalance = availableBalance + ${creditAmt} WHERE bankId = '${staticWalletId}';
                                                      UPDATE credit_transaction_data SET userId = '${userId}', creditAmount = ${totalCash}, creditComment = 'Auto Credit & Update By Business Report', creditDate = STR_TO_DATE('${datas.reportDate}','%b %d %Y') WHERE transactionId = '${existingTransactionId}';
                                                      UPDATE business_autoTrasactionId_data SET transactionAmount = ${totalCash} WHERE transactionId = '${existingTransactionId}'`;
                            connection.query(sql_updateCredit, (errUpdate) => {
                                if (errUpdate) {
                                    console.error("Error updating cash credit", errUpdate);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                    return;
                                }
                                connection.commit((err) => {
                                    if (err) {
                                        console.error("Error committing transaction:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                        return;
                                    }
                                    connection.release();
                                    return res.status(200).send("Business Report Updated Successfully");
                                });
                            });
                            return;
                        });
                    });
                });
            });
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            });
        }
    });
}

// Get Expense & Closing Balance By Date

const getExpenseAndClosingBalanceByDate = (req, res) => {
    try {
        const brDate = req.query.brDate ? new Date(req.query.brDate).toString().slice(4, 15) : null;
        if (!brDate) {
            return res.status(404).send('Date Not Found');
        }
        console.log(brDate);
        sql_querry_chkDetails = `SELECT businessDate FROM business_report_data WHERE businessDate = STR_TO_DATE('${brDate}','%b %d %Y')`;
        req.query.brDate = pool.query(sql_querry_chkDetails, (err, row) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                return res.status(400).send(`Business Is Already Added For ${brDate}`);
            } else {
                const sql_querry_getDetails = `SELECT
                                                   ecd.categoryName,
                                                   COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                               FROM
                                                   expense_category_data AS ecd
                                               LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${process.env.STATIC_WALLETID}' AND ed.expenseDate =STR_TO_DATE('${brDate}','%b %d %Y')
                                               GROUP BY ecd.categoryId;
                                               SELECT (
                                                   (SELECT COALESCE(SUM(ctd.creditAmount), 0) FROM credit_transaction_data AS ctd WHERE ctd.toId = '${process.env.STATIC_WALLETID}' AND ctd.creditDate <= STR_TO_DATE('${brDate}','%b %d %Y')) -
                                                   (SELECT COALESCE(SUM(dtd.debitAmount), 0) FROM debit_transaction_data AS dtd WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.debitDate <= STR_TO_DATE('${brDate}','%b %d %Y'))
                                               ) AS closingBalance;`;
                pool.query(sql_querry_getDetails, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const expenseData = data[0];
                    const closingBalance = data[1][0].closingBalance;
                    return res.status(200).send({ expenseData, closingBalance });
                })
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export Excel For Business Report

const exportExcelForBusinessReport = async (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessCategoryId, bcd.businessName, bcd.businessType, COALESCE(SUM(brd.businessAmount),0) AS businessAmt FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${process.env.STATIC_WALLETID}' AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId;
                                     -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                     -- BALANCE COMMENT
                                            SELECT
                                                CASE
                                                    WHEN STR_TO_DATE('${data.startDate}','%b %d %Y') = STR_TO_DATE('${data.endDate}','%b %d %Y') 
                                                    THEN balanceComment
                                                    ELSE '' 
                                                END AS balanceComment 
                                            FROM 
                                                balance_data 
                                            WHERE 
                                                balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                     -- CLOSING BALANCE AMOUNT
                                            SELECT
                                                SUM(
                                                    (SELECT COALESCE(SUM(ctd.creditAmount), 0) 
                                                     FROM credit_transaction_data AS ctd 
                                                     WHERE ctd.toId = '${process.env.STATIC_WALLETID}' AND DATE(ctd.creditDate) <= date_list.Date) -
                                                    (SELECT COALESCE(SUM(dtd.debitAmount), 0) 
                                                     FROM debit_transaction_data AS dtd 
                                                     WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND DATE(dtd.debitDate) <= date_list.Date)
                                                ) AS closingBalance
                                            FROM (
                                                SELECT DATE(balanceDate) AS Date
                                                FROM balance_data 
                                                WHERE DATE(balanceDate) BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            ) AS date_list
                                            WHERE date_list.Date BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                    -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- Wallet To Other Bank Debit Transaction
                                            SELECT COALESCE(SUM(dtd.debitAmount),0) AS bankDebitAmt FROM debit_transaction_data AS dtd
                                            WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.toId IN (SELECT COALESCE(bank_data.bankId,null) FROM bank_data WHERE NOT bank_data.bankId = '${process.env.STATIC_WALLETID}') 
                                            AND dtd.debitDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessCategoryId, bcd.businessName, bcd.businessType, COALESCE(SUM(brd.businessAmount),0) AS businessAmt FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${process.env.STATIC_WALLETID}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId;
                                     -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y');
                                     -- BALANCE COMMENT
                                            SELECT balanceComment FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y');
                                     -- CLOSING BALANCE AMOUNT
                                            SELECT (
                                                (SELECT COALESCE(SUM(ctd.creditAmount), 0) FROM credit_transaction_data AS ctd WHERE ctd.toId = '${process.env.STATIC_WALLETID}' AND ctd.creditDate <= STR_TO_DATE('${currentDate}','%b %d %Y')) -
                                                (SELECT COALESCE(SUM(dtd.debitAmount), 0) FROM debit_transaction_data AS dtd WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.debitDate <= STR_TO_DATE('${currentDate}','%b %d %Y'))
                                            ) AS closingBalance;
                                     -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- Wallet To Other Bank Debit Transaction
                                            SELECT COALESCE(SUM(dtd.debitAmount),0) AS bankDebitAmt FROM debit_transaction_data AS dtd
                                            WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.toId IN (SELECT COALESCE(bank_data.bankId,null) FROM bank_data WHERE NOT bank_data.bankId = '${process.env.STATIC_WALLETID}') 
                                            AND dtd.debitDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }
        pool.query(sql_querry_getDetails, async (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);

            const combinedData = {
                incomeSourceData: data[0],
                expenseData: data[1],
                openingBalanceAmt: data[2][0].openingBalanceAmt,
                openingBalanceComment: data && data[3][0] ? data[3][0].balanceComment : '',
                totalBusiness: cashAmtSum + debitAmtSum,
                totalCash: cashAmtSum - (onlineAmtSum + dueAmtSum),
                totalDebit: debitAmtSum,
                totalOnline: onlineAmtSum,
                closingBalance: data[4][0].closingBalance,
                mistakeCredit: data[5][0].mistakeCredit,
                isData: data && (data[2][0].openingBalanceAmt || data[2][0].openingBalanceAmt == 0) ? true : false,
            }
            combinedData.expenseData.push({
                categoryName: "Other Bank Transfer",
                expenseAmt: data[6][0].bankDebitAmt
            });
            // return res.status(200).send(combinedData);
            const workbook = new excelJS.Workbook();  // Create a new workbook
            const worksheet = workbook.addWorksheet("Business Report"); // New Worksheet

            // Add a merged cell for the header
            worksheet.mergeCells('A1:C1');
            const headerCell = worksheet.getCell('A1');
            headerCell.value = `Business Report : ${req.query.startDate ? `From ${req.query.startDate.slice(4, 15)} To ${req.query.endDate.slice(4, 15)}` : currentDate}`;
            headerCell.height = 30;
            headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
            headerCell.font = { bold: true, size: 16 };

            worksheet.addRow([]);

            // Add headers for income source data
            worksheet.addRow(['Business Name', 'Business Amount', 'Business Type']);
            worksheet.getRow(3).font = { bold: true };

            // Add income source data
            combinedData.incomeSourceData.forEach(source => {
                worksheet.addRow([
                    source.businessName,
                    source.businessAmt,
                    source.businessType,
                ]);
            });
            worksheet.addRow(['Mistake Credit', combinedData.mistakeCredit]);

            // Merge header cells for expense data (across columns A to C)
            worksheet.mergeCells('A' + (combinedData.incomeSourceData.length + 6) + ':B' + (combinedData.incomeSourceData.length + 6));
            const headerCell2 = worksheet.getCell('A' + (combinedData.incomeSourceData.length + 6));
            headerCell2.value = 'Expense Data';
            headerCell2.height = 30;
            headerCell2.alignment = { vertical: 'middle', horizontal: 'center' };
            headerCell2.font = { bold: true, size: 16 };

            worksheet.addRow([]);

            // Add headers for expense data
            worksheet.addRow(['Category Name', 'Expense Amount']);

            // Bold the header row
            worksheet.getRow(combinedData.incomeSourceData.length + 8).font = { bold: true };

            // Add expense data
            combinedData.expenseData.forEach(expense => {
                worksheet.addRow([
                    expense.categoryName,
                    expense.expenseAmt
                ]);
            });
            worksheet.addRows([]);
            // Merge header cells for expense data (across columns A to C)
            worksheet.mergeCells('A' + (combinedData.incomeSourceData.length + combinedData.expenseData.length + 10) + ':B' + (combinedData.incomeSourceData.length + combinedData.expenseData.length + 10));
            const headerCell3 = worksheet.getCell('A' + (combinedData.incomeSourceData.length + combinedData.expenseData.length + 10));
            headerCell3.value = 'Statistics Data';
            headerCell3.height = 30;
            headerCell3.alignment = { vertical: 'middle', horizontal: 'center' };
            headerCell3.font = { bold: true, size: 16 };

            worksheet.addRow([]);

            // Add metadata to the Excel file
            worksheet.addRow(['Opening Balance Amount', combinedData.openingBalanceAmt]);
            worksheet.addRow(['Opening Balance Comment', combinedData.openingBalanceComment]);
            worksheet.addRow(['Total Business', combinedData.totalBusiness]);
            worksheet.addRow(['Total Cash', combinedData.totalCash]);
            worksheet.addRow(['Total Debit', combinedData.totalDebit]);
            worksheet.addRow(['Total Online', combinedData.totalOnline]);
            worksheet.addRow(['Closing Balance', combinedData.closingBalance]);

            // Set column widths for expense data
            worksheet.getColumn(1).width = 30;
            worksheet.getColumn(2).width = 30;
            worksheet.getColumn(3).width = 30;

            // Set row height for expense data
            worksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
                row.height = 20; // Set the row height as needed
            });
            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    row.height = 20
                });
            });
            try {
                const data = await workbook.xlsx.writeBuffer()
                var fileName = new Date().toString().slice(4, 15) + ".xlsx";
                res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                res.type = 'blob';
                res.send(data)
            } catch (err) {
                throw new Error(err);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
};

// Export PDF Function

async function createPDF(res, data, heading) {
    try {
        // Create a new PDF document
        const doc = new jsPDF();

        // Add a title to the PDF
        doc.setFontSize(18);
        doc.text(`Business Report : ${heading}`, 14, 20);

        // Convert income data to table format
        const incomeColumns = ['Business Name', 'Business Amount', 'Business Type',];
        const incomeRows = data.incomeSourceData.map(item => Object.values(item));

        // Convert expense data to table format
        const expenseColumns = ['Category Name', 'Expense Amount'];
        const expenseRows = data.expenseData.map(item => Object.values(item));

        // Convert Statics data to table format
        const staticsColumns = ['Category Name', 'Amount'];
        const staticsRows = data.statistics.map(item => Object.values(item));

        // Set position for income table
        let startY = 30;

        // Add income table to the PDF
        doc.setFontSize(12);
        doc.text('Income Sources', 14, startY);
        doc.autoTable({
            startY: startY + 10,
            head: [incomeColumns],
            body: incomeRows,
            styles: {
                cellPadding: 2, // Add padding to cells for better appearance
                halign: 'center', // Horizontally center-align content
                fontSize: 10,
                lineColor: [0, 0, 0], // Border color
                lineWidth: 0.1, // Border width
            },
        });

        // Set position for expense table
        startY = doc.autoTable.previous.finalY + 10;

        // Add expense table to the PDF
        doc.text('Expenses', 14, startY);
        doc.autoTable({
            startY: startY + 10,
            head: [expenseColumns],
            body: expenseRows,
            styles: {
                cellPadding: 2, // Add padding to cells for better appearance
                halign: 'center', // Horizontally center-align content
                fontSize: 10,
                lineColor: [0, 0, 0], // Border color
                lineWidth: 0.1, // Border width
            },
        });

        // Adding financial details at the end
        startY = doc.autoTable.previous.finalY + 20;

        // Add expense table to the PDF
        doc.text('Statics', 14, startY);
        doc.autoTable({
            startY: startY + 10,
            head: [staticsColumns],
            body: staticsRows,
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
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Export PDF For Business Report

const exportPdfForBusinessReport = (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessName, COALESCE(SUM(brd.businessAmount),0) AS businessAmt, bcd.businessType FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${process.env.STATIC_WALLETID}' AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId;
                                     -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                     -- BALANCE COMMENT
                                            SELECT
                                                CASE
                                                    WHEN STR_TO_DATE('${data.startDate}','%b %d %Y') = STR_TO_DATE('${data.endDate}','%b %d %Y') 
                                                    THEN balanceComment
                                                    ELSE '' 
                                                END AS balanceComment 
                                            FROM 
                                                balance_data 
                                            WHERE 
                                                balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                     -- CLOSING BALANCE AMOUNT
                                            SELECT
                                                SUM(
                                                    (SELECT COALESCE(SUM(ctd.creditAmount), 0) 
                                                     FROM credit_transaction_data AS ctd 
                                                     WHERE ctd.toId = '${process.env.STATIC_WALLETID}' AND DATE(ctd.creditDate) <= date_list.Date) -
                                                    (SELECT COALESCE(SUM(dtd.debitAmount), 0) 
                                                     FROM debit_transaction_data AS dtd 
                                                     WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND DATE(dtd.debitDate) <= date_list.Date)
                                                ) AS closingBalance
                                            FROM (
                                                SELECT DATE(balanceDate) AS Date
                                                FROM balance_data 
                                                WHERE DATE(balanceDate) BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            ) AS date_list
                                            WHERE date_list.Date BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                    -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- Wallet To Other Bank Debit Transaction
                                            SELECT COALESCE(SUM(dtd.debitAmount),0) AS bankDebitAmt FROM debit_transaction_data AS dtd
                                            WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.toId IN (SELECT COALESCE(bank_data.bankId,null) FROM bank_data WHERE NOT bank_data.bankId = '${process.env.STATIC_WALLETID}') 
                                            AND dtd.debitDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessName, COALESCE(SUM(brd.businessAmount),0) AS businessAmt, bcd.businessType FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.moneySourceId = '${process.env.STATIC_WALLETID}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId;
                                     -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y');
                                     -- BALANCE COMMENT
                                            SELECT balanceComment FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y');
                                     -- CLOSING BALANCE AMOUNT
                                            SELECT (
                                                (SELECT COALESCE(SUM(ctd.creditAmount), 0) FROM credit_transaction_data AS ctd WHERE ctd.toId = '${process.env.STATIC_WALLETID}' AND ctd.creditDate <= STR_TO_DATE('${currentDate}','%b %d %Y')) -
                                                (SELECT COALESCE(SUM(dtd.debitAmount), 0) FROM debit_transaction_data AS dtd WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.debitDate <= STR_TO_DATE('${currentDate}','%b %d %Y'))
                                            ) AS closingBalance;
                                     -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                     -- Wallet To Other Bank Debit Transaction
                                            SELECT COALESCE(SUM(dtd.debitAmount),0) AS bankDebitAmt FROM debit_transaction_data AS dtd
                                            WHERE dtd.fromId = '${process.env.STATIC_WALLETID}' AND dtd.toId IN (SELECT COALESCE(bank_data.bankId,null) FROM bank_data WHERE NOT bank_data.bankId = '${process.env.STATIC_WALLETID}') 
                                            AND dtd.debitDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }
        pool.query(sql_querry_getDetails, async (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);

            const combinedData = {
                incomeSourceData: data[0],
                expenseData: data[1],
                statistics: [
                    {
                        key: 'Opening Balance Amount',
                        value: data && data[2][0] && data[2][0].openingBalanceAmt ? data[2][0].openingBalanceAmt : 0
                    },
                    {
                        key: 'Opening Balance Comment',
                        value: data && data[3][0] ? data[3][0].balanceComment : ''
                    },
                    {
                        key: 'Total Business',
                        value: cashAmtSum + debitAmtSum
                    },
                    {
                        key: 'Total Cash',
                        value: cashAmtSum - (onlineAmtSum + dueAmtSum),
                    },
                    {
                        key: 'Total Debit',
                        value: debitAmtSum
                    },
                    {
                        key: 'Total Online',
                        value: onlineAmtSum,
                    },
                    {
                        key: 'Mistake Credit',
                        value: data[5][0].mistakeCredit,
                    },
                    {
                        key: 'Closing Balance',
                        value: data && data[4][0] && data[4][0].closingBalance ? data[4][0].closingBalance : 0,
                    },
                ]
            }
            combinedData.expenseData.push({
                categoryName: "Other Bank Transfer",
                expenseAmt: data[6][0].bankDebitAmt
            });
            const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
            const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
            if (req.query.startDate && req.query.endDate) {
                dateHeading = `From ${(startDate).trim()} To ${(endDate).trim()}`;
            } else {
                dateHeading = currentDate;
            }
            createPDF(res, combinedData, dateHeading)
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

// Export PDF For Business Report NET Profit

const exportPdfForBusinessReportNet = (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessName, COALESCE(SUM(brd.businessAmount),0) AS businessAmt, bcd.businessType FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId;
                                    -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessName, COALESCE(SUM(brd.businessAmount),0) AS businessAmt, bcd.businessType FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId;
                                     -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }
        pool.query(sql_querry_getDetails, async (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);
            const totalExpense = data[1].reduce((total, expense) => total + expense.expenseAmt, 0);

            const combinedData = {
                incomeSourceData: data[0],
                expenseData: data[1],
                statistics: [
                    {
                        key: 'Total Cash',
                        value: cashAmtSum - (onlineAmtSum + dueAmtSum),
                    },
                    {
                        key: 'Total Debit',
                        value: debitAmtSum
                    },
                    {
                        key: 'Total Online',
                        value: onlineAmtSum,
                    },
                    {
                        key: 'Mistake Credit',
                        value: data[2][0].mistakeCredit,
                    },
                    {
                        key: 'Total Business',
                        value: cashAmtSum + debitAmtSum
                    },
                    {
                        key: 'Total Expense',
                        value: totalExpense
                    },
                    {
                        key: 'Net Profit',
                        value: cashAmtSum + debitAmtSum - totalExpense ? cashAmtSum + debitAmtSum - totalExpense : 0,
                    },
                ]
            }
            const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
            const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
            if (req.query.startDate && req.query.endDate) {
                dateHeading = `From ${(startDate).trim()} To ${(endDate).trim()}`;
            } else {
                dateHeading = currentDate;
            }
            createPDF(res, combinedData, dateHeading)
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

// Export Excel For Business Report

const exportExcelForBusinessReportNet = async (req, res) => {
    try {
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (req.query.startDate && req.query.endDate) {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessName, COALESCE(SUM(brd.businessAmount),0) AS businessAmt, bcd.businessType FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId;
                                    -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else {
            sql_querry_getDetails = `-- INCOME SOURCE DATA
                                        SELECT bcd.businessName, COALESCE(SUM(brd.businessAmount),0) AS businessAmt, bcd.businessType FROM business_category_data AS bcd
                                        LEFT JOIN business_report_data AS brd ON brd.businessCategoryId = bcd.businessCategoryId AND brd.businessDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY bcd.businessCategoryId ORDER BY bcd.businessName ASC;
                                    -- EXPENSE DATA
                                        SELECT
                                            ecd.categoryName,
                                            COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                        FROM
                                            expense_category_data AS ecd
                                        LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                        GROUP BY ecd.categoryId;
                                     -- MISTAKE CREDIT DATE
                                            SELECT COALESCE(SUM(ctd.creditAmount),0) AS mistakeCredit FROM incomeSource_data AS isd
                                            LEFT JOIN credit_transaction_data AS ctd ON ctd.fromId = isd.sourceId AND ctd.creditDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                            WHERE isd.sourceId = '${process.env.STATIC_MISTAKE_CREDITID}'
                                            GROUP by isd.sourceId;
                                    -- BALANCE AMOUNT
                                            SELECT SUM(balanceAmount) AS openingBalanceAmt FROM balance_data WHERE balanceDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }
        pool.query(sql_querry_getDetails, async (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);
            const totalExpense = data[1].reduce((total, expense) => total + expense.expenseAmt, 0);

            const combinedData = {
                incomeSourceData: data[0],
                expenseData: data[1],
                totalBusiness: cashAmtSum + debitAmtSum,
                totalCash: cashAmtSum - (onlineAmtSum + dueAmtSum),
                totalDebit: debitAmtSum,
                totalOnline: onlineAmtSum,
                mistakeCredit: data[2][0].mistakeCredit,
                totalExpense: totalExpense,
                netProfit: cashAmtSum + debitAmtSum - totalExpense ? cashAmtSum + debitAmtSum - totalExpense : 0,
            }

            // return res.status(200).send(combinedData);
            const workbook = new excelJS.Workbook();  // Create a new workbook
            const worksheet = workbook.addWorksheet("Business Report"); // New Worksheet

            // Add a merged cell for the header
            worksheet.mergeCells('A1:C1');
            const headerCell = worksheet.getCell('A1');
            headerCell.value = `Business Report : ${req.query.startDate ? `From ${req.query.startDate.slice(4, 15)} To ${req.query.endDate.slice(4, 15)}` : currentDate}`;
            headerCell.height = 30;
            headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
            headerCell.font = { bold: true, size: 16 };

            worksheet.addRow([]);

            // Add headers for income source data
            worksheet.addRow(['Business Name', 'Business Amount', 'Business Type']);
            worksheet.getRow(3).font = { bold: true };

            // Add income source data
            combinedData.incomeSourceData.forEach(source => {
                worksheet.addRow([
                    source.businessName,
                    source.businessAmt,
                    source.businessType,
                ]);
            });
            worksheet.addRow(['Mistake Credit', combinedData.mistakeCredit]);

            // Merge header cells for expense data (across columns A to C)
            worksheet.mergeCells('A' + (combinedData.incomeSourceData.length + 6) + ':B' + (combinedData.incomeSourceData.length + 6));
            const headerCell2 = worksheet.getCell('A' + (combinedData.incomeSourceData.length + 6));
            headerCell2.value = 'Expense Data';
            headerCell2.height = 30;
            headerCell2.alignment = { vertical: 'middle', horizontal: 'center' };
            headerCell2.font = { bold: true, size: 16 };

            worksheet.addRow([]);

            // Add headers for expense data
            worksheet.addRow(['Category Name', 'Expense Amount']);

            // Bold the header row
            worksheet.getRow(combinedData.incomeSourceData.length + 8).font = { bold: true };

            // Add expense data
            combinedData.expenseData.forEach(expense => {
                worksheet.addRow([
                    expense.categoryName,
                    expense.expenseAmt
                ]);
            });
            worksheet.addRows([]);
            // Merge header cells for expense data (across columns A to C)
            worksheet.mergeCells('A' + (combinedData.incomeSourceData.length + combinedData.expenseData.length + 10) + ':B' + (combinedData.incomeSourceData.length + combinedData.expenseData.length + 10));
            const headerCell3 = worksheet.getCell('A' + (combinedData.incomeSourceData.length + combinedData.expenseData.length + 10));
            headerCell3.value = 'Statistics Data';
            headerCell3.height = 30;
            headerCell3.alignment = { vertical: 'middle', horizontal: 'center' };
            headerCell3.font = { bold: true, size: 16 };

            worksheet.addRow([]);

            // Add metadata to the Excel file

            worksheet.addRow(['Total Cash', combinedData.totalCash]);
            worksheet.addRow(['Total Debit', combinedData.totalDebit]);
            worksheet.addRow(['Total Online', combinedData.totalOnline]);
            worksheet.addRow(['Total Business', combinedData.totalBusiness]);
            worksheet.addRow(['Total Expense', combinedData.totalExpense]);
            worksheet.addRow(['Net Profit', combinedData.netProfit]);

            // Set column widths for expense data
            worksheet.getColumn(1).width = 30;
            worksheet.getColumn(2).width = 30;
            worksheet.getColumn(3).width = 30;

            // Set row height for expense data
            worksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
                row.height = 20; // Set the row height as needed
            });
            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    row.height = 20
                });
            });
            try {
                const data = await workbook.xlsx.writeBuffer()
                var fileName = new Date().toString().slice(4, 15) + ".xlsx";
                res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                res.type = 'blob';
                res.send(data)
            } catch (err) {
                throw new Error(err);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
};

// Fill Business Category Textbox Loop Data

const fillBusinessCategory = (req, res) => {
    try {
        const currentDate = getCurrentDate();
        let sql_queries_getStatics = `SELECT
                                         COALESCE(SUM(CASE WHEN billPayType IN ('cash', 'due', 'online') AND billType = 'Pick Up' THEN settledAmount ELSE 0 END), 0) AS "Take Away",
                                         COALESCE(SUM(CASE WHEN billPayType IN ('cash', 'due', 'online') AND billType = 'Delivery' THEN settledAmount ELSE 0 END), 0) AS "Home Delivery",
                                         COALESCE(SUM(CASE WHEN billPayType IN ('cash', 'due', 'online') AND billType = 'Dine In' AND billStatus IN ('print','complete') THEN settledAmount ELSE 0 END), 0) AS "Restaurent",
                                         COALESCE(SUM(CASE WHEN billPayType IN ('cash','online') AND billStatus != 'cancel' AND billType = 'Hotel' THEN settledAmount ELSE 0 END), 0) AS "Hotel Cash",
                                         COALESCE(SUM(CASE WHEN billPayType = 'debit' AND billStatus != 'cancel' AND billType = 'Hotel' THEN settledAmount ELSE 0 END), 0) AS "Hotel Debit",
                                         COALESCE(SUM(CASE WHEN billPayType = 'online' AND billStatus != 'cancel' AND billType IN ('Pick UP','Delivery','Dine In','Hotel') THEN settledAmount ELSE 0 END), 0) AS "G pay",
                                         COALESCE(SUM(CASE WHEN billPayType = 'due' AND billStatus != 'cancel' AND billType IN ('Pick UP','Delivery','Dine In') THEN settledAmount ELSE 0 END), 0) AS "Parcel Due"
                                     FROM billing_data
                                     WHERE billDate = STR_TO_DATE('${currentDate}', '%b %d %Y');
                                     SELECT businessCategoryId, businessName, businessType FROM business_category_data 
                                     Order BY businessName`;
        pool.query(sql_queries_getStatics, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const fillData = data[0];
                const businessCategoryData = data[1];

                // Get the first object from fillData array (contains all the amounts)
                const fillDataObj = fillData && fillData.length ? fillData[0] : {};

                // Map through businessCategoryData and add amount from fillData
                const businessCategoryWithAmount = businessCategoryData.map(category => {
                    const businessName = category.businessName;
                    // Find matching key in fillDataObj (case-insensitive match)
                    const amt = fillDataObj[businessName] !== undefined
                        ? fillDataObj[businessName]
                        : (fillDataObj[Object.keys(fillDataObj).find(key =>
                            key.toLowerCase() === businessName.toLowerCase()
                        )] || 0);

                    return {
                        ...category,
                        fillAmount: amt
                    };
                });

                return res.status(200).send(businessCategoryWithAmount);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    addBusinessReport,
    updateBusinessReport,
    removeBusinessReport,
    getExpenseAndClosingBalanceByDate,
    getBusinessReportDashBoard,
    exportExcelForBusinessReport,
    exportPdfForBusinessReport,
    getBusinessReportDashBoardwithNetProfit,
    exportPdfForBusinessReportNet,
    exportExcelForBusinessReportNet,
    fillBusinessCategory
}