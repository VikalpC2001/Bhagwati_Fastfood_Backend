const pool = require('../../database');
const jwt = require("jsonwebtoken");
const pool2 = require('../../databasePool');

// Get Date Function 4 Hour

function getCurrentDate() {
    const now = new Date();
    const hours = now.getHours();

    if (hours <= 4) { // If it's 4 AM or later, increment the date
        now.setDate(now.getDate() - 1);
    }
    return now.toDateString().slice(4, 15);
}

// Get Bill Category Function By First Word

function getCategory(input) {
    switch (input.toUpperCase()) {  // Ensure input is case-insensitive
        case 'H':
            return 'Hotel';
        case 'P':
            return 'Pick Up';
        case 'D':
            return 'Delivery';
        case 'R':
            return 'Dine In';
        default:
            return null;  // Default case if input doesn't match any cases
    }
}

// Get Delivery, Hotel & Bill Data By Token

const getDeliveryDataByToken = (req, res) => {
    try {
        const tknNo = req.query.tknNo;
        if (!tknNo) {
            return res.status(404).send('Token Not Found');
        } else {
            const tokenNo = Number.isInteger(Number(`${tknNo}`)) ? "D" + tknNo : tknNo;
            const matches = tokenNo.match(/([A-Za-z]+)(\d+)/);
            if (matches) {
                const result = [matches[1], parseInt(matches[2])];
                const billType = getCategory(result[0]);
                const currentDate = getCurrentDate();
                if (billType == 'Dine In') {
                    return res.status(404).send('Dine In Token Is Not Allowed');
                } else if (billType) {
                    let sql_query_getRecentBill = `SELECT 
                                                        bd.billId AS billId, 
                                                        bd.billNumber AS billNumber,
                                                        bd.totalAmount AS totalAmount,
                                                        CASE
                                                            WHEN bd.billType = 'Hotel' THEN CONCAT('H',btd.tokenNo)
                                                            WHEN bd.billType = 'Pick Up' THEN CONCAT('P',btd.tokenNo)
                                                            WHEN bd.billType = 'Delivery' THEN CONCAT('D',btd.tokenNo)
                                                            WHEN bd.billType = 'Dine In' THEN CONCAT('R',btd.tokenNo)
                                                        ELSE NULL
                                                        END AS tokenNo 
                                                   FROM billing_data AS bd
                                                   LEFT JOIN billing_token_data AS btd ON btd.billId = bd.billId
                                                   WHERE bd.billType = '${billType}' AND bd.billPayType != 'cancel' AND bd.billStatus != 'cancel' AND bd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                   ORDER BY btd.tokenNo DESC`;
                    pool.query(sql_query_getRecentBill, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        } else {
                            if (data && data.length) {
                                const isBillId = data.filter((e) => {
                                    if (e.tokenNo.toUpperCase() == tokenNo.toUpperCase()) {
                                        return e.billId;
                                    } else {
                                        null
                                    }
                                });
                                const billId = isBillId && isBillId[0] ? isBillId[0].billId : null;
                                if (billId) {
                                    let sql_query_chkBillStatus = `SELECT * FROM billing_data WHERE billId = '${billId}' AND billStatus = 'Print'`;
                                    pool.query(sql_query_chkBillStatus, (err, result) => {
                                        if (err) {
                                            console.error("An error occurred in SQL Queery", err);
                                            return res.status(500).send('Database Error'); t
                                        } else {
                                            if (result && result.length) {
                                                let sql_query_getBillingData = `SELECT 
                                                                                    bd.billId AS billId, 
                                                                                    bd.billType AS billType,
                                                                                    CASE
                                                                                        WHEN bd.billType = 'Hotel' THEN CONCAT('H',btd.tokenNo)
                                                                                        WHEN bd.billType = 'Pick Up' THEN CONCAT('P',btd.tokenNo)
                                                                                        WHEN bd.billType = 'Delivery' THEN CONCAT('D',btd.tokenNo)
                                                                                        WHEN bd.billType = 'Dine In' THEN CONCAT('R',btd.tokenNo)
                                                                                    ELSE NULL
                                                                                    END AS tokenNo,
                                                                                    bd.billPayType AS billPayType, 
                                                                                    bd.settledAmount AS settledAmount
                                                                                FROM 
                                                                                    billing_data AS bd
                                                                                LEFT JOIN billing_token_data AS btd ON btd.billId = bd.billId
                                                                                WHERE bd.billId = '${billId}'`;
                                                let sql_query_getCustomerInfo = `SELECT
                                                                                    TRIM(CONCAT(
                                                                                        COALESCE(bwc.customerName, ''),
                                                                                        IF((bwc.customerName IS NOT NULL OR bwc.customerName IS NOT NULL) AND bwc.address IS NOT NULL, ' - ', ''),
                                                                                        COALESCE(bwc.address, ''),
                                                                                        IF((bwc.mobileNo IS NOT NULL OR bwc.customerName IS NOT NULL OR bwc.address IS NOT NULL) AND bwc.locality IS NOT NULL, ' - ', ''),
                                                                                        COALESCE(bwc.locality, '')
                                                                                    )) AS billAddress
                                                                                 FROM
                                                                                     billing_billWiseCustomer_data AS bwc
                                                                                 WHERE bwc.billId = '${billId}'`;
                                                let sql_query_getHotelInfo = `SELECT
                                                                                    TRIM(CONCAT(
                                                                                        COALESCE(bhd.hotelName, ''),
                                                                                        IF(bhd.hotelName IS NOT NULL AND hif.roomNo IS NOT NULL, ' - ', ''),
                                                                                        COALESCE(hif.roomNo, '')
                                                                                    )) AS billAddress
                                                                              FROM
                                                                                  billing_hotelInfo_data AS hif
                                                                              LEFT JOIN billing_hotel_data AS bhd ON bhd.hotelId = hif.hotelId
                                                                              WHERE hif.billId = '${billId}'`;
                                                const sql_query_getBillData = `${sql_query_getBillingData};
                                                                   ${billType == 'Hotel' ? sql_query_getHotelInfo + ';' : ''}
                                                                   ${billType == 'Pick Up' || billType == 'Delivery' ? sql_query_getCustomerInfo : ''}`;
                                                pool.query(sql_query_getBillData, (err, billData) => {
                                                    if (err) {
                                                        console.error("An error occurred in SQL Queery", err);
                                                        return res.status(500).send('Database Error'); t
                                                    } else {
                                                        const json = {
                                                            ...billData[0][0],
                                                            ...(billType === 'Hotel' ? billData[1][0] : ''),
                                                            ...(billType == 'Pick Up' || billType == 'Delivery' ? billData && billData[1][0] ? billData[1][0] : '' : '')
                                                        }
                                                        return res.status(200).send(json);
                                                    }
                                                })
                                            } else {
                                                return res.status(400).send('Token Is Already Used');
                                            }
                                        }
                                    })
                                } else {
                                    return res.status(404).send('Token Number Not Found');
                                }
                            } else {
                                return res.status(404).send('No Data Found');
                            }
                        }
                    })
                } else {
                    return res.status(404).send('Token Bill Type Not Found');
                }
            } else {
                return res.status(400).send('Token Format is Incorrect');
            }
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get On Delivery Data

const getOnDeliveryData = (req, res) => {
    try {
        let sql_query_getOnDeliveryId = `SELECT deliveryId FROM delivery_data 
                                         WHERE deliveryStatus IN ('On Delivery', 'Delivered')
                                         ORDER BY deliveryCreationDate DESC`;
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
                                                             INSERT(delivery_person_data.mobileNo, 6, 0, ' ') AS mobileNo,
                                                             totalBillAmt,
                                                             totalChange,
                                                             totalDesiredAmt,
                                                             durationTime,
                                                             deliveryDate,
                                                             deliveryStatus,
                                                             SEC_TO_TIME(
                                                                TIMESTAMPDIFF(
                                                                    SECOND,
                                                                    delivery_data.deliveryCreationDate,
                                                                    NOW()
                                                                )
                                                            ) AS timeDifference
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
                            return res.status(200).send(results);
                        })
                        .catch(error => {
                            console.error('An error occurred', error);
                            return res.status(500).send('Internal Server Error');
                        });
                } else {
                    return res.status(404).send('Deliveries Not Found');
                }
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// ADD Delivery Data

const addDeliveryData = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return res.status(500).send('Database Error');
        }
        try {
            connection.beginTransaction((err) => {
                if (err) {
                    console.error("Error beginning transaction:", err);
                    connection.release();
                    return res.status(500).send('Database Error');
                } else {
                    let token;
                    token = req.headers ? req.headers.authorization.split(" ")[1] : null;
                    if (token) {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        const enterBy = decoded.id.firstName;

                        const currentDate = getCurrentDate();
                        const deliveryData = req.body;

                        if (!deliveryData.personId || !deliveryData.deliveryBillData.length) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill All The Fields..!');
                            })
                        } else {
                            const uid1 = new Date();
                            const deliveryId = String("delivery_" + uid1.getTime());

                            let sql_querry_chkDeliveryPerson = `SELECT personId, deliveryId FROM delivery_data WHERE personId = '${deliveryData.personId}' AND deliveryStatus = 'On Delivery'`;
                            connection.query(sql_querry_chkDeliveryPerson, (err, person) => {
                                if (err) {
                                    console.error("Error Check Delivery Person Availability:", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                } else {
                                    if (person && person.length) {
                                        const onDeliveryId = person[0].deliveryId
                                        let sql_query_getOnDeliveryData = `SELECT
                                                                               deliveryId,
                                                                               enterBy,
                                                                               delivery_data.personId,
                                                                               delivery_person_data.personName,
                                                                               totalBillAmt,
                                                                               totalChange,
                                                                               totalDesiredAmt,
                                                                               durationTime,
                                                                               deliveryDate,
                                                                               deliveryStatus,
                                                                               SEC_TO_TIME(
                                                                                  TIMESTAMPDIFF(
                                                                                      SECOND,
                                                                                      delivery_data.deliveryCreationDate,
                                                                                      NOW()
                                                                                  )
                                                                              ) AS timeDifference
                                                                           FROM
                                                                               delivery_data
                                                                           INNER JOIN delivery_person_data ON delivery_person_data.personId = delivery_data.personId
                                                                           WHERE deliveryId = '${onDeliveryId}';
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
                                                                           WHERE bwd.deliveryId = '${onDeliveryId}'`;
                                        connection.query(sql_query_getOnDeliveryData, (err, result) => {
                                            if (err) {
                                                console.error("Error Get Delivery Bill Data:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                const json = {
                                                    ...result[0][0],
                                                    deliveryData: result[1]
                                                }
                                                connection.commit((err) => {
                                                    if (err) {
                                                        console.error("Error committing transaction:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        connection.release();
                                                        return res.status(402).send(json);
                                                    }
                                                });
                                            }
                                        })
                                    } else {

                                        const sums = deliveryData.deliveryBillData.reduce((acc, bill) => {
                                            acc.billAmt += bill.billAmt || 0;
                                            acc.billChange += bill.billChange || 0;
                                            acc.desiredAmt += bill.desiredAmt || 0;
                                            return acc;
                                        }, { billAmt: 0, billChange: 0, desiredAmt: 0 });

                                        let sql_querry_addDeliveryData = `INSERT INTO delivery_data (
                                                                                         deliveryId,
                                                                                         enterBy,
                                                                                         personId,
                                                                                         totalBillAmt,
                                                                                         totalChange,
                                                                                         totalDesiredAmt,
                                                                                         durationTime,
                                                                                         deliveryDate,
                                                                                         deliveryStatus
                                                                                        )
                                                                                 VALUES (
                                                                                         '${deliveryId}',
                                                                                         '${enterBy}',
                                                                                         '${deliveryData.personId}',
                                                                                          ${sums.billAmt ? sums.billAmt : 0},
                                                                                          ${sums.billChange ? sums.billChange : 0},
                                                                                          ${sums.desiredAmt ? sums.desiredAmt : 0},
                                                                                         '${deliveryData.durationTime}',
                                                                                         STR_TO_DATE('${currentDate}','%b %d %Y'),
                                                                                         'On Delivery'
                                                                                        )`;
                                        connection.query(sql_querry_addDeliveryData, (err) => {
                                            if (err) {
                                                console.error("Error inserting Delivery Data:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                const deliveryBillData = deliveryData.deliveryBillData;

                                                let billIds = (deliveryBillData && deliveryBillData.length)
                                                    ? `(${deliveryBillData.map(item => `'${item.billId}'`).join(',')})`
                                                    : '(NULL)';

                                                let addBillWiseDeliveryData = deliveryBillData.map((item, index) => {
                                                    let uniqueId = `bwd_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                                    return `('${uniqueId}', 
                                                             '${deliveryId}', 
                                                              ${item.billId ? `'${item.billId}'` : null}, 
                                                              ${item.billAddress ? `'${item.billAddress}'` : null}, 
                                                             '${item.deliveryType}', 
                                                              ${item.billPayType ? `'${item.billPayType}'` : null}, 
                                                              ${item.billAmt ? item.billAmt : 0}, 
                                                              ${item.billChange ? item.billChange : 0},
                                                              ${item.desiredAmt ? item.desiredAmt : 0},
                                                             STR_TO_DATE('${currentDate}','%b %d %Y'))`;
                                                }).join(', ');
                                                let sql_query_addDeliveries = `INSERT INTO delivery_billWiseDelivery_data (bwdId, deliveryId, billId, billAddress, deliveryType, billPayType, billAmt, billChange, desiredAmt, bwdDate)
                                                                               VALUES ${addBillWiseDeliveryData};
                                                                               UPDATE billing_data SET billStatus = 'On Delivery' WHERE billId IN ${billIds};
                                                                               UPDATE billing_Official_data SET billStatus = 'On Delivery' WHERE billId IN ${billIds};
                                                                               UPDATE billing_Complimentary_data SET billStatus = 'On Delivery' WHERE billId IN ${billIds}`;
                                                connection.query(sql_query_addDeliveries, (err) => {
                                                    if (err) {
                                                        console.error("Error inserting Delivery Bill Data:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        connection.commit((err) => {
                                                            if (err) {
                                                                console.error("Error committing transaction:", err);
                                                                connection.rollback(() => {
                                                                    connection.release();
                                                                    return res.status(500).send('Database Error');
                                                                });
                                                            } else {
                                                                connection.release();
                                                                return res.status(200).send('Delivery Start Successfully');
                                                            }
                                                        });
                                                    }
                                                })
                                            }
                                        });

                                    }
                                }
                            })
                        }
                    } else {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Login First....!');
                        });
                    }
                }
            });
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    });
}

// Remove Delivery Data

const removeDeliveryData = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return res.status(500).send('Database Error');
        }
        try {
            connection.beginTransaction((err) => {
                if (err) {
                    console.error("Error beginning transaction:", err);
                    connection.release();
                    return res.status(500).send('Database Error');
                } else {
                    let token;
                    token = req.headers ? req.headers.authorization.split(" ")[1] : null;
                    if (token) {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        const enterBy = decoded.id.firstName;

                        const deliveryId = req.query.deliveryId
                        if (!deliveryId) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill deliveryId..!');
                            })
                        } else {
                            let sql_querry_chkDeliveryId = `SELECT deliveryId FROM delivery_data WHERE deliveryId = '${deliveryId}'`;
                            connection.query(sql_querry_chkDeliveryId, (err, id) => {
                                if (err) {
                                    console.error("Error Check deliveryId:", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                } else {
                                    if (id && id.length) {
                                        let sql_querry_addDeliveryData = `UPDATE billing_data SET billStatus = 'Print' 
                                                                          WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryId}') AND billStatus != 'cancel';
                                                                          UPDATE billing_Official_data SET billStatus = 'Print'
                                                                          WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryId}') AND billStatus != 'cancel';
                                                                          UPDATE billing_Complimentary_data SET billStatus = 'Print'
                                                                          WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryId}') AND billStatus != 'cancel'`;
                                        connection.query(sql_querry_addDeliveryData, (err) => {
                                            if (err) {
                                                console.error("Error Update Delivery Bill Status:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                let sql_query_removeOldDeliveries = `DELETE FROM delivery_data WHERE deliveryId = '${deliveryId}'`;
                                                connection.query(sql_query_removeOldDeliveries, (err) => {
                                                    if (err) {
                                                        console.error("Error Remove Delivery Data:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        connection.commit((err) => {
                                                            if (err) {
                                                                console.error("Error committing transaction:", err);
                                                                connection.rollback(() => {
                                                                    connection.release();
                                                                    return res.status(500).send('Database Error');
                                                                });
                                                            } else {
                                                                connection.release();
                                                                return res.status(200).send('Delivery Remove Successfully');
                                                            }
                                                        });
                                                    }
                                                })
                                            }
                                        });
                                    } else {
                                        return res.status(404).send('deliveryId Not Found');
                                    }
                                }
                            });
                        }
                    } else {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Login First....!');
                        });
                    }
                }
            });
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    });
}

// Update All Delivery Data

const updateDeliveryData = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return res.status(500).send('Database Error');
        }
        try {
            connection.beginTransaction((err) => {
                if (err) {
                    console.error("Error beginning transaction:", err);
                    connection.release();
                    return res.status(500).send('Database Error');
                } else {
                    let token;
                    token = req.headers ? req.headers.authorization.split(" ")[1] : null;
                    if (token) {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        const enterBy = decoded.id.firstName;
                        const currentDate = getCurrentDate();
                        const deliveryData = req.body;

                        if (!deliveryData.personId || !deliveryData.deliveryBillData.length) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill All The Fields..!');
                            })
                        } else {

                            const sums = deliveryData.deliveryBillData.reduce((acc, bill) => {
                                acc.billAmt += bill.billAmt || 0;
                                acc.billChange += bill.billChange || 0;
                                acc.desiredAmt += bill.desiredAmt || 0;
                                return acc;
                            }, { billAmt: 0, billChange: 0, desiredAmt: 0 });

                            let sql_querry_addDeliveryData = `UPDATE
                                                                  delivery_data
                                                              SET
                                                                  enterBy = '${enterBy}',
                                                                  personId = '${deliveryData.personId}',
                                                                  totalBillAmt = ${sums.billAmt ? sums.billAmt : 0},
                                                                  totalChange = ${sums.billChange ? sums.billChange : 0},
                                                                  totalDesiredAmt = ${sums.desiredAmt ? sums.desiredAmt : 0}
                                                              WHERE
                                                                  deliveryId = '${deliveryData.deliveryId}';
                                                              UPDATE billing_data SET billStatus = 'Print' 
                                                              WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryData.deliveryId}') AND billStatus != 'cancel';
                                                              UPDATE billing_Official_data SET billStatus = 'Print'
                                                              WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryData.deliveryId}') AND billStatus != 'cancel';
                                                              UPDATE billing_Complimentary_data SET billStatus = 'Print'
                                                              WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryData.deliveryId}' AND billStatus != 'cancel')`;
                            connection.query(sql_querry_addDeliveryData, (err) => {
                                if (err) {
                                    console.error("Error Update Delivery Data:", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                } else {
                                    let sql_query_removeOldDeliveries = `DELETE FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryData.deliveryId}'`;
                                    connection.query(sql_query_removeOldDeliveries, (err) => {
                                        if (err) {
                                            console.error("Error Remove Old Delivery Bill Data:", err);
                                            connection.rollback(() => {
                                                connection.release();
                                                return res.status(500).send('Database Error');
                                            });
                                        } else {
                                            const deliveryBillData = deliveryData.deliveryBillData;

                                            let billIds = (deliveryBillData && deliveryBillData.length)
                                                ? `(${deliveryBillData.map(item => `'${item.billId}'`).join(',')})`
                                                : '(NULL)';

                                            let addBillWiseDeliveryData = deliveryBillData.map((item, index) => {
                                                let uniqueId = `bwd_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                                return `('${uniqueId}', 
                                                 '${deliveryData.deliveryId}', 
                                                  ${item.billId ? `'${item.billId}'` : null}, 
                                                  ${item.billAddress ? `'${item.billAddress}'` : null}, 
                                                 '${item.deliveryType}', 
                                                  ${item.billPayType ? `'${item.billPayType}'` : null}, 
                                                  ${item.billAmt ? item.billAmt : 0}, 
                                                  ${item.billChange ? item.billChange : 0},
                                                  ${item.desiredAmt ? item.desiredAmt : 0},
                                                 STR_TO_DATE('${currentDate}','%b %d %Y'))`;
                                            }).join(', ');

                                            let sql_query_addDeliveries = `INSERT INTO delivery_billWiseDelivery_data (bwdId, deliveryId, billId, billAddress, deliveryType, billPayType, billAmt, billChange, desiredAmt, bwdDate)
                                                                           VALUES ${addBillWiseDeliveryData};
                                                                           UPDATE billing_data SET billStatus = 'On Delivery' WHERE billId IN ${billIds};
                                                                           UPDATE billing_Official_data SET billStatus = 'On Delivery' WHERE billId IN ${billIds};
                                                                           UPDATE billing_Complimentary_data SET billStatus = 'On Delivery' WHERE billId IN ${billIds}`;
                                            connection.query(sql_query_addDeliveries, (err) => {
                                                if (err) {
                                                    console.error("Error inserting Delivery Bill Data:", err);
                                                    connection.rollback(() => {
                                                        connection.release();
                                                        return res.status(500).send('Database Error');
                                                    });
                                                } else {
                                                    let sql_query_getDeliveryData = `SELECT
                                                                                         deliveryId,
                                                                                         enterBy,
                                                                                         personId,
                                                                                         totalBillAmt,
                                                                                         totalChange,
                                                                                         totalDesiredAmt,
                                                                                         durationTime,
                                                                                         deliveryDate,
                                                                                         deliveryStatus,
                                                                                         SEC_TO_TIME(
                                                                                            TIMESTAMPDIFF(
                                                                                                SECOND,
                                                                                                delivery_data.deliveryCreationDate,
                                                                                                NOW()
                                                                                            )
                                                                                        ) AS timeDifference
                                                                                     FROM
                                                                                         delivery_data
                                                                                     WHERE deliveryId = '${deliveryData.deliveryId}';
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
                                                                                     WHERE bwd.deliveryId = '${deliveryData.deliveryId}'`;
                                                    connection.query(sql_query_getDeliveryData, (err, data) => {
                                                        if (err) {
                                                            console.error("Error inserting Delivery Bill Data:", err);
                                                            connection.rollback(() => {
                                                                connection.release();
                                                                return res.status(500).send('Database Error');
                                                            });
                                                        } else {
                                                            let json = {
                                                                ...data[0][0],
                                                                deliveryData: data[1]
                                                            }
                                                            connection.commit((err) => {
                                                                if (err) {
                                                                    console.error("Error committing transaction:", err);
                                                                    connection.rollback(() => {
                                                                        connection.release();
                                                                        return res.status(500).send('Database Error');
                                                                    });
                                                                } else {
                                                                    connection.release();
                                                                    return res.status(200).send(json);
                                                                }
                                                            });
                                                        }
                                                    })
                                                }
                                            })
                                        }
                                    });
                                }
                            });
                        }
                    } else {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Login First....!');
                        });
                    }
                }
            });
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    });
}

// Update Delivery Person In Delivery Data

const updateDeliveryPerson = (req, res) => {
    try {
        const personId = req.query.personId ? req.query.personId : null;
        const deliveryId = req.query.deliveryId ? req.query.deliveryId : null;
        if (!personId || !deliveryId) {
            return res.status(404).send('Please Fill All The Fields...!');
        } else {
            let sql_query_chkPersonAvailability = `SELECT personId FROM delivery_data WHERE personId = '${personId}' AND deliveryStatus = 'On Delivery' AND deliveryId != '${deliveryId}'`;
            pool.query(sql_query_chkPersonAvailability, (err, chk) => {
                if (err) {
                    console.error("An error occurred in SQL Query", err);
                    return res.status(500).send('Database Error');
                } else {
                    if (chk && chk.length) {
                        return res.status(400).send('Person Is On Delivery');
                    } else {
                        let sql_query_chkPersonAvailability = `UPDATE delivery_data SET personId = '${personId}' WHERE deliveryId = '${deliveryId}'`;
                        pool.query(sql_query_chkPersonAvailability, (err, result) => {
                            if (err) {
                                console.error("An error occurred in SQL Query", err);
                                return res.status(500).send('Database Error');
                            } else {
                                return res.status(200).send(personId);
                            }
                        })
                    }
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Stop Delivery Data

const stopDeliveryData = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return res.status(500).send('Database Error');
        }
        try {
            connection.beginTransaction((err) => {
                if (err) {
                    console.error("Error beginning transaction:", err);
                    connection.release();
                    return res.status(500).send('Database Error');
                } else {
                    let token;
                    token = req.headers ? req.headers.authorization.split(" ")[1] : null;
                    if (token) {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        const enterBy = decoded.id.firstName;
                        const currentDate = getCurrentDate();
                        const deliveryId = req.query.deliveryId;

                        if (!deliveryId) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill All The Fields..!');
                            })
                        } else {
                            let sql_querry_updateDelivery = `UPDATE
                                                                  delivery_data
                                                              SET
                                                                  durationTime = SEC_TO_TIME(
                                                                                     TIMESTAMPDIFF(
                                                                                         SECOND,
                                                                                         delivery_data.deliveryCreationDate,
                                                                                         NOW()
                                                                                     )
                                                                                 ),
                                                                  deliveryStatus = 'complete'
                                                              WHERE 
                                                                  deliveryId = '${deliveryId}';`;
                            connection.query(sql_querry_updateDelivery, (err) => {
                                if (err) {
                                    console.error("Error Update Delivery Data:", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                } else {
                                    let sql_query_updateBillStatus = `UPDATE billing_data SET billStatus = 'complete' 
                                                                      WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryId}');
                                                                      UPDATE billing_Official_data SET billStatus = 'complete'
                                                                      WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryId}');
                                                                      UPDATE billing_Complimentary_data SET billStatus = 'complete'
                                                                      WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryId}')`;
                                    connection.query(sql_query_updateBillStatus, (err) => {
                                        if (err) {
                                            console.error("Error Update Bill Status:", err);
                                            connection.rollback(() => {
                                                connection.release();
                                                return res.status(500).send('Database Error');
                                            });
                                        } else {
                                            connection.commit((err) => {
                                                if (err) {
                                                    console.error("Error committing transaction:", err);
                                                    connection.rollback(() => {
                                                        connection.release();
                                                        return res.status(500).send('Database Error');
                                                    });
                                                } else {
                                                    connection.release();
                                                    return res.status(200).send('Delivery has Completed');
                                                }
                                            });
                                        }
                                    })
                                }
                            })
                        }
                    } else {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Login First....!');
                        });
                    }
                }
            });
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    });
}

// Change PayType In Delivery Console

const changePayTypeByDelivery = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return res.status(500).send('Database Error');
        }
        try {
            connection.beginTransaction((err) => {
                if (err) {
                    console.error("Error beginning transaction:", err);
                    connection.release();
                    return res.status(500).send('Database Error');
                } else {
                    let token;
                    token = req.headers ? req.headers.authorization.split(" ")[1] : null;
                    if (token) {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        const enterBy = decoded.id.firstName;
                        const uid1 = new Date();
                        const bwuId = String("bwu_" + uid1.getTime());
                        const dabId = String("dab_" + uid1.getTime());
                        const deliveryData = req.body;

                        const currentDate = getCurrentDate();
                        if (!deliveryData.deliveryId || !deliveryData.payTypeData ||
                            !deliveryData.payTypeData.bwdId || !deliveryData.payTypeData.deliveryType || !deliveryData.payTypeData.billPayType) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill All The Fields..!');
                            })
                        } else {
                            if (deliveryData.payTypeData.deliveryType == 'Hotel') {
                                let sql_querry_updateDelivery = `UPDATE
                                                                     delivery_data
                                                                 SET
                                                                     totalBillAmt = ${deliveryData.totalBillAmt ? deliveryData.totalBillAmt : 0},
                                                                     totalChange = ${deliveryData.totalChange ? deliveryData.totalChange : 0},
                                                                     totalDesiredAmt = ${deliveryData.totalDesiredAmt ? deliveryData.totalDesiredAmt : 0}
                                                                 WHERE deliveryId = '${deliveryData.deliveryId}';
                                                                 UPDATE
                                                                     delivery_billWiseDelivery_data
                                                                 SET
                                                                     billPayType = '${deliveryData.payTypeData.billPayType}',
                                                                     billAmt = ${deliveryData.payTypeData.billAmt ? deliveryData.payTypeData.billAmt : 0},
                                                                     billChange = ${deliveryData.payTypeData.billChange ? deliveryData.payTypeData.billChange : 0},
                                                                     desiredAmt = ${deliveryData.payTypeData.desiredAmt ? deliveryData.payTypeData.desiredAmt : 0}
                                                                 WHERE bwdId = '${deliveryData.payTypeData.bwdId}';
                                                                 UPDATE billing_data SET billStatus = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}';
                                                                 UPDATE billing_billWiseItem_data SET billStatus = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}';
                                                                 UPDATE billing_Official_data SET billStatus = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}'`;
                                connection.query(sql_querry_updateDelivery, (err) => {
                                    if (err) {
                                        console.error("Error Update Delivery Data:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        connection.commit((err) => {
                                            if (err) {
                                                console.error("Error committing transaction:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                connection.release();
                                                return res.status(200).send('Change Successfully');
                                            }
                                        });
                                    }
                                });
                            } else {
                                const currentDateMD = `DATE_FORMAT(STR_TO_DATE('${currentDate}', '%b %d %Y'), '%m-%d')`;
                                let sql_query_chkOfficial = `SELECT billId FROM billing_Official_data WHERE billId = '${deliveryData.payTypeData.billId}';
                                                             SELECT IF(COUNT(*) = 0, 0, MAX(billNumber)) AS officialLastBillNo FROM billing_Official_data bod CROSS JOIN (SELECT COALESCE(resetDate, '04-01') AS resetDate FROM billing_firm_data WHERE firmId = (SELECT firmId FROM billing_category_data WHERE categoryName = '${deliveryData.payTypeData.deliveryType}') LIMIT 1) AS frm WHERE bod.firmId = (SELECT firmId FROM billing_category_data WHERE categoryName = '${deliveryData.payTypeData.deliveryType}') AND (${currentDateMD} < frm.resetDate OR (${currentDateMD} >= frm.resetDate AND DATE_FORMAT(bod.billDate, '%m-%d') >= frm.resetDate AND DATE_FORMAT(bod.billCreationDate, '%m-%d') >= frm.resetDate)) FOR UPDATE;`;
                                connection.query(sql_query_chkOfficial, (err, chkExist) => {
                                    if (err) {
                                        console.error("Error check official bill exist or not:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        const isExist = chkExist && chkExist[0].length ? true : false;
                                        const officialLastBillNo = chkExist && chkExist[1] ? chkExist[1][0].officialLastBillNo : 0;
                                        const nextOfficialBillNo = officialLastBillNo + 1;
                                        let sql_querry_updateDelivery = `UPDATE
                                                                             delivery_data
                                                                         SET
                                                                             totalBillAmt = ${deliveryData.totalBillAmt ? deliveryData.totalBillAmt : 0},
                                                                             totalChange = ${deliveryData.totalChange ? deliveryData.totalChange : 0},
                                                                             totalDesiredAmt = ${deliveryData.totalDesiredAmt ? deliveryData.totalDesiredAmt : 0}
                                                                         WHERE deliveryId = '${deliveryData.deliveryId}';
                                                                         UPDATE
                                                                             delivery_billWiseDelivery_data
                                                                         SET
                                                                             billPayType = '${deliveryData.payTypeData.billPayType}',
                                                                             billAmt = ${deliveryData.payTypeData.billAmt ? deliveryData.payTypeData.billAmt : 0},
                                                                             billChange = ${deliveryData.payTypeData.billChange ? deliveryData.payTypeData.billChange : 0},
                                                                             desiredAmt = ${deliveryData.payTypeData.desiredAmt ? deliveryData.payTypeData.desiredAmt : 0}
                                                                         WHERE bwdId = '${deliveryData.payTypeData.bwdId}';
                                        ${deliveryData.payTypeData.billPayType == 'Cancel'
                                                ?
                                                `UPDATE billing_data SET billPayType = '${deliveryData.payTypeData.billPayType}', billStatus = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 UPDATE billing_billWiseItem_data SET billPayType = '${deliveryData.payTypeData.billPayType}', billStatus = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 UPDATE billing_Official_data SET billPayType = '${deliveryData.payTypeData.billPayType}', billStatus = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 DELETE FROM billing_billWiseUpi_data WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 DELETE FROM due_billAmount_data WHERE billId = '${deliveryData.payTypeData.billId}';`
                                                :
                                                `UPDATE billing_data SET billPayType = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 UPDATE billing_billWiseItem_data SET billPayType = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 UPDATE billing_Official_data SET billPayType = '${deliveryData.payTypeData.billPayType}' WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 DELETE FROM billing_billWiseUpi_data WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 DELETE FROM due_billAmount_data WHERE billId = '${deliveryData.payTypeData.billId}';
                                                 ${deliveryData.payTypeData.billPayType == 'online'
                                                    ?
                                                    `INSERT INTO billing_billWiseUpi_data(bwuId, onlineId, billId, amount, onlineDate)
                                                     VALUES('${bwuId}', '${deliveryData.onlineId}', '${deliveryData.payTypeData.billId}', '${deliveryData.payTypeData.billAmt}', STR_TO_DATE('${currentDate}','%b %d %Y'));`
                                                    :
                                                    deliveryData.accountId && deliveryData.payTypeData.billPayType == 'due'
                                                        ?
                                                        `INSERT INTO due_billAmount_data(dabId, enterBy, accountId, billId, billAmount, dueNote, dueDate)
                                                         VALUES('${dabId}', '${enterBy}', '${deliveryData.accountId}','${deliveryData.payTypeData.billId}',${deliveryData.payTypeData.billAmt},${deliveryData.billNote ? `'${deliveryData.billNote}'` : null}, STR_TO_DATE('${currentDate}','%b %d %Y'));`
                                                        :
                                                        ''}
                                                 ${!isExist && deliveryData.isOfficial
                                                    ?
                                                    `INSERT INTO billing_Official_data(billId, billNumber, firmId, cashier, menuStatus, billType, billPayType, discountType, discountValue, totalDiscount, totalAmount, settledAmount, billComment, billDate, billStatus)
                                                     SELECT billId, ${nextOfficialBillNo}, firmId, cashier, menuStatus, billType, '${deliveryData.payTypeData.billPayType}', discountType, discountValue, totalDiscount, totalAmount, settledAmount, billComment, billDate, billStatus FROM billing_data WHERE billId = '${deliveryData.payTypeData.billId}';`
                                                    :
                                                    ''}`}`;
                                        connection.query(sql_querry_updateDelivery, (err) => {
                                            if (err) {
                                                console.error("Error Update Delivery Data:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                connection.commit((err) => {
                                                    if (err) {
                                                        console.error("Error committing transaction:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        connection.release();
                                                        return res.status(200).send('Change Successfully');
                                                    }
                                                });
                                            }
                                        });
                                    }
                                })
                            }
                        }
                    } else {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Login First....!');
                        });
                    }
                }
            });
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    });
}

module.exports = {
    getDeliveryDataByToken,
    getOnDeliveryData,
    addDeliveryData,
    removeDeliveryData,
    updateDeliveryData,
    updateDeliveryPerson,
    stopDeliveryData,
    changePayTypeByDelivery
}
