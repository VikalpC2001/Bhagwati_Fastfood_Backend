const pool = require('../../database');

// Expense Category DashBoard For App

const getMainCategoryDashboardForApp = (req, res) => {
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
            sql_query_getStaticsData = `SELECT
                                          ecd.categoryId,
                                          ecd.categoryName,
                                          ecd.categoryIconName,
                                          COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                      FROM
                                          expense_category_data AS ecd
                                      LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                      GROUP BY ecd.categoryId
                                      ORDER BY ecd.categoryName ASC`;
        } else {
            sql_query_getStaticsData = `SELECT
                                          ecd.categoryId,
                                          ecd.categoryName,
                                          ecd.categoryIconName,
                                          COALESCE(SUM(ed.expenseAmount), 0) AS expenseAmt
                                      FROM
                                          expense_category_data AS ecd
                                      LEFT JOIN expense_data AS ed ON ed.categoryId = ecd.categoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                      GROUP BY ecd.categoryId
                                      ORDER BY ecd.categoryName ASC`;
        }
        pool.query(sql_query_getStaticsData, (err, data) => {
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

// Get Sub Category List By Id For App

const getSubCategoryListByIdForApp = (req, res) => {
    try {
        const mainCategoryId = req.query.mainCategoryId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        const data = {
            moneySourceId: req.query.moneySourceId,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
            searchWord: req.query.searchWord ? req.query.searchWord : '',
        }
        if (req.query.searchWord) {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_subcategory_data WHERE categoryId = '${mainCategoryId}' AND subCategoryName LIKE '%` + data.searchWord + `%'`;
        } else {
            sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM expense_subcategory_data WHERE categoryId = '${mainCategoryId}'`;
        }

        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const commanQuarry = `SELECT
                                            esd.subCategoryId,
                                            esd.categoryId,
                                            esd.subCategoryName,
                                            COALESCE(SUM(ed.expenseAmount),0) AS expenseAmt,
                                            COALESCE(edt.totalOfMainCategory,0) AS totalExpenseOfMainCategory,
                                            CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount),0) / COALESCE(edt.totalOfMainCategory,0) * 100,0)),' ','%') AS expPercentage
                                        FROM
                                            expense_subcategory_data AS esd`
                if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
                    sql_queries_getdetails = `${commanQuarry}
                                                LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                LEFT JOIN (
                                                    SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data 
                                                    WHERE moneySourceId = '${data.moneySourceId}' AND categoryId = '${mainCategoryId}' AND expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y'))
                                                    AS edt ON esd.categoryId = edt.categoryId
                                                WHERE esd.categoryId = '${mainCategoryId}' AND esd.subCategoryName LIKE '%` + data.searchWord + `%'
                                                GROUP BY esd.subCategoryId
                                                ORDER BY esd.subCategoryName ASC
                                                limit ${limit}`;
                } else if (req.query.startDate && req.query.endDate) {
                    sql_queries_getdetails = `${commanQuarry}
                                                LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                                LEFT JOIN (
                                                    SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data 
                                                    WHERE categoryId = '${mainCategoryId}' AND expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y'))
                                                    AS edt ON esd.categoryId = edt.categoryId
                                                WHERE esd.categoryId = '${mainCategoryId}' AND esd.subCategoryName LIKE '%` + data.searchWord + `%'
                                                GROUP BY esd.subCategoryId
                                                ORDER BY esd.subCategoryName ASC
                                                limit ${limit}`;
                } else if (req.query.moneySourceId) {
                    sql_queries_getdetails = `${commanQuarry}
                                                LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                LEFT JOIN (
                                                    SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data
                                                    WHERE moneySourceId = '${data.moneySourceId}' AND categoryId = '${mainCategoryId}' AND expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y'))
                                                    AS edt ON esd.categoryId = edt.categoryId
                                                WHERE esd.categoryId = '${mainCategoryId}' AND esd.subCategoryName LIKE '%` + data.searchWord + `%'
                                                GROUP BY esd.subCategoryId
                                                ORDER BY esd.subCategoryName ASC
                                                limit ${limit}`;
                } else {
                    sql_queries_getdetails = `${commanQuarry}
                                                LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                LEFT JOIN (
                                                    SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data
                                                    WHERE categoryId = '${mainCategoryId}' AND expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y'))
                                                    AS edt ON esd.categoryId = edt.categoryId
                                                WHERE esd.categoryId = '${mainCategoryId}' AND esd.subCategoryName LIKE '%` + data.searchWord + `%'
                                                GROUP BY esd.subCategoryId
                                                ORDER BY esd.subCategoryName ASC
                                                limit ${limit}`;
                }
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        const totalExpense = rows && rows[0] && rows[0].totalExpenseOfMainCategory ? rows[0].totalExpenseOfMainCategory : 0;
                        if (numRows === 0) {
                            const rows = []
                            return res.status(200).send({ rows, numRows, totalExpense });
                        } else {
                            return res.status(200).send({ rows, numRows, totalExpense });
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

// Get Expense List By Id For App

const getExpenseTransactionDataForApp = (req, res) => {
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
                console.error("An error occurred in SQL Queery", err);
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
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = []
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
};

// Get SubCategory Statics By Id For App

const getStaticsForSubCategoryByIdForApp = (req, res) => {
    try {
        const subCategoryId = req.query.subCategoryId;
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            moneySourceId: req.query.moneySourceId,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15),
        }
        if (req.query.startDate && req.query.endDate && req.query.subCategoryId && req.query.moneySourceId) {
            sql_querry_getStaticsDetails = `SELECT 'Custom' AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.subcategoryId = '${subCategoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                            SELECT CONCAT( MONTHNAME(CURRENT_DATE()),'-',YEAR(CURRENT_DATE())) AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND MONTH(expenseDate) = MONTH(CURRENT_DATE()) AND YEAR(expenseDate) = YEAR(CURRENT_DATE());
                                            SELECT CONCAT(MONTHNAME(CURRENT_DATE - INTERVAL 1 MONTH),'-',YEAR(CURRENT_DATE - INTERVAL 1 MONTH)) AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND YEAR(expenseDate) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(expenseDate) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH);
                                            SELECT 'Today Expense' AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        } else if (req.query.startDate && req.query.endDate && req.query.subCategoryId) {
            sql_querry_getStaticsDetails = `SELECT 'Custom' AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND expense_data.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y');
                                            SELECT CONCAT( MONTHNAME(CURRENT_DATE()),'-',YEAR(CURRENT_DATE())) AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND MONTH(expenseDate) = MONTH(CURRENT_DATE()) AND YEAR(expenseDate) = YEAR(CURRENT_DATE());
                                            SELECT CONCAT(MONTHNAME(CURRENT_DATE - INTERVAL 1 MONTH),'-',YEAR(CURRENT_DATE - INTERVAL 1 MONTH)) AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND YEAR(expenseDate) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(expenseDate) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH);
                                            SELECT 'Today Expense' AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        } else if (req.query.subCategoryId && req.query.moneySourceId) {
            sql_querry_getStaticsDetails = `SELECT 'Custom' AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.moneySourceId = '${data.moneySourceId}' AND expense_data.subcategoryId = '${subCategoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE();
                                            SELECT CONCAT( MONTHNAME(CURRENT_DATE()),'-',YEAR(CURRENT_DATE())) AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND MONTH(expenseDate) = MONTH(CURRENT_DATE()) AND YEAR(expenseDate) = YEAR(CURRENT_DATE());
                                            SELECT CONCAT(MONTHNAME(CURRENT_DATE - INTERVAL 1 MONTH),'-',YEAR(CURRENT_DATE - INTERVAL 1 MONTH)) AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND YEAR(expenseDate) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(expenseDate) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH);
                                            SELECT 'Today Expense' AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        } else {
            sql_querry_getStaticsDetails = `SELECT 'Custom' AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND expense_data.expenseDate >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND expense_data.expenseDate <= CURDATE();
                                            SELECT CONCAT( MONTHNAME(CURRENT_DATE()),'-',YEAR(CURRENT_DATE())) AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND MONTH(expenseDate) = MONTH(CURRENT_DATE()) AND YEAR(expenseDate) = YEAR(CURRENT_DATE());
                                            SELECT CONCAT(MONTHNAME(CURRENT_DATE - INTERVAL 1 MONTH),'-',YEAR(CURRENT_DATE - INTERVAL 1 MONTH)) AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND YEAR(expenseDate) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(expenseDate) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH);
                                            SELECT 'Today Expense' AS label, COALESCE(SUM(expense_data.expenseAmount),0) AS expenseAmt FROM expense_data WHERE expense_data.subcategoryId = '${subCategoryId}' AND expense_data.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        }
        pool.query(sql_querry_getStaticsDetails, (err, result) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const arrayOfObjects = result.flat();
                return res.status(200).send(arrayOfObjects);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getMainCategoryDashboardForApp,
    getSubCategoryListByIdForApp,
    getExpenseTransactionDataForApp,
    getStaticsForSubCategoryByIdForApp
}