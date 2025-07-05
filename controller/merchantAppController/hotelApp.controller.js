const pool = require("../../database");

// Get Hotel List For App

const getHotelListForApp = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const searchWord = req.query.searchWord ? req.query.searchWord : '';
        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM billing_hotel_data WHERE hotelName LIKE '%` + searchWord + `%'`;
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_getDetails = `SELECT 
                                                hotelId,
                                                hotelName,
                                                COALESCE(hotelAddress,NULL) AS hotelAddress,
                                                COALESCE(hotelLocality,NULL) AS hotelLocality,
                                                COALESCE(hotelPincode,NULL) AS hotelPincode,
                                                hotelMobileNo,
                                                COALESCE(otherMobileNo,NULL) AS otherMobileNo,
                                                payType,
                                                discountType,
                                                CASE
                                                    WHEN discountType = 'percentage' THEN CONCAT(discount,' %')
                                                    WHEN discountType = 'fixed' THEN CONCAT('₹ ',discount)
                                                    ELSE discount
                                                END AS discountView,
                                                discount
                                              FROM 
                                                billing_hotel_data
                                              WHERE hotelName LIKE '%` + searchWord + `%'
                                              ORDER BY billing_hotel_data.hotelName ASC
                                              LIMIT ${limit}`;
                pool.query(sql_query_getDetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        if (numRows === 0) {
                            return res.status(200).send('No Data Found');
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Hotel Statics For App

const getHotelStaticsDataForApp = (req, res) => {
    try {
        const hotelId = req.query.hotelId ? req.query.hotelId : null;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }

        let sql_query_hotelStatics = `SELECT 
                                          COALESCE(COUNT(CASE WHEN bod.billStatus != 'cancel' THEN bod.billId END), 0) AS totalOrder,
                                          COALESCE(COUNT(CASE WHEN bod.billStatus = 'cancel' THEN bod.billId END), 0) AS cancelOrder,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2),0) AS totalBusiness,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billPayType = 'cash' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2),0) AS totalCash,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billPayType = 'debit' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2),0) AS totalDebit,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billStatus = 'cancel' THEN bod.settledAmount ELSE 0 END), 2),0) AS totalCancel,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billStatus != 'cancel' THEN bod.totalDiscount ELSE 0 END), 2),0) AS totalDiscount,
                                            COALESCE((SELECT ROUND(SUM(CASE WHEN bod.billPayType = 'debit' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalDebit FROM billing_Official_data AS bod
                                            LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                            WHERE hif.hotelId = '${hotelId}')
                                            - 
                                            (SELECT ROUND(COALESCE(SUM(billing_hotelTransaction_data.paidAmount),0),2) FROM billing_hotelTransaction_data WHERE billing_hotelTransaction_data.hotelId = '${hotelId}'),0) 
                                          AS totalRemaining
                                      FROM billing_Official_data AS bod
                                      LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                      WHERE hif.hotelId = '${hotelId}' AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate ? data.startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${data.endDate ? data.endDate : lastDay}', '%b %d %Y')`;
        pool.query(sql_query_hotelStatics, (err, statics) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                return res.status(200).send(statics[0])
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Hotel Data By Id For App

const getHotelDataByIdForApp = (req, res) => {
    try {
        const hotelId = req.query.hotelId ? req.query.hotelId : null;
        if (!hotelId) {
            return res.status(404).send('hotelId Not Found..!');
        } else {
            sql_querry_getCountDetails = `SELECT
                                            hotelId,
                                            hotelName,
                                            COALESCE(hotelAddress,NULL) AS hotelAddress,
                                            COALESCE(hotelLocality,NULL) AS hotelLocality,
                                            COALESCE(hotelPincode,NULL) AS hotelPincode,
                                            hotelMobileNo,
                                            COALESCE(otherMobileNo,NULL) AS otherMobileNo,
                                            payType,
                                            discountType,
                                            CASE
                                                WHEN discountType = 'percentage' THEN CONCAT(discount,' %')
                                                WHEN discountType = 'fixed' THEN CONCAT('₹ ',discount)
                                                ELSE discount
                                            END AS discount
                                          FROM
                                            billing_hotel_data
                                          WHERE hotelId = '${hotelId}'`;
            pool.query(sql_querry_getCountDetails, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    return res.status(200).send(data[0]);
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Monthly Data Of Hotel For App

const getHotelMonthWiseDataForApp = (req, res) => {
    try {
        const hotelId = req.query.hotelId;
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        if (!hotelId || !page || !numPerPage) {
            return res.status(404).send('Not Found')
        }
        let sql_query_getMonthWiseData = `SELECT
                                              ROUND(SUM(CASE 
                                                  WHEN bod.billPayType = 'cash' AND bod.billStatus != 'Cancel' THEN bod.settledAmount
                                                  ELSE 0 
                                              END), 0) AS cashAmount,
                                              COUNT(CASE 
                                                  WHEN bod.billPayType = 'cash' AND bod.billStatus != 'Cancel' THEN bod.billId
                                                  ELSE NULL 
                                              END) AS cashOrderCount,
                                              ROUND(SUM(CASE
                                                  WHEN bod.billPayType = 'debit' AND bod.billStatus != 'Cancel' THEN bod.settledAmount
                                                  ELSE 0
                                              END), 0) AS debitAmount,
                                              COUNT(CASE
                                                  WHEN bod.billPayType = 'debit' AND bod.billStatus != 'Cancel' THEN bod.billId
                                                  ELSE NULL
                                              END) AS debitOrderCount,
                                              CONCAT(MONTHNAME(bod.billDate), '-', YEAR(bod.billDate)) AS date
                                          FROM billing_hotel_data AS bhd
                                          LEFT JOIN billing_hotelInfo_data AS hid ON hid.hotelId = bhd.hotelId
                                          LEFT JOIN billing_Official_data AS bod ON bod.billId = hid.billId
                                          WHERE bhd.hotelId = '${hotelId}' AND bod.billStatus != 'Cancel'
                                          GROUP BY YEAR(bod.billDate), MONTH(bod.billDate)
                                          ORDER BY YEAR(bod.billDate) DESC, MONTH(bod.billDate) DESC
                                          LIMIT ${limit};`;
        pool.query(sql_query_getMonthWiseData, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (data.length === 0) {
                return res.status(400).send('No Data Found');
            } else {
                return res.status(200).send(data);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getHotelListForApp,
    getHotelStaticsDataForApp,
    getHotelDataByIdForApp,
    getHotelMonthWiseDataForApp
}