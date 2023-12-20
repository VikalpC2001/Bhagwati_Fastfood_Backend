const { query } = require('express');
const pool = require('../../database');
const excelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Get SubCategory Statics By Id

const getStaticsForSubCategoryById = (req, res) => {
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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const arrayOfObjects = result.flat();
                return res.status(200).send(arrayOfObjects);
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Sub Category List By Id

const getSubCategoryListById = (req, res) => {
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
                console.error("An error occurd in SQL Queery", err);
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
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        const totalExpense = rows && rows[0] && rows[0].totalExpenseOfMainCategory ? rows[0].totalExpenseOfMainCategory : 0;
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows, totalExpense });
                        } else {
                            return res.status(200).send({ rows, numRows, totalExpense });
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

// Add Sub Category

const addSubCategory = (req, res) => {
    try {
        const uid1 = new Date();
        const subCategoryId = String('subCategory_' + uid1.getTime());
        const data = {
            categoryId: req.body.categoryId.trim(),
            subCategoryName: req.body.subCategoryName
        }
        if (!data.categoryId || !data.subCategoryName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.subCategoryName = pool.query(`SELECT subCategoryName FROM expense_subcategory_data WHERE subCategoryName = '${data.subCategoryName}' AND categoryId = '${data.categoryId}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Sub Category is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO expense_subcategory_data(subCategoryId, categoryId, subCategoryName)
                                                VALUES('${subCategoryId}', '${data.categoryId}', '${data.subCategoryName}')`;
                    pool.query(sql_querry_addDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Sub Category Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Sub Category Data

const removeSubCategory = async (req, res) => {

    try {
        var subCategoryId = req.query.subCategoryId.trim();
        if (!subCategoryId) {
            return res.status(404).send('subCategoryId Not Found');
        }
        req.query.subCategoryId = pool.query(`SELECT subCategoryId FROM expense_subcategory_data WHERE subCategoryId = '${subCategoryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM expense_subcategory_data WHERE subCategoryId = '${subCategoryId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Sub Category Deleted Successfully");
                })
            } else {
                return res.status(404).send('subCategoryId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Sub Category Data

const updateSubCategory = (req, res) => {
    try {
        const subCategoryId = req.body.subCategoryId;
        const data = {
            subCategoryName: req.body.subCategoryName.trim()
        }
        if (!data.subCategoryName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.categoryName = pool.query(`SELECT subCategoryName FROM expense_subcategory_data WHERE subCategoryId NOT IN ('${subCategoryId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const subCategoryNameList = rowarr.map(e => e.subCategoryName.toLowerCase())
                if (subCategoryNameList.includes(data.subCategoryName.toLowerCase())) {
                    return res.status(400).send('Sub Category is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                    expense_subcategory_data
                                                SET
                                                    subCategoryName = '${data.subCategoryName}'
                                                WHERE
                                                    subCategoryId = '${subCategoryId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Sub Category Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Dropdown List Of SubCategory

const ddlSubCategoryData = (req, res) => {
    try {
        const categoryId = req.query.categoryId.trim();
        if (!categoryId) {
            return res.status(404).send('CategoryId Not Found');
        }
        const sql_query_getDDlData = `SELECT subCategoryId, subCategoryName FROM expense_subcategory_data WHERE categoryId = '${categoryId}'`;
        pool.query(sql_query_getDDlData, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Import Excel For Sub Category Data

const exportExcelForSubCategoryData = (req, res) => {

    const mainCategoryId = req.query.mainCategoryId;
    const now = new Date();
    now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
    const currentDate = now.toDateString().slice(4, 15);
    console.log(currentDate);
    const data = {
        moneySourceId: req.query.moneySourceId,
        startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
        endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
    }
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
                                    WHERE esd.categoryId = '${mainCategoryId}'
                                    GROUP BY esd.subCategoryId
                                    ORDER BY esd.subCategoryName ASC`;
    } else if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    LEFT JOIN (
                                        SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data 
                                        WHERE categoryId = '${mainCategoryId}' AND expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y'))
                                        AS edt ON esd.categoryId = edt.categoryId
                                    WHERE esd.categoryId = '${mainCategoryId}'
                                    GROUP BY esd.subCategoryId
                                    ORDER BY esd.subCategoryName ASC`;
    } else if (req.query.moneySourceId) {
        sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    LEFT JOIN (
                                        SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data
                                        WHERE moneySourceId = '${data.moneySourceId}' AND categoryId = '${mainCategoryId}' AND expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y'))
                                        AS edt ON esd.categoryId = edt.categoryId
                                    WHERE esd.categoryId = '${mainCategoryId}'
                                    GROUP BY esd.subCategoryId
                                    ORDER BY esd.subCategoryName ASC`;
    } else {
        sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    LEFT JOIN (
                                        SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data
                                        WHERE categoryId = '${mainCategoryId}' AND expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y'))
                                        AS edt ON esd.categoryId = edt.categoryId
                                    WHERE esd.categoryId = '${mainCategoryId}'
                                    GROUP BY esd.subCategoryId
                                    ORDER BY esd.subCategoryName ASC`;
    }
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Sub Category Data"); // New Worksheet
        sql_queries_getIncomeSourceData = `SELECT categoryName FROM expense_category_data WHERE categoryId = '${mainCategoryId}';
                                           SELECT bankDisplayName FROM bank_data WHERE bankId = '${data.moneySourceId}'`;
        pool.query(sql_queries_getIncomeSourceData, async (err, result) => {
            if (err) return res.status(404).send(err);

            if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
                worksheet.mergeCells('A1', 'D1');
                worksheet.getCell('A1').value = `${result[0][0].categoryName} Sub Category Data From ${data.startDate} To ${data.endDate} For ${result && result[0][1] && result[0][1].bankDisplayName ? result[0][1].bankDisplayName : ''}`;
            } else if (req.query.startDate && req.query.endDate) {
                worksheet.mergeCells('A1', 'D1');
                worksheet.getCell('A1').value = `${result[0][0].categoryName} Sub Category Data From ${data.startDate} To ${data.endDate}`;
            } else if (req.query.moneySourceId) {
                worksheet.mergeCells('A1', 'D1');
                worksheet.getCell('A1').value = `${result[0][0].categoryName} Sub Category Data For Date : - ${currentDate} (${result && result[0][1] && result[0][1].bankDisplayName ? result[0][1].bankDisplayName : ''})`;
            } else {
                worksheet.mergeCells('A1', 'D1');
                worksheet.getCell('A1').value = `${result[0][0].categoryName} Sub Category Data For Date : - ${currentDate}`;
            }
            /*Column headers*/
            worksheet.getRow(2).values = ['S no.', 'Sub Categories', 'Amount', 'Usage (%)'];

            // Column for data in excel. key must match data key
            worksheet.columns = [
                { key: "s_no", width: 10, },
                { key: "subCategoryName", width: 30 },
                { key: "expenseAmt", width: 30 },
                { key: "expPercentage", width: 30 }
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
                { formula: `SUM(C3:C${arr.length + 2})` }
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
}

// Export PDF For Sub Category Data

const exportPdfForSubcategoryData = (req, res) => {
    try {
        const mainCategoryId = req.query.mainCategoryId;
        const now = new Date();
        now.setDate(now.getHours() <= 4 ? now.getDate() - 1 : now.getDate());
        const currentDate = now.toDateString().slice(4, 15);
        console.log(currentDate);
        const data = {
            moneySourceId: req.query.moneySourceId,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        const commanQuarry = `SELECT
                              esd.subCategoryName AS "Sub Categories",
                              COALESCE(SUM(ed.expenseAmount),0) AS "Amount",
                              CONCAT(ROUND(COALESCE(COALESCE(SUM(ed.expenseAmount),0) / COALESCE(edt.totalOfMainCategory,0) * 100,0)),' ','%') AS "Usage (%)"
                          FROM
                              expense_subcategory_data AS esd`
        if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
            sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    LEFT JOIN (
                                        SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data 
                                        WHERE moneySourceId = '${data.moneySourceId}' AND categoryId = '${mainCategoryId}' AND expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y'))
                                        AS edt ON esd.categoryId = edt.categoryId
                                    WHERE esd.categoryId = '${mainCategoryId}'
                                    GROUP BY esd.subCategoryId
                                    ORDER BY esd.subCategoryName ASC`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    LEFT JOIN (
                                        SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data 
                                        WHERE categoryId = '${mainCategoryId}' AND expenseDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y'))
                                        AS edt ON esd.categoryId = edt.categoryId
                                    WHERE esd.categoryId = '${mainCategoryId}'
                                    GROUP BY esd.subCategoryId
                                    ORDER BY esd.subCategoryName ASC`;
        } else if (req.query.moneySourceId) {
            sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.moneySourceId = '${data.moneySourceId}' AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    LEFT JOIN (
                                        SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data
                                        WHERE moneySourceId = '${data.moneySourceId}' AND categoryId = '${mainCategoryId}' AND expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y'))
                                        AS edt ON esd.categoryId = edt.categoryId
                                    WHERE esd.categoryId = '${mainCategoryId}'
                                    GROUP BY esd.subCategoryId
                                    ORDER BY esd.subCategoryName ASC`;
        } else {
            sql_queries_getdetails = `${commanQuarry}
                                    LEFT JOIN expense_data AS ed ON ed.subcategoryId = esd.subCategoryId AND ed.expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                    LEFT JOIN (
                                        SELECT categoryId, SUM(expenseAmount) AS totalOfMainCategory FROM expense_data
                                        WHERE categoryId = '${mainCategoryId}' AND expenseDate = STR_TO_DATE('${currentDate}','%b %d %Y'))
                                        AS edt ON esd.categoryId = edt.categoryId
                                    WHERE esd.categoryId = '${mainCategoryId}'
                                    GROUP BY esd.subCategoryId
                                    ORDER BY esd.subCategoryName ASC`;
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
            const sumFooterArray = ['Total', '', sumExpenseAmount];

            sql_queries_getIncomeSourceData = `SELECT categoryName FROM expense_category_data WHERE categoryId = '${mainCategoryId}';
                                               SELECT bankDisplayName FROM bank_data WHERE bankId = '${data.moneySourceId}'`;
            pool.query(sql_queries_getIncomeSourceData, async (err, result) => {
                if (err) return res.status(404).send(err);

                if (req.query.startDate && req.query.endDate && req.query.moneySourceId) {
                    tableHeading = `${result[0][0].categoryName} Sub Category Data From ${data.startDate} To ${data.endDate} For ${result && result[0][1] && result[0][1].bankDisplayName ? result[0][1].bankDisplayName : ''}`;
                } else if (req.query.startDate && req.query.endDate) {
                    tableHeading = `${result[0][0].categoryName} Sub Category Data From ${data.startDate} To ${data.endDate}`;
                } else if (req.query.moneySourceId) {
                    tableHeading = `${result[0][0].categoryName} Sub Category Data For Date : - ${currentDate} (${result && result[0][1] && result[0][1].bankDisplayName ? result[0][1].bankDisplayName : ''})`;
                } else {
                    tableHeading = `${result[0][0].categoryName} Sub Category Data For Date : - ${currentDate}`;
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
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getStaticsForSubCategoryById,
    addSubCategory,
    updateSubCategory,
    removeSubCategory,
    ddlSubCategoryData,
    getSubCategoryListById,
    exportExcelForSubCategoryData,
    exportPdfForSubcategoryData
}