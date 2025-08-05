const pool = require("../../database");
const pool2 = require("../../databasePool");
const jwt = require('jsonwebtoken');

// Get Date Function 4 Hour

function getCurrentDate() {
    const now = new Date();
    const hours = now.getHours();

    if (hours <= 4) { // If it's 4 AM or later, increment the date
        now.setDate(now.getDate() - 1);
    }
    return now.toDateString().slice(4, 15);
}

// Function To Get Bill Info

function getBillInfo(groupByField = 'billType') {
    return `SELECT ${groupByField}, 
                   SUM(settledAmount) AS totalSettled, 
                   COUNT(*) AS totalBills
            FROM (
                SELECT *,
                       SUM(settledAmount) OVER (PARTITION BY billDate ORDER BY settledAmount, billId) AS cumulativeSum
                FROM billing_data
                WHERE billDate = STR_TO_DATE(?, '%b %d %Y')
                  AND firmId = ?
                  AND billPayType != 'complimentary'
                  AND billId NOT IN (
                      SELECT billId
                      FROM billing_Official_data
                      WHERE billDate = STR_TO_DATE(?, '%b %d %Y')
                  )
            ) AS filtered
            WHERE cumulativeSum <= ?
            GROUP BY ${groupByField}`
}

// Get SettlementData For Today

const getSettlementDataByFirm = (req, res) => {
    try {
        const currentDate = getCurrentDate();
        const firmId = req.query.firmId ? req.query.firmId : null;
        const desiredAmt = req.query.desiredAmt ? req.query.desiredAmt : 0;
        if (!firmId) {
            return res.status(404).send('firmId Not Found..!');
        } else {
            const sql_query_getFirmInfo = `SELECT firmId, isSettlement, csr FROM billing_firm_data WHERE firmId = '${firmId}'`;
            pool.query(sql_query_getFirmInfo, (err, firm) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    if (firm && firm.length) {
                        const isSettlement = firm && firm[0].isSettlement ? firm[0].isSettlement : 0;
                        const csr = firm && firm[0].csr ? firm[0].csr : 0;
                        if (!isSettlement) {
                            return res.status(405).send('Settlement is Not Allowed');
                        } else {
                            const sql_static_condition = `WHERE firmId = '${firmId}' 
                                                          AND billPayType != 'complimentary' 
                                                          AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;

                            const sql_query_getTodayBusiness = `SELECT COALESCE(SUM(settledAmount),0) AS todayBusiness FROM billing_data 
                                                                ${sql_static_condition};
                                                                SELECT COALESCE(SUM(settledAmount),0) AS officialBusiness FROM billing_Official_data 
                                                                ${sql_static_condition};
                                                                SELECT COALESCE(MAX(billNumber),0) AS officialLastBillNo FROM billing_Official_data 
                                                                WHERE firmId = '${firmId}' AND billCreationDate = (SELECT MAX(billCreationDate) FROM billing_Official_data WHERE firmId = '${firmId}')`;
                            pool.query(sql_query_getTodayBusiness, (err, business) => {
                                if (err) {
                                    console.error("An error occurred in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                } else {
                                    const todayBusiness = business && business[0].length ? business[0][0].todayBusiness : 0;
                                    const officialBusiness = business && business[1].length ? business[1][0].officialBusiness : 0;
                                    const cumulativeAmt = Math.round(((todayBusiness - officialBusiness) * 100) / 100);
                                    const officialLastBillNo = business && business[2].length ? business[2][0].officialLastBillNo : 0;
                                    const nextOfficialBillNo = officialLastBillNo + 1;

                                    const sql_query_getSettleBillData = `SELECT billId, settledAmount, billDate, billType, cumulativeSum
                                                                         FROM (
                                                                             SELECT 
                                                                                billId, 
                                                                                settledAmount, 
                                                                                billDate, 
                                                                                billType,
                                                                                SUM(settledAmount) OVER (PARTITION BY billDate ORDER BY settledAmount, billId) AS cumulativeSum
                                                                             FROM 
                                                                                billing_data
                                                                             WHERE billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                                             AND firmId = '${firmId}'
                                                                             AND billPayType != 'complimentary'
                                                                             AND billId NOT IN (SELECT COALESCE(billId, NULL) FROM billing_Official_data WHERE billDate = STR_TO_DATE('${currentDate}','%b %d %Y'))
                                                                         ) AS sortedData
                                                                         WHERE cumulativeSum <= ${desiredAmt ? desiredAmt : cumulativeAmt}`;
                                    pool.query(sql_query_getSettleBillData, (err, settle) => {
                                        if (err) {
                                            console.error("An error occurred in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        } else {
                                            const sql_query_getBillsInfo = `${getBillInfo("billType")};
                                                                            ${getBillInfo("billPayType")}`;
                                            const values = [
                                                currentDate, firmId, currentDate, desiredAmt || cumulativeAmt,  // for billType
                                                currentDate, firmId, currentDate, desiredAmt || cumulativeAmt   // for billPayType
                                            ];

                                            pool.query(sql_query_getBillsInfo, values, (err, gropInfo) => {
                                                if (err) {
                                                    console.error("An error occurred in SQL Queery", err);
                                                    return res.status(500).send('Database Error');
                                                } else {
                                                    const displayJson = {
                                                        "todayBusiness": todayBusiness,
                                                        "officialBusiness": officialBusiness,
                                                        "numberOfBills": settle.length ? settle.length : 0,
                                                        "billNumberSeries": nextOfficialBillNo + ' To ' + (officialLastBillNo + settle.length),
                                                        "todaySettleAmount": settle.length ? settle[settle.length - 1].cumulativeSum : 0,
                                                        "billTypeInfo": gropInfo[0],
                                                        "billPayTypeInfo": gropInfo[1],
                                                        "bills": settle
                                                    }
                                                    return res.status(200).send(displayJson);
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    } else {
                        return res.status(404).send('Firm Not Found');
                    }
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

//Add Settlement Bill Data

const addSettleDataByFirm = (req, res) => {
    pool2.getConnection((err, connection) => {
        if (err) {
            console.error("Error getting database connection:", err);
            return res.status(500).send('Database Error');
        } else {
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
                            const cashier = decoded.id.firstName;
                            const currentDate = getCurrentDate();

                            const firmId = req.query.firmId ? req.query.firmId : null;
                            const desiredAmt = req.query.desiredAmt;
                            const settlePercentage = req.query.settlePercentage;

                            const uid1 = new Date();
                            const settlementId = String("settlement_" + uid1.getTime());

                            if (!firmId) {
                                connection.rollback(() => {
                                    connection.release();
                                    return res.status(404).send('firmId Not Found...!');
                                })
                            } else {
                                const sql_query_chkSettleExist = `SELECT settlementId FROM billing_settlement_data WHERE firmId = '${firmId}' AND settleDate = STR_TO_DATE('${currentDate}','%b %d %Y')`;
                                connection.query(sql_query_chkSettleExist, (err, isSettle) => {
                                    if (err) {
                                        console.error("Error in Get Exist Settle Data:", err);
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(500).send('Database Error');
                                        });
                                    } else {
                                        if (isSettle && isSettle.length) {
                                            connection.rollback(() => {
                                                connection.release();
                                                return res.status(409).send('Settle is Already Done');
                                            })
                                        } else {
                                            const sql_query_getSettleData = `SELECT billId, settledAmount, billDate, billType, cumulativeSum
                                                                             FROM (
                                                                                 SELECT 
                                                                                    billId, 
                                                                                    settledAmount, 
                                                                                    billDate, 
                                                                                    billType,
                                                                                    SUM(settledAmount) OVER (PARTITION BY billDate ORDER BY settledAmount, billId) AS cumulativeSum
                                                                                 FROM 
                                                                                    billing_data
                                                                                 WHERE billDate = STR_TO_DATE('${currentDate}','%b %d %Y')
                                                                                 AND firmId = '${firmId}'
                                                                                 AND billPayType != 'complimentary'
                                                                                 AND billId NOT IN (SELECT COALESCE(billId, NULL) FROM billing_Official_data WHERE billDate = STR_TO_DATE('${currentDate}','%b %d %Y'))
                                                                             ) AS sortedData
                                                                             WHERE cumulativeSum <= ${desiredAmt}`;
                                            connection.query(sql_query_getSettleData, (err, settleData) => {
                                                if (err) {
                                                    console.error("Error In Get Settle Data:", err);
                                                    connection.rollback(() => {
                                                        connection.release();
                                                        return res.status(500).send('Database Error');
                                                    });
                                                } else {
                                                    const sql_query_addSettleData = `INSERT INTO billing_settlement_data(
                                                                                        settlementId,
                                                                                        settleBy,
                                                                                        firmId,
                                                                                        totalBills,
                                                                                        settleAmount,
                                                                                        desiredAmt,
                                                                                        settlePercentage,
                                                                                        settleDate
                                                                                    )
                                                                                    VALUES(
                                                                                        '${settlementId}',
                                                                                        '${cashier}',
                                                                                        '${firmId}',
                                                                                        ${settleData.length ? settleData.length : 0},
                                                                                        ${settleData.length ? settleData[settleData.length - 1].cumulativeSum : 0},
                                                                                        ${desiredAmt},
                                                                                        ${settlePercentage},
                                                                                        STR_TO_DATE('${currentDate}','%b %d %Y')
                                                                                    )`;
                                                    connection.query(sql_query_addSettleData, (err, addSettle) => {
                                                        if (err) {
                                                            console.error("Error In Add Settle info Data:", err);
                                                            connection.rollback(() => {
                                                                connection.release();
                                                                return res.status(500).send('Database Error');
                                                            });
                                                        } else {
                                                            if (settleData && settleData.length) {
                                                                const billIdsString = settleData.map(item => `'${item.billId}'`).join(',');
                                                                const sql_query_getMaxBillNo = `SELECT COALESCE(MAX(billNumber),0) AS officialLastBillNo FROM billing_Official_data WHERE firmId = '${firmId}' AND billCreationDate = (SELECT MAX(billCreationDate) FROM billing_Official_data WHERE firmId = '${firmId}') FOR UPDATE`;
                                                                connection.query(sql_query_getMaxBillNo, (err, lastBillNo) => {
                                                                    if (err) {
                                                                        console.error("Error selecting last bill number:", err);
                                                                        connection.rollback(() => {
                                                                            connection.release();
                                                                            return res.status(500).send('Database Error');
                                                                        });
                                                                    } else {
                                                                        const officialLastBillNo = lastBillNo && lastBillNo.length ? lastBillNo[0].officialLastBillNo : 0;
                                                                        const sql_query_addSettleBills = `
                                                                            INSERT INTO billing_Official_data (
                                                                                billId, billNumber, firmId, cashier, menuStatus, billType, 
                                                                                billPayType, discountType, discountValue, totalDiscount, 
                                                                                totalAmount, settledAmount, billComment, billDate, billStatus
                                                                            )
                                                                            SELECT 
                                                                                billId, 
                                                                                ${officialLastBillNo} + ROW_NUMBER() OVER (ORDER BY billId) as billNumber,
                                                                                firmId, cashier, menuStatus, billType, billPayType, 
                                                                                discountType, discountValue, totalDiscount, totalAmount, 
                                                                                settledAmount, billComment, billDate, billStatus
                                                                            FROM billing_data 
                                                                            WHERE billId IN (${billIdsString})`;

                                                                        connection.query(sql_query_addSettleBills, (err, addBill) => {
                                                                            if (err) {
                                                                                console.error("Error in Add Official bill Data:", err);
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
                                                                                        return res.status(200).send(`Settled Success`);
                                                                                    }
                                                                                });
                                                                            }
                                                                        })
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
                                                                        return res.status(200).send(`Settled Success with No Data`);
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    })
                                                }
                                            })
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
                })
            } catch (error) {
                console.error('An error occurred', error);
                connection.rollback(() => {
                    connection.release();
                    return res.status(500).json('Internal Server Error');
                })
            }
        }
    })
}

module.exports = {
    getSettlementDataByFirm,
    addSettleDataByFirm
}

