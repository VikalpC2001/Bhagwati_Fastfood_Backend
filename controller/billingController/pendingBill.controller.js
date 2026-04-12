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

/**
 * Same as online hotel billing: raw discount from billing_hotel_data (percentage | fixed | none).
 * @param {number} subTotal
 * @param {string} discountType
 * @param {number} discount
 * @returns {number}
 */
function computeHotelDiscountAmt(subTotal, discountType, discount) {
    const s = Number(subTotal) || 0;
    const d = Number(discount) || 0;
    if (!discountType || discountType === 'none') return 0;
    if (discountType === 'percentage') return (s * d) / 100;
    if (discountType === 'fixed') return Math.min(d, s);
    return 0;
}

/**
 * Loads full pending bill payload (same JSON shape as getPendingBillDataById response).
 * @param {string} pendingId
 * @param {(err: Error|null, payload: object|null) => void} callback
 */
function fetchPendingBillPayloadById(pendingId, callback) {
    const sql_query_chkBillExist = `SELECT pendingId, billType FROM pending_data WHERE pendingId = '${pendingId}'`;
    pool.query(sql_query_chkBillExist, (err, bill) => {
        if (err) return callback(err);
        if (!bill || !bill.length) return callback(null, null);
        const billType = bill[0].billType;
        const sql_query_getBillingData = `SELECT 
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
        const sql_query_getBillwiseItem = `SELECT
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
        const sql_query_getCustomerInfo = `SELECT
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
        const sql_query_getHotelInfo = `SELECT
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
                                        WHERE phid.pendingId = '${pendingId}'`;
        const sql_query_getFirmData = `SELECT 
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
                                          firmId = (SELECT firmId FROM pending_data WHERE pendingId = '${pendingId}')`;
        const sql_query_getBillData = `${sql_query_getBillingData};
                                       ${sql_query_getBillwiseItem};
                                       ${sql_query_getFirmData};
                                       ${billType == 'Hotel' ? sql_query_getHotelInfo + ';' : ''}
                                       ${billType == 'Pick Up' || billType == 'Delivery' ? sql_query_getCustomerInfo : ''}`;
        pool.query(sql_query_getBillData, (qErr, billData) => {
            if (qErr) return callback(qErr);
            const json = {
                ...billData[0][0],
                itemData: billData && billData[1] ? billData[1] : [],
                firmData: billData && billData[2] ? billData[2][0] : [],
                ...(billType === 'Hotel' ? { hotelDetails: billData[3] && billData[3][0] ? billData[3][0] : null } : {}),
                ...(billType == 'Pick Up' || billType == 'Delivery'
                    ? { customerDetails: billData && billData[3] && billData[3][0] ? billData[3][0] : null }
                    : {})
            };
            callback(null, json);
        });
    });
}

/**
 * Deletes all rows for a pending order.
 * @param {string} pendingId
 * @param {(err: Error|null) => void} callback
 */
function deletePendingBillRows(pendingId, callback) {
    const sql_query_discardData = `DELETE FROM pending_data WHERE pendingId = '${pendingId}';
                             DELETE FROM pending_billWiseItem_data WHERE pendingId = '${pendingId}';
                             DELETE FROM pending_hotelInfo_data WHERE pendingId = '${pendingId}';
                             DELETE FROM pending_billWiseCustomer_data WHERE pendingId = '${pendingId}'`;
    pool.query(sql_query_discardData, callback);
}

/**
 * Pending row may have billStatus `Reject` when re-approving; real bill must not use that value.
 * @param {unknown} pendingStatus
 * @returns {string}
 */
function normalizeBillStatusForAccept(pendingStatus) {
    const s = String(pendingStatus || '').toLowerCase();
    if (s === 'reject') return 'complete';
    return pendingStatus ? String(pendingStatus) : 'complete';
}

/**
 * Maps pending payload to addOnlineHotelBillData req.body.
 * @param {Record<string, unknown>} p
 */
function mapPendingToHotelOnlineBody(p) {
    const h = p.hotelDetails;
    if (!h || !h.hotelId) {
        throw new Error('Hotel details missing');
    }
    return {
        hotelId: h.hotelId,
        firmId: p.firmId,
        subTotal: Number(p.totalAmount),
        billStatus: normalizeBillStatusForAccept(p.billStatus),
        itemsData: (p.itemData || []).map((row) => ({
            itemId: row.itemId,
            itemName: row.itemName != null ? row.itemName : '',
            qty: row.qty,
            unit: row.unit,
            itemPrice: row.itemPrice,
            price: row.price,
            comment: row.comment,
            ...(row.inputCode != null && String(row.inputCode) !== '' ? { inputCode: row.inputCode } : {}),
            addons: {}
        })),
        billComment: p.billComment,
        roomNo: h.roomNo,
        customerName: h.customerName,
        mobileNo: h.mobileNo,
        customerNumber: h.mobileNo != null && h.mobileNo !== '' ? h.mobileNo : '',
        billType: 'Hotel',
        /** Same shape as fetchPendingBillPayloadById (pending_hotelInfo_data + billing_hotel join). */
        hotelDetails: h
    };
}

/**
 * Maps pending payload to addOnlinePickUpBillData req.body.
 * @param {Record<string, unknown>} p
 */
function mapPendingToPickUpOnlineBody(p) {
    return {
        customerDetails: p.customerDetails || {},
        firmId: p.firmId,
        subTotal: Number(p.totalAmount),
        settledAmount: Number(p.settledAmount),
        billPayType: p.billPayType,
        discountType: p.discountType,
        discountValue: p.discountValue,
        totalDiscount: p.totalDiscount,
        billComment: p.billComment,
        billStatus: normalizeBillStatusForAccept(p.billStatus),
        itemsData: (p.itemData || []).map((row) => ({
            itemId: row.itemId,
            itemName: row.itemName != null ? row.itemName : '',
            qty: row.qty,
            unit: row.unit,
            itemPrice: row.itemPrice,
            price: row.price,
            comment: row.comment,
            ...(row.inputCode != null && String(row.inputCode) !== '' ? { inputCode: row.inputCode } : {})
        })),
        billType: p.billType,
        isOfficial: p.isOfficial
    };
}

/**
 * Express-like res wrapper: on HTTP 200 from online billing, deletes pending rows and emits pending count.
 * @param {string} pendingId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function createResWithPendingCleanup(pendingId, req, res) {
    const forward = (code, body, sendOrJson) => {
        if (code !== 200) {
            return sendOrJson === 'json' ? res.status(code).json(body) : res.status(code).send(body);
        }
        deletePendingBillRows(pendingId, (delErr) => {
            if (delErr) {
                console.error('Failed to remove pending after bill:', delErr);
                return res.status(500).send('Bill created but pending cleanup failed');
            }
            pool.query(`SELECT COUNT(*) AS pendingNo FROM pending_data WHERE billStatus = 'Pending'`, (cntErr, rows) => {
                if (cntErr) {
                    console.error(cntErr);
                    return res.status(500).send('Database Error');
                }
                const pendingCount = rows && rows[0] ? rows[0].pendingNo : 0;
                req?.io?.emit('pendingBillList');
                req?.io?.emit('getpendingCount', pendingCount);
                const orderAcceptPayload = { orderAccept: true };
                if (body != null && typeof body === 'object' && !Array.isArray(body) && body.tokenNo != null) {
                    orderAcceptPayload.tokenNo = body.tokenNo;
                }
                req?.io?.emit(`order_${pendingId}`, orderAcceptPayload);
                return res.status(200).send(body);
            });
        });
    };
    return {
        status(code) {
            return {
                send: (body) => forward(code, body, 'send'),
                json: (body) => forward(code, body, 'json')
            };
        }
    };
}

// Get Number Of Pending

const getPendingCount = (req, res) => {
    try {
        let sql_query_getPendingNumber = `SELECT COUNT(*) AS pendingNo FROM pending_data WHERE billStatus = 'Pending'`;
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
        const status = req.query.status || 'Pending';
        const currentDate = getCurrentDate();
        /**
         * Hotel: room/customer/phone from pending_hotelInfo_data; name from billing_hotel_data.
         * Pick Up / Delivery: customer/phone/address/locality from pending_billWiseCustomer_data.
         */
        let sql_query_getPendingBill = `SELECT
                                            pd.pendingId AS pendingId,
                                            pd.settledAmount AS totalAmount,
                                            pd.cashier AS PendingBy,
                                            pd.menuStatus AS orderStatus,
                                            CONCAT(DATE_FORMAT(pd.billDate,'%d-%b-%Y'),' ',DATE_FORMAT(pd.billCreationDate,'%h:%i:%s')) AS pendingDateTime,
                                            pd.billType AS billType,
                                            COALESCE(bh.hotelName, '') AS hoteName,
                                            CASE WHEN pd.billType = 'Hotel' THEN COALESCE(ph.roomNo, '') ELSE '' END AS roomNo,
                                            CASE
                                                WHEN pd.billType = 'Hotel' THEN COALESCE(ph.customerName, '')
                                                WHEN pd.billType IN ('Pick Up', 'Delivery') THEN COALESCE(pw.customerName, '')
                                                ELSE ''
                                            END AS customerName,
                                            CASE
                                                WHEN pd.billType = 'Hotel' THEN COALESCE(ph.phoneNumber, '')
                                                WHEN pd.billType IN ('Pick Up', 'Delivery') THEN COALESCE(pw.mobileNo, '')
                                                ELSE ''
                                            END AS phoneNumber,
                                            CASE WHEN pd.billType IN ('Pick Up', 'Delivery') THEN COALESCE(pw.address, '') ELSE '' END AS address,
                                            CASE WHEN pd.billType IN ('Pick Up', 'Delivery') THEN COALESCE(pw.locality, '') ELSE '' END AS locality
                                        FROM
                                            pending_data AS pd
                                        LEFT JOIN pending_hotelInfo_data AS ph ON ph.pendingId = pd.pendingId
                                        LEFT JOIN billing_hotel_data AS bh ON bh.hotelId = ph.hotelId
                                        LEFT JOIN pending_billWiseCustomer_data AS pw ON pw.pendingId = pd.pendingId
                                        WHERE pd.billStatus = '${status}' AND pd.billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
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

// Get Pending Data By Id (full payload + remove from queue — same behaviour as accept)

const getPendingBillDataById = (req, res) => {
    try {
        const pendingId = req.query.pendingId;
        if (!pendingId) {
            return res.status(404).send('pendingId Not Found');
        }
        fetchPendingBillPayloadById(pendingId, (err, pendingJson) => {
            if (err) {
                console.error("An error occurred in SQL Query", err);
                return res.status(500).send('Database Error');
            }
            if (!pendingJson) {
                return res.status(404).send('Pending Id Not Found');
            }
            pool.query(`SELECT COUNT(*) AS pendingNo FROM pending_data WHERE billStatus = 'Pending'`, (cntErr, rows) => {
                if (cntErr) {
                    console.error("An error occurred in SQL Query", cntErr);
                    return res.status(500).send('Database Error');
                }
                const pendingCount = rows && rows[0] ? rows[0].pendingNo : 0;
                req?.io?.emit('getpendingCount', pendingCount);
                return res.status(200).send(pendingJson);
            });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
};

/**
 * Accept pending order: creates real bill via online billing (Hotel / Pick Up), then removes pending rows on success.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const acceptPendingBillData = (req, res) => {
    try {
        const pendingId = req.body.pendingId || req.query.pendingId;
        if (!pendingId) {
            return res.status(404).send('pendingId Not Found');
        }
        fetchPendingBillPayloadById(pendingId, (err, pendingJson) => {
            if (err) {
                console.error("An error occurred in SQL Query", err);
                return res.status(500).send('Database Error');
            }
            if (!pendingJson) {
                return res.status(404).send('Pending Id Not Found');
            }

            const { addOnlineHotelBillData, addOnlineBillData } = require('./onlineBilling.controller');
            const fakeReq = { body: {}, io: req.io };
            const fakeRes = createResWithPendingCleanup(pendingId, req, res);

            try {
                if (pendingJson.billType === 'Hotel') {
                    fakeReq.body = mapPendingToHotelOnlineBody(pendingJson);
                    return addOnlineHotelBillData(fakeReq, fakeRes);
                }
                if (pendingJson.billType === 'Pick Up') {
                    fakeReq.body = mapPendingToPickUpOnlineBody(pendingJson);
                    return addOnlineBillData(fakeReq, fakeRes);
                }
                if (pendingJson.billType === 'Delivery') {
                    fakeReq.body = mapPendingToPickUpOnlineBody(pendingJson);
                    return addOnlineBillData(fakeReq, fakeRes);
                }
                return res.status(400).send('Unsupported bill type for accept');
            } catch (mapErr) {
                console.error('acceptPendingBillData mapping error:', mapErr);
                return res.status(400).send(mapErr.message || 'Invalid pending data');
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
};

/**
 * Reject pending order: mark as rejected (keeps row for audit).
 */
const rejectPendingBillData = (req, res) => {
    try {
        const pendingId = req.body.pendingId || req.query.pendingId;
        if (!pendingId) {
            return res.status(404).send('pendingId Not Found....!');
        }
        const sql = `UPDATE pending_data SET billStatus = 'Reject' WHERE pendingId = '${pendingId}'`;
        pool.query(sql, (err, result) => {
            if (err) {
                console.error("An error occurred in SQL Query", err);
                return res.status(500).send('Database Error');
            }
            if (!result || result.affectedRows === 0) {
                return res.status(404).send('Pending Id Not Found');
            }
            req?.io?.emit('pendingBillList');
            req?.io?.emit(`order_${pendingId}`, { orderAccept: false });
            return res.status(200).send('Order Rejected');
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
};

// Add Pending Hotel Bill Data

const addHotelPendingBillData = (req, res) => {
    const currentDate = getCurrentDate();
    const pendingData = req.body;
    if (!pendingData.hotelId || !pendingData.firmId || !pendingData.subTotal || !pendingData.billStatus || !pendingData.itemsData) {
        return res.status(404).send('Please Fill All The Fields..!');
    }

    const sql_getHotelDiscount = `SELECT payType, discountType, discount FROM billing_hotel_data WHERE hotelId = '${pendingData.hotelId}' LIMIT 1`;
    pool.query(sql_getHotelDiscount, (hotelErr, hotelRows) => {
        if (hotelErr) {
            console.error("Error loading hotel discount config:", hotelErr);
            return res.status(500).send('Database Error');
        }
        if (!hotelRows || !hotelRows.length) {
            return res.status(404).send('Hotel Not Found');
        }

        const hotelCfg = hotelRows[0];
        const subTotal = Number(pendingData.subTotal);
        const discountRaw = computeHotelDiscountAmt(subTotal, hotelCfg.discountType, hotelCfg.discount);
        const discountAmt = Math.floor(Math.min(discountRaw, subTotal));
        const billPayTypeFromHotel = hotelCfg.payType;
        const discountTypeFromHotel = hotelCfg.discountType;
        const discountValueFromHotel = Number(hotelCfg.discount) || 0;
        const totalAmount = subTotal;
        const settledAmount = Math.max(0, totalAmount - discountAmt);
        const totalDiscount = discountAmt;

        pool2.getConnection((err, connection) => {
            if (err) {
                console.error("Error getting database connection:", err);
                return res.status(500).send('Database Error');
            }
            try {
                connection.beginTransaction((txErr) => {
                    if (txErr) {
                        console.error("Error beginning transaction:", txErr);
                        connection.release();
                        return res.status(500).send('Database Error');
                    }

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
                                    '${billPayTypeFromHotel}',
                                    '${discountTypeFromHotel}',
                                    ${discountValueFromHotel},
                                    ${totalDiscount},
                                    ${totalAmount},
                                    ${settledAmount},
                                    ${pendingData.billComment ? `'${pendingData.billComment}'` : null},
                                    STR_TO_DATE('${currentDate}','%b %d %Y'),
                                    'Pending'`;
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
                                    const billItemData = pendingData.itemsData;
                                    let addBillWiseItemData = billItemData.map((item, index) => {
                                        let uniqueId = `iwb_${Date.now() + index + '_' + index}`;
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
                                            let sql_query_getpendingCount = `SELECT COUNT(*) AS pendingNo FROM pending_data WHERE billStatus = 'Pending'`;
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
                                                            req?.io?.emit('pendingBillList');
                                                            req?.io?.emit('notification');
                                                            req?.io?.emit('getpendingCount', pendingCount);
                                                            return res.status(200).send({ pendingId: pendingId });
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
                });
            } catch (error) {
                console.error('An error occurred', error);
                connection.rollback(() => {
                    connection.release();
                    return res.status(500).json('Internal Server Error');
                });
            }
        });
    });
};

// Add Pending PickUp Bill Data

const addOnlinePendingBillData = (req, res) => {
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
                    if (!pendingData.customerDetails || !pendingData.billType || !pendingData.firmId || !pendingData.subTotal || !pendingData.settledAmount || !pendingData.itemsData) {
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
                                        '${pendingData.billType}',
                                        'cash',
                                        'none',
                                        0,
                                        0,
                                        ${pendingData.subTotal},
                                        ${pendingData.settledAmount},
                                        ${pendingData.billComment ? `'${pendingData.billComment}'` : null},
                                        STR_TO_DATE('${currentDate}','%b %d %Y'),
                                        'Pending'`;
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
                                        let sql_query_getpendingCount = `SELECT COUNT(*) AS pendingNo FROM pending_data WHERE billStatus = 'Pending'`;
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
                                                                                        VALUES ('${bwcId}', '${pendingId}', ${customerData.customerId ? `'${customerData.customerId}'` : null}, ${customerData.addressId ? `'${customerData.addressId}'` : null}, ${customerData.mobileNo ? `TRIM('${customerData.mobileNo}')` : null}, ${customerData.customerName ? `TRIM('${customerData.customerName}')` : null}, ${customerData.address ? `'${customerData.address}'` : null}, ${customerData.locality ? `'${customerData.locality}'` : null})`;
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
                                                                    req?.io?.emit('pendingBillList');
                                                                    req?.io?.emit('notification');
                                                                    req?.io?.emit('getpendingCount', pendingCount);
                                                                    return res.status(200).send({ pendingId: pendingId });
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
                                                            req?.io?.emit('pendingBillList');
                                                            req?.io?.emit('notification');
                                                            req?.io?.emit('getpendingCount', pendingCount);
                                                            return res.status(200).send({ pendingId: pendingId });
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
                    let sql_query_getPendingNumber = `SELECT COUNT(*) AS pendingNo FROM pending_data WHERE billStatus = 'Pending'`;
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
    acceptPendingBillData,
    rejectPendingBillData,
    addHotelPendingBillData,
    addOnlinePendingBillData,
    discardpendingData
}