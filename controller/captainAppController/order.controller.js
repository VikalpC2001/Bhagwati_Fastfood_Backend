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

// Add Dine In Order By App

const addDineInOrderByApp = (req, res) => {
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
                        console.log(decoded);
                        const cashier = decoded.id.firstName;

                        const currentDate = getCurrentDate();
                        const billData = req.body;

                        if (!billData.tableNo || !billData.subTotal || !billData.settledAmount || !billData.itemsData.length) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill All The Fields..!');
                            })
                        } else {
                            let sql_query_chkTableAcvtive = `SELECT billId FROM billing_DineInTable_data WHERE tableNo = '${billData.tableNo}'`;
                            connection.query(sql_query_chkTableAcvtive, (err, table) => {
                                if (err) {
                                    console.error("Error selecting last bill and token number:", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                } else {
                                    if (table && table.length && table[0].billId) {
                                        const existBillId = table[0].billId;
                                        let sql_query_getLastBillNo = `SELECT COALESCE(MAX(subTokenNumber),0) AS lastSubTokenNo FROM billing_subtoken_data WHERE subTokenDate = STR_TO_DATE('${currentDate}','%b %d %Y') FOR UPDATE;`;
                                        connection.query(sql_query_getLastBillNo, (err, result) => {
                                            if (err) {
                                                console.error("Error selecting last bill and token number:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                const lastSubTokenNo = result && result[0] && result[0].lastSubTokenNo ? result[0].lastSubTokenNo : 0;

                                                const nextSubTokenNo = lastSubTokenNo + 1;
                                                const uid1 = new Date();
                                                const subTokenId = String("subToken_" + uid1.getTime() + '_' + nextSubTokenNo);
                                                const bwtId = String("bwtId_" + uid1.getTime() + '_' + nextSubTokenNo);

                                                let sql_querry_updateBillData = `UPDATE
                                                                                     billing_data
                                                                                 SET
                                                                                     totalAmount = totalAmount + ${billData.subTotal},
                                                                                     settledAmount = settledAmount + ${billData.settledAmount}
                                                                                 WHERE
                                                                                     billId = '${existBillId}';`;
                                                connection.query(sql_querry_updateBillData, (err) => {
                                                    if (err) {
                                                        console.error("Error Update new bill Data:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        let sql_query_addTokenNo = `INSERT INTO billing_subToken_data(subTokenId, captain, billId, subTokenNumber, tokenComment, subTokenDate, tokenStaus)
                                                                                    VALUES ('${subTokenId}', '${cashier}', '${existBillId}', ${nextSubTokenNo}, ${billData.billComment ? `'${billData.billComment}'` : null}, STR_TO_DATE('${currentDate}','%b %d %Y'), 'print');`;
                                                        connection.query(sql_query_addTokenNo, (err) => {
                                                            if (err) {
                                                                console.error("Error inserting New Sub Token Number:", err);
                                                                connection.rollback(() => {
                                                                    connection.release();
                                                                    return res.status(500).send('Database Error');
                                                                });
                                                            } else {
                                                                const billItemData = billData.itemsData;
                                                                let iwbIdArray = []
                                                                let addBillWiseItemData = billItemData.map((item, index) => {
                                                                    let uniqueId = `iwb_${Date.now() + index + '_' + index}`;
                                                                    iwbIdArray = [...iwbIdArray, uniqueId] // Generating a unique ID using current timestamp
                                                                    return `('${uniqueId}', '${existBillId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null}, 'Dine In', 'cash', 'running', STR_TO_DATE('${currentDate}','%b %d %Y'))`;
                                                                }).join(', ');
                                                                let sql_query_addItems = `INSERT INTO billing_billWiseItem_data(iwbId, billId, itemId, qty, unit, itemPrice, price, comment, billType, billPayType, billStatus, billDate)
                                                                                          VALUES ${addBillWiseItemData}`;
                                                                connection.query(sql_query_addItems, (err) => {
                                                                    if (err) {
                                                                        console.error("Error inserting Bill Wise Item Data:", err);
                                                                        connection.rollback(() => {
                                                                            connection.release();
                                                                            return res.status(500).send('Database Error');
                                                                        });
                                                                    } else {
                                                                        let addItemWiseSubToken = iwbIdArray.map((item, index) => {
                                                                            let uniqueId = `iwst_${Date.now() + index + '_' + index}`;  // Generating a unique ID using current timestamp
                                                                            return `('${uniqueId}', '${subTokenId}', '${item}')`;
                                                                        }).join(', ');
                                                                        let sql_query_addItems = `INSERT INTO billing_itemWiseSubToken_data(iwstId, subTokenId, iwbId)
                                                                                                  VALUES ${addItemWiseSubToken}`;
                                                                        connection.query(sql_query_addItems, (err) => {
                                                                            if (err) {
                                                                                console.error("Error inserting Item Wise Sub Token Id:", err);
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
                                                                                            captain: billData.assignCaptain ? billData.assignCaptain : cashier,
                                                                                            tokenNo: nextSubTokenNo ? nextSubTokenNo : 0,
                                                                                            billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                                                            billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                                        }
                                                                                        connection.release();
                                                                                        req?.io?.emit('updateTableView');
                                                                                        return res.status(200).send(sendJson);
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
                                        });
                                    } else {
                                        let sql_query_chkTable = `SELECT tableNo FROM billing_DineInTable_data WHERE tableNo = '${billData.tableNo}' AND billId IS NOT NULL`;
                                        connection.query(sql_query_chkTable, (err, chkTable) => {
                                            if (err) {
                                                console.error("Error in Check Dine In Is Empty..!:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                if (chkTable && chkTable.length) {
                                                    connection.rollback(() => {
                                                        connection.release();
                                                        return res.status(401).send('Table Is Not Empty..!');
                                                    });
                                                } else {
                                                    let sql_query_chkExistTable = `SELECT tableNo FROM billing_DineInTable_data WHERE tableNo = '${billData.tableNo}'`;
                                                    connection.query(sql_query_chkExistTable, (err, tbl) => {
                                                        if (err) {
                                                            console.error("Error inserting new bill number:", err);
                                                            connection.rollback(() => {
                                                                connection.release();
                                                                return res.status(500).send('Database Error');
                                                            });
                                                        } else {
                                                            let sql_query_getTableNo = tbl && tbl.length
                                                                ?
                                                                `SELECT tableNo FROM billing_DineInTable_data WHERE tableNo = '${billData.tableNo}'`
                                                                :
                                                                `INSERT INTO billing_DineInTable_data(tableId, tableNo, billId, isFixed)
                                                                 VALUES ('${billData.tableNo}', '${billData.tableNo}', NULL, 0)`;
                                                            connection.query(sql_query_getTableNo, (err) => {
                                                                if (err) {
                                                                    console.error("Error inserting new Table No:", err);
                                                                    connection.rollback(() => {
                                                                        connection.release();
                                                                        return res.status(500).send('Database Error');
                                                                    });
                                                                } else {
                                                                    let sql_query_getLastBillNo = `SELECT COALESCE(MAX(billNumber),0) AS lastBillNo FROM billing_data WHERE firmId = '${billData.firmId}' AND billCreationDate = (SELECT MAX(billCreationDate) FROM billing_data WHERE firmId = '${billData.firmId}') FOR UPDATE;
                                                                                                   SELECT COALESCE(MAX(tokenNo),0) AS lastTokenNo FROM billing_token_data WHERE billType = 'Dine In' AND billDate = STR_TO_DATE('${currentDate}','%b %d %Y') FOR UPDATE;
                                                                                                   SELECT COALESCE(MAX(subTokenNumber),0) AS lastSubTokenNo FROM billing_subtoken_data WHERE subTokenDate = STR_TO_DATE('${currentDate}','%b %d %Y') FOR UPDATE;
                                                                                                   SELECT firmId FROM billing_category_data WHERE categoryName = 'Dine In';`;
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
                                                                            const lastSubTokenNo = result && result[2] && result[2][0].lastSubTokenNo ? result[2][0].lastSubTokenNo : 0;
                                                                            const firmId = result && result[3] && result[3][0].firmId ? result[3][0].firmId : 'B';
                                                                            console.log('..//', firmId);

                                                                            const nextBillNo = lastBillNo + 1;
                                                                            const nextTokenNo = lastTokenNo + 1;
                                                                            const nextSubTokenNo = lastSubTokenNo + 1;
                                                                            const uid1 = new Date();
                                                                            const billId = String("bill_" + uid1.getTime() + '_' + nextBillNo);
                                                                            const tokenId = String("token_" + uid1.getTime() + '_' + nextTokenNo);
                                                                            const subTokenId = String("subToken_" + uid1.getTime() + '_' + nextSubTokenNo);
                                                                            const bwtId = String("bwtId_" + uid1.getTime() + '_' + nextBillNo);

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
                                                                                            '${firmId}', 
                                                                                            '${cashier}', 
                                                                                            'Offline',
                                                                                            'Dine In',
                                                                                            'cash',
                                                                                            'none',
                                                                                            0,
                                                                                            0,
                                                                                            ${billData.subTotal},
                                                                                            ${billData.settledAmount},
                                                                                            NULL,
                                                                                            STR_TO_DATE('${currentDate}','%b %d %Y'),
                                                                                            'running'`;
                                                                            let sql_querry_addBillData = `INSERT INTO billing_data (billNumber, ${columnData}) VALUES (${nextBillNo}, ${values});
                                                                                                          UPDATE billing_DineInTable_data SET billId = '${billId}' WHERE tableNo = '${billData.tableNo}'`;
                                                                            connection.query(sql_querry_addBillData, (err) => {
                                                                                if (err) {
                                                                                    console.error("Error inserting new bill number:", err);
                                                                                    connection.rollback(() => {
                                                                                        connection.release();
                                                                                        return res.status(500).send('Database Error');
                                                                                    });
                                                                                } else {
                                                                                    let sql_query_addTokenNo = `INSERT INTO billing_token_data(tokenId, billId, tokenNo, billType, billDate)
                                                                                                                VALUES ('${tokenId}', '${billId}', ${nextTokenNo}, 'Dine In', STR_TO_DATE('${currentDate}','%b %d %Y'));
                                                                                                                INSERT INTO billing_subToken_data(subTokenId, captain, billId, subTokenNumber, tokenComment, subTokenDate, tokenStaus)
                                                                                                                VALUES ('${subTokenId}', '${cashier}', '${billId}', ${nextSubTokenNo}, ${billData.billComment ? `'${billData.billComment}'` : null}, STR_TO_DATE('${currentDate}','%b %d %Y'), 'print');`;
                                                                                    connection.query(sql_query_addTokenNo, (err) => {
                                                                                        if (err) {
                                                                                            console.error("Error inserting new Token & Sub Token number:", err);
                                                                                            connection.rollback(() => {
                                                                                                connection.release();
                                                                                                return res.status(500).send('Database Error');
                                                                                            });
                                                                                        } else {
                                                                                            let sql_query_addBillWiseTable = `INSERT INTO billing_billWiseTableNo_data(bwtId, billId, tableNo, assignCaptain)
                                                                                                                              VALUES('${bwtId}', '${billId}', '${billData.tableNo}', '${billData.assignCaptain ? billData.assignCaptain : cashier}')`;
                                                                                            connection.query(sql_query_addBillWiseTable, (err) => {
                                                                                                if (err) {
                                                                                                    console.error("Error inserting Bill Wise Table Data:", err);
                                                                                                    connection.rollback(() => {
                                                                                                        connection.release();
                                                                                                        return res.status(500).send('Database Error');
                                                                                                    });
                                                                                                } else {
                                                                                                    const billItemData = billData.itemsData;
                                                                                                    let iwbIdArray = []
                                                                                                    let addBillWiseItemData = billItemData.map((item, index) => {
                                                                                                        let uniqueId = `iwb_${Date.now() + index + '_' + index}`;
                                                                                                        iwbIdArray = [...iwbIdArray, uniqueId] // Generating a unique ID using current timestamp
                                                                                                        return `('${uniqueId}', '${billId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null}, 'Dine In', 'cash', 'running', STR_TO_DATE('${currentDate}','%b %d %Y'))`;
                                                                                                    }).join(', ');
                                                                                                    let sql_query_addItems = `INSERT INTO billing_billWiseItem_data(iwbId, billId, itemId, qty, unit, itemPrice, price, comment, billType, billPayType, billStatus, billDate)
                                                                                                                              VALUES ${addBillWiseItemData}`;
                                                                                                    connection.query(sql_query_addItems, (err) => {
                                                                                                        if (err) {
                                                                                                            console.error("Error inserting Bill Wise Item Data:", err);
                                                                                                            connection.rollback(() => {
                                                                                                                connection.release();
                                                                                                                return res.status(500).send('Database Error');
                                                                                                            });
                                                                                                        } else {
                                                                                                            let addItemWiseSubToken = iwbIdArray.map((item, index) => {
                                                                                                                let uniqueId = `iwst_${Date.now() + index + '_' + index}`;  // Generating a unique ID using current timestamp
                                                                                                                return `('${uniqueId}', '${subTokenId}', '${item}')`;
                                                                                                            }).join(', ');
                                                                                                            let sql_query_addItems = `INSERT INTO billing_itemWiseSubToken_data(iwstId, subTokenId, iwbId)
                                                                                                                                      VALUES ${addItemWiseSubToken}`;
                                                                                                            connection.query(sql_query_addItems, (err) => {
                                                                                                                if (err) {
                                                                                                                    console.error("Error inserting Item Wise Sub Token Id:", err);
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
                                                                                                                                captain: billData.assignCaptain ? billData.assignCaptain : cashier,
                                                                                                                                tokenNo: nextSubTokenNo ? nextSubTokenNo : 0,
                                                                                                                                billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                                                                                                billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                                                                            }
                                                                                                                            connection.release();
                                                                                                                            req?.io?.emit('updateTableView');
                                                                                                                            return res.status(200).send(sendJson);
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
                                                                            });
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

module.exports = {
    addDineInOrderByApp
}