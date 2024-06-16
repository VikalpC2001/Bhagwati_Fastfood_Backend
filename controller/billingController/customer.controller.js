const pool = require('../../database');
const jwt = require("jsonwebtoken");

const searchCustomerData = (req, res) => {
    try {
        const searchWord = req.query.searchWord;
        var sql_queries_searchCustomer = `SELECT
                                              bcd.customerId AS customerId,
                                              bcd.customerName AS customerName,
                                              bcd.customerMobileNumber AS mobileNo,
                                              bcad.addressId AS addressId,
                                              bcad.customerAddress AS address,
                                              bcad.customerLocality AS locality
                                          FROM
                                              billing_customer_data AS bcd
                                          LEFT JOIN billing_customerAddress_data AS bcad ON bcad.customerId = bcd.customerId
                                          WHERE bcd.customerMobileNumber LIKE '%` + searchWord + `%'`;
        pool.query(sql_queries_searchCustomer, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                if (searchWord) {
                    return res.status(200).send(rows);
                } else {
                    return res.status(200).send([]);
                }
            }
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
};

const addMultipleCustomerData = (req, res) => {
    try {
        const uid1 = new Date();
        const newCustometId = String("customer_" + uid1.getTime());
        const newAddressId = String("addressId_" + uid1.getTime());
        const data = {
            mobileNo: req.body.mobileNo ? req.body.mobileNo : null,
            name: req.body.name ? req.body.name : null,
            address: req.body.address ? req.body.address : null,
            locality: req.body.locality ? req.body.locality : null
        }
        if (!data.mobileNo) {
            return res.status(404).send('Mobile Number Not Found..!');
        }
        let chk_sql_mobileNoExist = `SELECT customerId FROM billing_customer_data WHERE customerMobileNumber = '${data.mobileNo}'`;
        pool.query(chk_sql_mobileNoExist, (err, no) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const existCustomerId = no && no.length ? no[0].customerId : null;
                if (existCustomerId) {
                    if (data.address) {
                        sql_query_chkAddress = `SELECT customerAddress FROM billing_customerAddress_data WHERE customerId = '${existCustomerId}' AND customerAddress = '${data.address}'`;
                        pool.query(sql_query_chkAddress, (err, chkAdd) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            } else {
                                if (chkAdd && chkAdd.length) {
                                    return res.status(400).send('Address Already Exisy For This Customer Id');
                                } else {
                                    sql_query_addExistCustomerNewAddress = `INSERT INTO billing_customerAddress_data(addressId, customerId, customerAddress, customerLocality)
                                                                            VALUES('${newAddressId}', '${existCustomerId}', TRIM('${data.address}'), ${data.locality ? `TRIM('${data.locality}')` : null})`;
                                    pool.query(sql_query_addExistCustomerNewAddress, (err, newAdd) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        } else {
                                            return res.status(200).send('Customer New Address Added Successfully');
                                        }
                                    })
                                }
                            }
                        })
                    } else {
                        return res.status(200).send('Customer Added Successfully');
                    }
                } else {
                    sql_query_addNewCustomer = `INSERT INTO billing_customer_data(customerId, customerName, customerMobileNumber, birthDate, anniversaryDate)
                                                VALUES('${newCustometId}', ${data.name ? `TRIM('${data.name}')` : null}, '${data.mobileNo}', NULL, NULL)`;
                    pool.query(sql_query_addNewCustomer, (err, customer) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        } else {
                            if (data.address) {
                                sql_query_addCustomerNewAddress = `INSERT INTO billing_customerAddress_data(addressId, customerId, customerAddress, customerLocality)
                                                                   VALUES('${newAddressId}', '${newCustometId}', TRIM('${data.address}'), ${data.locality ? `TRIM('${data.locality}')` : null})`;
                                pool.query(sql_query_addCustomerNewAddress, (err, adds) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    } else {
                                        return res.status(200).send('Customer Added Successfully');
                                    }
                                })
                            } else {
                                return res.status(200).send('Customer Added Success Fully');
                            }
                        }
                    })
                }
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    searchCustomerData,
    addMultipleCustomerData
}