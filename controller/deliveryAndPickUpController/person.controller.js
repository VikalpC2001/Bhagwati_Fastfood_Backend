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

// Get Customer Data

const getDeliveryPersonList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const filterData = {
            searchWord: req.query.searchWord ? req.query.searchWord : '',
            currentDate: getCurrentDate(),
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM delivery_person_data WHERE delivery_person_data.personName LIKE '%` + filterData.searchWord + `%'`;
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_getDetails = `SELECT
                                                  dpd.personId,
                                                  dpd.personName,
                                                  dpd.shortName,
                                                  dpd.mobileNo,
                                                  dpd.isAvailable,
                                                  COALESCE(dd.totalRound, 0) AS totalRound,
                                                  COALESCE(dd.totalWorkTime, '00:00:00') AS totalTime
                                              FROM
                                                  delivery_person_data AS dpd
                                              LEFT JOIN(
                                                  SELECT personId,
                                                      COUNT(*) AS totalRound,
                                                      COALESCE(SEC_TO_TIME(
                                                          SUM(TIME_TO_SEC(durationTime))
                                                      ),'00:00:00') AS totalWorkTime
                                                  FROM
                                                      delivery_data
                                                  WHERE
                                                      deliveryDate BETWEEN STR_TO_DATE('${filterData.startDate ? filterData.startDate : filterData.currentDate}','%b %d %Y') AND STR_TO_DATE('${filterData.endDate ? filterData.endDate : filterData.currentDate}','%b %d %Y') AND deliveryStatus = 'complete'
                                                  GROUP BY
                                                      personId) AS dd ON dpd.personId = dd.personId
                                              WHERE dpd.personName LIKE '%` + filterData.searchWord + `%'
                                              ORDER BY dpd.isAvailable DESC, dd.totalRound DESC
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

// Add Person API

const addDeliveryPerson = async (req, res) => {
    try {
        const uid1 = new Date();
        const personId = String("person_" + uid1.getTime());

        const data = {
            personName: req.body.personName ? req.body.personName : null,
            shortName: req.body.shortName ? req.body.shortName : null,
            mobileNo: req.body.mobileNo ? req.body.mobileNo : null,
            isAvailable: req.body.isAvailable ? req.body.isAvailable : true,
        }
        if (!data.personName || !data.shortName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            pool.query(`SELECT personName FROM delivery_person_data WHERE personName = '${data.personName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Name is Already In Use');
                } else {
                    const sql_querry_addCategory = `INSERT INTO delivery_person_data (personId, personName, shortName, mobileNo, isAvailable)  
                                                    VALUES ('${personId}','${data.personName}', '${data.shortName}',${data.mobileNo ? `'${data.mobileNo}'` : null}, ${data.isAvailable})`;
                    pool.query(sql_querry_addCategory, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Person Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Person API

const removeDeliveryPerson = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const personId = req.query.personId.trim();
                req.query.personId = pool.query(`SELECT personId FROM delivery_person_data WHERE personId = '${personId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM delivery_person_data WHERE personId = '${personId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Person Deleted Successfully");
                        })
                    } else {
                        return res.send('PersonId Not Found');
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

// Update Person API

const updateDeliveryPerson = async (req, res) => {
    try {
        const data = {
            personId: req.body.personId.trim(),
            personName: req.body.personName ? req.body.personName : null,
            shortName: req.body.shortName ? req.body.shortName : null,
            mobileNo: req.body.mobileNo ? req.body.mobileNo : null,
            isAvailable: req.body.isAvailable,
        }
        if (!data.personId || !data.personName || !data.shortName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            pool.query(`SELECT personName FROM delivery_person_data WHERE personName = '${data.personName}' AND personId != '${data.personId}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Short Name is Already In Use');
                } else {
                    const sql_querry_updatedetails = `UPDATE    
                                                        delivery_person_data 
                                                      SET
                                                         personName = '${data.personName}',
                                                         shortName = '${data.shortName}',
                                                         mobileNo = ${data.mobileNo ? `'${data.mobileNo}'` : null},
                                                         isAvailable = ${data.isAvailable}
                                                      WHERE personId = '${data.personId}'`;
                    pool.query(sql_querry_updatedetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Person Updated Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// DDL Person Data

const ddlPersonData = (req, res) => {
    try {
        const sql_querry_getddlCategory = `SELECT personId, personName FROM delivery_person_data 
                                           WHERE isAvailable = 1
                                           ORDER BY personName ASC`;
        pool.query(sql_querry_getddlCategory, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Statics For Person

const getStaticsForPerson = (req, res) => {
    try {
        const data = {
            personId: req.query.personId ? req.query.personId : null,
            currentDate: getCurrentDate(),
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (!data.personId) {
            return res.status(404).send('personId Not Found....!');
        } else {
            let sql_query_getPersonStaticsData = `SELECT
                                                      COALESCE(SEC_TO_TIME(
                                                          SUM(TIME_TO_SEC(dd.durationTime))
                                                      ),'00:00:00') AS totalWorkTime,
                                                      COUNT(*) AS deliveryRound,
                                                      COALESCE(ROUND(SUM(dd.totalBillAmt)),0) AS totalParcelAmt
                                                  FROM
                                                      delivery_data dd
                                                  WHERE
                                                      dd.personId = '${data.personId}' AND dd.deliveryStatus = 'complete'
                                                  AND dd.deliveryDate BETWEEN STR_TO_DATE('${data.startDate ? data.startDate : data.currentDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate ? data.endDate : data.currentDate}','%b %d %Y');
                                                SELECT
                                                    SUM(CASE WHEN bwd.deliveryType IN ('Delivery', 'Hotel', 'Pick Up') THEN 1 ELSE 0 END) AS totalNoOfParcel,
                                                    SUM(CASE WHEN bwd.deliveryType IN ('Due Bill', 'other') THEN 1 ELSE 0 END) AS numberOfOtherWork
                                                FROM
                                                    delivery_billWiseDelivery_data AS bwd
                                                WHERE
                                                    bwd.deliveryId IN (
                                                        SELECT COALESCE(dd.deliveryId, NULL)
                                                        FROM delivery_data AS dd
                                                        WHERE dd.personId = '${data.personId}' AND dd.deliveryStatus = 'complete'
                                                    )
                                                AND bwd.bwdDate BETWEEN STR_TO_DATE('${data.startDate ? data.startDate : data.currentDate}','%b %d %Y') AND STR_TO_DATE('${data.endDate ? data.endDate : data.currentDate}','%b %d %Y')`;
            pool.query(sql_query_getPersonStaticsData, (err, statics) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    let json = {
                        ...statics[0][0],
                        ...statics[1][0]
                    }
                    return res.status(200).send(json);
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get Delivery Info By PersonId

const getDeliveryDataByPerson = (req, res) => {
    try {
        let page = req.query.page; // Page number
        let numPerPage = Number(req.query.numPerPage); // Number of items per page
        let startIndex = (page - 1) * numPerPage;
        let endIndex = startIndex + numPerPage;
        const filterData = {
            personId: req.query.personId ? req.query.personId : null,
            currentDate: getCurrentDate(),
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (!page || !numPerPage) {
            return res.status(404).send('page or limit not found..!');
        } else if (!filterData.personId) {
            return res.status(404).send('personId NotFound');
        } else {
            let sql_query_getOnDeliveryId = `SELECT deliveryId FROM delivery_data 
                                             WHERE personId = '${filterData.personId}' AND deliveryDate BETWEEN STR_TO_DATE('${filterData.startDate ? filterData.startDate : filterData.currentDate}','%b %d %Y') AND STR_TO_DATE('${filterData.endDate ? filterData.endDate : filterData.currentDate}','%b %d %Y')
                                             AND deliveryStatus = 'Complete' ORDER BY deliveryCreationDate DESC`;
            pool.query(sql_query_getOnDeliveryId, (err, deliveries) => {
                if (err) {
                    console.error("An error occurred in SQL Query", err);
                    return res.status(500).send('Database Error');
                } else {
                    if (deliveries && deliveries.length) {
                        const billDataPromises = deliveries.map(bill => {
                            const deliveryId = bill.deliveryId;

                            let sql_query_getDeliveryData = `SELECT
                                                             deliveryId,
                                                             enterBy,
                                                             delivery_data.personId,
                                                             delivery_person_data.personName,
                                                             totalBillAmt,
                                                             totalChange,
                                                             totalDesiredAmt,
                                                             durationTime,
                                                             DATE_FORMAT(deliveryDate,'%D %b %Y') AS deliveryDate,
                                                             deliveryStatus,
                                                             CONCAT(TIME_FORMAT(deliveryCreationDate, '%h:%i %p'),' To ',
                                                                    TIME_FORMAT(ADDTIME(deliveryCreationDate, durationTime), '%h:%i %p'))
                                                             AS timePeriod
                                                         FROM
                                                             delivery_data
                                                         INNER JOIN delivery_person_data ON delivery_person_data.personId = delivery_data.personId
                                                         WHERE deliveryId = '${deliveryId}';
                                                         SELECT
                                                            bwd.bwdId,
                                                            bwd.deliveryId,
                                                            bwd.billId,
                                                            CASE 
                                                            	WHEN bwd.deliveryType = 'Hotel' THEN CONCAT('H', btd.tokenNo) 
                                                            	WHEN bwd.deliveryType = 'Pick Up' THEN CONCAT('P', btd.tokenNo) 
                                                            	WHEN bwd.deliveryType = 'Delivery' THEN CONCAT('D', btd.tokenNo) 
                                                            	WHEN bwd.deliveryType = 'Dine In' THEN CONCAT('R', btd.tokenNo)
                                                                WHEN bwd.deliveryType = 'Due Bill' THEN 'B'
                                                                WHEN bwd.deliveryType = 'other' THEN 'O'  
                                                              	ELSE NULL
	                                                        END AS token,
                                                            bwd.billAddress,
                                                            bwd.deliveryType,
                                                            bwd.billPayType,
                                                            bwd.billAmt,
                                                            bwd.billChange,
                                                            bwd.desiredAmt
                                                        FROM
                                                            delivery_billWiseDelivery_data AS bwd
                                                        LEFT JOIN billing_token_data AS btd ON btd.billId = bwd.billId
                                                        WHERE bwd.deliveryId = '${deliveryId}'`;
                            return new Promise((resolve, reject) => {
                                pool.query(sql_query_getDeliveryData, (err, data) => {
                                    if (err) {
                                        console.error("An error occurred in SQL Query", err);
                                        return reject('Database Error');
                                    } else {
                                        const json = {
                                            ...data[0][0],
                                            deliveryData: data[1]
                                        }
                                        return resolve(json);
                                    }
                                });
                            });
                        });

                        Promise.all(billDataPromises)
                            .then(results => {
                                const rows = results.slice(startIndex, endIndex);
                                const numRows = results.length
                                return res.status(200).send({ rows, numRows });
                            })
                            .catch(error => {
                                console.error('An error occurred', error);
                                return res.status(500).send('Internal Server Error');
                            });
                    } else {
                        const rows = [{
                            'msg': 'No Data Found'
                        }]
                        return res.status(200).send({ rows, numRows: 0 });
                    }
                }
            });
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    getDeliveryPersonList,
    addDeliveryPerson,
    removeDeliveryPerson,
    updateDeliveryPerson,
    ddlPersonData,
    getStaticsForPerson,
    getDeliveryDataByPerson
}