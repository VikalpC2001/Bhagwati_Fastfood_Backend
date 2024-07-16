const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Get Due Customer UPI

const getUPIList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM billing_onlineUPI_data`;
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_getDetails = `SELECT 
                                                onlineId,
                                                holderName,
                                                holderNumber,
                                                upiId,
                                                isOfficial
                                              FROM 
                                                billing_onlineUPI_data
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

// Add UPI API

const addUPI = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const uid1 = new Date();
                const onlineId = String("online_" + uid1.getTime());

                const data = {
                    holderName: req.body.holderName ? req.body.holderName.trim() : null,
                    holderNumber: req.body.holderNumber ? req.body.holderNumber.trim() : null,
                    upiId: req.body.upiId ? req.body.upiId.trim() : null,
                    isOfficial: req.body.isOfficial
                }
                if (!data.holderName || !data.holderNumber || !data.upiId) {
                    return res.status(400).send("Please Fill All The Fields...!");
                } else {
                    let sql_query_checkExist = `SELECT holderName FROM billing_onlineUPI_data WHERE holderName = '${data.holderName}';
                                                SELECT holderNumber FROM billing_onlineUPI_data WHERE holderNumber = '${data.holderNumber}';
                                                SELECT upiId FROM billing_onlineUPI_data WHERE holderName = '${data.upiId}';`
                    pool.query(sql_query_checkExist, (err, row) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        } else {
                            const oldData = Object.values(JSON.parse(JSON.stringify(row)));
                            if (oldData && oldData[0].length > 0) {
                                return res.status(400).send('Holder Name is Already In Use');
                            } else if (oldData && oldData[1].length > 0) {
                                return res.status(400).send('Holder Number is Already In Use');
                            } else if (oldData && oldData[2].length > 0) {
                                return res.status(400).send('UPI ID is Already In Use');
                            } else {
                                const sql_querry_addCategory = `INSERT INTO billing_onlineUPI_data (onlineId, holderName, holderNumber, upiId, isOfficial)  
                                                                VALUES ('${onlineId}','${data.holderName}', '${data.holderNumber}', '${data.upiId}', ${data.isOfficial})`;
                                pool.query(sql_querry_addCategory, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    return res.status(200).send("UPI Added Successfully");
                                })
                            }
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

// Remove UPI API

const removeUPI = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const onlineId = req.query.onlineId.trim();
                req.query.onlineId = pool.query(`SELECT onlineId FROM billing_onlineUPI_data WHERE onlineId = '${onlineId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM billing_onlineUPI_data WHERE onlineId = '${onlineId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("UPI Deleted Successfully");
                        })
                    } else {
                        return res.send('OnlineId Not Found');
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

// Update UPI API

const updateUPI = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const data = {
                    onlineId: req.body.onlineId ? req.body.onlineId : null,
                    holderName: req.body.holderName ? req.body.holderName.trim() : null,
                    holderNumber: req.body.holderNumber ? req.body.holderNumber.trim() : null,
                    upiId: req.body.upiId ? req.body.upiId.trim() : null,
                    isOfficial: req.body.isOfficial
                }
                if (!data.onlineId || !data.holderName || !data.holderNumber) {
                    return res.status(400).send("Please Add UPI");
                } else {
                    let sql_query_checkExist = `SELECT holderName FROM billing_onlineUPI_data WHERE holderName = '${data.holderName}' AND onlineId != '${data.onlineId}';
                                                SELECT holderNumber FROM billing_onlineUPI_data WHERE holderNumber = '${data.holderNumber}' AND onlineId != '${data.onlineId}';
                                                SELECT upiId FROM billing_onlineUPI_data WHERE holderName = '${data.upiId}' AND onlineId != '${data.onlineId}';`
                    pool.query(sql_query_checkExist, (err, row) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        } else {
                            const oldData = Object.values(JSON.parse(JSON.stringify(row)));
                            if (oldData && oldData[0].length > 0) {
                                return res.status(400).send('Holder Name is Already In Use');
                            } else if (oldData && oldData[1].length > 0) {
                                return res.status(400).send('Holder Number is Already In Use');
                            } else if (oldData && oldData[2].length > 0) {
                                return res.status(400).send('UPI ID is Already In Use');
                            } else {
                                const sql_querry_updatedetails = `UPDATE 
                                                                    billing_onlineUPI_data 
                                                                  SET 
                                                                    holderName = '${data.holderName}',
                                                                    holderNumber = '${data.holderNumber}',
                                                                    upiId = '${data.upiId}',
                                                                    isOfficial = ${data.isOfficial}
                                                                  WHERE onlineId = '${data.onlineId}'`;
                                pool.query(sql_querry_updatedetails, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    return res.status(200).send("UPI Updated Successfully");
                                })
                            }
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

// DDL UPI List

const ddlUPI = (req, res) => {
    try {
        const sql_query_getDetails = `SELECT
                                          onlineId,
                                          upiId,
                                          isOfficial
                                      FROM
                                          billing_onlineUPI_data`;
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
    getUPIList,
    addUPI,
    removeUPI,
    updateUPI,
    ddlUPI
}