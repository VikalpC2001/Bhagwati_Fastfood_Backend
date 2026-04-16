const pool = require('../../database');
const jwt = require("jsonwebtoken");
const pool2 = require('../../databasePool');
const { addOnlinePendingBillData, addHotelPendingBillData } = require('./pendingBill.controller');

// Get Date Function 4 Hour

function getCurrentDate() {
    const now = new Date();
    const hours = now.getHours();

    if (hours <= 4) { // If it's 4 AM or later, increment the date
        now.setDate(now.getDate() - 1);
    }
    return now.toDateString().slice(4, 15);
}

function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    const hours = Number(parts[0] || 0);
    const minutes = Number(parts[1] || 0);
    return hours * 60 + minutes;
}

/**
 * When two clock times are equal, treat as "no restriction" / 24h:
 * - stopAutoAccept: full-day auto-accept for that rule
 * - storeStart/storeEnd: store treated as open all day (skip narrow window check)
 * @param {unknown} startTime
 * @param {unknown} endTime
 * @returns {boolean}
 */
function isStopAutoAccept24hEqual(startTime, endTime) {
    if (startTime == null || endTime == null) return false;
    const a = timeToMinutes(startTime);
    const b = timeToMinutes(endTime);
    if (a === null || b === null) return false;
    return a === b;
}

/**
 * Computes raw discount amount from billing_hotel_data (percentage | fixed | none).
 * Caller should round to whole rupees (e.g. Math.floor) before storing.
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

// ADD Hotel Online QR Billing Data

const addOnlineHotelBillData = (req, res) => {
    const currentDate = getCurrentDate();
    const billData = req.body;
    if (!billData.hotelId || !billData.firmId || !billData.subTotal || !billData.billStatus || !billData.itemsData) {
        return res.status(404).send('Please Fill All The Fields..!');
    }

    const sql_getHotelDiscount = `SELECT payType, discountType, discount FROM billing_hotel_data WHERE hotelId = '${billData.hotelId}' LIMIT 1`;
    const sql_getHotelCategoryPrint = `SELECT isOfficial, billFooterNote, appriciateLine FROM billing_category_data WHERE categoryId = 'hotel' AND firmId = '${billData.firmId}' LIMIT 1`;
    pool.query(`${sql_getHotelDiscount};${sql_getHotelCategoryPrint}`, (hotelErr, results) => {
        if (hotelErr) {
            console.error("Error loading hotel discount config:", hotelErr);
            return res.status(500).send('Database Error');
        }
        let hotelRows;
        let categoryPrintRows = null;
        if (Array.isArray(results) && results.length >= 2 && Array.isArray(results[0])) {
            hotelRows = results[0];
            categoryPrintRows = results[1];
        } else {
            hotelRows = results;
        }
        if (!hotelRows || !hotelRows.length) {
            return res.status(404).send('Hotel Not Found');
        }

        const hotelCfg = hotelRows[0];
        let billFooterNoteVal = '';
        let appriciateLineVal = '';
        if (categoryPrintRows && categoryPrintRows.length && categoryPrintRows[0]) {
            const cr = categoryPrintRows[0];
            billFooterNoteVal = cr.billFooterNote != null ? String(cr.billFooterNote) : '';
            appriciateLineVal = cr.appriciateLine != null ? String(cr.appriciateLine) : '';
            if (typeof billData.isOfficial === 'undefined' && cr.isOfficial != null && cr.isOfficial !== undefined) {
                billData.isOfficial =
                    cr.isOfficial === 1 ||
                    cr.isOfficial === '1' ||
                    cr.isOfficial === true ||
                    cr.isOfficial === 'true';
            }
        }
        const subTotal = Number(billData.subTotal);
        const discountRaw = computeHotelDiscountAmt(subTotal, hotelCfg.discountType, hotelCfg.discount);
        /** Whole-rupee discount (e.g. 10% of 35 = 3.5 → 3) — no decimal points stored */
        const discountAmt = Math.floor(Math.min(discountRaw, subTotal));
        const billPayTypeFromHotel = hotelCfg.payType;
        const discountTypeFromHotel = hotelCfg.discountType;
        const discountValueFromHotel = Number(hotelCfg.discount) || 0;
        const totalAmount = subTotal;
        /** Net payable after discount (e.g. 35 − 3 = 32) */
        const settledAmount = Math.max(0, totalAmount - discountAmt);
        const totalDiscount = discountAmt;
        const amountAfterDiscount = settledAmount;

        const isComplimentary = billPayTypeFromHotel === 'complimentary';
        const resetStartDateExpr = `STR_TO_DATE(
                                        CONCAT(
                                            CASE
                                                WHEN DATE(STR_TO_DATE('${currentDate}', '%b %d %Y')) < STR_TO_DATE(
                                                    CONCAT(YEAR(STR_TO_DATE('${currentDate}', '%b %d %Y')), '-', frm.resetDate),
                                                    '%Y-%m-%d'
                                                )
                                                THEN YEAR(STR_TO_DATE('${currentDate}', '%b %d %Y')) - 1
                                                ELSE YEAR(STR_TO_DATE('${currentDate}', '%b %d %Y'))
                                            END,
                                            '-',
                                            frm.resetDate
                                        ),
                                        '%Y-%m-%d'
                                    )`;
        const billTypeForToken = billData.billType || 'Hotel';

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

                    let sql_query_getOfficialLastBillNo = `SELECT COALESCE(MAX(bod.billNumber), 0) AS officialLastBillNo
                                                            FROM billing_Official_data bod
                                                            CROSS JOIN (SELECT COALESCE(resetDate, '04-01') AS resetDate FROM billing_firm_data WHERE firmId = '${billData.firmId}' LIMIT 1) AS frm
                                                            WHERE bod.firmId = '${billData.firmId}'
                                                            AND bod.billDate >= ${resetStartDateExpr}
                                                            FOR UPDATE`;
                    let sql_query_getComplimentaryLastBillNo = `SELECT COALESCE(MAX(bcd.billNumber), 0) AS complimentaryBillNo
                                                                 FROM billing_Complimentary_data bcd
                                                                 CROSS JOIN (SELECT COALESCE(resetDate, '04-01') AS resetDate FROM billing_firm_data WHERE firmId = '${billData.firmId}' LIMIT 1) AS frm
                                                                 WHERE bcd.firmId = '${billData.firmId}'
                                                                 AND bcd.billDate >= ${resetStartDateExpr}
                                                                 FOR UPDATE`;
                    let sql_query_getLastBillNo = `SELECT COALESCE(MAX(bd.billNumber), 0) AS lastBillNo
                                                   FROM billing_data bd
                                                   CROSS JOIN (SELECT COALESCE(resetDate, '04-01') AS resetDate FROM billing_firm_data WHERE firmId = '${billData.firmId}' LIMIT 1) AS frm
                                                   WHERE bd.firmId = '${billData.firmId}'
                                                   AND bd.billDate >= ${resetStartDateExpr}
                                                   FOR UPDATE;
                                                   SELECT COALESCE(MAX(tokenNo),0) AS lastTokenNo FROM billing_token_data WHERE billType = '${billTypeForToken}' AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y') FOR UPDATE;
                                                   ${billData.isOfficial && !isComplimentary ? sql_query_getOfficialLastBillNo : isComplimentary ? sql_query_getComplimentaryLastBillNo : ''}`;

                    connection.query(sql_query_getLastBillNo, (err, result) => {
                        if (err) {
                            console.error("Error selecting last bill and token number:", err);
                            connection.rollback(() => {
                                connection.release();
                                return res.status(500).send('Database Error');
                            });
                            return;
                        }
                        const lastBillNo = result && result[0] && result[0][0].lastBillNo ? result[0][0].lastBillNo : 0;
                        const lastTokenNo = result && result[1] && result[1][0].lastTokenNo ? result[1][0].lastTokenNo : 0;
                        const officialLastBillNo = result && result[2] && result[2][0].officialLastBillNo
                            ? result[2][0].officialLastBillNo
                            : result && result[2] && result[2][0].complimentaryBillNo
                                ? result[2][0].complimentaryBillNo
                                : 0;

                        const nextBillNo = lastBillNo + 1;
                        const nextOfficialBillNo = officialLastBillNo + 1;
                        const nextTokenNo = lastTokenNo + 1;
                        const uid1 = new Date();
                        const billId = String("bill_" + uid1.getTime() + '_' + nextBillNo);
                        const tokenId = String("token_" + uid1.getTime() + '_' + nextTokenNo);
                        const hotelInfoId = String("hotelInfo_" + uid1.getTime() + '_' + nextBillNo);
                        const bwuId = String("bwu_" + uid1.getTime());

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
                                        '${billPayTypeFromHotel}',
                                        '${discountTypeFromHotel}',
                                        ${discountValueFromHotel},
                                        ${totalDiscount},
                                        ${totalAmount},
                                        ${settledAmount},
                                        ${billData.billComment ? `'${billData.billComment}'` : null},
                                        STR_TO_DATE('${currentDate}','%b %d %Y'),
                                        'Print'`;
                        let sql_querry_addBillInfo = `INSERT INTO billing_data (billNumber,${columnData}) VALUES (${nextBillNo}, ${values})`;
                        let sql_querry_addOfficialData = `INSERT INTO billing_Official_data (billNumber, ${columnData}) VALUES(${nextOfficialBillNo}, ${values})`;
                        let sql_querry_addComplimentaryData = `INSERT INTO billing_Complimentary_data (billNumber, ${columnData}) VALUES(${nextOfficialBillNo}, ${values})`;
                        let sql_querry_addBillData = `${sql_querry_addBillInfo};
                                                      ${billData.isOfficial && !isComplimentary ? sql_querry_addOfficialData : isComplimentary ? sql_querry_addComplimentaryData : ''}`;

                        connection.query(sql_querry_addBillData, (insertErr) => {
                            if (insertErr) {
                                console.error("Error inserting new bill number:", insertErr);
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(500).send('Database Error');
                                });
                                return;
                            }
                            let sql_query_addTokenNo = `INSERT INTO billing_token_data(tokenId, billId, tokenNo, billType, billDate)
                                                        VALUES ('${tokenId}', '${billId}', ${nextTokenNo}, '${billTypeForToken}', STR_TO_DATE('${currentDate}','%b %d %Y'))`;
                            connection.query(sql_query_addTokenNo, (tokenErr) => {
                                if (tokenErr) {
                                    console.error("Error inserting new Token number:", tokenErr);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                    return;
                                }
                                let sql_query_addHotelDetalis = `INSERT INTO billing_hotelInfo_data(hotelInfoId, billId, hotelId, roomNo, customerName, phoneNumber)
                                                                 VALUES(?, ?, ?, ?, ?, ?)`;
                                const sql_query_addHotelDetalis_values = [
                                    hotelInfoId,
                                    billId,
                                    billData.hotelId,
                                    billData.roomNo || null,
                                    billData.customerName || null,
                                    billData.mobileNo || null
                                ];
                                connection.query(sql_query_addHotelDetalis, sql_query_addHotelDetalis_values, (hotelInfoErr) => {
                                    if (hotelInfoErr) {
                                        console.error("Error inserting Hotel Info Details:", hotelInfoErr);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                        return;
                                    }
                                    const billItemData = billData.itemsData;
                                    const addBillWiseItemData = [];
                                    const addItemWiseAddonData = [];
                                    billItemData.forEach((item, index) => {
                                        let uniqueId = `iwb_${Date.now() + index}_${index}`;
                                        addBillWiseItemData.push(`('${uniqueId}', '${billId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null}, 'Hotel', '${billPayTypeFromHotel}', '${billData.billStatus}', STR_TO_DATE('${currentDate}','%b %d %Y'))`);
                                        const allAddons = item.addons ? Object.keys(item.addons) : [];
                                        if (allAddons && allAddons.length) {
                                            allAddons.forEach((addonId, addonIndex) => {
                                                let iwaId = `iwa_${Date.now() + addonIndex + index}_${index}`;
                                                addItemWiseAddonData.push(`('${iwaId}', '${uniqueId}', '${addonId}')`);
                                            });
                                        }
                                    });
                                    let sql_query_addItems = `INSERT INTO billing_billWiseItem_data(iwbId, billId, itemId, qty, unit, itemPrice, price, comment, billType, billPayType, billStatus, billDate)
                                                              VALUES ${addBillWiseItemData.join(", ")}`;
                                    connection.query(sql_query_addItems, (itemsErr) => {
                                        if (itemsErr) {
                                            console.error("Error inserting Bill Wise Item Data:", itemsErr);
                                            connection.rollback(() => {
                                                connection.release();
                                                return res.status(500).send('Database Error');
                                            });
                                            return;
                                        }
                                        let sql_query_getFirmData = `SELECT firmId, firmName, gstNumber, firmAddress, pincode, firmMobileNo, otherMobileNo FROM billing_firm_data WHERE firmId = '${billData.firmId}';
                                                                     ${addItemWiseAddonData.length ? `INSERT INTO billing_itemWiseAddon_data (iwaId, iwbId, addOnsId) VALUES ${addItemWiseAddonData.join(", ")};` : ''}
                                                                     ${billPayTypeFromHotel === 'online' && billData.onlineId && billData.onlineId != 'other'
                                                ? `INSERT INTO billing_billWiseUpi_data(bwuId, onlineId, billId, amount, onlineDate)
                                                                               VALUES('${bwuId}', '${billData.onlineId}', '${billId}', '${amountAfterDiscount}', STR_TO_DATE('${currentDate}','%b %d %Y'));`
                                                : ''}
                                                SELECT adminMacAddress FROM billing_admin_data LIMIT 1`;
                                        connection.query(sql_query_getFirmData, (firmErr, firm) => {
                                            if (firmErr) {
                                                console.error("Error in firm/addon/upi queries:", firmErr);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                                return;
                                            }
                                            connection.commit((commitErr) => {
                                                if (commitErr) {
                                                    console.error("Error committing transaction:", commitErr);
                                                    connection.rollback(() => {
                                                        connection.release();
                                                        return res.status(500).send('Database Error');
                                                    });
                                                } else {
                                                    const firmData = firm && firm[0] && firm[0].length ? firm[0][0] : (firm && firm[0] ? firm[0] : {});
                                                    const adminRowSet = Array.isArray(firm)
                                                        ? [...firm].reverse().find((rowSet) => Array.isArray(rowSet) && rowSet.length && rowSet[0].adminMacAddress)
                                                        : null;
                                                    const adminMacAddress = adminRowSet && adminRowSet[0] ? adminRowSet[0].adminMacAddress : null;
                                                    const isOfficialForBill =
                                                        billData.isOfficial === 1 ||
                                                        billData.isOfficial === '1' ||
                                                        billData.isOfficial === true ||
                                                        billData.isOfficial === 'true';
                                                    const sendJson = {
                                                        ...billData,
                                                        firmData: firmData,
                                                        cashier: 'Online',
                                                        billPayType: billPayTypeFromHotel,
                                                        discountType: discountTypeFromHotel,
                                                        discountValue: discountValueFromHotel,
                                                        totalDiscount,
                                                        totalAmount,
                                                        settledAmount,
                                                        discountAmt,
                                                        amountAfterDiscount,
                                                        footerBill: billFooterNoteVal,
                                                        appriciateLine: appriciateLineVal,
                                                        isOfficial: isOfficialForBill,
                                                        officialBillNo: isOfficialForBill && !isComplimentary ? nextOfficialBillNo : isComplimentary ? 'C' + nextOfficialBillNo : 'Not Available',
                                                        billNo: nextBillNo,
                                                        tokenNo: 'H' + nextTokenNo,
                                                        billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                        billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    };
                                                    if (adminMacAddress) {
                                                        req?.io?.emit(`print_Kot_${adminMacAddress}`, sendJson);
                                                        req?.io?.emit(`print_Bill_${adminMacAddress}`, sendJson);
                                                    }
                                                    connection.release();
                                                    return res.status(200).send(sendJson);
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        });
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

// ADD Pick UP Online QR Billing Data

const addOnlineBillData = (req, res) => {
    const billData = req.body;
    if (!billData.customerDetails || !billData.firmId || !billData.subTotal || !billData.settledAmount || !billData.billType || !billData.itemsData) {
        return res.status(404).send('Please Fill All The Fields..!');
    }

    const sql_getCategoryPrint = `SELECT isOfficial, billFooterNote, appriciateLine FROM billing_category_data WHERE categoryName = '${billData.billType}' AND firmId = '${billData.firmId}' LIMIT 1`;

    pool.query(sql_getCategoryPrint, (catErr, catRows) => {
        if (catErr) {
            console.error("Error getting category print config for online bill:", catErr);
            return res.status(500).send('Database Error');
        }

        let billFooterNoteVal = '';
        let appriciateLineVal = '';
        const categoryPrintRow = catRows && catRows[0];
        if (categoryPrintRow) {
            billFooterNoteVal = categoryPrintRow.billFooterNote != null ? String(categoryPrintRow.billFooterNote) : '';
            appriciateLineVal = categoryPrintRow.appriciateLine != null ? String(categoryPrintRow.appriciateLine) : '';
        }

        if (typeof billData.isOfficial === 'undefined' && categoryPrintRow && categoryPrintRow.isOfficial != null && categoryPrintRow.isOfficial !== undefined) {
            const cr = categoryPrintRow;
            billData.isOfficial =
                cr.isOfficial === 1 ||
                cr.isOfficial === '1' ||
                cr.isOfficial === true ||
                cr.isOfficial === 'true';
        }

        const isOfficialForBill =
            billData.isOfficial === 1 ||
            billData.isOfficial === '1' ||
            billData.isOfficial === true ||
            billData.isOfficial === 'true';

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
                        const resetStartDateExpr = `STR_TO_DATE(
                                                        CONCAT(
                                                            CASE
                                                                WHEN DATE(STR_TO_DATE('${currentDate}', '%b %d %Y')) < STR_TO_DATE(
                                                                    CONCAT(YEAR(STR_TO_DATE('${currentDate}', '%b %d %Y')), '-', frm.resetDate),
                                                                    '%Y-%m-%d'
                                                                )
                                                                THEN YEAR(STR_TO_DATE('${currentDate}', '%b %d %Y')) - 1
                                                                ELSE YEAR(STR_TO_DATE('${currentDate}', '%b %d %Y'))
                                                            END,
                                                            '-',
                                                            frm.resetDate
                                                        ),
                                                        '%Y-%m-%d'
                                                    )`;
                        let sql_query_getOfficialLastBillNo = `SELECT COALESCE(MAX(bod.billNumber), 0) AS officialLastBillNo
                                                                FROM billing_Official_data bod
                                                                CROSS JOIN (SELECT COALESCE(resetDate, '04-01') AS resetDate FROM billing_firm_data WHERE firmId = '${billData.firmId}' LIMIT 1) AS frm
                                                                WHERE bod.firmId = '${billData.firmId}'
                                                                AND bod.billDate >= ${resetStartDateExpr}
                                                                FOR UPDATE`;
                        let sql_query_getLastBillNo = `SELECT COALESCE(MAX(bd.billNumber), 0) AS lastBillNo
                                                       FROM billing_data bd
                                                       CROSS JOIN (SELECT COALESCE(resetDate, '04-01') AS resetDate FROM billing_firm_data WHERE firmId = '${billData.firmId}' LIMIT 1) AS frm
                                                       WHERE bd.firmId = '${billData.firmId}'
                                                       AND bd.billDate >= ${resetStartDateExpr}
                                                       FOR UPDATE;
                                                       SELECT COALESCE(MAX(tokenNo),0) AS lastTokenNo FROM billing_token_data WHERE billType = '${billData.billType}' AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y') FOR UPDATE;
                                                       ${isOfficialForBill ? sql_query_getOfficialLastBillNo : ''}`;
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
                                const officialLastBillNo = result && result[2] && result[2][0].officialLastBillNo ? result[2][0].officialLastBillNo : 0;

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
                                                '${billData.billType}',
                                                'cash',
                                                'none',
                                                0,
                                                0,
                                                ${billData.subTotal},
                                                ${billData.settledAmount},
                                                ${billData.billComment ? `'${billData.billComment}'` : null},
                                                STR_TO_DATE('${currentDate}','%b %d %Y'),
                                                'Print'`;
                                let sql_querry_addBillInfo = `INSERT INTO billing_data (billNumber,${columnData}) VALUES (${nextBillNo}, ${values})`;
                                let sql_querry_addOfficialData = `INSERT INTO billing_Official_data (billNumber, ${columnData}) VALUES(${nextOfficialBillNo}, ${values})`;
                                let sql_querry_addBillData = `${sql_querry_addBillInfo};
                                                              ${isOfficialForBill ? sql_querry_addOfficialData : ''}`;
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
                                                                                         ORDER BY btd.tokenNo ASC;
                                                                                         SELECT adminMacAddress FROM billing_admin_data LIMIT 1`;
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
                                                                    cashier: 'Online',
                                                                    billPayType: 'cash',
                                                                    discountType: 'none',
                                                                    discountValue: 0,
                                                                    totalDiscount: 0,
                                                                    footerBill: billFooterNoteVal,
                                                                    appriciateLine: appriciateLineVal,
                                                                    isOfficial: isOfficialForBill,
                                                                    billNo: nextBillNo,
                                                                    officialBillNo: isOfficialForBill ? nextOfficialBillNo : 'Not Available',
                                                                    tokenNo: billData.billType === 'Delivery' ? 'D' + nextTokenNo : nextTokenNo,
                                                                    justToken: nextTokenNo,
                                                                    billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                                    billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                }
                                                                const tokenList = firm && firm[1].length ? firm[1] : null;
                                                                const adminMacAddress = firm && firm[2] && firm[2][0] ? firm[2][0].adminMacAddress : null;
                                                                const customerData = billData.customerDetails;
                                                                if (customerData && customerData.mobileNo || customerData && customerData.mobileNo) {
                                                                    let sql_query_addAddressRelation = `INSERT INTO billing_billWiseCustomer_data(bwcId, billId, customerId, addressId, mobileNo, customerName, address, locality)
                                                                                                        VALUES (?, ?, ?, ?, TRIM(?), TRIM(?), ?, ?)`;
                                                                    const sql_query_addAddressRelation_values = [
                                                                        bwcId,
                                                                        billId,
                                                                        customerData.customerId || null,
                                                                        customerData.addressId || null,
                                                                        customerData.mobileNo || null,
                                                                        customerData.customerName || null,
                                                                        customerData.address || null,
                                                                        customerData.locality || null
                                                                    ];
                                                                    connection.query(sql_query_addAddressRelation, sql_query_addAddressRelation_values, (err) => {
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
                                                                                    if (adminMacAddress) {
                                                                                        const json = sendJson;
                                                                                        req?.io?.emit(`print_Kot_${adminMacAddress}`, sendJson);
                                                                                        req?.io?.emit(`print_Bill_${adminMacAddress}`, json);
                                                                                    }
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
                                                                            if (adminMacAddress) {
                                                                                const json = sendJson;
                                                                                req?.io?.emit(`print_Kot_${adminMacAddress}`, sendJson);
                                                                                req?.io?.emit(`print_Bill_${adminMacAddress}`, json);
                                                                            }
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
                });
            } catch (error) {
                console.error('An error occurred', error);
                connection.rollback(() => {
                    connection.release();
                    return res.status(500).json('Internal Server Error');
                })
            }
        });
    });
};

const addOnlineOrderData = (req, res) => {
    try {
        const billData = req.body;

        if (!billData.customerDetails || !billData.billType || !billData.firmId || !billData.subTotal || !billData.settledAmount || !billData.itemsData) {
            return res.status(404).send('Please Fill All The Fields..!');
        }

        const currentDate = getCurrentDate();
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const totalAmount = Number(billData.subTotal || 0);

        const sql_getPickUpCategory = `SELECT
                                            categoryId,
                                            categoryName,
                                            onlineMenuId,
                                            firmId,
                                            isOfficial,
                                            onlineStoreStatus,
                                            storeStartTime,
                                            storeEndTime,
                                            amountRange,
                                            stopAutoAcceptStartTime,
                                            stopAutoAcceptCloseTime
                                       FROM billing_category_data
                                       WHERE categoryName = '${billData.billType}'
                                       LIMIT 1`;

        pool.query(sql_getPickUpCategory, (err, rows) => {
            if (err) {
                console.error("Error getting Pick Up category config:", err);
                return res.status(500).send('Database Error');
            }

            // If no config, default to existing online behaviour.
            if (!rows || !rows.length) {
                return addOnlineBillData(req, res);
            }

            const cfg = rows[0];
            const onlineStoreStatus =
                cfg.onlineStoreStatus === 1 ||
                cfg.onlineStoreStatus === '1' ||
                cfg.onlineStoreStatus === true ||
                cfg.onlineStoreStatus === 'true';

            // Store closed by flag
            if (!onlineStoreStatus) {
                return res.status(404).send('Store is not open at this time');
            }

            const storeStartMinutes = timeToMinutes(cfg.storeStartTime);
            const storeEndMinutes = timeToMinutes(cfg.storeEndTime);
            const storeHours24hEqual = isStopAutoAccept24hEqual(cfg.storeStartTime, cfg.storeEndTime);

            // Store closed by main time window (if start === end → treat as 24h open, skip this check)
            if (storeStartMinutes !== null && storeEndMinutes !== null && !storeHours24hEqual) {
                if (nowMinutes < storeStartMinutes || nowMinutes > storeEndMinutes) {
                    return res.status(404).send('Store is close');
                }
            }

            let shouldGoToPending = false;
            // amountRange: 0 => always pending.
            // Delivery: auto-accept only when 300 <= total <= amountRange; else pending.
            // Pick Up: auto-accept when total <= amountRange; if total > amountRange => pending.
            if (cfg.amountRange !== null && cfg.amountRange !== undefined) {
                const rangeLimit = Number(cfg.amountRange);
                if (!Number.isNaN(rangeLimit)) {
                    if (rangeLimit === 0) {
                        shouldGoToPending = true;
                    } else if (billData.billType === 'Delivery') {
                        const deliveryMin = 300;
                        const withinDeliveryBand =
                            totalAmount >= deliveryMin && totalAmount <= rangeLimit;
                        if (!withinDeliveryBand) {
                            shouldGoToPending = true;
                        }
                    } else if (billData.billType === 'Pick Up') {
                        if (totalAmount > rangeLimit) {
                            shouldGoToPending = true;
                        }
                    } else if (totalAmount > rangeLimit) {
                        shouldGoToPending = true;
                    }
                }
            }

            // stopAutoAccept window:
            // if start === end → allow 24h (skip this rule). Else if current time is NOT
            // between stopAutoAcceptStartTime and stopAutoAcceptCloseTime → pending.
            const stopStartMinutes = timeToMinutes(cfg.stopAutoAcceptStartTime);
            const stopEndMinutes = timeToMinutes(cfg.stopAutoAcceptCloseTime);
            const stopAutoAcceptSameTime = isStopAutoAccept24hEqual(cfg.stopAutoAcceptStartTime, cfg.stopAutoAcceptCloseTime);
            if (stopStartMinutes !== null && stopEndMinutes !== null && !stopAutoAcceptSameTime) {
                const withinStopWindow = nowMinutes >= stopStartMinutes && nowMinutes <= stopEndMinutes;
                if (!withinStopWindow) {
                    shouldGoToPending = true;
                }
            }

            // Optionally override isOfficial from category if not explicitly provided
            if (typeof billData.isOfficial === 'undefined' && cfg.isOfficial !== null && cfg.isOfficial !== undefined) {
                billData.isOfficial =
                    cfg.isOfficial === 1 ||
                    cfg.isOfficial === '1' ||
                    cfg.isOfficial === true ||
                    cfg.isOfficial === 'true';
            }

            if (shouldGoToPending) {
                return addOnlinePendingBillData(req, res);
            } else {
                return addOnlineBillData(req, res);
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        return res.status(500).json('Internal Server Error');
    }
};

const addOnlineHotelOrderData = (req, res) => {
    try {
        const billData = req.body;

        if (!billData.firmId || !billData.subTotal || !billData.settledAmount || !billData.billPayType || !billData.billStatus || !billData.itemsData) {
            return res.status(404).send('Please Fill All The Fields..!');
        }

        const currentDate = getCurrentDate();
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const totalAmount = Number(billData.subTotal || 0);

        const sql_getHotelCategory = `SELECT
                                            categoryId,
                                            categoryName,
                                            onlineMenuId,
                                            firmId,
                                            isOfficial,
                                            onlineStoreStatus,
                                            storeStartTime,
                                            storeEndTime,
                                            amountRange,
                                            stopAutoAcceptStartTime,
                                            stopAutoAcceptCloseTime
                                       FROM billing_category_data
                                       WHERE firmId = '${billData.firmId}'
                                         AND categoryName = 'Hotel'
                                       LIMIT 1`;

        pool.query(sql_getHotelCategory, (err, rows) => {
            if (err) {
                console.error("Error getting Hotel category config:", err);
                return res.status(500).send('Database Error');
            }

            // If no config, default to existing online hotel behaviour.
            if (!rows || !rows.length) {
                return addOnlineHotelBillData(req, res);
            }

            const cfg = rows[0];
            const onlineStoreStatus =
                cfg.onlineStoreStatus === 1 ||
                cfg.onlineStoreStatus === '1' ||
                cfg.onlineStoreStatus === true ||
                cfg.onlineStoreStatus === 'true';

            // Store closed by flag
            if (!onlineStoreStatus) {
                return res.status(404).send('Store is close');
            }

            const storeStartMinutes = timeToMinutes(cfg.storeStartTime);
            const storeEndMinutes = timeToMinutes(cfg.storeEndTime);
            const storeHours24hEqual = isStopAutoAccept24hEqual(cfg.storeStartTime, cfg.storeEndTime);

            // Store closed by main time window (if start === end → treat as 24h open, skip this check)
            if (storeStartMinutes !== null && storeEndMinutes !== null && !storeHours24hEqual) {
                if (nowMinutes < storeStartMinutes || nowMinutes > storeEndMinutes) {
                    return res.status(404).send('Store is not open at this time');
                }
            }

            let shouldGoToPending = false;

            // Hotel amountRange: 0 => always pending.
            // Otherwise auto-accept only when 300 <= total <= amountRange; else pending.
            if (cfg.amountRange !== null && cfg.amountRange !== undefined) {
                const rangeLimit = Number(cfg.amountRange);
                if (!Number.isNaN(rangeLimit)) {
                    if (rangeLimit === 0) {
                        shouldGoToPending = true;
                    } else {
                        const hotelMin = 100;
                        const withinHotelBand =
                            totalAmount >= hotelMin && totalAmount <= rangeLimit;
                        if (!withinHotelBand) {
                            shouldGoToPending = true;
                        }
                    }
                }
            }

            // stopAutoAccept window:
            // if start === end → allow 24h (skip this rule). Else if current time is NOT
            // between stopAutoAcceptStartTime and stopAutoAcceptCloseTime → pending.
            const stopStartMinutes = timeToMinutes(cfg.stopAutoAcceptStartTime);
            const stopEndMinutes = timeToMinutes(cfg.stopAutoAcceptCloseTime);
            const stopAutoAcceptSameTime = isStopAutoAccept24hEqual(cfg.stopAutoAcceptStartTime, cfg.stopAutoAcceptCloseTime);
            if (stopStartMinutes !== null && stopEndMinutes !== null && !stopAutoAcceptSameTime) {
                const withinStopWindow = nowMinutes >= stopStartMinutes && nowMinutes <= stopEndMinutes;
                if (!withinStopWindow) {
                    shouldGoToPending = true;
                }
            }

            // Optionally override isOfficial from category if not explicitly provided
            if (typeof billData.isOfficial === 'undefined' && cfg.isOfficial !== null && cfg.isOfficial !== undefined) {
                billData.isOfficial =
                    cfg.isOfficial === 1 ||
                    cfg.isOfficial === '1' ||
                    cfg.isOfficial === true ||
                    cfg.isOfficial === 'true';
            }

            if (shouldGoToPending) {
                return addHotelPendingBillData(req, res);
            } else {
                return addOnlineHotelBillData(req, res);
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        return res.status(500).json('Internal Server Error');
    }
};

module.exports = {
    addOnlineHotelBillData,
    addOnlineBillData,
    addOnlineOrderData,
    addOnlineHotelOrderData
}