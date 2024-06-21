const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Get Hotel List

const getHotelList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM billing_hotel_data`;
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
                                                discount
                                              FROM 
                                                billing_hotel_data 
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
        if (!data.hotelName || !data.hotelAddress || !data.hotelLocality || !data.hotelPincode || !data.hotelMobileNo || !data.payType || !data.discountType || !data.discount) {
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
                                                     VALUES ('${hotelId}', '${data.hotelName}', '${data.hotelAddress}', '${data.hotelLocality}', ${data.hotelPincode}, '${data.hotelMobileNo}', NULLIF('${data.otherMobileNo}','null'), '${data.payType}', '${data.discountType}', ${data.discount})`;
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
        if (!data.hotelId || !data.hotelName || !data.hotelAddress || !data.hotelLocality || !data.hotelPincode || !data.hotelMobileNo || !data.payType || !data.discountType || !data.discount) {
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
                                                            hotelAddress = '${data.hotelAddress}',
                                                            hotelLocality = '${data.hotelLocality}',
                                                            hotelPincode = ${data.hotelPincode},
                                                            hotelMobileNo = '${data.hotelMobileNo}',
                                                            otherMobileNo = NULLIF('${data.otherMobileNo}','null'),
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

module.exports = {
    getHotelList,
    addHotelData,
    removeHotelData,
    updateHotelData,
    ddlHotelList
}
