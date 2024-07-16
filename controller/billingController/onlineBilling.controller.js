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

// ADD Hotel Online QR Billing Data

const addOnlineHotelBillData = (req, res) => {
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
                    const billData = req.body;
                    if (!billData.hotelId || !billData.firmId || !billData.subTotal || !billData.settledAmount || !billData.billPayType || !billData.billStatus || !billData.itemsData) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Fill All The Fields..!');
                        })
                    } else {
                        let sql_query_getOfficialLastBillNo = `SELECT COALESCE(MAX(billNumber),0) AS officialLastBillNo FROM billing_Official_data WHERE firmId = '${billData.firmId}' AND billPayType = '${billData.billPayType}' AND billCreationDate = (SELECT MAX(billCreationDate) FROM billing_Official_data WHERE firmId = '${billData.firmId}' AND billPayType = '${billData.billPayType}') FOR UPDATE`;
                        let sql_query_getLastBillNo = `SELECT COALESCE(MAX(billNumber),0) AS lastBillNo FROM billing_data WHERE firmId = '${billData.firmId}' AND billCreationDate = (SELECT MAX(billCreationDate) FROM billing_data WHERE firmId = '${billData.firmId}') FOR UPDATE;
                                                       SELECT COALESCE(MAX(tokenNo),0) AS lastTokenNo FROM billing_token_data WHERE billType = '${billData.billType}' AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y') FOR UPDATE;
                                                       ${billData.isOfficial ? sql_query_getOfficialLastBillNo : ''}`;
                        connection.query(sql_query_getLastBillNo, (err, result) => {
                            if (err) {
                                console.error("Error selecting last bill and token number:", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                            } else {
                                const lastBillNo = result && result[0] && result[0][0].lastBillNo ? result[0][0].lastBillNo : 0;
                                const lastTokenNo = result && result[1] && result[1][0].lastTokenNo ? result[1][0].lastTokenNo : 0;
                                const officialLastBillNo = result && result[2] && result[2][0].officialLastBillNo ? result[2][0].officialLastBillNo : 0;

                                const nextBillNo = lastBillNo + 1;
                                const nextOfficialBillNo = officialLastBillNo + 1;
                                const nextTokenNo = lastTokenNo + 1;
                                const uid1 = new Date();
                                const billId = String("bill_" + uid1.getTime() + '_' + nextBillNo);
                                const tokenId = String("token_" + uid1.getTime() + '_' + nextTokenNo);
                                const hotelInfoId = String("hotelInfo_" + uid1.getTime() + '_' + nextBillNo);

                                const columnData = `billId,
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
                                const values = `'${billId}',
                                                '${billData.firmId}', 
                                                'Online', 
                                                'Online',
                                                'Hotel',
                                                '${billData.billPayType}',
                                                '${billData.discountType}',
                                                ${billData.discountValue},
                                                ${billData.totalDiscount},
                                                ${billData.subTotal},
                                                ${billData.settledAmount},
                                                ${billData.billComment ? `'${billData.billComment}'` : null},
                                                STR_TO_DATE('${currentDate}','%b %d %Y'),
                                                '${billData.billStatus}'`;
                                let sql_querry_addBillInfo = `INSERT INTO billing_data (billNumber,${columnData}) VALUES (${nextBillNo}, ${values})`;
                                let sql_querry_addOfficialData = `INSERT INTO billing_Official_data (billNumber, ${columnData}) VALUES(${nextOfficialBillNo}, ${values})`;
                                let sql_querry_addBillData = `${sql_querry_addBillInfo};
                                                              ${billData.isOfficial ? sql_querry_addOfficialData : ''}`;
                                connection.query(sql_querry_addBillData, (err) => {
                                    if (err) {
                                        console.error("Error inserting new bill number:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        let sql_query_addTokenNo = `INSERT INTO billing_token_data(tokenId, billId, tokenNo, billType, billDate)
                                                                    VALUES ('${tokenId}', '${billId}', ${nextTokenNo}, '${billData.billType}', STR_TO_DATE('${currentDate}','%b %d %Y'))`;
                                        connection.query(sql_query_addTokenNo, (err) => {
                                            if (err) {
                                                console.error("Error inserting new Token number:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                let sql_query_addHotelDetalis = `INSERT INTO billing_hotelInfo_data(hotelInfoId, billId, hotelId, roomNo, customerName, phoneNumber)
                                                                                 VALUES('${hotelInfoId}', '${billId}', '${billData.hotelId}', ${billData.roomNo ? `'${billData.roomNo}'` : null}, ${billData.customerName ? `'${billData.customerName}'` : null}, ${billData.mobileNo ? `'${billData.mobileNo}'` : null})`;
                                                connection.query(sql_query_addHotelDetalis, (err) => {
                                                    if (err) {
                                                        console.error("Error inserting Hotel Info Details:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        const billItemData = billData.itemsData
                                                        let addBillWiseItemData = billItemData.map((item, index) => {
                                                            let uniqueId = `iwb_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                                            return `('${uniqueId}', '${billId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null})`;
                                                        }).join(', ');
                                                        let sql_query_addItems = `INSERT INTO billing_billWiseItem_data(iwbId, billId, itemId, qty, unit, itemPrice, price, comment)
                                                                                  VALUES ${addBillWiseItemData}`;
                                                        connection.query(sql_query_addItems, (err) => {
                                                            if (err) {
                                                                console.error("Error inserting Bill Wise Item Data:", err);
                                                                connection.rollback(() => {
                                                                    connection.release();
                                                                    return res.status(500).send('Database Error');
                                                                });
                                                            } else {
                                                                let sql_query_getFirmData = `SELECT firmId, firmName, gstNumber, firmAddress, pincode, firmMobileNo, otherMobileNo FROM billing_firm_data WHERE firmId = '${billData.firmId}'`;
                                                                connection.query(sql_query_getFirmData, (err, firm) => {
                                                                    if (err) {
                                                                        console.error("Error inserting Bill Wise Item Data:", err);
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
                                                                                const sendJson = {
                                                                                    ...billData,
                                                                                    firmData: firm[0],
                                                                                    cashier: 'Online',
                                                                                    officialBillNo: billData.isOfficial ? nextOfficialBillNo : 'Not Available',
                                                                                    billNo: nextBillNo,
                                                                                    tokenNo: 'H' + nextTokenNo,
                                                                                    billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                                                    billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                                }
                                                                                connection.release();
                                                                                return res.status(200).send(sendJson);
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
                                });
                            }
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

// ADD Pick UP Online QR Billing Data

const addOnlinePickUpBillData = (req, res) => {
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
                    const billData = req.body;
                    if (!billData.customerDetails || !billData.firmId || !billData.subTotal || !billData.settledAmount || !billData.billPayType || !billData.billStatus || !billData.itemsData) {
                        connection.rollback(() => {
                            connection.release();
                            return res.status(404).send('Please Fill All The Fields..!');
                        })
                    } else {
                        const isComplimentary = billData.billPayType == 'complimentary' ? true : false;
                        let sql_query_getOfficialLastBillNo = `SELECT COALESCE(MAX(billNumber),0) AS officialLastBillNo FROM billing_Official_data WHERE firmId = '${billData.firmId}' AND billCreationDate = (SELECT MAX(billCreationDate) FROM billing_Official_data WHERE firmId = '${billData.firmId}') FOR UPDATE`;
                        let sql_query_getComplimentaryLastBillNo = `SELECT COALESCE(MAX(billNumber),0) AS complimentaryBillNo FROM billing_Complimentary_data WHERE firmId = '${billData.firmId}' AND billCreationDate = (SELECT MAX(billCreationDate) FROM billing_Complimentary_data WHERE firmId = '${billData.firmId}') FOR UPDATE`;
                        let sql_query_getLastBillNo = `SELECT COALESCE(MAX(billNumber),0) AS lastBillNo FROM billing_data WHERE firmId = '${billData.firmId}' AND billCreationDate = (SELECT MAX(billCreationDate) FROM billing_data WHERE firmId = '${billData.firmId}') FOR UPDATE;
                                                       SELECT COALESCE(MAX(tokenNo),0) AS lastTokenNo FROM billing_token_data WHERE billType = '${billData.billType}' AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y') FOR UPDATE;
                                                       ${billData.isOfficial && !isComplimentary ? sql_query_getOfficialLastBillNo : isComplimentary ? sql_query_getComplimentaryLastBillNo : ''}`;
                        connection.query(sql_query_getLastBillNo, (err, result) => {
                            if (err) {
                                console.error("Error selecting last bill and token number:", err);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                            } else {
                                const lastBillNo = result && result[0] && result[0][0].lastBillNo ? result[0][0].lastBillNo : 0;
                                const lastTokenNo = result && result[0] && result[1][0].lastTokenNo ? result[1][0].lastTokenNo : 0;
                                const officialLastBillNo = result && result[2] && result[2][0].officialLastBillNo ? result[2][0].officialLastBillNo : result && result[2] && result[2][0].complimentaryBillNo ? result[2][0].complimentaryBillNo : 0;

                                const nextBillNo = lastBillNo + 1;
                                const nextOfficialBillNo = officialLastBillNo + 1;
                                const nextTokenNo = lastTokenNo + 1;
                                const uid1 = new Date();
                                const billId = String("bill_" + uid1.getTime() + '_' + nextBillNo);
                                const tokenId = String("token_" + uid1.getTime() + '_' + nextTokenNo);
                                const bwcId = String("bwc_" + uid1.getTime() + '_' + nextTokenNo);

                                const columnData = `billId,
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
                                const values = `'${billId}',
                                                '${billData.firmId}', 
                                                'Online', 
                                                'Online',
                                                'Pick Up',
                                                '${billData.billPayType}',
                                                '${billData.discountType}',
                                                ${billData.discountValue},
                                                ${billData.totalDiscount},
                                                ${billData.subTotal},
                                                ${billData.settledAmount},
                                                ${billData.billComment ? `'${billData.billComment}'` : null},
                                                STR_TO_DATE('${currentDate}','%b %d %Y'),
                                                '${billData.billStatus}'`;
                                let sql_querry_addBillInfo = `INSERT INTO billing_data (billNumber,${columnData}) VALUES (${nextBillNo}, ${values})`;
                                let sql_querry_addOfficialData = `INSERT INTO billing_Official_data (billNumber, ${columnData}) VALUES(${nextOfficialBillNo}, ${values})`;
                                let sql_querry_addComplimentaryData = `INSERT INTO billing_Complimentary_data (billNumber, ${columnData}) VALUES(${nextOfficialBillNo}, ${values})`;
                                let sql_querry_addBillData = `${sql_querry_addBillInfo};
                                                              ${billData.isOfficial && !isComplimentary ? sql_querry_addOfficialData : isComplimentary ? sql_querry_addComplimentaryData : ''}`;
                                connection.query(sql_querry_addBillData, (err) => {
                                    if (err) {
                                        console.error("Error inserting new bill number:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        let sql_query_addTokenNo = `INSERT INTO billing_token_data(tokenId, billId, tokenNo, billType, billDate)
                                                                    VALUES ('${tokenId}', '${billId}', ${nextTokenNo}, '${billData.billType}', STR_TO_DATE('${currentDate}','%b %d %Y'))`;
                                        connection.query(sql_query_addTokenNo, (err) => {
                                            if (err) {
                                                console.error("Error inserting new Token number:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                const billItemData = billData.itemsData
                                                let addBillWiseItemData = billItemData.map((item, index) => {
                                                    let uniqueId = `iwb_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                                    return `('${uniqueId}', '${billId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null})`;
                                                }).join(', ');
                                                let sql_query_addItems = `INSERT INTO billing_billWiseItem_data(iwbId, billId, itemId, qty, unit, itemPrice, price, comment)
                                                                          VALUES ${addBillWiseItemData}`;
                                                connection.query(sql_query_addItems, (err) => {
                                                    if (err) {
                                                        console.error("Error inserting Bill Wise Item Data:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        let sql_query_getFirmData = `SELECT firmId, firmName, gstNumber, firmAddress, pincode, firmMobileNo, otherMobileNo FROM billing_firm_data WHERE firmId = '${billData.firmId}';
                                                                                         SELECT
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
                                                                                         WHERE btd.billType = 'Pick Up' AND bd.billStatus NOT IN ('complete','Cancel') AND btd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                                                         ORDER BY btd.tokenNo ASC`;
                                                        connection.query(sql_query_getFirmData, (err, firm) => {
                                                            if (err) {
                                                                console.error("Error inserting Bill Wise Item Data:", err);
                                                                connection.rollback(() => {
                                                                    connection.release();
                                                                    return res.status(500).send('Database Error');
                                                                });
                                                            } else {
                                                                const sendJson = {
                                                                    ...billData,
                                                                    firmData: firm[0][0],
                                                                    cashier: cashier,
                                                                    billNo: nextBillNo,
                                                                    officialBillNo: billData.isOfficial && !isComplimentary ? nextOfficialBillNo : isComplimentary ? 'C' + nextOfficialBillNo : 'Not Available',
                                                                    tokenNo: 'P' + nextTokenNo,
                                                                    justToken: nextTokenNo,
                                                                    billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                                    billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                }
                                                                const tokenList = firm && firm[1].length ? firm[1] : null;
                                                                const customerData = billData.customerDetails;
                                                                if (customerData && customerData.mobileNo || customerData && customerData.mobileNo) {
                                                                    let sql_query_addAddressRelation = `INSERT INTO billing_billWiseCustomer_data(bwcId, billId, customerId, addressId, mobileNo, customerName, address, locality)
                                                                                                        VALUES ('${bwcId}', '${billId}', '${null}', '${null}', ${customerData.mobileNo ? `TRIM('${customerData.mobileNo}')` : null}, ${customerData.customerName ? `TRIM('${customerData.customerName}')` : null}, ${customerData.address ? `'${customerData.address}'` : null}, ${customerData.locality ? `'${customerData.locality}'` : null})`;
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
                                                                                    req?.io?.emit('getTokenList', tokenList);
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
                                                                            req?.io?.emit('getTokenList', tokenList);
                                                                            return res.status(200).send(sendJson);
                                                                        }
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    }
                                                });
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
            console.error('An error occurd', error);
            connection.rollback(() => {
                connection.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    });
}

module.exports = {
    addOnlineHotelBillData,
    addOnlinePickUpBillData
}