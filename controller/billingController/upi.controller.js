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
                console.error("An error occurred in SQL Queery", err);
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
                            console.error("An error occurred in SQL Queery", err);
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
                                        console.error("An error occurred in SQL Queery", err);
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
        console.error('An error occurred', error);
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
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM billing_onlineUPI_data WHERE onlineId = '${onlineId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
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
        console.error('An error occurred', error);
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
                            console.error("An error occurred in SQL Queery", err);
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
                                        console.error("An error occurred in SQL Queery", err);
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
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// DDL UPI List

const ddlUPI = (req, res) => {
    try {
        const sql_query_getDetails = `SELECT
                                          onlineId,
                                          holderName,
                                          holderNumber,
                                          upiId,
                                          isOfficial,
                                          isDefault
                                      FROM
                                          billing_onlineUPI_data`;
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

// Get UPI Transaction By ID

const getUPITransactionById = (req, res) => {
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
                                return res.status(200).send({ rows, numRows, totalAmount });
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
    getUPIList,
    addUPI,
    removeUPI,
    updateUPI,
    ddlUPI,
    getUPITransactionById
}