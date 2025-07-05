const pool = require('../../databasePool');

// Get Business Report with Net Profit For App

const getBusinessReportDashBoardwithNetProfitForApp = (req, res) => {
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

module.exports = {
    getBusinessReportDashBoardwithNetProfitForApp
}