const pool = require("../../database");
const pool2 = require("../../databasePool");

function getAddressValidation(addressDetails) {
    const addressCount = addressDetails.reduce((acc, curr) => {
        const address = curr.address.toLowerCase(); // Normalize address to lowercase
        acc[address] = (acc[address] || 0) + 1; // Increment count
        return acc;
    }, {});

    const isAddressRepeated = Object.values(addressCount).some(count => count > 1);

    return isAddressRepeated;
}

// Get Customer Statics Data

const getCustomerStaticsForApp = (req, res) => {
    try {
        const customerId = req.query.customerId ? req.query.customerId : null;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        if (!customerId) {
            return res.status(404).send("customerId Not Found...!");
        } else {
            let sql_qury_getStaticsData = `SELECT
                                            -- Order Counts
                                            COUNT(CASE WHEN bd.billType = 'Pick Up' THEN 1 END) AS totalPickupOrders,
                                            COUNT(CASE WHEN bd.billType = 'Delivery' THEN 1 END) AS totalDeliveryOrders,
                                            COUNT(CASE WHEN bd.billType = 'Dine In' THEN 1 END) AS totalDineinOrders,
                                            COUNT(CASE WHEN bd.billPayType = 'cash' THEN 1 END) AS totalCashOrders,
                                            COUNT(CASE WHEN bd.billPayType = 'due' THEN 1 END) AS totalDueOrders,
                                            COUNT(CASE WHEN bd.billPayType = 'online' THEN 1 END) AS totalOnlineOrders,
                                            COUNT(CASE WHEN bd.billPayType = 'complimentary' THEN 1 END) AS totalComplimentaryOrders,
                                            COUNT(CASE WHEN bd.billPayType = 'cancel' THEN 1 END) AS totalCancelOrders,
                                            -- Order Sum
                                            COALESCE(SUM(CASE WHEN bd.billType = 'Pick Up' THEN bd.settledAmount ELSE 0 END),0) AS totalPickupAmount,
                                            COALESCE(SUM(CASE WHEN bd.billType = 'Delivery' THEN bd.settledAmount ELSE 0 END),0) AS totalDeliveryAmount,
                                            COALESCE(SUM(CASE WHEN bd.billType = 'Dine In' THEN bd.settledAmount ELSE 0 END),0) AS totalDineinAmount,
                                            COALESCE(SUM(CASE WHEN bd.billPayType = 'cash' THEN bd.settledAmount ELSE 0 END),0) AS totalCashAmount,
                                            COALESCE(SUM(CASE WHEN bd.billPayType = 'due' THEN bd.settledAmount ELSE 0 END),0) AS totalDueAmount,
                                            COALESCE(SUM(CASE WHEN bd.billPayType = 'online' THEN bd.settledAmount ELSE 0 END),0) AS totalOnlineAmount,
                                            COALESCE(SUM(CASE WHEN bd.billPayType = 'complimentary' THEN bd.settledAmount ELSE 0 END),0) AS totalComplimentaryAmount,
                                            COALESCE(SUM(CASE WHEN bd.billPayType = 'cancel' THEN bd.settledAmount ELSE 0 END),0) AS totalCancelAmount
                                          FROM
                                              billing_billwisecustomer_data AS bwc
                                          LEFT JOIN billing_data AS bd ON bd.billId = bwc.billId
                                          WHERE bwc.customerId = '${customerId}'
                                          AND bd.billDate BETWEEN STR_TO_DATE('${data.startDate ? data.startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${data.endDate ? data.endDate : lastDay}', '%b %d %Y')`;
            pool.query(sql_qury_getStaticsData, (err, data) => {
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

// Get Customer Data For App

const getCustomerListForApp = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        const searchWord = req.query.searchWord ? req.query.searchWord : '';
        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM billing_customer_data WHERE customerName LIKE '%` + searchWord + `%' OR customerMobileNumber LIKE '%` + searchWord + `%'`;
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_getDetails = `SELECT 
                                                customerId,
                                                customerName,
                                                customerMobileNumber
                                              FROM 
                                                billing_customer_data
                                              WHERE customerName LIKE '%` + searchWord + `%' OR customerMobileNumber LIKE '%` + searchWord + `%'
                                              LIMIT ${limit}`;
                pool.query(sql_query_getDetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        if (numRows === 0) {
                            return res.status(404).send('No Data Found');
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

// Get Customer Details By Id For App

const getCustomerDetailsByIdForApp = (req, res) => {
    try {
        const customerId = req.query.customerId ? req.query.customerId : null;
        if (!customerId) {
            return res.status(404).send("customerId Not Found");
        } else {
            let sql_query_getCustomerData = `SELECT
                                             customerId,
                                             customerName,
                                             customerMobileNumber,
                                             birthDate,
                                             anniversaryDate
                                         FROM
                                             billing_customer_data
                                         WHERE customerId = '${customerId}';
                                         SELECT
                                             customerAddress AS address,
                                             customerLocality AS locality
                                         FROM
                                             billing_customerAddress_data
                                         WHERE customerId = '${customerId}'`;
            pool.query(sql_query_getCustomerData, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');;
                } else {
                    if (data && data[0].length) {
                        let json = {
                            ...data[0][0],
                            addressDetails: data[1]
                        }
                        return res.status(200).send(json);
                    } else {
                        return res.status(404).send('No Data Found');
                    }
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Cusstomer Data For App

const addCustomerDataForApp = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.log('Connection Error', err)
            return res.status(500).send('Database Connection Error');
        }
        try {
            connection.beginTransaction((err) => {
                if (err) {
                    console.log('Error In Transaction');
                    return res.status(500).send('Transaction Error');
                }
                const customerData = req.body;
                const addressJson = customerData && customerData.addressDetails ? customerData.addressDetails : null;

                const uid1 = new Date();
                const customerId = String("customer_" + uid1.getTime());

                if (!customerData.mobileNumber) {
                    connection.rollback(() => {
                        connection.release();
                        return res.status(404).send('Please Fill Mobile Number..!');
                    })
                } else if (addressJson && getAddressValidation(addressJson)) {
                    connection.rollback(() => {
                        connection.release();
                        return res.status(400).send('You Can Not Add Same Address');
                    })
                } else {
                    let sql_query_chkExistCustomer = `SELECT customerId FROM billing_customer_data WHERE customerMobileNumber = '${customerData.mobileNumber}'`;
                    connection.query(sql_query_chkExistCustomer, (err, result) => {
                        if (err) {
                            console.error("Error Find Exist Customer :", err);
                            connection.rollback(() => {
                                connection.release();
                                return res.status(500).send('Database Error');
                            });
                        } else {
                            if (result && result.length) {
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(400).send('Customer Is Already Exist..!');
                                })
                            } else {
                                let sql_query_addCustomerDetails = `INSERT INTO billing_customer_data (customerId, customerName, customerMobileNumber, birthDate, anniversaryDate)
                                                                    VALUES ('${customerId}', ${customerData.customerName ? `TRIM('${customerData.customerName}')` : null}, '${customerData.mobileNumber}', ${customerData.birthDate ? `STR_TO_DATE('${customerData.birthDate}','%b %d %Y')` : null}, ${customerData.anniversaryDate ? `STR_TO_DATE('${customerData.anniversaryDate}','%b %d %Y')` : null})`;
                                connection.query(sql_query_addCustomerDetails, (err, add) => {
                                    if (err) {
                                        console.error("Error Insert Customer Data :", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        if (customerData.addressDetails && customerData.addressDetails.length) {
                                            let addAddressData = addressJson.map((item, index) => {
                                                let uniqueId = `addressId_${Date.now() + index}`; // Generating a unique ID using current timestamp
                                                return `('${uniqueId}', '${customerId}', ${item.address ? `TRIM('${item.address}')` : null}, ${item.locality ? `TRIM('${item.locality}')` : null})`;
                                            }).join(', ');
                                            let sql_query_addAddressData = `INSERT INTO billing_customerAddress_data(addressId, customerId, customerAddress, customerLocality)
                                                                            VALUES ${addAddressData}`;
                                            connection.query(sql_query_addAddressData, (err, add) => {
                                                if (err) {
                                                    console.error("Error Insert Address Data :", err);
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
                                                            return res.status(200).send("Customer Added Successfully..!");
                                                        }
                                                    });
                                                }
                                            })
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
                                                    return res.status(200).send("Customer Added Successfully..!");
                                                }
                                            });
                                        }
                                    }
                                })
                            }
                        }
                    });
                }
            })
        } catch (error) {
            connection.rollback(() => {
                console.error('An error occurred', error);
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Remove Customer Data

const removeCustomeDataForApp = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.log('Connection Error', err)
            return res.status(500).send('Database Connection Error');
        }
        try {
            connection.beginTransaction((err) => {
                if (err) {
                    console.log('Error In Transaction');
                    return res.status(500).send('Transaction Error');
                }
                const customerId = req.query.customerId ? req.query.customerId : null;

                if (!customerId) {
                    connection.rollback(() => {
                        connection.release();
                        return res.status(404).send('customerId Not Found..!');
                    })
                } else {
                    let sql_query_chkExistCustomer = `SELECT customerId FROM billing_customer_data WHERE customerId = '${customerId}'`;
                    connection.query(sql_query_chkExistCustomer, (err, result) => {
                        if (err) {
                            console.error("Error Find Exist Customer :", err);
                            connection.rollback(() => {
                                connection.release();
                                return res.status(500).send('Database Error');
                            });
                        } else {
                            if (result && result.length == 0) {
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(400).send('customerId Not Exist..!');
                                })
                            } else {
                                let sql_query_removeCustomerData = `DELETE FROM billing_customer_data WHERE customerId = '${customerId}'`;
                                connection.query(sql_query_removeCustomerData, (err, add) => {
                                    if (err) {
                                        console.error("Error Remove Customer Data :", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {

                                        let sql_query_removeCustomerAddress = `DELETE FROM billing_customerAddress_data WHERE customerId = '${customerId}'`;
                                        connection.query(sql_query_removeCustomerAddress, (err, add) => {
                                            if (err) {
                                                console.error("Error Remove Customer Address Data :", err);
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
                                                        return res.status(200).send("Customer Removed Successfully..!");
                                                    }
                                                });
                                            }
                                        })
                                    }
                                })
                            }
                        }
                    });
                }
            })
        } catch (error) {
            connection.rollback(() => {
                console.error('An error occurred', error);
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Update Customer Data For App

const updateCustomerDataForApp = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.log('Connection Error', err)
            return res.status(500).send('Database Connection Error');
        }
        try {
            connection.beginTransaction((err) => {
                if (err) {
                    console.log('Error In Transaction');
                    return res.status(500).send('Transaction Error');
                }
                const customerData = req.body;
                const addressJson = customerData && customerData.addressDetails ? customerData.addressDetails : null;

                if (!customerData.mobileNumber) {
                    connection.rollback(() => {
                        connection.release();
                        return res.status(404).send('Please Fill Mobile Number..!');
                    })
                } else if (addressJson && getAddressValidation(addressJson)) {
                    connection.rollback(() => {
                        connection.release();
                        return res.status(400).send('You Can Not Add Same Address');
                    })
                } else {
                    let sql_query_chkExistCustomer = `SELECT customerId FROM billing_customer_data WHERE customerMobileNumber = '${customerData.mobileNumber}' AND customerId != '${customerData.customerId}'`;
                    connection.query(sql_query_chkExistCustomer, (err, result) => {
                        if (err) {
                            console.error("Error Find Exist Customer :", err);
                            connection.rollback(() => {
                                connection.release();
                                return res.status(500).send('Database Error');
                            });
                        } else {
                            if (result && result.length) {
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(400).send('Customer Mobile Number is Alredy Exist..!');
                                })
                            } else {
                                let sql_query_addCustomerDetails = `UPDATE
                                                                        billing_customer_data
                                                                    SET
                                                                        customerName = ${customerData.customerName ? `TRIM('${customerData.customerName}')` : null},
                                                                        customerMobileNumber = '${customerData.mobileNumber}',
                                                                        birthDate = ${customerData.birthDate ? `STR_TO_DATE('${customerData.birthDate}','%b %d %Y')` : null},
                                                                        anniversaryDate = ${customerData.anniversaryDate ? `STR_TO_DATE('${customerData.anniversaryDate}','%b %d %Y')` : null}
                                                                    WHERE customerId = '${customerData.customerId}'`
                                connection.query(sql_query_addCustomerDetails, (err, add) => {
                                    if (err) {
                                        console.error("Error Insert Customer Data :", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        let sql_query_removeOldAddress = `DELETE FROM billing_customerAddress_data WHERE customerId = '${customerData.customerId}'`;
                                        connection.query(sql_query_removeOldAddress, (err, add) => {
                                            if (err) {
                                                console.error("Error Removing Old Customer Address :", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                if (customerData.addressDetails && customerData.addressDetails.length) {
                                                    let addAddressData = addressJson.map((item, index) => {
                                                        let uniqueId = `addressId_${Date.now() + index}`; // Generating a unique ID using current timestamp
                                                        return `('${uniqueId}', '${customerData.customerId}', ${item.address ? `TRIM('${item.address}')` : null}, ${item.locality ? `TRIM('${item.locality}')` : null})`;
                                                    }).join(', ');
                                                    let sql_query_addAddressData = `INSERT INTO billing_customerAddress_data(addressId, customerId, customerAddress, customerLocality)
                                                                                    VALUES ${addAddressData}`;
                                                    connection.query(sql_query_addAddressData, (err, add) => {
                                                        if (err) {
                                                            console.error("Error Insert Address Data :", err);
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
                                                                    return res.status(200).send("Customer Updated Successfully..!");
                                                                }
                                                            });
                                                        }

                                                    })
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
                                                            return res.status(200).send("Customer Updated Successfully..!");
                                                        }
                                                    });
                                                }
                                            }
                                        })
                                    }
                                })
                            }
                        }
                    });
                }
            })
        } catch (error) {
            connection.rollback(() => {
                console.error('An error occurred', error);
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

module.exports = {
    getCustomerStaticsForApp,
    getCustomerListForApp,
    getCustomerDetailsByIdForApp,
    addCustomerDataForApp,
    removeCustomeDataForApp,
    updateCustomerDataForApp

}