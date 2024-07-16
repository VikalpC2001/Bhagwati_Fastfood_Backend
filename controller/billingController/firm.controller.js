const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Get Firm List

const getFirmData = async (req, res) => {
    try {
        var sql_queries_getDetails = `SELECT
                                        firmId,
                                        firmName,
                                        gstNumber,
                                        firmAddress,
                                        pincode,
                                        firmMobileNo,
                                        otherMobileNo
                                      FROM
                                        billing_firm_data`;

        pool.query(sql_queries_getDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                return res.status(200).send(rows);
            }
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Firm API

const addFirmData = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const uid1 = new Date();
                const firmId = String("firm_" + uid1.getTime());

                const data = {
                    firmName: req.body.firmName ? req.body.firmName : null,
                    gstNumber: req.body.gstNumber ? req.body.gstNumber : null,
                    firmAddress: req.body.firmAddress ? req.body.firmAddress : null,
                    pincode: req.body.pincode ? req.body.pincode : null,
                    firmMobileNo: req.body.firmMobileNo ? req.body.firmMobileNo : null,
                    otherMobileNo: req.body.otherMobileNo ? req.body.otherMobileNo : null
                }
                if (!data.firmName || !data.gstNumber || !data.firmAddress || !data.pincode || !data.firmMobileNo) {
                    return res.status(400).send("Please Fill All The Fields...!");
                } else {
                    pool.query(`SELECT firmName FROM billing_firm_data WHERE firmName = '${data.firmName}'`, function (err, row) {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        } else if (row && row.length) {
                            return res.status(400).send('Firm is Already In Use');
                        } else {
                            const sql_querry_addCategory = `INSERT INTO billing_firm_data (firmId, firmName, gstNumber, firmAddress, pincode, firmMobileNo, otherMobileNo)  
                                                            VALUES ('${firmId}','${data.firmName}','${data.gstNumber}','${data.firmAddress}',${data.pincode},'${data.firmMobileNo}',NULLIF('${data.otherMobileNo}','null'))`;
                            pool.query(sql_querry_addCategory, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                return res.status(200).send("Firm Added Successfully");
                            })
                        }
                    })
                }
            } else {
                return res.status(400).send('You are Not Authorised');
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Firm API

const removeFirmData = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const firmId = req.query.firmId.trim();
                req.query.firmId = pool.query(`SELECT firmId FROM billing_firm_data WHERE firmId = '${firmId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM billing_firm_data WHERE firmId = '${firmId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Firm Deleted Successfully");
                        })
                    } else {
                        return res.send('FirmId Not Found');
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
        res.status(500).send('Internal Server Error');
    }
}

// Update Firm API

const updateFirmData = async (req, res) => {
    try {
        const data = {
            firmId: req.body.firmId,
            firmName: req.body.firmName ? req.body.firmName : null,
            gstNumber: req.body.gstNumber ? req.body.gstNumber : null,
            firmAddress: req.body.firmAddress ? req.body.firmAddress : null,
            pincode: req.body.pincode ? req.body.pincode : null,
            firmMobileNo: req.body.firmMobileNo ? req.body.firmMobileNo : null,
            otherMobileNo: req.body.otherMobileNo ? req.body.otherMobileNo : null
        }
        if (!data.firmId || !data.firmName || !data.gstNumber || !data.firmAddress || !data.pincode || !data.firmMobileNo) {
            return res.status(400).send("Please Fill All The Fields...!");
        } else {

        }
        pool.query(`SELECT firmName FROM billing_firm_data WHERE firmName = '${data.firmName}' AND firmId != '${data.firmId}'`, function (err, row) {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (row && row.length) {
                return res.status(400).send('Firm is Already In Use');
            } else {
                const sql_querry_updatedetails = `UPDATE 
                                                    billing_firm_data 
                                                  SET 
                                                    firmName = '${data.firmName}',
                                                    gstNumber = '${data.gstNumber}',
                                                    firmAddress = '${data.firmAddress}',
                                                    pincode = ${data.pincode},
                                                    firmMobileNo = '${data.firmMobileNo}',
                                                    otherMobileNo = NULLIF('${data.otherMobileNo}','null')
                                                  WHERE firmId = '${data.firmId}'`;
                pool.query(sql_querry_updatedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Firm Updated Successfully");
                })
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// DDL Firm Data

const ddlFirmData = (req, res) => {
    try {
        var sql_queries_getDetails = `SELECT
                                        firmId,
                                        firmName
                                      FROM
                                        billing_firm_data`;

        pool.query(sql_queries_getDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                return res.status(200).send(rows);
            }
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getFirmData,
    addFirmData,
    removeFirmData,
    updateFirmData,
    ddlFirmData
}