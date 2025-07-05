const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Get Date Function 4 Hour

function getCurrentDate() {
    const now = new Date();
    const hours = now.getHours();

    if (hours <= 4) { // If it's 4 AM or later, increment the date
        now.setDate(now.getDate() - 1);
    }
    return now.toDateString().slice(4, 15);
}

// Get Due Customer UPI

const getUPIListForApp = (req, res) => {
    try {
        const currentDate = getCurrentDate();
        const sql_query_getDetails = `SELECT
                                          oud.onlineId AS onlineId,
                                          oud.holderName AS holderName,
                                          oud.holderNumber AS holderNumber,
                                          oud.upiId AS upiId,
                                          ROUND(IFNULL(SUM(CASE WHEN bwu.onlineDate = STR_TO_DATE('${currentDate}','%b %d %Y') THEN bwu.amount ELSE 0 END), 0)) AS upiAmt,
                                          oud.isOfficial AS isOfficial
                                      FROM
                                          billing_onlineUPI_data AS oud
                                      LEFT JOIN billing_billWiseUpi_data AS bwu ON bwu.onlineId = oud.onlineId
                                      GROUP BY oud.onlineId ORDER BY upiAmt ASC`;
        pool.query(sql_query_getDetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                return res.status(200).send({ rows });
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get UPI Transaction By ID

const getUPITransactionByIdForApp = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const upiId = req.query.upiId;
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        const currentDate = getCurrentDate();
        if (!upiId) {
            return res.status(404).send("Please Fill All The Fields...!");
        } else {
            let sql_querry_getCountDetails = `SELECT SUM(amount) as totalAmount, count(*) as numRows FROM billing_billWiseUpi_data 
                                              WHERE onlineId = '${upiId}' AND onlineDate BETWEEN STR_TO_DATE('${startDate ? startDate : currentDate}','%b %d %Y') AND STR_TO_DATE('${endDate ? endDate : currentDate}','%b %d %Y')`;
            pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    const numRows = rows[0].numRows;
                    const totalAmount = rows[0].totalAmount ? rows[0].totalAmount : 0;
                    const numPages = Math.ceil(numRows / numPerPage);
                    const sql_query_getDetails = `SELECT
                                                      bwu.bwuId AS transactionId,
                                                      bwu.onlineId AS onlineId,
                                                      bwu.billId AS billId,
                                                      bwu.amount AS amount,
                                                      bd.billType AS billType,
                                                      DATE_FORMAT(bwu.onlineDate, '%d-%m-%Y') AS onlineDate
                                                  FROM
                                                      billing_billWiseUpi_data AS bwu
                                                  LEFT JOIN billing_data AS bd ON bd.billId = bwu.billId
                                                  WHERE bwu.onlineId = '${upiId}'
                                                  AND bwu.onlineDate BETWEEN STR_TO_DATE('${startDate ? startDate : currentDate}','%b %d %Y') AND STR_TO_DATE('${endDate ? endDate : currentDate}','%b %d %Y')
                                                  ORDER BY bwu.onlineDate DESC
                                                  LIMIT ${limit}`;
                    pool.query(sql_query_getDetails, (err, rows, fields) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');;
                        } else {
                            if (numRows === 0) {
                                return res.status(200).send('No Data Found');
                            } else {
                                return res.status(200).send({ rows, numRows, totalAmount });
                            }
                        }
                    });
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}


module.exports = {
    getUPIListForApp,
    getUPITransactionByIdForApp
}