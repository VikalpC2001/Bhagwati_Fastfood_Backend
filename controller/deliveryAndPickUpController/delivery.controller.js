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
                if (billType) {
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
                                                   WHERE bd.billType = '${billType}' AND bd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                   ORDER BY btd.tokenNo DESC`;
                    pool.query(sql_query_getRecentBill, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
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
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error'); t
                                        } else {
                                            if (result && result.length) {
                                                let sql_query_getBillingData = `SELECT 
                                                                                    bd.billId AS billId, 
                                                                                    bd.billType AS billType, 
                                                                                    bd.billPayType AS billPayType, 
                                                                                    bd.settledAmount AS settledAmount
                                                                                FROM 
                                                                                    billing_data AS bd
                                                                                WHERE bd.billId = '${billId}'`;
                                                let sql_query_getCustomerInfo = `SELECT
                                                                                    TRIM(CONCAT(
                                                                                        COALESCE(bwc.customerName, ''),
                                                                                        IF((bwc.mobileNo IS NOT NULL OR bwc.customerName IS NOT NULL) AND bwc.address IS NOT NULL, ' - ', ''),
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
                                                        console.error("An error occurd in SQL Queery", err);
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
                                                return res.status(400).send('Token Is Already Delivered');
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
        console.error('An error occurd', error);
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
                                                             personId,
                                                             totalBillAmt,
                                                             totalChange,
                                                             totalDesiredAmt,
                                                             durationTime,
                                                             deliveryDate,
                                                             deliveryStatus
                                                         FROM
                                                             delivery_data
                                                         WHERE deliveryId = '${deliveryId}';
                                                         SELECT
                                                            bwdId,
                                                            deliveryId,
                                                            billId,
                                                            billAddress,
                                                            deliveryType,
                                                            billPayType,
                                                            billAmt,
                                                            billChange,
                                                            desiredAmt
                                                        FROM
                                                            delivery_billWiseDelivery_data
                                                        WHERE deliveryId = '${deliveryId}'`;

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
                                                                                          ${deliveryData.totalBillAmt},
                                                                                          ${deliveryData.totalChange},
                                                                                          ${deliveryData.totalDesiredAmt},
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
                                                  ${item.desiredAmt ? item.desiredAmt : 0})`;
                                    }).join(', ');
                                    let sql_query_addDeliveries = `INSERT INTO delivery_billWiseDelivery_data (bwdId, deliveryId, billId, billAddress, deliveryType, billPayType, billAmt, billChange, desiredAmt)
                                                                   VALUES ${addBillWiseDeliveryData};
                                                                   UPDATE billing_data SET billStatus = 'On Delivery' WHERE billId IN ${billIds}`;
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
                    } else {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Login First....!');
                        });
                    }
                }
            });
        } catch (error) {
            console.error('An error occurd', error);
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
                                                                          WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryId}')`;
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
            console.error('An error occurd', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    });
}

// Get Delivery, Hotel & Bill Data By Token

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

                        const deliveryData = req.body;
                        if (!deliveryData.personId || !deliveryData.deliveryBillData.length) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill All The Fields..!');
                            })
                        } else {
                            let sql_querry_addDeliveryData = `UPDATE
                                                                  delivery_data
                                                              SET
                                                                  enterBy = '${enterBy}',
                                                                  personId = '${deliveryData.personId}',
                                                                  totalBillAmt = ${deliveryData.totalBillAmt},
                                                                  totalChange = ${deliveryData.totalChange},
                                                                  totalDesiredAmt = ${deliveryData.totalDesiredAmt}
                                                              WHERE
                                                                  deliveryId = '${deliveryData.deliveryId}';
                                                              UPDATE billing_data SET billStatus = 'Print' 
                                                              WHERE billId IN (SELECT COALESCE(billId,NULL) FROM delivery_billWiseDelivery_data WHERE deliveryId = '${deliveryData.deliveryId}')`;
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
                                                  ${item.desiredAmt ? item.desiredAmt : 0})`;
                                            }).join(', ');

                                            let sql_query_addDeliveries = `INSERT INTO delivery_billWiseDelivery_data (bwdId, deliveryId, billId, billAddress, deliveryType, billPayType, billAmt, billChange, desiredAmt)
                                                                           VALUES ${addBillWiseDeliveryData};
                                                                           UPDATE billing_data SET billStatus = 'On Delivery' WHERE billId IN ${billIds}`;
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
                                                            return res.status(200).send('Delivery Updated Successfully');
                                                        }
                                                    });
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
            console.error('An error occurd', error);
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
    updateDeliveryData
}
