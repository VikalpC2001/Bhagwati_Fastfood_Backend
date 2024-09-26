const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

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
                                                COALESCE(hotelAddress,'N/A') AS hotelAddress,
                                                COALESCE(hotelLocality,'N/A') AS hotelLocality,
                                                COALESCE(hotelPincode,'N/A') AS hotelPincode,
                                                hotelMobileNo,
                                                COALESCE(otherMobileNo,'N/A') AS otherMobileNo,
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
                        console.error("An error occurred in SQL Queery", err);
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
                                            COALESCE(hotelAddress,'N/A') AS hotelAddress,
                                            COALESCE(hotelLocality,'N/A') AS hotelLocality,
                                            COALESCE(hotelPincode,'N/A') AS hotelPincode,
                                            hotelMobileNo,
                                            COALESCE(otherMobileNo,'N/A') AS otherMobileNo,
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
        console.log(sql_querry_getCountDetails);
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

// Export PDF Function

async function createBillPDF(res, datas, sumFooterArray, tableHeading) {
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
            },
            didParseCell: function (data) {
                var rows = data.table.body;
                if (data.row.index === rows.length - 1) {
                    data.cell.styles.fontSize = 14
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

// Export Hotel Data PDF

const exportPdfBillDataById = (req, res) => {
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
        console.log(data.startDate)
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
                                        ORDER BY bod.billDate ASC`;
        } else if (data.startDate && data.endDate) {
            sql_query_getDetails = `${commanTransactionQuarry}
                                        WHERE hif.hotelId = '${data.hotelId}'
                                        AND bod.billStatus != 'Cancel'
                                        AND bod.billDate BETWEEN STR_TO_DATE('${data.startDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate}','%b %d %Y')
                                        ORDER BY bod.billDate ASC`;
        } else if (data.payType) {
            sql_query_getDetails = `${commanTransactionQuarry}
                                        WHERE hif.hotelId = '${data.hotelId}'
                                        AND bod.billPayType = '${data.payType}'
                                        AND bod.billStatus != 'Cancel'
                                        AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                        ORDER BY bod.billDate ASC`;
        } else {
            sql_query_getDetails = `${commanTransactionQuarry}
                                        WHERE hif.hotelId = '${data.hotelId}'
                                        AND bod.billStatus != 'Cancel'
                                        AND bod.billDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                        ORDER BY bod.billDate ASC`;
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
                                              COALESCE(SUM(CASE 
                                                  WHEN bod.billPayType = 'debit' AND bod.billStatus != 'Cancel' THEN bod.settledAmount 
                                                  ELSE 0 
                                              END), 0) - COALESCE(SUM(ht.paidAmount), 0) AS remainingAmount
                                          FROM
                                              billing_hotel_data AS bhd
                                          LEFT JOIN billing_hotelInfo_data AS hinfo ON bhd.hotelId = hinfo.hotelId
                                          LEFT JOIN billing_Official_data AS bod ON hinfo.billId = bod.billId
                                          LEFT JOIN billing_hotelTransaction_data AS ht ON bhd.hotelId = ht.hotelId
                                          WHERE bhd.hotelId = '${hotelId}'
                                          GROUP BY bhd.hotelName`;
            pool.query(get_remaining_amount, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const remainingAmount = data[0].remainingAmount

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
                const sql_query_staticQuery = `SELECT transactionId, hotelId, receivedBy, givenBy, pendingAmount, paidAmount, transactionNote, transactionDate FROM billing_hotelTransaction_data`;
                if (data.startDate && data.endDate) {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE hotelId = '${data.hotelId}' 
                                            AND transactionDate BETWEEN STR_TO_DATE('${data.startDate}', '%b %d %Y') AND STR_TO_DATE('${data.endDate}', '%b %d %Y')
                                            ORDER BY transactionDate DESC
                                            LIMIT ${limit}`;
                } else {
                    sql_query_getDetails = `${sql_query_staticQuery}
                                            WHERE hotelId = '${data.hotelId}' 
                                            AND transactionDate BETWEEN STR_TO_DATE('${firstDay}', '%b %d %Y') AND STR_TO_DATE('${lastDay}', '%b %d %Y')
                                            ORDER BY transactionDate DESC
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
        let numPerPage = req.query.numPerPage; // Number of items per page
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
                                          WHERE bhd.hotelId = '${hotelId}'
                                          GROUP BY 
                                            YEAR(bod.billDate), 
                                            MONTH(bod.billDate)
                                          ORDER BY 
                                            YEAR(bod.billDate) ASC, 
                                            MONTH(bod.billDate) ASC;
                                          SELECT COALESCE(ROUND(SUM(paidAmount)),0) AS totalPaidAmount FROM billing_hotelTransaction_data WHERE hotelId = '${hotelId}'`;
        pool.query(sql_query_getMonthWiseData, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const creditAmtJson = data && data[0] ? Object.values(JSON.parse(JSON.stringify(data[0]))) : [];
                const debitAmtSum = data && data[1] ? data[1][0].totalPaidAmount : 0;
                const arr = MonthWiseData(creditAmtJson, debitAmtSum);
                const result = arr.sort((a, b) => {
                    let dateA = new Date(a.date);
                    let dateB = new Date(b.date);
                    return dateB - dateA;
                });
                const rows = result.slice(startIndex, endIndex);
                const numRows = arr.length
                return res.status(200).send({ rows, numRows });
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

module.exports = {
    getHotelList,
    getHotelDataById,
    getHotelStaticsData,
    getHotelBillDataById,
    addHotelData,
    removeHotelData,
    updateHotelData,
    ddlHotelList,
    exportPdfBillDataById,
    addHotelTransactionData,
    removeHotelTransactionById,
    getMonthWiseTransactionForHotel,
    getHotelTransactionListById
}