const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { writeFileSync, readFileSync } = require("fs");
const fs = require('fs');
const { Readable } = require('stream')
const { jsPDF } = require('jspdf');
require('jspdf-autotable');


function addStartAndEndDates(data) {
    return data.map(item => {
        const [month, year] = item.date.split("-");
        const startDate = new Date(`${month} 1, ${year}`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1); // Go to next month
        endDate.setDate(0); // Set to last day of the previous month

        return {
            ...item,
            startDate: "...." + startDate.toDateString().replace(/^\w+ /, ""),
            endDate: "...." + endDate.toDateString().replace(/^\w+ /, "")
        };
    });
}

// Get Hotel List

const getHotelList = (req, res) => {
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
        res.status(500).json('Internal Server Error');
    }
}

// Get Hotel Data By Id

const getHotelDataById = (req, res) => {
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

// Add Hotel Data

const addHotelData = (req, res) => {
    try {
        const uid1 = new Date();
        const hotelId = String("Hotel_" + uid1.getTime());

        const data = {
            hotelName: req.body.hotelName ? req.body.hotelName : null,
            hotelAddress: req.body.hotelAddress ? req.body.hotelAddress : null,
            hotelLocality: req.body.hotelLocality ? req.body.hotelLocality : null,
            hotelPincode: req.body.hotelPincode ? req.body.hotelPincode : null,
            hotelMobileNo: req.body.hotelMobileNo ? req.body.hotelMobileNo : null,
            otherMobileNo: req.body.otherMobileNo ? req.body.otherMobileNo : null,
            payType: req.body.payType ? req.body.payType : null,
            discountType: req.body.discountType ? req.body.discountType : null,
            discount: req.body.discount ? req.body.discount : 0,
        }
        if (!data.hotelName || !data.hotelMobileNo || !data.payType || !data.discountType) {
            return res.status(404).send('Please Fill All The Fields....!');
        } else {
            pool.query(`SELECT hotelName FROM billing_hotel_data WHERE hotelName = '${data.hotelName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Hotel is Already In Use');
                } else {
                    const sql_querry_addHotelData = `INSERT INTO billing_hotel_data (hotelId, hotelName, hotelAddress ,hotelLocality, hotelPincode, hotelMobileNo, otherMobileNo, payType, discountType, discount)
                                                     VALUES ('${hotelId}', '${data.hotelName}', ${data.hotelAddress ? `'${data.hotelAddress}'` : null}, ${data.hotelLocality ? `'${data.hotelLocality}'` : null}, ${data.hotelPincode ? `${data.hotelPincode}` : null}, '${data.hotelMobileNo}',${data.otherMobileNo ? `'${data.otherMobileNo}'` : null}, '${data.payType}', '${data.discountType}', ${data.discount})`;
                    pool.query(sql_querry_addHotelData, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Hotel Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Delete Hotel Data

const removeHotelData = (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const hotelId = req.query.hotelId.trim();
                req.query.hotelId = pool.query(`SELECT hotelId FROM billing_hotel_data WHERE hotelId = '${hotelId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM billing_hotel_data WHERE hotelId = '${hotelId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Hotel Deleted Successfully");
                        })
                    } else {
                        return res.send('HotelId Not Found');
                    }
                })
            } else {
                return res.status(400).send('You are Not Authorised');
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Update Hotel Data

const updateHotelData = (req, res) => {
    try {
        const data = {
            hotelId: req.body.hotelId ? req.body.hotelId : null,
            hotelName: req.body.hotelName ? req.body.hotelName : null,
            hotelAddress: req.body.hotelAddress ? req.body.hotelAddress : null,
            hotelLocality: req.body.hotelLocality ? req.body.hotelLocality : null,
            hotelPincode: req.body.hotelPincode ? req.body.hotelPincode : null,
            hotelMobileNo: req.body.hotelMobileNo ? req.body.hotelMobileNo : null,
            otherMobileNo: req.body.otherMobileNo ? req.body.otherMobileNo : null,
            payType: req.body.payType ? req.body.payType : null,
            discountType: req.body.discountType ? req.body.discountType : null,
            discount: req.body.discount ? req.body.discount : 0,
        }
        console.log('mummm', data.discountType, data.discountType == 'none' ? 0 : data.discount);
        if (!data.hotelId || !data.hotelName || !data.hotelMobileNo || !data.payType || !data.discountType) {
            return res.status(404).send('Please Fill All The Fields....!');
        } else {
            pool.query(`SELECT hotelName FROM billing_hotel_data WHERE hotelName = '${data.hotelName}' AND hotelId != '${data.hotelId}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Hotel is Already In Use');
                } else {
                    const sql_querry_updateHotelData = `UPDATE
                                                            billing_hotel_data
                                                        SET
                                                            hotelName = '${data.hotelName}',
                                                            hotelAddress = ${data.hotelAddress ? `'${data.hotelAddress}'` : null},
                                                            hotelLocality = ${data.hotelLocality ? `'${data.hotelLocality}'` : null},
                                                            hotelPincode = ${data.hotelPincode ? `${data.hotelPincode}` : null},
                                                            hotelMobileNo = '${data.hotelMobileNo}',
                                                            otherMobileNo = ${data.otherMobileNo ? `'${data.otherMobileNo}'` : null},
                                                            payType = '${data.payType}',
                                                            discountType = '${data.discountType}',
                                                            discount = ${data.discountType == 'none' ? 0 : data.discount}
                                                        WHERE hotelId = '${data.hotelId}'`;
                    pool.query(sql_querry_updateHotelData, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Hotel Updated Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// DDL Hotel List

const ddlHotelList = (req, res) => {
    try {
        const sql_query_getDetails = `SELECT 
                                        hotelId,
                                        hotelName,
                                        hotelAddress,
                                        hotelLocality,
                                        hotelPincode,
                                        hotelMobileNo,
                                        otherMobileNo,
                                        payType,
                                        discountType,
                                        discount
                                      FROM 
                                        billing_hotel_data
                                      ORDER BY hotelName ASC`;
        pool.query(sql_query_getDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                if (rows.length == 0) {
                    const rows = [{
                        'msg': 'No Data Found'
                    }]
                    return res.status(200).send(rows);
                } else {
                    return res.status(200).send(rows);
                }
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Hotel Bill Data By ID

const getHotelBillDataById = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            hotelId: req.query.hotelId ? req.query.hotelId : null,
            payType: req.query.payType ? req.query.payType : null,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (data.payType && data.payType != 'cancel' && data.startDate && data.endDate) {
            sql_querry_getCountDetails = `SELECT COUNT(*) AS numRows FROM billing_Official_data AS bod
                                          LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                          WHERE hif.hotelId = '${data.hotelId}'
                                          AND bod.billPayType = '${data.payType}'
                                          AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (data.payType && data.payType == 'cancel' && data.startDate && data.endDate) {
            sql_querry_getCountDetails = `SELECT COUNT(*) AS numRows FROM billing_Official_data AS bod
                                          LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                          WHERE hif.hotelId = '${data.hotelId}'
                                          AND bod.billStatus = '${data.payType}'
                                          AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (data.startDate && data.endDate) {
            sql_querry_getCountDetails = `SELECT COUNT(*) AS numRows FROM billing_Official_data AS bod
                                          LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                          WHERE hif.hotelId = '${data.hotelId}'
                                          AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')`;
        } else if (data.payType && data.payType == 'cancel') {
            sql_querry_getCountDetails = `SELECT COUNT(*) AS numRows FROM billing_Official_data AS bod
                                          LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                          WHERE hif.hotelId = '${data.hotelId}'
                                          AND bod.billStatus = '${data.payType}'
                                          AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')`;
        } else if (data.payType) {
            sql_querry_getCountDetails = `SELECT COUNT(*) AS numRows FROM billing_Official_data AS bod
                                          LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                          WHERE hif.hotelId = '${data.hotelId}'
                                          AND bod.billPayType = '${data.payType}'
                                          AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')`;
        } else {
            sql_querry_getCountDetails = `SELECT COUNT(*) AS numRows FROM billing_Official_data AS bod
                                          LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                          WHERE hif.hotelId = '${data.hotelId}'
                                          AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')`;
        }
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                let commaonQuery = `SELECT 
                                        bod.billId AS billId,
                                        bod.billNumber AS billNumber,
                                        hif.roomNo AS roomNo,
                                        bod.cashier AS cashier,
                                        bod.billPayType AS billPayType,
                                        bod.totalAmount AS subTotal,
                                        bod.discountType AS discountType,
                                        bod.discountValue AS discountValue,
                                        bod.totalDiscount AS totalDiscount,
                                        bod.settledAmount AS grandTotal,
                                        bod.billStatus AS billStatus,
                                        DATE_FORMAT(bod.billDate,'%d-%m-%Y') AS billDate,
                                        DATE_FORMAT(bod.billCreationDate,'%h:%i %p') AS billTime
                                    FROM billing_Official_data AS bod
                                    LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId`;

                if (data.payType && data.payType != 'cancel' && data.startDate && data.endDate) {
                    sql_query_getDetails = `${commaonQuery}
                                            WHERE hif.hotelId = '${data.hotelId}'
                                            AND bod.billPayType = '${data.payType}'
                                            AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            ORDER BY bod.billNumber DESC, bod.billDate DESC
                                            LIMIT ${limit}`;
                } else if (data.payType && data.payType == 'cancel' && data.startDate && data.endDate) {
                    sql_query_getDetails = `${commaonQuery}
                                            WHERE hif.hotelId = '${data.hotelId}'
                                            AND bod.billStatus = '${data.payType}'
                                            AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            ORDER BY bod.billNumber DESC, bod.billDate DESC
                                            LIMIT ${limit}`;
                } else if (data.startDate && data.endDate) {
                    sql_query_getDetails = `${commaonQuery}
                                            WHERE hif.hotelId = '${data.hotelId}'
                                            AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                            ORDER BY bod.billNumber DESC, bod.billDate DESC
                                            LIMIT ${limit}`;
                } else if (data.payType && data.payType == 'cancel') {
                    sql_query_getDetails = `${commaonQuery}
                                            WHERE hif.hotelId = '${data.hotelId}'
                                            AND bod.billStatus = '${data.payType}'
                                            AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            ORDER BY bod.billNumber DESC, bod.billDate DESC
                                            LIMIT ${limit}`;
                } else if (data.payType) {
                    sql_query_getDetails = `${commaonQuery}
                                            WHERE hif.hotelId = '${data.hotelId}'
                                            AND bod.billPayType = '${data.payType}'
                                            AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            ORDER BY bod.billNumber DESC, bod.billDate DESC
                                            LIMIT ${limit}`;
                } else {
                    sql_query_getDetails = `${commaonQuery}
                                            WHERE hif.hotelId = '${data.hotelId}'
                                            AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                            ORDER BY bod.billNumber DESC, bod.billDate DESC
                                            LIMIT ${limit}`;
                }
                pool.query(sql_query_getDetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
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
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Hotel Statics Data

const getHotelStaticsData = (req, res) => {
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
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2),0) AS totalBusiness,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billPayType = 'cash' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2),0) AS totalCash,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billPayType = 'debit' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2),0) AS totalDebit,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billStatus = 'cancel' THEN bod.settledAmount ELSE 0 END), 2),0) AS totalCancel,
                                          COALESCE(ROUND(SUM(CASE WHEN bod.billStatus != 'cancel' THEN bod.totalDiscount ELSE 0 END), 2),0) AS totalDiscount,
                                            (SELECT ROUND(SUM(CASE WHEN bod.billPayType = 'debit' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalDebit FROM billing_Official_data AS bod
                                            LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                            WHERE hif.hotelId = '${hotelId}')
                                            - 
                                            (SELECT ROUND(COALESCE(SUM(billing_hotelTransaction_data.paidAmount),0),2) FROM billing_hotelTransaction_data WHERE billing_hotelTransaction_data.hotelId = '${hotelId}') 
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

// Add Hotel Transaction Data

const addHotelTransactionData = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const cashier = decoded.id.firstName;
            const uid1 = new Date();
            const transactionId = String("Transaction_" + uid1.getTime());

            const hotelId = req.body.hotelId ? req.body.hotelId : null;
            const givenBy = req.body.givenBy ? req.body.givenBy.trim() : null;
            const paidAmount = req.body.paidAmount ? req.body.paidAmount : 0;
            const transactionNote = req.body.transactionNote ? req.body.transactionNote.trim() : null;
            const transactionDate = new Date(req.body.transactionDate ? req.body.transactionDate : null).toString().slice(4, 15)

            if (!hotelId || !paidAmount || !transactionDate) {
                return res.status(400).send("Please Fill all the feilds");
            }
            const get_remaining_amount = `SELECT
                                             (SELECT ROUND(SUM(CASE WHEN bod.billPayType = 'debit' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalDebit FROM billing_Official_data AS bod
                                            LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                            WHERE hif.hotelId = '${hotelId}')
                                            - 
                                            (SELECT ROUND(COALESCE(SUM(billing_hotelTransaction_data.paidAmount),0),2) FROM billing_hotelTransaction_data WHERE billing_hotelTransaction_data.hotelId = '${hotelId}') 
                                          AS remainingAmount
                                          FROM
                                              billing_hotel_data AS bhd`;
            pool.query(get_remaining_amount, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const remainingAmount = data[0].remainingAmount;
                console.log(remainingAmount);

                const sql_querry_addTransaction = `INSERT INTO billing_hotelTransaction_data (transactionId, hotelId, receivedBy, givenBy, pendingAmount, paidAmount, transactionNote, transactionDate)  
                                                   VALUES ('${transactionId}', '${hotelId}', '${cashier}', ${givenBy ? `'${givenBy}'` : null}, ${remainingAmount}, ${paidAmount}, ${transactionNote ? `'${transactionNote}'` : null}, STR_TO_DATE('${transactionDate}','%b %d %Y'))`;
                pool.query(sql_querry_addTransaction, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Transaction Added Successfully");
                })
            })
        } else {
            return res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurred', error);
        return res.status(500).json('Internal Server Error');
    }
}

// Remove Hotel Transaction Data

const removeHotelTransactionById = (req, res) => {
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
                req.query.transactionId = pool.query(`SELECT transactionId FROM billing_hotelTransaction_data WHERE transactionId = '${transactionId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM billing_hotelTransaction_data WHERE transactionId = '${transactionId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
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
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Hotel Transaction Data

const getHotelTransactionListById = (req, res) => {
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
            hotelId: req.query.hotelId
        }
        if (data.startDate && data.endDate) {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM billing_hotelTransaction_data WHERE hotelId = '${data.hotelId}' AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')`;
        } else {
            sql_querry_getCountDetails = `SELECT count(*) as numRows FROM billing_hotelTransaction_data WHERE hotelId = '${data.hotelId}' AND transactionDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y')`;
        }
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_staticQuery = `SELECT transactionId, hotelId, receivedBy, givenBy, pendingAmount, paidAmount, transactionNote, DATE_FORMAT(transactionDate, '%d %b %Y') AS displayDate, DATE_FORMAT(creationDate, '%h:%i %p') AS diplayTime FROM billing_hotelTransaction_data`;
                if (data.startDate && data.endDate) {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE hotelId = '${data.hotelId}' 
                                            AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')
                                            ORDER BY billing_hotelTransaction_data.transactionDate DESC, billing_hotelTransaction_data.creationDate DESC
                                            LIMIT ${limit}`;
                } else {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE hotelId = '${data.hotelId}' 
                                            AND transactionDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y')
                                            ORDER BY billing_hotelTransaction_data.transactionDate DESC, billing_hotelTransaction_data.creationDate DESC
                                            LIMIT ${limit}`;
                }
                pool.query(sql_query_getDetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
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
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Month Wise Debit Transaction Of Hotel

const getMonthWiseTransactionForHotel = (req, res) => {
    try {
        const hotelId = req.query.hotelId;
        let page = req.query.page; // Page number
        let numPerPage = Number(req.query.numPerPage);// Number of items per page
        if (!hotelId || !page || !numPerPage) {
            return res.status(404).send('Not Found')
        }

        // Calculate the start and end indices for the current page
        let startIndex = (page - 1) * numPerPage;
        let endIndex = startIndex + numPerPage;
        let sql_query_getMonthWiseData = `SELECT
                                            COALESCE(ROUND(SUM(
                                            CASE 
                                                WHEN bod.billPayType = 'debit' AND bod.billStatus != 'Cancel' THEN bod.settledAmount 
                                                ELSE 0 
                                            END), 0), 0) AS amount,
                                            COALESCE(ROUND(SUM(
                                            CASE
                                                WHEN bod.billPayType = 'debit' AND bod.billStatus != 'Cancel' THEN bod.settledAmount
                                                ELSE 0
                                            END), 0), 0) AS amt,
                                            CONCAT(MONTHNAME(bod.billDate), '-', YEAR(bod.billDate)) AS date
                                          FROM
                                            billing_hotel_data AS bhd
                                          LEFT JOIN billing_hotelInfo_data AS hid ON hid.hotelId = bhd.hotelId
                                          LEFT JOIN billing_Official_data AS bod ON bod.billId = hid.billId
                                          WHERE bhd.hotelId = '${hotelId}' AND bod.billPayType = 'debit' AND bod.billStatus != 'Cancel'
                                          GROUP BY 
                                            YEAR(bod.billDate), 
                                            MONTH(bod.billDate)
                                          ORDER BY 
                                            YEAR(bod.billDate) ASC, 
                                            MONTH(bod.billDate) ASC;
                                          SELECT COALESCE(ROUND(SUM(paidAmount)),0) AS totalPaidAmount FROM billing_hotelTransaction_data WHERE hotelId = '${hotelId}'`;
        pool.query(sql_query_getMonthWiseData, (err, data) => {
            console.log(data[0].length);
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (!data[0].length) {
                const numRows = 0;
                const rows = [{
                    'msg': 'No Data Found'
                }]
                return res.status(200).send({ rows, numRows });
            } else {
                const creditAmtJson = data && data[0] ? Object.values(JSON.parse(JSON.stringify(data[0]))) : [];
                const debitAmtSum = data && data[1] ? data[1][0].totalPaidAmount : 0;
                const arr = MonthWiseData(creditAmtJson, debitAmtSum);
                const result = arr.sort((a, b) => {
                    let dateA = new Date(a.date);
                    let dateB = new Date(b.date);
                    return dateB - dateA;
                });
                const resulst = addStartAndEndDates(result);
                const rows = resulst.slice(startIndex, endIndex);
                const numRows = arr.length
                if (numRows != 0) {
                    return res.status(200).send({ rows, numRows });
                } else {
                    const rows = [{
                        'msg': 'No Data Found'
                    }]
                    return res.status(200).send({ rows, numRows });
                }
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Catrers Month Wise Data Function

function MonthWiseData(arr, cutAmt) {
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

// Export PDF Function

async function createBillPDF(res, datas, sumFooterArray, tableHeading) {
    try {
        // Create a new PDF document
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

        // Add auto table to the PDF document
        // Set font size for the title
        doc.setTextColor(255, 0, 0);
        doc.setFontSize(28);

        // Get the page width
        const pageWidth = doc.internal.pageSize.getWidth();

        // Calculate the text width for centering
        const text = "SHRI BHAGWATI FAST FOOD";
        const textWidth = doc.getTextWidth(text);

        // Calculate the x-coordinate to center the text
        const xCoordinate = (pageWidth - textWidth) / 2;

        // Add the centered title to the document
        doc.text(xCoordinate, 15, text);

        // Set font size back to normal for the address
        doc.setFontSize(14);

        // Add the address below the title, centered as well
        const address1 = "Palace Road, Rajkot - 360001";
        const address2 = "Mobile : 9825360287  , 9909036360";

        // Calculate the text width for the address
        const address1Width = doc.getTextWidth(address1);
        const address2Width = doc.getTextWidth(address2);

        // Calculate the x-coordinate to center the address
        const address1XCoordinate = (pageWidth - address1Width) / 2;
        const address2XCoordinate = (pageWidth - address2Width) / 2;

        doc.text(address1XCoordinate, 24, address1);
        doc.text(address2XCoordinate, 31, address2);

        const lineStartY = 35;
        doc.setDrawColor(255, 0, 0); // Set draw color to red
        doc.setLineWidth(0.5);
        doc.line(15, lineStartY, pageWidth - 15, lineStartY);

        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.setFont('BOLD')
        doc.text(address2XCoordinate + 8, 41, 'GSTIN: 24BDZPC3972L1ZX');

        doc.setDrawColor(0, 0, 0);
        doc.line(15, 43, pageWidth - 15, 43);

        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.setFont('BOLD')
        doc.text(15, 49, `A/c of : ${tableHeading} `);

        const amountColumnIndex = columns.findIndex(col => col.header === 'Amount');

        doc.autoTable({
            startY: 52,
            head: [columns.map(col => col.header)], // Extract headers correctly
            body: data,
            theme: 'grid',
            styles: {
                cellPadding: 2, // Add padding to cells for better appearance
                halign: 'center', // Horizontally center-align content
                fontSize: 12
            },
            columnStyles: {
                [amountColumnIndex]: { halign: 'right' } // Align amount column to the right
            }, headStyles: {
                lineWidth: 0.1, // Add border width
                lineColor: [192, 192, 192], // Add border color
                fontSize: 10,
                halign: 'center',
            },
            didParseCell: function (data) {
                // Apply a red background to the entire row if settled amount is 0
                const settledAmount = String(data.row.raw[6]);
                if (settledAmount == 'Cancel') {
                    data.cell.styles.fillColor = [255, 0, 79];
                    data.cell.styles.textColor = [255, 255, 255] // Red background for the entire row
                }
                var rows = data.table.body;
                if (data.row.index === rows.length - 1) {
                    data.cell.styles.fontSize = 12;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
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

// Export PDF of Transaction Invoice Hotel

async function createPDF(res, data) {
    try {
        const details = {
            invoiceNumber: data[0].invoiceNumber ? data[0].invoiceNumber.toString() : '',
            paidBy: data[0].paidBy ? data[0].paidBy : '',
            customerName: data[0].customerName ? data[0].customerName : '',
            customerNumber: data[0].customerNumber ? data[0].customerNumber : '',
            receivedBy: data[0].receivedBy ? data[0].receivedBy : '',
            pendingAmount: data[0].pendingAmount ? data[0].pendingAmount.toString() : '',
            paidAmount: data[0].paidAmount ? data[0].paidAmount.toString() : '',
            remainingAmount: data[0].remainingAmount ? data[0].remainingAmount.toString() : '',
            transactionNote: data[0].transactionNote ? data[0].transactionNote : '',
            transactionDate: data[0].transactionDate ? data[0].transactionDate : '',
            transactionTime: data[0].transactionTime ? data[0].transactionTime : '',
        }
        const document = await PDFDocument.load(readFileSync(process.env.INVOICE_BHAGWATI_URL));
        console.log('>>?>>?>?>?', process.env.INVOICE_BHAGWATI_URL)
        const helveticaFont = await document.embedFont(StandardFonts.Helvetica);
        const HelveticaBold = await document.embedFont(StandardFonts.HelveticaBold);
        const firstPage = document.getPage(0);

        // Load the image data synchronously using readFileSync
        const draftImageData = fs.readFileSync(process.env.DRAFT_LOGO_IMAGE_URL);

        // Embed the image data in the PDF document
        const draftImage = await document.embedPng(draftImageData);

        // Draw the image on the desired page
        const draftImageDims = draftImage.scale(0.6); // Adjust the scale as needed
        firstPage.drawImage(draftImage, {
            x: 50, // Adjust the X position as needed
            y: 100, // Adjust the Y position as needed
            width: draftImageDims.width + 50,
            height: draftImageDims.height + 100,
            opacity: 0.09, // Apply transparency (0.0 to 1.0)
        });

        firstPage.moveTo(105, 530);
        firstPage.drawText(details.invoiceNumber, {
            x: 140,
            y: 635,
            size: 10,
            fontSize: 100,
            font: HelveticaBold
        })

        firstPage.drawText(details.transactionDate, {
            x: 140,
            y: 621,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.transactionTime, {
            x: 140,
            y: 606,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.customerName, {
            x: 300,
            y: 635,
            size: 10,
            fontSize: 100,
            font: HelveticaBold
        })

        firstPage.drawText(details.customerNumber, {
            x: 300,
            y: 621,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.receivedBy, {
            x: 50,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.paidBy, {
            x: 159,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.pendingAmount, {
            x: 295,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.paidAmount, {
            x: 404,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.remainingAmount, {
            x: 476,
            y: 505,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(details.transactionNote, {
            x: 85,
            y: 435,
            size: 9,
            font: helveticaFont
        })

        const pdfBytes = await document.save();

        const stream = new Readable();
        stream.push(pdfBytes);
        stream.push(null);

        const fileName = 'jane-doe.pdf'; // Set the desired file name

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        stream.pipe(res);
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
    // writeFileSync("jane-doe.pdf", await document.save());
}

const exportHotelTransactionInvoice = async (req, res) => {
    try {
        const transactionId = req.query.transactionId;
        const sql_queries_getInvoiceDetails = `SELECT
                                                   RIGHT(htd.transactionId, 9) AS invoiceNumber,
                                                   hd.hotelName AS customerName,
                                                   hd.hotelMobileNo AS customerNumber,
                                                   receivedBy AS receivedBy,
                                                   givenBy AS paidBy,
                                                   pendingAmount,
                                                   paidAmount,
                                                   (pendingAmount - paidAmount) AS remainingAmount,
                                                   transactionNote,
                                                   DATE_FORMAT(transactionDate, '%d %M %Y, %W') AS transactionDate,
                                                   DATE_FORMAT(htd.creationDate, '%h:%i %p') AS transactionTime
                                               FROM
                                                   billing_hotelTransaction_data AS htd
                                               INNER JOIN billing_hotel_data AS hd ON hd.hotelId = htd.hotelId
                                               WHERE htd.transactionId = '${transactionId}'`;
        pool.query(sql_queries_getInvoiceDetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (!data.length) {
                return res.status(500).send('Invoice Not Found');
            } else {
                createPDF(res, data)
                    .then(() => {
                        console.log('PDF created successfully');
                        res.status(200);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send('Error creating PDF');
                    });
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Export Hotel Data PDF

const exportPdfHotelBillData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            hotelId: req.query.hotelId ? req.query.hotelId : null,
            payType: req.query.payType ? req.query.payType : null,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        let commaonQuery = `SELECT hotelName FROM billing_hotel_data WHERE hotelId = '${data.hotelId}';
                            SELECT 
                                bod.billNumber AS "Bill No",
                                bod.billPayType AS "Pay",
                                FORMAT(bod.totalAmount,2) AS "Bill Amt",
                                FORMAT(bod.totalDiscount,2) AS "Discount",
                                FORMAT(bod.settledAmount,2) AS "Settle Amt",
                                bod.billStatus AS "Status",
                                CONCAT(DATE_FORMAT(bod.billDate,'%d-%m-%Y'),' ',DATE_FORMAT(bod.billCreationDate,'%h:%i %p')) AS "Date"
                            FROM billing_Official_data AS bod
                            LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId`;

        if (data.payType && data.payType != 'cancel' && data.startDate && data.endDate) {
            sql_query_getDetails = `${commaonQuery}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billPayType = '${data.payType}'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY bod.billNumber DESC, bod.billDate DESC`;
        } else if (data.payType && data.payType == 'cancel' && data.startDate && data.endDate) {
            sql_query_getDetails = `${commaonQuery}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billStatus = '${data.payType}'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY bod.billNumber DESC, bod.billDate DESC`;
        } else if (data.startDate && data.endDate) {
            sql_query_getDetails = `${commaonQuery}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY bod.billNumber DESC, bod.billDate DESC`;
        } else if (data.payType && data.payType == 'cancel') {
            sql_query_getDetails = `${commaonQuery}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billStatus = '${data.payType}'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY bod.billNumber DESC, bod.billDate DESC`;
        } else if (data.payType) {
            sql_query_getDetails = `${commaonQuery}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billPayType = '${data.payType}'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY bod.billNumber DESC, bod.billDate DESC`;
        } else {
            sql_query_getDetails = `${commaonQuery}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY bod.billNumber DESC, bod.billDate DESC`;
        }
        pool.query(sql_query_getDetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const totalSettle = abc.reduce((total, item) => total + Number(item['Settle Amt'].replace(/,/g, '') || 0), 0);
            const totalDiscount = abc.reduce((total, item) => total + Number(item['Discount'].replace(/,/g, '') || 0), 0);
            const totalBillAmt = abc.reduce((total, item) => total + Number(item['Bill Amt'].replace(/,/g, '') || 0), 0);
            const sumFooterArray = ['Total', '', '',
                parseFloat(totalBillAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                parseFloat(totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                parseFloat(totalSettle).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ];

            let tableHeading = rows && rows[0].length ? rows[0][0].hotelName + ' (' + (data.startDate ? data.startDate : firstDay) + ' To ' + (data.endDate ? data.endDate : lastDay) + ')' : 'NA';


            createBillPDF(res, abc, sumFooterArray, tableHeading)
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
        res.status(500).json('Internal Server Error');
    }
}

// Export Hotel Data PDF

const exportPdfHotelBillDataById = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            hotelId: req.query.hotelId ? req.query.hotelId : null,
            payType: req.query.payType ? req.query.payType : null,
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        const commanTransactionQuarry = `SELECT hotelName FROM billing_hotel_data WHERE hotelId = '${data.hotelId}';
                                         SELECT 
                                            CONCAT(DATE_FORMAT(bod.billDate,'%d-%m-%Y'),' ',DATE_FORMAT(bod.billCreationDate,'%h:%i %p')) AS Date,
                                            FORMAT(bod.settledAmount,2) AS Amount,
                                            CONCAT('Bill No : ',bod.billNumber) AS "Bill Number",
                                            CONCAT('Room No : ',hif.roomNo) AS "Room Number"
                                         FROM billing_Official_data AS bod
                                         LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId`;
        if (data.payType && data.startDate && data.endDate) {
            sql_query_getDetails = `${commanTransactionQuarry}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billPayType = '${data.payType}'
                                    AND bod.billStatus != 'Cancel' 
                                    AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY bod.billDate ASC, bod.billCreationDate ASC`;
        } else if (data.startDate && data.endDate) {
            sql_query_getDetails = `${commanTransactionQuarry}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billStatus != 'Cancel'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                    ORDER BY bod.billDate ASC, bod.billCreationDate ASC`;
        } else if (data.payType) {
            sql_query_getDetails = `${commanTransactionQuarry}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billPayType = '${data.payType}'
                                    AND bod.billStatus != 'Cancel'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY bod.billDate ASC, bod.billCreationDate ASC`;
        } else {
            sql_query_getDetails = `${commanTransactionQuarry}
                                    WHERE hif.hotelId = '${data.hotelId}'
                                    AND bod.billStatus != 'Cancel'
                                    AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY bod.billDate ASC, bod.billCreationDate ASC`;
        }
        pool.query(sql_query_getDetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const grandTotal = abc.reduce((total, item) => total + Number(item.Amount.replace(/,/g, '') || 0), 0);
            const sumFooterArray = ['Total', '', parseFloat(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })];

            let tableHeading = rows && rows[0].length ? rows[0][0].hotelName + ' (' + (data.startDate ? data.startDate : firstDay) + ' To ' + (data.endDate ? data.endDate : lastDay) + ')' : 'NA';


            createBillPDF(res, abc, sumFooterArray, tableHeading)
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
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    getHotelList,
    getHotelDataById,
    getHotelStaticsData,
    getHotelBillDataById,
    addHotelData,
    removeHotelData,
    updateHotelData,
    ddlHotelList,
    exportPdfHotelBillDataById,
    addHotelTransactionData,
    removeHotelTransactionById,
    getMonthWiseTransactionForHotel,
    getHotelTransactionListById,
    exportHotelTransactionInvoice,
    exportPdfHotelBillData
}