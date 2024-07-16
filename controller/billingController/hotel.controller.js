const pool = require('../../database');
const jwt = require("jsonwebtoken");

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
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
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
                                                CASE
                                                    WHEN discountType = 'percentage' THEN CONCAT(discount,' %')
                                                    WHEN discountType = 'fixed' THEN CONCAT('₹ ',discount)
                                                    ELSE discount
                                                END AS discountView,
                                                discount
                                              FROM 
                                                billing_hotel_data
                                              WHERE hotelName LIKE '%` + searchWord + `%'
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
                                            hotelAddress,
                                            hotelLocality,
                                            hotelPincode,
                                            hotelMobileNo,
                                            otherMobileNo,
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
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    return res.status(200).send(data[0]);
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
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
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Hotel is Already In Use');
                } else {
                    const sql_querry_addHotelData = `INSERT INTO billing_hotel_data (hotelId, hotelName, hotelAddress ,hotelLocality, hotelPincode, hotelMobileNo, otherMobileNo, payType, discountType, discount)
                                                     VALUES ('${hotelId}', '${data.hotelName}', ${data.hotelAddress ? `'${data.hotelAddress}'` : null}, ${data.hotelLocality ? `'${data.hotelLocality}'` : null}, ${data.hotelPincode ? `${data.hotelPincode}` : null}, '${data.hotelMobileNo}',${data.otherMobileNo ? `'${data.otherMobileNo}'` : null}, '${data.payType}', '${data.discountType}', ${data.discount})`;
                    pool.query(sql_querry_addHotelData, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Hotel Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
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
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM billing_hotel_data WHERE hotelId = '${hotelId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
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
        if (!data.hotelId || !data.hotelName || !data.hotelMobileNo || !data.payType || !data.discountType) {
            return res.status(404).send('Please Fill All The Fields....!');
        } else {
            pool.query(`SELECT hotelName FROM billing_hotel_data WHERE hotelName = '${data.hotelName}' AND hotelId != '${data.hotelId}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
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
                                                            discount = ${data.discount}
                                                        WHERE hotelId = '${data.hotelId}'`;
                    pool.query(sql_querry_updateHotelData, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Hotel Updated Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
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
                console.error("An error occurd in SQL Queery", err);
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
        console.error('An error occurd', error);
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
                                          AND bbod.billStatus = '${data.payType}'
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
        console.log(sql_querry_getCountDetails);
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
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
                                            AND bbod.billStatus = '${data.payType}'
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
        if (data.startDate && data.endDate) {
            sql_query_hotelStatics = `SELECT 
                                          ROUND(SUM(CASE WHEN bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalBusiness,
                                          ROUND(SUM(CASE WHEN bod.billPayType = 'cash' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalCash,
                                          ROUND(SUM(CASE WHEN bod.billPayType = 'debit' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalDebit,
                                          ROUND(SUM(CASE WHEN bod.billStatus = 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalCancel,
                                          ROUND(SUM(CASE WHEN bod.billStatus != 'cancel' THEN bod.totalDiscount ELSE 0 END), 2) AS totalDiscount,
                                          0 AS totalRemaining
                                      FROM 
                                          billing_Official_data AS bod
                                      LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                      WHERE 
                                          hif.hotelId = '${hotelId}'
                                          AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')`;
        } else {
            sql_query_hotelStatics = `SELECT 
                                          ROUND(SUM(CASE WHEN bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalBusiness,
                                          ROUND(SUM(CASE WHEN bod.billPayType = 'cash' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalCash,
                                          ROUND(SUM(CASE WHEN bod.billPayType = 'debit' AND bod.billStatus != 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalDebit,
                                          ROUND(SUM(CASE WHEN bod.billStatus = 'cancel' THEN bod.settledAmount ELSE 0 END), 2) AS totalCancel,
                                          ROUND(SUM(CASE WHEN bod.billStatus != 'cancel' THEN bod.totalDiscount ELSE 0 END), 2) AS totalDiscount,
                                          0 AS totalRemaining
                                      FROM 
                                          billing_Official_data AS bod
                                      LEFT JOIN billing_hotelInfo_data AS hif ON bod.billId = hif.billId
                                      WHERE 
                                          hif.hotelId = '${hotelId}'
                                          AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y')`;
        }
        pool.query(sql_query_hotelStatics, (err, statics) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                return res.status(200).send(statics[0])
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
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
    ddlHotelList
}
