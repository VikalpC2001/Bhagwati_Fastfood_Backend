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

// Get Number Of Pending

const getPendingCount = (req, res) => {
    try {
        let sql_query_getPendingNumber = `SELECT COUNT(*) AS pendingNo FROM pending_data`;
        pool.query(sql_query_getPendingNumber, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                return res.status(200).send(data[0]);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Pending Bill List

const getPendingBillData = (req, res) => {
    try {
        let sql_query_getPendingBill = `SELECT
                                         pd.pendingId AS pendingId,
                                         pd.settledAmount AS totalAmount,
                                         pd.cashier AS PendingBy,
                                         pd.menuStatus AS orderStatus,
                                         CONCAT(DATE_FORMAT(pd.billDate,'%d-%b-%Y'),' ',DATE_FORMAT(pd.billCreationDate,'%h:%i:%s')) AS pendingDateTime,
                                         pd.billType AS billType
                                     FROM
                                         pending_data AS pd
                                     ORDER BY pd.billCreationDate DESC;`;
        pool.query(sql_query_getPendingBill, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                if (data && data.length) {
                    return res.status(200).send(data);
                } else {
                    return res.status(404).send('No Data Found');
                }
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Pending Data By Id

const getPendingBillDataById = (req, res) => {
    try {
        const pendingId = req.query.pendingId;
        if (!pendingId) {
            return res.status(404).send('pendingId Not Found');
        } else {
            let sql_query_chkBillExist = `SELECT pendingId, billType FROM pending_data WHERE pendingId = '${pendingId}'`;
            pool.query(sql_query_chkBillExist, (err, bill) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    if (bill && bill.length) {
                        const billType = bill[0].billType;
                        let sql_query_getBillingData = `SELECT 
                                                            pd.pendingId AS pendingId, 
                                                            pd.firmId AS firmId, 
                                                            pd.cashier AS cashier, 
                                                            pd.menuStatus AS menuStatus, 
                                                            pd.billType AS billType, 
                                                            pd.billPayType AS billPayType, 
                                                            pd.discountType AS discountType, 
                                                            pd.discountValue AS discountValue, 
                                                            pd.totalDiscount AS totalDiscount, 
                                                            pd.totalAmount AS totalAmount, 
                                                            pd.settledAmount AS settledAmount, 
                                                            pd.billComment AS billComment, 
                                                            DATE_FORMAT(pd.billDate,'%d/%m/%Y') AS billDate,
                                                            pd.billStatus AS billStatus,
                                                            DATE_FORMAT(pd.billCreationDate,'%h:%i %p') AS billTime
                                                        FROM 
                                                            pending_data AS pd
                                                        WHERE pd.pendingId = '${pendingId}'`;
                        let sql_query_getBillwiseItem = `SELECT
                                                             pwid.iwbId AS iwbId,
                                                             pwid.itemId AS itemId,
                                                             imd.itemName AS itemName,
                                                             imd.itemCode AS inputCode,
                                                             pwid.qty AS qty,
                                                             pwid.unit AS unit,
                                                             pwid.itemPrice AS itemPrice,
                                                             pwid.price AS price,
                                                             pwid.comment AS comment
                                                         FROM
                                                             pending_billWiseItem_data AS pwid
                                                         INNER JOIN item_menuList_data AS imd ON imd.itemId = pwid.itemId
                                                         WHERE pwid.pendingId = '${pendingId}'`;
                        let sql_query_getCustomerInfo = `SELECT
                                                             pwcd.bwcId AS bwcId,
                                                             pwcd.customerId AS customerId,
                                                             pwcd.mobileNo AS mobileNo,
                                                             pwcd.addressId AS addressId,
                                                             pwcd.address AS address,
                                                             pwcd.locality AS locality,
                                                             pwcd.customerName AS customerName
                                                         FROM
                                                             pending_billWiseCustomer_data AS pwcd
                                                         WHERE pwcd.pendingId = '${pendingId}'`;
                        let sql_query_getHotelInfo = `SELECT
                                                          phid.hotelInfoId AS hotelInfoId,
                                                          phid.hotelId AS hotelId,
                                                          bpd.hotelName AS hotelName,
                                                          bpd.hotelAddress AS hotelAddress,
                                                          bpd.hotelLocality AS hotelLocality,
                                                          bpd.hotelMobileNo AS hotelMobileNo,
                                                          phid.roomNo AS roomNo,
                                                          phid.customerName AS customerName,
                                                          phid.phoneNumber AS mobileNo
                                                      FROM
                                                          pending_hotelInfo_data AS phid
                                                      LEFT JOIN billing_hotel_data AS bpd ON bpd.hotelId = phid.hotelId
                                                      WHERE phid.pendingId = '${pendingId}'`
                        let sql_query_getFirmData = `SELECT 
                                                        firmId, 
                                                        firmName, 
                                                        gstNumber, 
                                                        firmAddress, 
                                                        pincode, 
                                                        firmMobileNo, 
                                                        otherMobileNo 
                                                     FROM 
                                                        billing_firm_data 
                                                     WHERE 
                                                        firmId = (SELECT firmId FROM pending_data WHERE pendingId = '${pendingId}')`
                        const sql_query_getBillData = `${sql_query_getBillingData};
                                                       ${sql_query_getBillwiseItem};
                                                       ${sql_query_getFirmData};
                                                       ${billType == 'Hotel' ? sql_query_getHotelInfo + ';' : ''}
                                                       ${billType == 'Pick Up' || billType == 'Delivery' ? sql_query_getCustomerInfo : ''}`;
                        pool.query(sql_query_getBillData, (err, billData) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error'); t
                            } else {
                                const json = {
                                    ...billData[0][0],
                                    itemData: billData && billData[1] ? billData[1] : [],
                                    firmData: billData && billData[2] ? billData[2][0] : [],
                                    ...(billType === 'Hotel' ? { hotelDetails: billData[3][0] } : ''),
                                    ...(billType == 'Pick Up' || billType == 'Delivery' ? { customerDetails: billData && billData[3][0] ? billData[3][0] : '' } : '')
                                }
                                const pendingJson = json;
                                let sql_query_discardData = `DELETE FROM pending_data WHERE pendingId = '${pendingId}';
                                                             DELETE FROM pending_billWiseItem_data WHERE pendingId = '${pendingId}';
                                                             DELETE FROM pending_hotelInfo_data WHERE pendingId = '${pendingId}';
                                                             DELETE FROM pending_billWiseCustomer_data WHERE pendingId = '${pendingId}'`;
                                pool.query(sql_query_discardData, (err, data) => {
                                    if (err) {
                                        console.error("An error occurred in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    } else {
                                        let sql_query_getPendingNumber = `SELECT COUNT(*) AS pendingNo FROM pending_data`;
                                        pool.query(sql_query_getPendingNumber, (err, data) => {
                                            if (err) {
                                                console.error("An error occurred in SQL Queery", err);
                                                return res.status(500).send('Database Error');
                                            } else {
                                                const pendingCount = data && data[0] ? data[0].pendingNo : 0;
                                                req?.io?.emit('getpendingCount', pendingCount);
                                                return res.status(200).send(pendingJson);
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    } else {
                        return res.status(404).send('Pending Id Not Found');
                    }
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Pending Hotel Bill Data

const addHotelPendingBillData = (req, res) => {
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
                    const pendingData = req.body;
                    if (!pendingData.hotelId || !pendingData.firmId || !pendingData.subTotal || !pendingData.settledAmount || !pendingData.billPayType || !pendingData.billStatus || !pendingData.itemsData) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Fill All The Fields..!');
                        })
                    } else {
                        const uid1 = new Date();
                        const pendingId = String("pending_" + uid1.getTime());
                        const hotelInfoId = String("hotelInfo_" + uid1.getTime());

                        const columnData = `pendingId,
                                            firmId,
                                            cashier,
                                            menuStatus,
                                            billType,
                                            billPayType,
                                            discountType,
                                            discountValue,
                                            totalDiscount,
                                            totalAmount,
                                            settledAmount,
                                            billComment,
                                            billDate,
                                            billStatus`;
                        const values = `'${pendingId}',
                                        '${pendingData.firmId}', 
                                        'Online', 
                                        'Online',
                                        'Hotel',
                                        '${pendingData.billPayType}',
                                        '${pendingData.discountType}',
                                        ${pendingData.discountValue},
                                        ${pendingData.totalDiscount},
                                        ${pendingData.subTotal},
                                        ${pendingData.settledAmount},
                                        ${pendingData.billComment ? `'${pendingData.billComment}'` : null},
                                        STR_TO_DATE('${currentDate}','%b %d %Y'),
                                        '${pendingData.billStatus}'`;
                        let sql_querry_addBillInfo = `INSERT INTO pending_data (${columnData}) VALUES (${values})`;

                        connection.query(sql_querry_addBillInfo, (err) => {
                            if (err) {
                                console.error("Error inserting new bill number:", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                            } else {
                                let sql_query_addHotelDetalis = `INSERT INTO pending_hotelInfo_data (hotelInfoId, pendingId, hotelId, roomNo, customerName, phoneNumber)
                                                                 VALUES('${hotelInfoId}', '${pendingId}', '${pendingData.hotelId}', ${pendingData.roomNo ? `'${pendingData.roomNo}'` : null}, ${pendingData.customerName ? `'${pendingData.customerName}'` : null}, ${pendingData.mobileNo ? `'${pendingData.mobileNo}'` : null})`;
                                connection.query(sql_query_addHotelDetalis, (err) => {
                                    if (err) {
                                        console.error("Error inserting Hotel Info Details:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        const billItemData = pendingData.itemsData
                                        let addBillWiseItemData = billItemData.map((item, index) => {
                                            let uniqueId = `iwb_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                            return `('${uniqueId}', '${pendingId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null})`;
                                        }).join(', ');
                                        let sql_query_addItems = `INSERT INTO pending_billWiseItem_data(iwbId, pendingId, itemId, qty, unit, itemPrice, price, comment)
                                                                  VALUES ${addBillWiseItemData}`;
                                        connection.query(sql_query_addItems, (err) => {
                                            if (err) {
                                                console.error("Error inserting Bill Wise Item Data:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                let sql_query_getpendingCount = `SELECT COUNT(*) AS pendingNo FROM pending_data`;
                                                connection.query(sql_query_getpendingCount, (err, count) => {
                                                    if (err) {
                                                        console.error("Error inserting Bill Wise Item Data:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        let pendingCount = count && count[0] ? count[0].pendingNo : 0;
                                                        connection.commit((err) => {
                                                            if (err) {
                                                                console.error("Error committing transaction:", err);
                                                                connection.rollback(() => {
                                                                    connection.release();
                                                                    return res.status(500).send('Database Error');
                                                                });
                                                            } else {
                                                                connection.release();
                                                                req?.io?.emit('getpendingCount', pendingCount);
                                                                return res.status(200).send("Bill Is On Pending");
                                                            }
                                                        });
                                                    }
                                                })
                                            }
                                        });
                                    }
                                });
                            }
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

// Add Pending PickUp Bill Data

const addPickUpPendingBillData = (req, res) => {
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
                    const pendingData = req.body;
                    if (!pendingData.customerDetails || !pendingData.firmId || !pendingData.subTotal || !pendingData.settledAmount || !pendingData.billPayType || !pendingData.billStatus || !pendingData.itemsData) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Fill All The Fields..!');
                        })
                    } else {

                        const uid1 = new Date();
                        const pendingId = String("pending_" + uid1.getTime());
                        const bwcId = String("bwc_" + uid1.getTime());

                        const columnData = `pendingId,
                                            firmId,
                                            cashier,
                                            menuStatus,
                                            billType,
                                            billPayType,
                                            discountType,
                                            discountValue,
                                            totalDiscount,
                                            totalAmount,
                                            settledAmount,
                                            billComment,
                                            billDate,
                                            billStatus`;
                        const values = `'${pendingId}',
                                        '${pendingData.firmId}', 
                                        'Online', 
                                        'Online',
                                        'Pick Up',
                                        '${pendingData.billPayType}',
                                        '${pendingData.discountType}',
                                        ${pendingData.discountValue},
                                        ${pendingData.totalDiscount},
                                        ${pendingData.subTotal},
                                        ${pendingData.settledAmount},
                                        ${pendingData.billComment ? `'${pendingData.billComment}'` : null},
                                        STR_TO_DATE('${currentDate}','%b %d %Y'),
                                        '${pendingData.billStatus}'`;
                        let sql_querry_addPendingBillInfo = `INSERT INTO pending_data (${columnData}) VALUES (${values})`;
                        connection.query(sql_querry_addPendingBillInfo, (err) => {
                            if (err) {
                                console.error("Error inserting new Pending Data:", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                            } else {
                                const billItemData = pendingData.itemsData
                                let addBillWiseItemData = billItemData.map((item, index) => {
                                    let uniqueId = `iwb_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                    return `('${uniqueId}', '${pendingId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null})`;
                                }).join(', ');
                                let sql_query_addItems = `INSERT INTO pending_billWiseItem_data(iwbId, pendingId, itemId, qty, unit, itemPrice, price, comment)
                                                          VALUES ${addBillWiseItemData}`;
                                connection.query(sql_query_addItems, (err) => {
                                    if (err) {
                                        console.error("Error inserting Bill Wise Item Data:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        let sql_query_getpendingCount = `SELECT COUNT(*) AS pendingNo FROM pending_data`;
                                        connection.query(sql_query_getpendingCount, (err, count) => {
                                            if (err) {
                                                console.error("Error inserting Bill Wise Item Data:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                let pendingCount = count && count[0] ? count[0].pendingNo : 0;
                                                const customerData = pendingData.customerDetails;
                                                if (customerData && customerData.mobileNo || customerData && customerData.mobileNo) {
                                                    let sql_query_addAddressRelation = `INSERT INTO pending_billWiseCustomer_data(bwcId, pendingId, customerId, addressId, mobileNo, customerName, address, locality)
                                                                                        VALUES ('${bwcId}', '${pendingId}', '${null}', '${null}', ${customerData.mobileNo ? `TRIM('${customerData.mobileNo}')` : null}, ${customerData.customerName ? `TRIM('${customerData.customerName}')` : null}, ${customerData.address ? `'${customerData.address}'` : null}, ${customerData.locality ? `'${customerData.locality}'` : null})`;
                                                    connection.query(sql_query_addAddressRelation, (err) => {
                                                        if (err) {
                                                            console.error("Error inserting Bill Wise Customer Data:", err);
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
                                                                    req?.io?.emit('getpendingCount', pendingCount);
                                                                    return res.status(200).send(sendJson);
                                                                }
                                                            });
                                                        }
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
                                                            req?.io?.emit('getpendingCount', pendingCount);
                                                            return res.status(200).send(sendJson);
                                                        }
                                                    });
                                                }
                                            }
                                        })
                                    }
                                });
                            }
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

// Add Pending Delivery Bill Data

const addDeliveryPendingBillData = (req, res) => {
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
                    const pendingData = req.body;
                    if (!pendingData.customerDetails || !pendingData.firmId || !pendingData.subTotal || !pendingData.settledAmount || !pendingData.billPayType || !pendingData.billStatus || !pendingData.itemsData) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Fill All The Fields..!');
                        })
                    } else {

                        const uid1 = new Date();
                        const pendingId = String("pending_" + uid1.getTime());
                        const bwcId = String("bwc_" + uid1.getTime());

                        const columnData = `pendingId,
                                            firmId,
                                            cashier,
                                            menuStatus,
                                            billType,
                                            billPayType,
                                            discountType,
                                            discountValue,
                                            totalDiscount,
                                            totalAmount,
                                            settledAmount,
                                            billComment,
                                            billDate,
                                            billStatus`;
                        const values = `'${pendingId}',
                                        '${pendingData.firmId}', 
                                        'Online', 
                                        'Online',
                                        'Pick Up',
                                        '${pendingData.billPayType}',
                                        '${pendingData.discountType}',
                                        ${pendingData.discountValue},
                                        ${pendingData.totalDiscount},
                                        ${pendingData.subTotal},
                                        ${pendingData.settledAmount},
                                        ${pendingData.billComment ? `'${pendingData.billComment}'` : null},
                                        STR_TO_DATE('${currentDate}','%b %d %Y'),
                                        '${pendingData.billStatus}'`;
                        let sql_querry_addPendingBillInfo = `INSERT INTO pending_data (${columnData}) VALUES (${values})`;
                        connection.query(sql_querry_addPendingBillInfo, (err) => {
                            if (err) {
                                console.error("Error inserting new Pending Data:", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                            } else {
                                const billItemData = pendingData.itemsData
                                let addBillWiseItemData = billItemData.map((item, index) => {
                                    let uniqueId = `iwb_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                    return `('${uniqueId}', '${pendingId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null})`;
                                }).join(', ');
                                let sql_query_addItems = `INSERT INTO pending_billWiseItem_data(iwbId, pendingId, itemId, qty, unit, itemPrice, price, comment)
                                                          VALUES ${addBillWiseItemData}`;
                                connection.query(sql_query_addItems, (err) => {
                                    if (err) {
                                        console.error("Error inserting Bill Wise Item Data:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        let sql_query_getpendingCount = `SELECT COUNT(*) AS pendingNo FROM pending_data`;
                                        connection.query(sql_query_getpendingCount, (err, count) => {
                                            if (err) {
                                                console.error("Error inserting Bill Wise Item Data:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                let pendingCount = count && count[0] ? count[0].pendingNo : 0;
                                                const customerData = pendingData.customerDetails;
                                                if (customerData && customerData.mobileNo || customerData && customerData.mobileNo) {
                                                    let sql_query_addAddressRelation = `INSERT INTO pending_billWiseCustomer_data(bwcId, pendingId, customerId, addressId, mobileNo, customerName, address, locality)
                                                                                        VALUES ('${bwcId}', '${pendingId}', '${null}', '${null}', ${customerData.mobileNo ? `TRIM('${customerData.mobileNo}')` : null}, ${customerData.customerName ? `TRIM('${customerData.customerName}')` : null}, ${customerData.address ? `'${customerData.address}'` : null}, ${customerData.locality ? `'${customerData.locality}'` : null})`;
                                                    connection.query(sql_query_addAddressRelation, (err) => {
                                                        if (err) {
                                                            console.error("Error inserting Bill Wise Customer Data:", err);
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
                                                                    req?.io?.emit('getpendingCount', pendingCount);
                                                                    return res.status(200).send(sendJson);
                                                                }
                                                            });
                                                        }
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
                                                            req?.io?.emit('getpendingCount', pendingCount);
                                                            return res.status(200).send(sendJson);
                                                        }
                                                    });
                                                }
                                            }
                                        })
                                    }
                                });
                            }
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

// Pending Discard API

const discardpendingData = (req, res) => {
    try {
        const pendingId = req.query.pendingId;
        if (!pendingId) {
            return res.status(404).send('pendingId Not Found....!');
        } else {
            let sql_query_discardData = `DELETE FROM pending_data WHERE pendingId = '${pendingId}';
                                         DELETE FROM pending_billWiseItem_data WHERE pendingId = '${pendingId}';
                                         DELETE FROM pending_hotelInfo_data WHERE pendingId = '${pendingId}';
                                         DELETE FROM pending_billWiseCustomer_data WHERE pendingId = '${pendingId}'`;
            pool.query(sql_query_discardData, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    let sql_query_getPendingNumber = `SELECT COUNT(*) AS pendingNo FROM pending_data`;
                    pool.query(sql_query_getPendingNumber, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        } else {
                            const pendingCount = data && data[0] ? data[0].pendingNo : 0;
                            req?.io?.emit('getpendingCount', pendingCount);
                            return res.status(200).send('Discard Successfully');
                        }
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        return res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    getPendingCount,
    getPendingBillData,
    getPendingBillDataById,
    addHotelPendingBillData,
    addPickUpPendingBillData,
    addDeliveryPendingBillData,
    discardpendingData
}