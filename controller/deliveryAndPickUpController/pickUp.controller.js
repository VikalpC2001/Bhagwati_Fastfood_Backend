const pool = require('../../database');
const pool2 = require('../../databasePool');
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

// Get Token List To Display

const getTokenList = (req, res) => {
    try {
        const currentDate = getCurrentDate();
        let sql_querry_getlist = `SELECT 
                                    btd.tokenNo, 
                                    bd.billStatus, 
                                    bd.billId, 
                                    bd.settledAmount,
                                    SEC_TO_TIME(
                                        TIMESTAMPDIFF(
                                            SECOND,
                                            bd.billCreationDate,
                                            NOW()
                                        )
                                    ) AS timeDifference 
                                  FROM billing_token_data AS btd 
                                  LEFT JOIN billing_data AS bd ON bd.billId = btd.billId 
                                  WHERE btd.billType = 'Pick Up' AND bd.billStatus NOT IN ('complete','cancel') AND btd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        pool.query(sql_querry_getlist, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                return res.status(200).send(data);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Display Token Number

const getDisplayTokenNumbr = (req, res) => {
    try {
        const currentDate = getCurrentDate();
        let sql_querry_getReadyToken = `SELECT btd.tokenNo, bd.billId FROM billing_token_data AS btd 
                                        LEFT JOIN billing_data AS bd ON bd.billId = btd.billId 
                                        WHERE btd.billType = 'Pick Up' AND bd.billStatus = 'Food Ready' AND btd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
        pool.query(sql_querry_getReadyToken, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                return res.status(200).send(data);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Food Ready For Pick Up

const updateTokenToDisplay = (req, res) => {
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
                    const tokenNo = req.query.tokenNo ? req.query.tokenNo : null;
                    const currentDate = getCurrentDate();
                    if (!tokenNo) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send("Pleast Fill Token No...!")
                        })
                    } else if (!Number.isInteger(Number(tokenNo))) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(401).send("Token must be a Number")
                        })
                    } else {
                        let sql_querry_getBillIdByToken = `SELECT tokenId, billId FROM billing_token_data
                                                           WHERE tokenNo = ${tokenNo} AND billType = 'Pick Up' AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y');`;
                        connection.query(sql_querry_getBillIdByToken, (err, token) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                            } else if (token && token.length) {
                                const billId = token[0] && token[0].billId ? token[0].billId : null;
                                let sql_querry_chkStatus = `SELECT billId, billStatus FROM billing_data 
                                                            WHERE billId = '${billId}' AND billType = 'Pick Up' AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
                                connection.query(sql_querry_chkStatus, (err, bill) => {
                                    if (err) {
                                        console.error("An error occurred in SQL Queery", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        if (bill && bill.length) {
                                            const billStatus = bill[0].billStatus ? bill[0].billStatus : null;
                                            if (billStatus && !['Print', 'Food Ready'].includes(billStatus)) {
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(404).send(`Token No. ${tokenNo} Is ${billStatus}..!`);
                                                });
                                            } else {
                                                let sql_querry_update = `UPDATE billing_data
                                                                         SET billStatus = CASE
                                                                                            WHEN billStatus = 'Print' THEN 'Food Ready'
                                                                                            WHEN billStatus = 'Food Ready' THEN 'complete'
                                                                                            ELSE billStatus -- no change if other status
                                                                                          END
                                                                         WHERE billId = '${billId}'`;
                                                connection.query(sql_querry_update, (err, update) => {
                                                    if (err) {
                                                        console.error("An error occurred in SQL Queery", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        let sql_querry_updateInOfficial = `UPDATE billing_Official_data
                                                                                           SET billStatus = CASE
                                                                                                              WHEN billStatus = 'Print' THEN 'Food Ready'
                                                                                                              WHEN billStatus = 'Food Ready' THEN 'complete'
                                                                                                              ELSE billStatus -- no change if other status
                                                                                                            END
                                                                                           WHERE billId = '${billId}'`;

                                                        connection.query(sql_querry_updateInOfficial, (err, update) => {
                                                            if (err) {
                                                                console.error("An error occurred in SQL Queery", err);
                                                                connection.rollback(() => {
                                                                    connection.release();
                                                                    return res.status(500).send('Database Error');
                                                                });
                                                            } else {
                                                                let sql_querry_getlist = `SELECT 
                                                                                            btd.tokenNo, 
                                                                                            bd.billStatus, 
                                                                                            bd.billId, 
                                                                                            bd.settledAmount,
                                                                                            SEC_TO_TIME(
                                                                                                TIMESTAMPDIFF(
                                                                                                    SECOND,
                                                                                                    bd.billCreationDate,
                                                                                                    NOW()
                                                                                                )
                                                                                            ) AS timeDifference 
                                                                                          FROM billing_token_data AS btd 
                                                                                          LEFT JOIN billing_data AS bd ON bd.billId = btd.billId 
                                                                                          WHERE btd.billType = 'Pick Up' AND bd.billStatus NOT IN ('complete','cancel') AND btd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
                                                                connection.query(sql_querry_getlist, (err, data) => {
                                                                    if (err) {
                                                                        console.error("An error occurred in SQL Queery", err);
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
                                                                                req?.io?.emit('getTokenList', data);
                                                                                billStatus && billStatus == 'Print'
                                                                                    ? req?.io?.emit('speakToken', tokenNo)
                                                                                    : req?.io?.emit('speakToken', null);
                                                                                connection.release();
                                                                                return res.status(200).send('Token Updated Successfully');
                                                                            }
                                                                        });
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    }
                                                })
                                            }
                                        } else {
                                            connection.rollback(() => {
                                                connection.release();
                                                return res.status(404).send('Bill Not Found...!')
                                            });
                                        }
                                    }
                                })
                            } else {
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(404).send(`Token No. ${tokenNo} is Not Found`);
                                });
                            }
                        })
                    }
                }
            })
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Revert Token Status

const revertTokenStatus = (req, res) => {
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
                    const billId = req.query.billId ? req.query.billId : null;
                    const currentDate = getCurrentDate();
                    if (!billId) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('billId Not Found');
                        });
                    } else {
                        let sql_querry_update = `UPDATE billing_data SET billStatus = 'Print' WHERE billId = '${billId}'`;
                        connection.query(sql_querry_update, (err, update) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                            } else {
                                let sql_querry_updateInOfficial = `UPDATE billing_Official_data SET billStatus = 'Print' WHERE billId = '${billId}'`;
                                connection.query(sql_querry_updateInOfficial, (err, data) => {
                                    if (err) {
                                        console.log("An error occurred in SQL Queery", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        })
                                    } else {
                                        let sql_querry_getlist = `SELECT 
                                                                    btd.tokenNo, 
                                                                    bd.billStatus, 
                                                                    bd.billId, 
                                                                    bd.settledAmount,
                                                                    SEC_TO_TIME(
                                                                        TIMESTAMPDIFF(
                                                                            SECOND,
                                                                            bd.billCreationDate,
                                                                            NOW()
                                                                        )
                                                                    ) AS timeDifference 
                                                                  FROM billing_token_data AS btd 
                                                                  LEFT JOIN billing_data AS bd ON bd.billId = btd.billId 
                                                                  WHERE btd.billType = 'Pick Up' AND bd.billStatus NOT IN ('complete','cancel') AND btd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
                                        connection.query(sql_querry_getlist, (err, data) => {
                                            if (err) {
                                                console.error("An error occurred in SQL Queery", err);
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
                                                        req?.io?.emit('getTokenList', data);
                                                        req?.io?.emit('speakToken', null);
                                                        connection.release();
                                                        return res.status(200).send('Token Revert Successfully');
                                                    }
                                                });
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    }
                }
            })
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Set All Token Complete

const setAllTokenComplete = (req, res) => {
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
                    const currentDate = getCurrentDate();
                    let sql_query_updateAllStatusComplete = `UPDATE billing_data AS bd
                                                             JOIN (
                                                                 SELECT billId
                                                                 FROM billing_data
                                                                 WHERE billType = 'Pick Up'
                                                                   AND billStatus NOT IN ('complete', 'Cancel')
                                                                   AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                             ) AS sub
                                                             ON bd.billId = sub.billId
                                                             SET bd.billStatus = 'complete'`;
                    connection.query(sql_query_updateAllStatusComplete, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            connection.rollback(() => {
                                connection.release();
                                return res.status(500).send('Database Error');
                            });
                        } else {
                            let sql_query_updateAllStatusCompleteInOfficial = `UPDATE billing_Official_data AS bod
                                                                               JOIN (
                                                                                   SELECT billId
                                                                                   FROM billing_data
                                                                                   WHERE billType = 'Pick Up'
                                                                                     AND billStatus NOT IN ('complete', 'Cancel')
                                                                                     AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                                               ) AS sub
                                                                               ON bod.billId = sub.billId
                                                                               SET bod.billStatus = 'complete'`;
                            connection.query(sql_query_updateAllStatusCompleteInOfficial, (err, data) => {
                                if (err) {
                                    console.log("An error occurred in SQL Queery", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    })
                                } else {
                                    let sql_querry_getlist = `SELECT 
                                                                btd.tokenNo, 
                                                                bd.billStatus, 
                                                                bd.billId, 
                                                                bd.settledAmount,
                                                                SEC_TO_TIME(
                                                                    TIMESTAMPDIFF(
                                                                        SECOND,
                                                                        bd.billCreationDate,
                                                                        NOW()
                                                                    )
                                                                ) AS timeDifference 
                                                              FROM billing_token_data AS btd 
                                                              LEFT JOIN billing_data AS bd ON bd.billId = btd.billId 
                                                              WHERE btd.billType = 'Pick Up' AND bd.billStatus NOT IN ('complete','cancel') AND btd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
                                    connection.query(sql_querry_getlist, (err, data) => {
                                        if (err) {
                                            console.error("An error occurred in SQL Queery", err);
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
                                                    req?.io?.emit('getTokenList', data);
                                                    req?.io?.emit('speakToken', null);
                                                    connection.release();
                                                    return res.status(200).send('All Bill Completed Successfully');
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Clear Display All Token 

const clearAllDisplayToken = (req, res) => {
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
                    const currentDate = getCurrentDate();
                    let sql_query_updateAllStatusComplete = `UPDATE billing_data AS bd
                                                             JOIN (
                                                                 SELECT billId
                                                                 FROM billing_data
                                                                 WHERE billType = 'Pick Up'
                                                                   AND billStatus = 'Food Ready'
                                                                   AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                             ) AS sub
                                                             ON bd.billId = sub.billId
                                                             SET bd.billStatus = 'complete'`;
                    connection.query(sql_query_updateAllStatusComplete, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            connection.rollback(() => {
                                connection.release();
                                return res.status(500).send('Database Error');
                            });
                        } else {
                            let sql_query_updateAllStatusCompleteInOfficial = `UPDATE billing_Official_data AS bod
                                                                               JOIN (
                                                                                   SELECT billId
                                                                                   FROM billing_data
                                                                                   WHERE billType = 'Pick Up'
                                                                                     AND billStatus = 'Food Ready'
                                                                                     AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                                               ) AS sub
                                                                               ON bod.billId = sub.billId
                                                                               SET bod.billStatus = 'complete'`;
                            connection.query(sql_query_updateAllStatusCompleteInOfficial, (err, data) => {
                                if (err) {
                                    console.log("An error occurred in SQL Queery", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    })
                                } else {
                                    let sql_querry_getlist = `SELECT 
                                                                btd.tokenNo, 
                                                                bd.billStatus, 
                                                                bd.billId, 
                                                                bd.settledAmount,
                                                                SEC_TO_TIME(
                                                                    TIMESTAMPDIFF(
                                                                        SECOND,
                                                                        bd.billCreationDate,
                                                                        NOW()
                                                                    )
                                                                ) AS timeDifference 
                                                              FROM billing_token_data AS btd 
                                                              LEFT JOIN billing_data AS bd ON bd.billId = btd.billId 
                                                              WHERE btd.billType = 'Pick Up' AND bd.billStatus NOT IN ('complete','cancel') AND btd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
                                    connection.query(sql_querry_getlist, (err, data) => {
                                        if (err) {
                                            console.error("An error occurred in SQL Queery", err);
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
                                                    req?.io?.emit('getTokenList', data);
                                                    req?.io?.emit('speakToken', null);
                                                    connection.release();
                                                    return res.status(200).send('Display Clear Successfully');
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        } catch (error) {
            console.error('An error occurred', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Speak Token Number

const speakTokenNumber = (req, res) => {
    try {
        const tokenNo = req.query.tokenNo ? req.query.tokenNo : null;
        req?.io?.emit('speakToken', tokenNo);
        res.status(200).send('Speak Success');
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    getTokenList,
    getDisplayTokenNumbr,
    revertTokenStatus,
    updateTokenToDisplay,
    setAllTokenComplete,
    clearAllDisplayToken,
    speakTokenNumber
}