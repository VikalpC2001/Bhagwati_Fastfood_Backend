const pool = require('../../database');
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require('jspdf');
const { start } = require('repl');
require('jspdf-autotable');

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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);
            console.log(cashAmtSum, debitAmtSum, onlineAmtSum, dueAmtSum);
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
        console.error('An error occurd', error);
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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);
            const totalExpense = data[1].reduce((total, expense) => total + expense.expenseAmt, 0);
            const netProfit = cashAmtSum + debitAmtSum - totalExpense ? cashAmtSum + debitAmtSum - totalExpense : 0

            console.log(cashAmtSum, debitAmtSum, onlineAmtSum, dueAmtSum);
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
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add Business Report

const addBusinessReport = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const staticWalletId = process.env.STATIC_WALLETID;
            const staticCreditMistaketId = process.env.STATIC_MISTAKE_CREDITID;
            const staticDebitMistakeId = process.env.STATIC_MISTAKE_DEBITID;
            const staticMistakeCategoryId = process.env.STATIC_MISTAKE_CATEGORYID;
            const uid1 = new Date();
            const balanceId = String('OpeningBalance_' + uid1.getTime());
            const businessReport = req.body.businessReport;
            const creditId = String("credit_" + uid1.getTime());
            const debitId = String("debit_" + (uid1.getTime() + 1));
            const transactionId = String("transaction_" + (uid1.getTime() + 2));
            const expenseId = String("expense_" + (uid1.getTime() + 3));
            const data = {
                openingBalanceAmt: req.body.openingBalanceAmt ? req.body.openingBalanceAmt : 0,
                openingBalanceComment: req.body.openingBalanceComment,
                closingBalance: req.body.closingBalance ? req.body.closingBalance : 0,
                reportDate: req.body.reportDate ? new Date(req.body.reportDate).toString().slice(4, 15) : null,
            }
            console.log(businessReport, data.openingBalanceAmt, data.closingBalance, data.reportDate);
            if (!businessReport || !data.reportDate) {
                return res.status(400).send("Please Fill All The Fields");

            } else {
                const keys = Object.keys(businessReport);
                let addBRdata = keys.map((item, index) => {
                    let uniqueId = `BRID_${Date.now() + index}`; // Generating a unique ID using current timestamp
                    return `('${uniqueId}', '${item}', ${businessReport[item] ? businessReport[item] : 0} , STR_TO_DATE('${data.reportDate}','%b %d %Y'))`;
                }).join(', ');
                console.log(addBRdata);
                businessReport[keys[1]] = pool.query(`SELECT businessCategoryId FROM business_report_data WHERE businessDate = STR_TO_DATE('${data.reportDate}','%b %d %Y')`, function (err, row) {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        return res.status(400).send(`Business is Already Added On Date ${data.reportDate}`);
                    } else {
                        const sql_querry_addDetails = `INSERT INTO balance_data (balanceId, balanceAmount, balanceComment, balanceDate)
                                                       VALUES('${balanceId}', ${data.openingBalanceAmt}, ${data.openingBalanceComment ? `'${data.openingBalanceComment}'` : null}, STR_TO_DATE('${data.reportDate}','%b %d %Y'));
                                                       INSERT INTO business_report_data (brId, businessCategoryId, businessAmount, businessDate)
                                                       VALUES ${addBRdata}`;
                        pool.query(sql_querry_addDetails, (err, result) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            sql_querry_getWalletAvailableBalance = `SELECT bd.availableBalance + COALESCE(SUM(dtd.debitAmount),0) - COALESCE(SUM(ctd.creditAmount),0) AS availableBalance FROM bank_data AS bd
                                                                    LEFT JOIN credit_transaction_data AS ctd ON ctd.toId = bd.bankId AND ctd.creditDate > CURDATE()
                                                                    LEFT JOIN debit_transaction_data AS dtd ON dtd.fromId = bd.bankId AND dtd.debitDate > CURDATE()
                                                                    WHERE bd.bankId = '${staticWalletId}'
                                                                    GROUP BY bd.bankId;`;
                            pool.query(sql_querry_getWalletAvailableBalance, (err, raw) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                const availableBalance = raw[0].availableBalance;
                                console.log('ddddd', availableBalance);
                                if (availableBalance < data.closingBalance) {
                                    sql_query_addMistakeData = `-- ADD CREDIT DATA
                                                                    INSERT INTO credit_transaction_data (creditId, userId, transactionId, fromId, toId, creditAmount, creditComment, creditDate)
                                                                    VALUES ('${creditId}', '${userId}', '${transactionId}', '${staticCreditMistaketId}', '${staticWalletId}', ABS(${availableBalance - data.closingBalance}), 'Mistake Credit', STR_TO_DATE('${data.reportDate}','%b %d %Y'));
                                                                -- UPDATE DEBIT AVAILBALE BALANCE
                                                                    UPDATE bank_data SET availableBalance = availableBalance + ABS(${availableBalance - data.closingBalance}) WHERE bankId = '${staticWalletId}';
                                                                -- ADD TRANSACTION DATA DATE WISE 
                                                                    INSERT INTO transactionId_with_date (transactionId, transactionType, transactionValue, transactionDate)
                                                                    VALUES('${transactionId}', 'CREDIT', ABS(${availableBalance - data.closingBalance}), STR_TO_DATE('${data.reportDate}','%b %d %Y'))`;
                                } else if (availableBalance > data.closingBalance) {
                                    sql_query_addMistakeData = `-- ADD EXPENSE DATA
                                                                    INSERT INTO expense_data (expenseId, userId, transactionId, moneySourceId, categoryId, subcategoryId, expenseAmount, expenseComment, expenseDate)
                                                                    VALUES ('${expenseId}', '${userId}', '${transactionId}', '${staticWalletId}', '${staticMistakeCategoryId}','${staticDebitMistakeId}', ABS(${availableBalance - data.closingBalance}), 'Mistake Expense', STR_TO_DATE('${data.reportDate}','%b %d %Y'));
                                                                -- ADD DEBIT DATA
                                                                    INSERT INTO debit_transaction_data (debitId, userId, transactionId, fromId, toId, debitAmount, debitComment, debitDate)
                                                                    VALUES ('${debitId}', '${userId}', '${transactionId}', '${staticWalletId}', '${staticDebitMistakeId}', ABS(${availableBalance - data.closingBalance}), 'Mistake Debit', STR_TO_DATE('${data.reportDate}','%b %d %Y'));
                                                                -- UPDATE AVAILBALE BALANCE
                                                                    UPDATE bank_data SET availableBalance = availableBalance - ABS(${availableBalance - data.closingBalance}) WHERE bankId = '${staticWalletId}';
                                                                -- ADD TRANSACTION DATA DATE WISE
                                                                    INSERT INTO transactionId_with_date (transactionId, transactionType, transactionValue, transactionDate)
                                                                    VALUES('${transactionId}', 'DEBIT', ABS(${availableBalance - data.closingBalance}), STR_TO_DATE('${data.reportDate}','%b %d %Y'))`;
                                } else {
                                    console.log('no Change');
                                    return res.status(200).send("Business Report Added Successfully");
                                }
                                pool.query(sql_query_addMistakeData, (err, mistakeResult) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    console.log('Change');
                                    return res.status(200).send("Business Report Added Successfully");
                                })
                            })
                        })
                    }
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

// Remove Business Report

const removeBusinessReport = (req, res) => {
    try {
        var brDate = req.query.brDate ? new Date(req.query.brDate).toString().slice(4, 15) : null;
        if (!brDate) {
            return res.status(404).send('Date Not Found');
        }
        req.query.brDate = pool.query(`SELECT businessDate FROM business_report_data WHERE businessDate =  STR_TO_DATE('${brDate}','%b %d %Y')`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_getTransactionType = `SELECT transactionId, transactionType, transactionValue FROM transactionId_with_date WHERE transactionDate = STR_TO_DATE('${brDate}','%b %d %Y')`;
                pool.query(sql_querry_getTransactionType, (err, result) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const transactionId = result && result[0] ? result[0].transactionId : null;
                    const transactionType = result && result[0] ? result[0].transactionType : null;
                    const transactionValue = result && result[0] ? result[0].transactionValue : 0;
                    if (transactionType == 'CREDIT') {
                        sql_querry_removedetails = `UPDATE bank_data SET availableBalance = availableBalance - ${transactionValue} WHERE bankId = '${process.env.STATIC_WALLETID}';
                                                    DELETE FROM credit_transaction_data WHERE transactionId = '${transactionId}';
                                                    DELETE FROM business_report_data WHERE businessDate = STR_TO_DATE('${brDate}','%b %d %Y');
                                                    DELETE FROM balance_data WHERE balanceDate =  STR_TO_DATE('${brDate}','%b %d %Y');
                                                    DELETE FROM transactionId_with_date WHERE transactionId = '${transactionId}'`;
                    } else if (transactionType == 'DEBIT') {
                        sql_querry_removedetails = `UPDATE bank_data SET availableBalance = availableBalance + ${transactionValue} WHERE bankId = '${process.env.STATIC_WALLETID}';
                                                    DELETE FROM expense_data WHERE transactionId = '${transactionId}';
                                                    DELETE FROM debit_transaction_data WHERE transactionId = '${transactionId}';
                                                    DELETE FROM business_report_data WHERE businessDate = STR_TO_DATE('${brDate}','%b %d %Y');
                                                    DELETE FROM balance_data WHERE balanceDate =  STR_TO_DATE('${brDate}','%b %d %Y');
                                                    DELETE FROM transactionId_with_date WHERE transactionId = '${transactionId}'`;
                    } else {
                        sql_querry_removedetails = `DELETE FROM business_report_data WHERE businessDate = STR_TO_DATE('${brDate}','%b %d %Y');
                                                    DELETE FROM balance_data WHERE balanceDate =  STR_TO_DATE('${brDate}','%b %d %Y')`;
                    }
                    pool.query(sql_querry_removedetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Business Report Deleted Successfully");
                    })
                })
            } else {
                return res.status(404).send('Business Report Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Business Report

const updateBusinessReport = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const staticWalletId = process.env.STATIC_WALLETID;
            const staticCreditMistaketId = process.env.STATIC_MISTAKE_CREDITID;
            const staticDebitMistakeId = process.env.STATIC_MISTAKE_DEBITID;
            const staticMistakeCategoryId = process.env.STATIC_MISTAKE_CATEGORYID;
            const uid1 = new Date();
            const businessReport = req.body.businessReport;
            const creditId = String("credit_" + uid1.getTime());
            const debitId = String("debit_" + (uid1.getTime() + 1));
            const transactionIds = String("transaction_" + (uid1.getTime() + 2));
            const expenseId = String("expense_" + (uid1.getTime() + 3));
            const datas = {
                openingBalanceAmt: req.body.openingBalanceAmt ? req.body.openingBalanceAmt : 0,
                openingBalanceComment: req.body.openingBalanceComment,
                closingBalance: req.body.closingBalance ? req.body.closingBalance : 0,
                reportDate: req.body.reportDate ? new Date(req.body.reportDate).toString().slice(4, 15) : null,
            }
            console.log(businessReport, datas.openingBalanceAmt, datas.closingBalance, datas.reportDate);
            if (!businessReport || !datas.reportDate) {
                return res.status(400).send("Please Fill All The Fields");
            } else {
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
                console.log(sql_queries_updateData);
                pool.query(sql_queries_updateData, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    sql_queries_getMistakeData = `SELECT transactionId, transactionType, transactionValue FROM transactionId_with_date WHERE transactionDate = STR_TO_DATE('${datas.reportDate}','%b %d %Y')`;
                    pool.query(sql_queries_getMistakeData, (err, mistake) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const transactionId = mistake && mistake[0] ? mistake[0].transactionId : null;
                        const transactionType = mistake && mistake[0] ? mistake[0].transactionType : null;
                        const transactionValue = mistake && mistake[0] ? mistake[0].transactionValue : 0;
                        if (transactionType == 'CREDIT') {
                            sql_querry_removedetails = `UPDATE bank_data SET availableBalance = availableBalance - ${transactionValue} WHERE bankId = '${process.env.STATIC_WALLETID}';
                                                        DELETE FROM credit_transaction_data WHERE transactionId = '${transactionId}';
                                                        DELETE FROM transactionId_with_date WHERE transactionId = '${transactionId}'`;
                            console.log('DELETE CREDIT');
                        } else if (transactionType == 'DEBIT') {
                            sql_querry_removedetails = `UPDATE bank_data SET availableBalance = availableBalance + ${transactionValue} WHERE bankId = '${process.env.STATIC_WALLETID}';
                                                        DELETE FROM expense_data WHERE transactionId = '${transactionId}';
                                                        DELETE FROM debit_transaction_data WHERE transactionId = '${transactionId}';
                                                        DELETE FROM transactionId_with_date WHERE transactionId = '${transactionId}'`;
                            console.log('DELETE DEBIT');
                        } else {
                            sql_querry_removedetails = `SELECT * FROM bank_data`;
                            console.log('NOTHING');
                        }
                        pool.query(sql_querry_removedetails, (err, deleteMistake) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }

                            sql_querry_getWalletAvailableBalance = `SELECT bd.availableBalance + COALESCE(SUM(dtd.debitAmount),0) - COALESCE(SUM(ctd.creditAmount),0) AS availableBalance FROM bank_data AS bd
                                                                    LEFT JOIN credit_transaction_data AS ctd ON ctd.toId = bd.bankId AND ctd.creditDate > STR_TO_DATE('${datas.reportDate}','%b %d %Y')
                                                                    LEFT JOIN debit_transaction_data AS dtd ON dtd.fromId = bd.bankId AND dtd.debitDate > STR_TO_DATE('${datas.reportDate}','%b %d %Y')
                                                                    WHERE bd.bankId = '${staticWalletId}'
                                                                    GROUP BY bd.bankId;`;
                            pool.query(sql_querry_getWalletAvailableBalance, (err, raw) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                const availableBalance = raw[0].availableBalance;
                                console.log('ddddd', availableBalance, 'Closing Balance', datas.closingBalance, datas.reportDate);
                                if (availableBalance < datas.closingBalance) {
                                    sql_query_addMistakeData = `-- ADD CREDIT DATA
                                                                    INSERT INTO credit_transaction_data (creditId, userId, transactionId, fromId, toId, creditAmount, creditComment, creditDate)
                                                                    VALUES ('${creditId}', '${userId}', '${transactionIds}', '${staticCreditMistaketId}', '${staticWalletId}', ABS(${availableBalance - datas.closingBalance}), 'Mistake Credit', STR_TO_DATE('${datas.reportDate}','%b %d %Y'));
                                                                -- UPDATE DEBIT AVAILBALE BALANCE
                                                                    UPDATE bank_data SET availableBalance = availableBalance + ABS(${availableBalance - datas.closingBalance}) WHERE bankId = '${staticWalletId}';
                                                                -- ADD TRANSACTION DATA DATE WISE 
                                                                    INSERT INTO transactionId_with_date (transactionId, transactionType, transactionValue, transactionDate)
                                                                    VALUES('${transactionIds}', 'CREDIT', ABS(${availableBalance - datas.closingBalance}), STR_TO_DATE('${datas.reportDate}','%b %d %Y'))`;
                                    console.log('ADD CREDIT');
                                } else if (availableBalance > datas.closingBalance) {
                                    sql_query_addMistakeData = `-- ADD EXPENSE DATA
                                                                    INSERT INTO expense_data (expenseId, userId, transactionId, moneySourceId, categoryId, subcategoryId, expenseAmount, expenseComment, expenseDate)
                                                                    VALUES ('${expenseId}', '${userId}', '${transactionIds}', '${staticWalletId}', '${staticMistakeCategoryId}','${staticDebitMistakeId}', ABS(${availableBalance - datas.closingBalance}), 'Mistake Expense', STR_TO_DATE('${datas.reportDate}','%b %d %Y'));
                                                                -- ADD DEBIT DATA
                                                                    INSERT INTO debit_transaction_data (debitId, userId, transactionId, fromId, toId, debitAmount, debitComment, debitDate)
                                                                    VALUES ('${debitId}', '${userId}', '${transactionIds}', '${staticWalletId}', '${staticDebitMistakeId}', ABS(${availableBalance - datas.closingBalance}), 'Mistake Debit', STR_TO_DATE('${datas.reportDate}','%b %d %Y'));
                                                                -- UPDATE AVAILBALE BALANCE
                                                                    UPDATE bank_data SET availableBalance = availableBalance - ABS(${availableBalance - datas.closingBalance}) WHERE bankId = '${staticWalletId}';
                                                                -- ADD TRANSACTION DATA DATE WISE
                                                                    INSERT INTO transactionId_with_date (transactionId, transactionType, transactionValue, transactionDate)
                                                                    VALUES('${transactionIds}', 'DEBIT', ABS(${availableBalance - datas.closingBalance}), STR_TO_DATE('${datas.reportDate}','%b %d %Y'))`;
                                    console.log('ADD DEBIT');
                                } else {
                                    console.log('no Change');
                                    return res.status(200).send("Business Report Updated Successfully");
                                }
                                pool.query(sql_query_addMistakeData, (err, mistakeResult) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    console.log('Change');
                                    return res.status(200).send("Business Report Updated Successfully");
                                })
                            })
                        })
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
                console.error("An error occurd in SQL Queery", err);
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
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const expenseData = data[0];
                    const closingBalance = data[1][0].closingBalance;
                    return res.status(200).send({ expenseData, closingBalance });
                })
            }
        });
    } catch (error) {
        console.error('An error occurd', error);
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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);
            console.log(cashAmtSum, debitAmtSum, onlineAmtSum);
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
                console.log(">>>", fileName);
                res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                res.type = 'blob';
                res.send(data)
            } catch (err) {
                throw new Error(err);
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
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
        console.error('An error occurd', error);
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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const cashAmtSum = data[0].filter(item => item.businessType === 'CASH').reduce((sum, item) => sum + item.businessAmt, 0);
            const debitAmtSum = data[0].filter(item => item.businessType === 'DEBIT').reduce((sum, item) => sum + item.businessAmt, 0);
            const onlineAmtSum = data[0].filter(item => item.businessType === 'ONLINE').reduce((sum, item) => sum + item.businessAmt, 0);
            const dueAmtSum = data[0].filter(item => item.businessType === 'DUE').reduce((sum, item) => sum + item.businessAmt, 0);
            console.log(cashAmtSum, debitAmtSum, onlineAmtSum);
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
        console.error('An error occurd', error);
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
                console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export Excel For Business Report

const exportExcelForBusinessReportNet = async (req, res) => {
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
                console.error("An error occurd in SQL Queery", err);
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
                console.log(">>>", fileName);
                res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                res.type = 'blob';
                res.send(data)
            } catch (err) {
                throw new Error(err);
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
};

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
    exportExcelForBusinessReportNet
}