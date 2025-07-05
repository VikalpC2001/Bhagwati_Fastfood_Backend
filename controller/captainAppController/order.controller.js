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

// Compare Two Json Function

function compareJson(json1, json2) {
    const json1Map = new Map(json1.map(item => [item.iwbId, item]));
    const json2Map = new Map(json2.map(item => [item.iwbId, item]));

    const added = json2.filter(item => !json1Map.has(item.iwbId));
    const removed = json1.filter(item => !json2Map.has(item.iwbId));

    const modified = json1
        .filter(item => json2Map.has(item.iwbId)) // Check if the item exists in both json1 and json2
        .filter(item => {
            const json2Item = json2Map.get(item.iwbId);

            // Compare only qty, price, and comment fields
            return (
                item.qty !== json2Item.qty ||
                item.unit !== json2Item.unit ||
                item.itemPrice !== json2Item.itemPrice ||
                item.price !== json2Item.price ||
                ((item.comment ? item.comment : '') !== (json2Item.comment ? json2Item.comment : ''))
            );
        })
        .map(item => ({
            old: item, // Return the entire old object
            new: json2Map.get(item.iwbId) // Return the entire new object
        }));

    return { added, removed, modified };
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
                            let sql_query_getAdminId = ` SELECT adminMacAddress FROM billing_admin_data`;
                            connection.query(sql_query_getAdminId, (err, macId) => {
                                if (err) {
                                    console.error("Error selecting last bill and token number:", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                } else {
                                    if (macId && macId.length) {
                                        const adminMacAddress = macId[0].adminMacAddress;
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
                                                                    let sql_query_addTokenNo = `INSERT INTO billing_subToken_data(subTokenId, captain, billId, subTokenNumber, tokenComment, subTokenDate, tokenStatus)
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
                                                                                                        assignCaptain: billData.assignCaptain ? billData.assignCaptain : cashier,
                                                                                                        tokenNo: nextSubTokenNo ? nextSubTokenNo : 0,
                                                                                                        billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                                                                        billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                                                    }
                                                                                                    connection.release();
                                                                                                    req?.io?.emit('updateTableView');
                                                                                                    req?.io?.emit(`print_Kot_${adminMacAddress}`, sendJson);
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
                                                                                                                            INSERT INTO billing_subToken_data(subTokenId, captain, billId, subTokenNumber, tokenComment, subTokenDate, tokenStatus)
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
                                                                                                                                            assignCaptain: billData.assignCaptain ? billData.assignCaptain : cashier,
                                                                                                                                            tokenNo: nextSubTokenNo ? nextSubTokenNo : 0,
                                                                                                                                            billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                                                                                                            billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                                                                                        }
                                                                                                                                        connection.release();
                                                                                                                                        req?.io?.emit('updateTableView');
                                                                                                                                        req?.io?.emit(`print_Kot_${adminMacAddress}`, sendJson);
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
                                    } else {
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(404).send('Main Server Not Found');
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

// Get Subtokens Details By Id

const getSubTokensByBillIdForApp = async (req, res) => {
    try {
        const billId = req.query.billId;
        if (!billId) {
            return res.status(401).send('Bill Id Not Found...!');
        } else {
            let sql_queries_getDetails = `SELECT
                                              bst.subTokenId AS subTokenId,
                                              bst.tokenComment AS tokenComment,
                                              bwtn.assignCaptain AS captain,
                                              DATE_FORMAT(bst.subTokenDate, '%d/%m/%Y') AS subTokenDate,
                                              DATE_FORMAT(bst.creationDate, '%h:%i %p') AS createTime,
                                              bst.subTokenNumber AS subTokenNumber,
                                              bst.tokenStatus AS tokenStatus,
                                              iwst.iwbId AS iwbId,
                                              iwst.itemStatus AS kotItemStatus,
                                              COALESCE(bwi.itemId, bmk.itemId) AS itemId,
                                              imld.itemName AS itemName,
                                              imld.itemCode AS inputCode,
                                              COALESCE(bwi.qty, bmk.qty) AS qty,
                                              COALESCE(bwi.unit, bmk.unit) AS unit,
                                              COALESCE(bwi.itemPrice, bmk.itemPrice) AS itemPrice,
                                              COALESCE(bwi.price, bmk.price) AS price,
                                              COALESCE(bwi.comment, bmk.comment) AS comment
                                          FROM
                                              billing_subToken_data AS bst
                                          LEFT JOIN billing_itemWiseSubToken_data AS iwst ON iwst.subTokenId = bst.subTokenId
                                          LEFT JOIN billing_billWiseItem_data AS bwi ON bwi.iwbId = iwst.iwbId
                                          LEFT JOIN billing_modifiedKot_data AS bmk ON bmk.iwbId = iwst.iwbId
                                          LEFT JOIN item_menuList_data AS imld ON imld.itemId = COALESCE(bwi.itemId, bmk.itemId)
                                          LEFT JOIN billing_billWiseTableNo_data AS bwtn ON bwtn.billId = bst.billId
                                          WHERE bst.billId = '${billId}' AND bst.tokenStatus != 'cancelled'
                                          ORDER BY bst.subTokenNumber DESC;
                                          SELECT
                                             bwid.iwbId AS iwbId,
                                             bwid.itemId AS itemId,
                                             imd.itemName AS itemName,
                                             imd.itemCode AS inputCode,
                                             SUM(bwid.qty) AS qty,
                                             bwid.unit AS unit,
                                             bwid.itemPrice AS itemPrice,
                                             SUM(bwid.price) AS price
                                         FROM
                                             billing_billWiseItem_data AS bwid
                                         INNER JOIN item_menuList_data AS imd ON imd.itemId = bwid.itemId
                                         WHERE bwid.billId = '${billId}'
                                         GROUP BY bwid.itemId, bwid.unit`;
            pool.query(sql_queries_getDetails, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    const subTokensJson = data && data[0].length ? data[0] : [];
                    const mergedItemJson = data && data[1].length ? data[1] : [];

                    const subTokens = subTokensJson.reduce((acc, item) => {
                        // Find if the subTokenId already exists in the accumulator
                        let existingToken = acc.find(group => group.subTokenId === item.subTokenId);

                        // Determine if the item's price should be added to totalPrice based on kotItemStatus
                        const shouldIncludeInTotal = item.kotItemStatus !== 'cancelled';

                        if (existingToken) {
                            // Only add items that are not cancelled
                            if (shouldIncludeInTotal) {
                                existingToken.items.push({
                                    iwbId: item.iwbId,
                                    itemId: item.itemId,
                                    inputCode: item.inputCode,
                                    itemName: item.itemName,
                                    qty: item.qty,
                                    unit: item.unit,
                                    itemPrice: item.itemPrice,
                                    price: item.price,
                                    comment: item.comment,
                                    kotItemStatus: item.kotItemStatus
                                });

                                // Update totalPrice
                                existingToken.totalPrice += item.price;
                                existingToken.totalQty += item.qty;
                            }
                        } else {
                            // Create a new group for this subTokenId
                            const newGroup = {
                                subTokenId: item.subTokenId,
                                captain: item.captain,
                                subTokenNumber: item.subTokenNumber,
                                tokenStatus: item.tokenStatus,
                                subTokenDate: item.subTokenDate,
                                createTime: item.createTime,
                                tokenComment: item.tokenComment,
                                totalPrice: shouldIncludeInTotal ? item.price : 0,
                                totalQty: shouldIncludeInTotal ? item.qty : 0, // Initialize totalPrice only if not cancelled
                                items: []
                            };

                            // Only add items that are not cancelled
                            if (shouldIncludeInTotal) {
                                newGroup.items.push({
                                    iwbId: item.iwbId,
                                    itemId: item.itemId,
                                    inputCode: item.inputCode,
                                    itemName: item.itemName,
                                    qty: item.qty,
                                    unit: item.unit,
                                    itemPrice: item.itemPrice,
                                    price: item.price,
                                    comment: item.comment,
                                    kotItemStatus: item.kotItemStatus
                                });
                            }
                            acc.push(newGroup);
                        }
                        return acc;
                    }, []);
                    return res.status(200).send({ subTokens, mergedItemJson });
                }
            });
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Subtokens Details By Id

const getSubTokenDataByIdForApp = async (req, res) => {
    try {
        const billId = req.query.billId;
        const subTokenId = req.query.subTokenId;
        if (!billId || !subTokenId) {
            return res.status(401).send('BillId or SubTokenId Not Found...!');
        } else {
            let sql_queries_getDetails = `SELECT
                                              bst.subTokenId AS subTokenId,
                                              bst.tokenComment AS tokenComment,
                                              bwtn.assignCaptain AS captain,
                                              DATE_FORMAT(bst.subTokenDate, '%d/%m/%Y') AS subTokenDate,
                                              DATE_FORMAT(bst.creationDate, '%h:%i %p') AS createTime,
                                              bst.subTokenNumber AS subTokenNumber,
                                              bst.tokenStatus AS tokenStatus,
                                              iwst.iwbId AS iwbId,
                                              iwst.itemStatus AS kotItemStatus,
                                              COALESCE(bwi.itemId, bmk.itemId) AS itemId,
                                              imld.itemName AS itemName,
                                              imld.itemCode AS inputCode,
                                              COALESCE(bwi.qty, bmk.qty) AS qty,
                                              COALESCE(bwi.unit, bmk.unit) AS unit,
                                              COALESCE(bwi.itemPrice, bmk.itemPrice) AS itemPrice,
                                              COALESCE(bwi.price, bmk.price) AS price,
                                              COALESCE(bwi.comment, bmk.comment) AS comment
                                          FROM
                                              billing_subToken_data AS bst
                                          LEFT JOIN billing_itemWiseSubToken_data AS iwst ON iwst.subTokenId = bst.subTokenId
                                          LEFT JOIN billing_billWiseItem_data AS bwi ON bwi.iwbId = iwst.iwbId
                                          LEFT JOIN billing_modifiedKot_data AS bmk ON bmk.iwbId = iwst.iwbId
                                          LEFT JOIN item_menuList_data AS imld ON imld.itemId = COALESCE(bwi.itemId, bmk.itemId)
                                          LEFT JOIN billing_billWiseTableNo_data AS bwtn ON bwtn.billId = bst.billId
                                          WHERE bst.subTokenId = '${subTokenId}' AND bst.billId = '${billId}' AND bst.tokenStatus != 'cancelled'
                                          ORDER BY bst.subTokenNumber DESC`;
            pool.query(sql_queries_getDetails, (err, data) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {

                    const result = data.reduce((acc, item) => {
                        // Find if the subTokenId already exists in the accumulator
                        let existingToken = acc.find(group => group.subTokenId === item.subTokenId);

                        // Determine if the item's price should be added to totalPrice based on kotItemStatus
                        const shouldIncludeInTotal = item.kotItemStatus !== 'cancelled';

                        if (existingToken) {
                            // Only add items that are not cancelled
                            if (shouldIncludeInTotal) {
                                existingToken.items.push({
                                    iwbId: item.iwbId,
                                    itemId: item.itemId,
                                    inputCode: item.inputCode,
                                    itemName: item.itemName,
                                    qty: item.qty,
                                    unit: item.unit,
                                    itemPrice: item.itemPrice,
                                    price: item.price,
                                    comment: item.comment,
                                    kotItemStatus: item.kotItemStatus
                                });

                                // Update totalPrice
                                existingToken.totalPrice += item.price;
                                existingToken.totalQty += item.qty;
                            }
                        } else {
                            // Create a new group for this subTokenId
                            const newGroup = {
                                subTokenId: item.subTokenId,
                                captain: item.captain,
                                subTokenNumber: item.subTokenNumber,
                                tokenStatus: item.tokenStatus,
                                subTokenDate: item.subTokenDate,
                                createTime: item.createTime,
                                tokenComment: item.tokenComment,
                                totalPrice: shouldIncludeInTotal ? item.price : 0,
                                totalQty: shouldIncludeInTotal ? item.qty : 0, // Initialize totalPrice only if not cancelled
                                items: []
                            };

                            // Only add items that are not cancelled
                            if (shouldIncludeInTotal) {
                                newGroup.items.push({
                                    iwbId: item.iwbId,
                                    itemId: item.itemId,
                                    inputCode: item.inputCode,
                                    itemName: item.itemName,
                                    qty: item.qty,
                                    unit: item.unit,
                                    itemPrice: item.itemPrice,
                                    price: item.price,
                                    comment: item.comment,
                                    kotItemStatus: item.kotItemStatus
                                });
                            }

                            acc.push(newGroup);
                        }
                        return acc;
                    }, []);
                    return res.status(200).send(result[0]);
                }
            });
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Update Sub Token Data By APP

const updateSubTokenDataByIdForApp = (req, res) => {
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
                        const cashier = decoded.id.firstName;
                        const currentDate = getCurrentDate();
                        const billData = req.body;
                        if (!billData.subTokenId || !billData.billId || !billData.subTokenNumber || !billData.settledAmount || !billData.subTotal || !billData.itemsData.length) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill All The Fields..!');
                            })
                        } else {
                            let sql_query_getAdminId = `SELECT adminMacAddress FROM billing_admin_data`;
                            connection.query(sql_query_getAdminId, (err, macId) => {
                                if (err) {
                                    console.error("Error Get Pre Total Price:", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                } else {
                                    if (macId && macId.length) {
                                        const adminMacAddress = macId[0].adminMacAddress;
                                        let sql_query_getPreTokenPrice = `SELECT SUM(bwi.price) AS preTotalPrice FROM billing_itemWiseSubToken_data  AS iwst
                                                                          LEFT JOIN billing_billWiseItem_data AS bwi ON bwi.iwbId = iwst.iwbId
                                                                          WHERE subTokenId = '${billData.subTokenId}'`;
                                        connection.query(sql_query_getPreTokenPrice, (err, prePrice) => {
                                            if (err) {
                                                console.error("Error Get Pre Total Price:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                const preTotalPrice = prePrice && prePrice[0].preTotalPrice ? prePrice[0].preTotalPrice : 0;
                                                let sql_querry_updateBillData = `UPDATE
                                                                                     billing_data
                                                                                 SET
                                                                                     totalAmount = totalAmount - ${preTotalPrice} + ${billData.subTotal},
                                                                                     settledAmount = settledAmount - ${preTotalPrice} + ${billData.settledAmount}
                                                                                 WHERE
                                                                                     billId = '${billData.billId}';
                                                                                 UPDATE
                                                                                     billing_subToken_data
                                                                                 SET
                                                                                     tokenComment = ${billData.billComment ? `'${billData.billComment}'` : null}
                                                                                 WHERE 
                                                                                    subTokenId = '${billData.subTokenId}';`;
                                                connection.query(sql_querry_updateBillData, (err) => {
                                                    if (err) {
                                                        console.error("Error Update new bill Price:", err);
                                                        connection.rollback(() => {
                                                            connection.release();
                                                            return res.status(500).send('Database Error');
                                                        });
                                                    } else {
                                                        let sql_query_getOldItemJson = `SELECT
                                                                                            bwid.iwbId AS iwbId,
                                                                                            bwid.itemId AS itemId,
                                                                                            imd.itemCode AS inputCode,
                                                                                            imd.itemName AS itemName,
                                                                                            bwid.qty AS qty,
                                                                                            bwid.unit AS unit,
                                                                                            bwid.itemPrice AS itemPrice,
                                                                                            bwid.price AS price,
                                                                                            bwid.comment AS comment
                                                                                        FROM
                                                                                            billing_billWiseItem_data AS bwid
                                                                                        INNER JOIN item_menuList_data AS imd ON imd.itemId = bwid.itemId
                                                                                        WHERE bwid.iwbId IN (SELECT COALESCE(iwbId,NULL) FROM billing_itemWiseSubToken_data WHERE subTokenId = '${billData.subTokenId}')`;
                                                        connection.query(sql_query_getOldItemJson, (err, oldJson) => {
                                                            if (err) {
                                                                console.error("Error getting old item json:", err);
                                                                connection.rollback(() => {
                                                                    connection.release();
                                                                    return res.status(500).send('Database Error');
                                                                });
                                                            } else {
                                                                const json1 = Object.values(JSON.parse(JSON.stringify(oldJson)));
                                                                const json2 = Object.values(JSON.parse(JSON.stringify(billData.itemsData)));

                                                                const { added, removed, modified } = compareJson(json1, json2);

                                                                console.log("addd+++", added);
                                                                console.log("Remove---", removed);
                                                                console.log("Updated", modified);

                                                                if (added.length || removed.length || modified.length) {
                                                                    const modifiedNewJson = modified.map(({ new: newItem }) => newItem);

                                                                    let iwbIdAddArray = []
                                                                    // ADD New Item In Bill
                                                                    let addBillWiseItemData = added.length ? added.map((item, index) => {
                                                                        let uniqueId = `iwb_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                                                        iwbIdAddArray = [...iwbIdAddArray, uniqueId]
                                                                        return `('${uniqueId}', '${billData.billId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null}, 'Dine In', 'cash', 'running', STR_TO_DATE('${currentDate}','%b %d %Y'))`;
                                                                    }).join(', ') : '';

                                                                    let addRemovedKotItem = removed.length ? removed.map((item, index) => {
                                                                        let uniqueId = `modified_${Date.now() + index + '_' + index}`; // Generating a unique ID using current timestamp
                                                                        return `('${uniqueId}', '${cashier}', '${item.iwbId}', '${item.itemId}', ${item.qty}, '${item.unit}', ${item.itemPrice}, ${item.price}, ${item.comment ? `'${item.comment}'` : null})`;
                                                                    }).join(', ') : '';

                                                                    // Remove Items iwbIds
                                                                    let removeJsonIds = removed.length ? removed.map((item, index) => {
                                                                        return `'${item.iwbId}'`;
                                                                    }).join(',') : '';

                                                                    // Updated Items iwbIds
                                                                    let updateJsonIds = modifiedNewJson.length ? modifiedNewJson.map((item, index) => {
                                                                        return `'${item.iwbId}'`;
                                                                    }).join(',') : '';

                                                                    // Update Existing Data Query

                                                                    let updateQuery = modifiedNewJson.length ?
                                                                        `UPDATE billing_billWiseItem_data SET qty = CASE iwbId ` +
                                                                        modifiedNewJson.map(item => `WHEN '${item.iwbId}' THEN ${item.qty}`).join(' ') +
                                                                        ` END,
                                                                         itemPrice = CASE iwbId ` +
                                                                        modifiedNewJson.map(item => `WHEN '${item.iwbId}' THEN ${item.itemPrice}`).join(' ') +
                                                                        ` END,
                                                                         price = CASE iwbId ` +
                                                                        modifiedNewJson.map(item => `WHEN '${item.iwbId}' THEN ${item.price}`).join(' ') +
                                                                        ` END,
                                                                         comment = CASE iwbId ` +
                                                                        modifiedNewJson.map(item => `WHEN '${item.iwbId}' THEN ${item.comment ? `'${item.comment}'` : null}`).join(' ') +
                                                                        ` END
                                                                         WHERE iwbId IN (${modifiedNewJson.map(item => `'${item.iwbId}'`).join(', ')});`
                                                                        : `SELECT * FROM user_details WHERE userId = '0'`;

                                                                    let sql_query_adjustItem = `${added.length ? `INSERT INTO billing_billWiseItem_data(iwbId, billId, itemId, qty, unit, itemPrice, price, comment, billType, billPayType, billStatus, billDate)
                                                                                                                  VALUES ${addBillWiseItemData};` : ''}
                                                                                                ${removed.length ? `DELETE FROM billing_billWiseItem_data WHERE iwbId IN (${removeJsonIds});` : ''}
                                                                                                ${modifiedNewJson.length ? `${updateQuery};` : `${updateQuery};`}`;
                                                                    connection.query(sql_query_adjustItem, (err) => {
                                                                        if (err) {
                                                                            console.error("Error inserting Bill Wise Item Data:", err);
                                                                            connection.rollback(() => {
                                                                                connection.release();
                                                                                return res.status(500).send('Database Error');
                                                                            });
                                                                        } else {
                                                                            let addItemWiseSubToken = iwbIdAddArray.length ? iwbIdAddArray.map((item, index) => {
                                                                                let uniqueId = `iwst_${Date.now() + index + '_' + index}`;  // Generating a unique ID using current timestamp
                                                                                return `('${uniqueId}', '${billData.subTokenId}', '${item}', 'new')`;
                                                                            }).join(', ') : '';
                                                                            let sql_query_addItemsId = iwbIdAddArray.length
                                                                                ?
                                                                                `INSERT INTO billing_itemWiseSubToken_data(iwstId, subTokenId, iwbId, itemStatus)
                                                                                 VALUES ${addItemWiseSubToken};`
                                                                                : '';
                                                                            let sql_query_removesId = removed.length
                                                                                ?
                                                                                `UPDATE billing_itemWiseSubToken_data SET itemStatus = 'cancelled' WHERE iwbId IN (${removeJsonIds});
                                                                                INSERT INTO billing_modifiedKot_data(modifiedId, removedBy, iwbId, itemId, qty, unit, itemPrice, price, comment)
                                                                                VALUES ${addRemovedKotItem};`
                                                                                : '';
                                                                            let sql_query_updateModified = modifiedNewJson.length
                                                                                ?
                                                                                `UPDATE billing_itemWiseSubToken_data SET itemStatus = 'modified' WHERE iwbId IN (${updateJsonIds});`
                                                                                : '';

                                                                            let sql_query_updateKotStatus = `${iwbIdAddArray.length ? sql_query_addItemsId : ''}
                                                                                                             ${removed.length ? sql_query_removesId : ''}
                                                                                                             ${modifiedNewJson.length ? sql_query_updateModified : ''}`;
                                                                            connection.query(sql_query_updateKotStatus, (err) => {
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
                                                                                            const createJson = (items, status) =>
                                                                                                items.length ? items.map(e => ({
                                                                                                    iwbId: e.iwbId,
                                                                                                    itemId: e.itemId,
                                                                                                    inputCode: e.inputCode,
                                                                                                    itemName: e.itemName,
                                                                                                    qty: e.qty,
                                                                                                    unit: e.unit,
                                                                                                    itemPrice: e.itemPrice,
                                                                                                    price: e.price,
                                                                                                    comment: e.comment,
                                                                                                    kotItemStatus: status ? status : e.kotItemStatus ? e.kotItemStatus : null
                                                                                                })) : [];
                                                                                            const addedJson = createJson(added, 'new');
                                                                                            const removeJson = createJson(removed, 'cancelled');
                                                                                            const modifyJson = createJson(modifiedNewJson, 'modified');
                                                                                            const existItemData = createJson(billData.itemsData)
                                                                                            const mergedJson = [...addedJson, ...removeJson, ...modifyJson];

                                                                                            const newMergeJson = (json1, json2) => {
                                                                                                json1.forEach(item1 => {
                                                                                                    const index = json2.findIndex(item2 => item2.itemId === item1.itemId && item2.unit === item1.unit);

                                                                                                    if (index !== -1) {
                                                                                                        // If a match is found, replace the object in json2 with the one from json1
                                                                                                        json2[index] = item1;
                                                                                                    } else {
                                                                                                        // If no match is found, push the object from json1 to json2
                                                                                                        json2.push(item1);
                                                                                                    }
                                                                                                });
                                                                                                return json2;
                                                                                            };
                                                                                            const newItemsData = newMergeJson(mergedJson, existItemData);

                                                                                            const sendJson = {
                                                                                                ...billData,
                                                                                                itemsData: newItemsData,
                                                                                                assignCaptain: billData.assignCaptain ? billData.assignCaptain : cashier,
                                                                                                billDate: new Date(currentDate).toLocaleDateString('en-GB'),
                                                                                                billTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                                            }
                                                                                            connection.release();
                                                                                            req?.io?.emit('updateTableView');
                                                                                            req?.io?.emit(`print_Kot_${adminMacAddress}`, sendJson);
                                                                                            return res.status(201).send(sendJson);
                                                                                        }
                                                                                    });
                                                                                }
                                                                            })
                                                                        }
                                                                    })
                                                                } else {
                                                                    connection.rollback(() => {
                                                                        connection.release();
                                                                        return res.status(401).send('No Change');
                                                                    });
                                                                }
                                                            }
                                                        })
                                                    }
                                                })
                                            }
                                        })
                                    } else {
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(404).send('Admin Server Not Found');
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

// Remove Sub Token Data By APP

const removeSubTokenDataByIdForApp = (req, res) => {
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
                        const cashier = decoded.id.firstName;

                        const subTokenId = req.query.subTokenId;
                        const billId = req.query.billId;
                        if (!subTokenId || !billId) {
                            connection.rollback(() => {
                                connection.release();
                                return res.status(404).send('Please Fill All The Fields..!');
                            })
                        } else {
                            let sql_query_getAdminId = `SELECT adminMacAddress FROM billing_admin_data`;
                            connection.query(sql_query_getAdminId, (err, macId) => {
                                if (err) {
                                    console.error("Error Get Pre Total Price:", err);
                                    connection.rollback(() => {
                                        connection.release();
                                        return res.status(500).send('Database Error');
                                    });
                                } else {
                                    if (macId && macId.length) {
                                        const adminMacAddress = macId[0].adminMacAddress;
                                        let sql_query_ExistSubtokenData = `SELECT subTokenId FROM billing_subToken_data WHERE subTokenId = '${subTokenId}'`;
                                        connection.query(sql_query_ExistSubtokenData, (err, tkn) => {
                                            if (err) {
                                                console.error("Error Get Token Id:", err);
                                                connection.rollback(() => {
                                                    connection.release();
                                                    return res.status(500).send('Database Error');
                                                });
                                            } else {
                                                if (tkn && tkn.length) {
                                                    let sql_query_getPreTokenPrice = `SELECT SUM(bwi.price) AS preTotalPrice FROM billing_itemWiseSubToken_data  AS iwst
                                                                                      LEFT JOIN billing_billWiseItem_data AS bwi ON bwi.iwbId = iwst.iwbId
                                                                                      WHERE subTokenId = '${subTokenId}'`;
                                                    connection.query(sql_query_getPreTokenPrice, (err, prePrice) => {
                                                        if (err) {
                                                            console.error("Error Get Pre Total Price:", err);
                                                            connection.rollback(() => {
                                                                connection.release();
                                                                return res.status(500).send('Database Error');
                                                            });
                                                        } else {
                                                            const preTotalPrice = prePrice && prePrice[0].preTotalPrice ? prePrice[0].preTotalPrice : 0;
                                                            let sql_querry_updateBillData = `UPDATE
                                                                                                 billing_data
                                                                                             SET
                                                                                                 totalAmount = totalAmount - ${preTotalPrice},
                                                                                                 settledAmount = settledAmount - ${preTotalPrice}
                                                                                             WHERE
                                                                                                 billId = '${billId}'`;
                                                            connection.query(sql_querry_updateBillData, (err) => {
                                                                if (err) {
                                                                    console.error("Error Update new bill Price:", err);
                                                                    connection.rollback(() => {
                                                                        connection.release();
                                                                        return res.status(500).send('Database Error');
                                                                    });
                                                                } else {
                                                                    let modifiedId = `CONCAT('modified_',${Date.now()} + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),'_',ROW_NUMBER() OVER (ORDER BY (SELECT NULL)))`;
                                                                    let sql_query_removeSubToken = `INSERT INTO billing_modifiedKot_data(modifiedId, iwbId, itemId, qty, unit, itemPrice, price, comment)
                                                                                                    SELECT ${modifiedId}, iwbId, itemId, qty, unit, itemPrice, price, comment FROM billing_billWiseItem_data WHERE iwbId IN (SELECT COALESCE(billing_itemWiseSubToken_data.iwbId,NULL) FROM billing_itemWiseSubToken_data WHERE billing_itemWiseSubToken_data.subTokenId = '${subTokenId}');
                                                                                                    UPDATE billing_itemWiseSubToken_data SET itemStatus = 'cancelled' WHERE billing_itemWiseSubToken_data.subTokenId = '${subTokenId}';
                                                                                                    UPDATE billing_subToken_data SET tokenStatus = 'cancelled', captain = '${cashier}' WHERE subTokenId = '${subTokenId}';
                                                                                                    DELETE FROM billing_billWiseItem_data WHERE iwbId IN (SELECT COALESCE(billing_itemWiseSubToken_data.iwbId,NULL) FROM billing_itemWiseSubToken_data WHERE billing_itemWiseSubToken_data.subTokenId = '${subTokenId}')`;
                                                                    connection.query(sql_query_removeSubToken, (err) => {
                                                                        if (err) {
                                                                            console.error("Error Delete Sub Token Item Data:", err);
                                                                            connection.rollback(() => {
                                                                                connection.release();
                                                                                return res.status(500).send('Database Error');
                                                                            });
                                                                        } else {
                                                                            let sql_query_getRemoveTokenData = `SELECT
                                                                                                                    bst.subTokenId AS subTokenId,
                                                                                                                    bst.tokenComment AS tokenComment,
                                                                                                                    bwtn.assignCaptain AS captain,
                                                                                                                    bwtn.tableNo AS tableNo,
                                                                                                                    DATE_FORMAT(bst.subTokenDate, '%d/%m/%Y') AS subTokenDate,
                                                                                                                    DATE_FORMAT(bst.creationDate, '%h:%i %p') AS createTime,
                                                                                                                    bst.subTokenNumber AS subTokenNumber,
                                                                                                                    bst.tokenStatus AS tokenStatus,
                                                                                                                    iwst.iwbId AS iwbId,
                                                                                                                    iwst.itemStatus AS kotItemStatus,
                                                                                                                    COALESCE(bwi.itemId, bmk.itemId) AS itemId,
                                                                                                                    imld.itemName AS itemName,
                                                                                                                    imld.itemCode AS inputCode,
                                                                                                                    COALESCE(bwi.qty, bmk.qty) AS qty,
                                                                                                                    COALESCE(bwi.unit, bmk.unit) AS unit,
                                                                                                                    COALESCE(bwi.itemPrice, bmk.itemPrice) AS itemPrice,
                                                                                                                    COALESCE(bwi.price, bmk.price) AS price,
                                                                                                                    COALESCE(bwi.comment, bmk.comment) AS comment
                                                                                                                FROM
                                                                                                                    billing_subToken_data AS bst
                                                                                                                LEFT JOIN billing_itemWiseSubToken_data AS iwst ON iwst.subTokenId = bst.subTokenId
                                                                                                                LEFT JOIN billing_billWiseItem_data AS bwi ON bwi.iwbId = iwst.iwbId
                                                                                                                LEFT JOIN billing_modifiedKot_data AS bmk ON bmk.iwbId = iwst.iwbId
                                                                                                                LEFT JOIN item_menuList_data AS imld ON imld.itemId = COALESCE(bwi.itemId, bmk.itemId)
                                                                                                                LEFT JOIN billing_billWiseTableNo_data AS bwtn ON bwtn.billId = bst.billId
                                                                                                                WHERE bst.subTokenId = '${subTokenId}' AND bst.billId = '${billId}'`;
                                                                            connection.query(sql_query_getRemoveTokenData, (err, tknJson) => {
                                                                                if (err) {
                                                                                    console.error("Error Getting Remove Sub Token Data:", err);
                                                                                    connection.rollback(() => {
                                                                                        connection.release();
                                                                                        return res.status(500).send('Database Error');
                                                                                    });
                                                                                } else {
                                                                                    const tokenData = tknJson && tknJson.length ? tknJson : [];
                                                                                    const tokenJson = {
                                                                                        subTokenId: tokenData ? tokenData[0].subTokenId : '',
                                                                                        captain: tokenData ? tokenData[0].captain : '',
                                                                                        tableNo: tokenData ? tokenData[0].tableNo : '',
                                                                                        subTokenNumber: tokenData ? tokenData[0].subTokenNumber : '',
                                                                                        tokenStatus: tokenData ? tokenData[0].tokenStatus : '',
                                                                                        subTokenDate: tokenData ? tokenData[0].subTokenDate : '',
                                                                                        createTime: tokenData ? tokenData[0].createTime : '',
                                                                                        tokenComment: tokenData ? tokenData[0].tokenComment : '',
                                                                                        totalPrice: tokenData.reduce((sum, item) => sum + item.price, 0),
                                                                                        items: tokenData ? tokenData.map(item => ({
                                                                                            iwbId: item.iwbId,
                                                                                            itemId: item.itemId,
                                                                                            inputCode: item.inputCode,
                                                                                            itemName: item.itemName,
                                                                                            qty: item.qty,
                                                                                            unit: item.unit,
                                                                                            itemPrice: item.itemPrice,
                                                                                            price: item.price,
                                                                                            comment: item.comment,
                                                                                            kotItemStatus: item.kotItemStatus
                                                                                        })) : []
                                                                                    };
                                                                                    let sql_query_chkExistToken = `SELECT subTokenId, billId FROM billing_subToken_data WHERE billId = '${billId}' AND tokenStatus = 'print'`;
                                                                                    connection.query(sql_query_chkExistToken, (err, chkTkn) => {
                                                                                        if (err) {
                                                                                            console.error("Error Delete Sub Token Item Data:", err);
                                                                                            connection.rollback(() => {
                                                                                                connection.release();
                                                                                                return res.status(500).send('Database Error');
                                                                                            });
                                                                                        } else {
                                                                                            if (chkTkn && chkTkn.length) {
                                                                                                connection.commit((err) => {
                                                                                                    if (err) {
                                                                                                        console.error("Error committing transaction:", err);
                                                                                                        connection.rollback(() => {
                                                                                                            connection.release();
                                                                                                            return res.status(500).send('Database Error');
                                                                                                        });
                                                                                                    } else {
                                                                                                        connection.release();
                                                                                                        req?.io?.emit('updateTableView');
                                                                                                        req?.io?.emit(`print_Kot_${adminMacAddress}`, tokenJson);
                                                                                                        return res.status(200).send('Token Deleted Successfully');
                                                                                                    }
                                                                                                });
                                                                                            } else {
                                                                                                let sql_query_getBillInfo = `SELECT bd.billId AS billId FROM billing_data AS bd WHERE bd.billId = '${billId}' AND bd.billType = 'Dine In'`;
                                                                                                connection.query(sql_query_getBillInfo, (err, billInfo) => {
                                                                                                    if (err) {
                                                                                                        console.error("Error get billInfo :", err);
                                                                                                        connection.rollback(() => {
                                                                                                            connection.release();
                                                                                                            return res.status(500).send('Database Error');
                                                                                                        });
                                                                                                    } else {
                                                                                                        if (billInfo && billInfo.length) {
                                                                                                            let sql_querry_cancelBillData = `UPDATE
                                                                                                                                                 billing_data
                                                                                                                                             SET
                                                                                                                                                 billPayType = 'CancelToken',
                                                                                                                                                 billStatus = 'CancelToken'
                                                                                                                                             WHERE billId = '${billId}'`;
                                                                                                            connection.query(sql_querry_cancelBillData, (err) => {
                                                                                                                if (err) {
                                                                                                                    console.error("Error Delete billData :", err);
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
                                                                                                                            req?.io?.emit('updateTableView');
                                                                                                                            req?.io?.emit(`print_Kot_${adminMacAddress}`, tokenJson);
                                                                                                                            return res.status(200).send('Table Bill Cancel Success');
                                                                                                                        }
                                                                                                                    });
                                                                                                                }
                                                                                                            });
                                                                                                        } else {
                                                                                                            connection.rollback(() => {
                                                                                                                connection.release();
                                                                                                                return res.status(404).send('billId Not Found...!');
                                                                                                            })
                                                                                                        }
                                                                                                    }
                                                                                                })
                                                                                            }
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
                                                } else {
                                                    connection.rollback(() => {
                                                        connection.release();
                                                        return res.status(401).send('subTokenId Not Found');
                                                    });
                                                }
                                            }
                                        });
                                    } else {
                                        connection.rollback(() => {
                                            connection.release();
                                            return res.status(404).send('Admin Server Not Found');
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

// Check Is Table Empty Or Not

const isTableEmpty = (req, res) => {
    try {
        const tableNo = req.query.tableNo;
        if (!tableNo) {
            return res.status(404).send('Please Enter Table Number')
        } else {
            let sql_query_chkTableIsEmpty = `SELECT tableId, tableNo FROM billing_DineInTable_data WHERE tableNo = '${tableNo}' AND billId IS NOT NULL`;
            pool.query(sql_query_chkTableIsEmpty, (err, table) => {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else {
                    if (table && table.length) {
                        return res.status(401).send(`Table No. ${tableNo} is Not Available`);
                    } else {
                        return res.status(200).send('Available');
                    }
                }
            });
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Print Table Bill For App

const printTableBillForApp = (req, res) => {
    try {
        const billId = req.query.billId;
        let sql_query_getBillingData = `SELECT 
                                            bd.billId AS billId, 
                                            bd.billNumber AS billNumber,
                                            COALESCE(bod.billNumber, CONCAT('C', bcd.billNumber), 'Not Available') AS officialBillNo,
                                            CASE
                                                WHEN bd.billType = 'Hotel' THEN CONCAT('H',btd.tokenNo)
                                                WHEN bd.billType = 'Pick Up' THEN CONCAT('P',btd.tokenNo)
                                                WHEN bd.billType = 'Delivery' THEN CONCAT('D',btd.tokenNo)
                                                WHEN bd.billType = 'Dine In' THEN CONCAT('R',btd.tokenNo)
                                                ELSE NULL
                                            END AS tokenNo,
                                            CASE
                                                WHEN bd.billPayType = 'online' THEN bwu.onlineId
                                                ELSE NULL
                                            END AS onlineId,
                                            bd.firmId AS firmId, 
                                            bd.cashier AS cashier, 
                                            bd.menuStatus AS menuStatus, 
                                            bd.billType AS billType, 
                                            bd.billPayType AS billPayType, 
                                            bd.discountType AS discountType, 
                                            bd.discountValue AS discountValue, 
                                            bd.totalDiscount AS totalDiscount, 
                                            bd.totalAmount AS subTotal, 
                                            bd.settledAmount AS settledAmount, 
                                            bd.billComment AS billComment, 
                                            DATE_FORMAT(bd.billDate,'%d/%m/%Y') AS billDate,
                                            bd.billStatus AS billStatus,
                                            DATE_FORMAT(bd.billCreationDate,'%h:%i %p') AS billTime
                                        FROM 
                                            billing_data AS bd
                                        LEFT JOIN billing_Official_data AS bod ON bod.billId = bd.billId
                                        LEFT JOIN billing_Complimentary_data AS bcd ON bcd.billId = bd.billId
                                        LEFT JOIN billing_token_data AS btd ON btd.billId = bd.billId
                                        LEFT JOIN billing_firm_data AS bfd ON bfd.firmId = bd.firmId
                                        LEFT JOIN billing_billWiseUpi_data AS bwu ON bwu.billId = bd.billId
                                        WHERE bd.billId = '${billId}'`;
        let sql_query_getBillwiseItem = `SELECT
                                             bwid.iwbId AS iwbId,
                                             bwid.itemId AS itemId,
                                             imd.itemName AS itemName,
                                             imd.itemCode AS inputCode,
                                             SUM(bwid.qty) AS qty,
                                             bwid.unit AS unit,
                                             bwid.itemPrice AS itemPrice,
                                             SUM(bwid.price) AS price,
                                             bwid.comment AS comment
                                         FROM
                                             billing_billWiseItem_data AS bwid
                                         INNER JOIN item_menuList_data AS imd ON imd.itemId = bwid.itemId
                                         WHERE bwid.billId = '${billId}'
                                         GROUP BY bwid.itemId, bwid.unit`;
        let sql_query_getCustomerInfo = `SELECT
                                             bwcd.bwcId AS bwcId,
                                             bwcd.customerId AS customerId,
                                             bwcd.mobileNo AS mobileNo,
                                             bwcd.addressId AS addressId,
                                             bwcd.address AS address,
                                             bwcd.locality AS locality,
                                             bwcd.customerName AS customerName
                                         FROM
                                             billing_billWiseCustomer_data AS bwcd
                                         WHERE bwcd.billId = '${billId}'`;
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
                                        firmId = (SELECT firmId FROM billing_data WHERE billId = '${billId}')`;
        let sql_query_getTableData = `SELECT
                                        tableNo,
                                        assignCaptain
                                      FROM
                                        billing_billWiseTableNo_data
                                      WHERE billId = '${billId}'`;
        let sql_query_getSubTokens = `SELECT subTokenNumber FROM billing_subToken_data WHERE billId = '${billId}'`;
        let sql_query_getAdminId = `SELECT adminMacAddress FROM billing_admin_data`;

        const sql_query_getBillData = `${sql_query_getBillingData};
                                       ${sql_query_getBillwiseItem};
                                       ${sql_query_getFirmData};
                                       ${sql_query_getCustomerInfo};
                                       ${sql_query_getTableData};
                                       ${sql_query_getSubTokens};`;

        let sql_query_updateTableStatus = `UPDATE billing_data SET billStatus = 'print' WHERE billId = '${billId}'`;
        pool.query(sql_query_updateTableStatus, (err, raw) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                pool.query(sql_query_getBillData, (err, billData) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        pool.query(sql_query_getAdminId, (err, macId) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            } else {
                                if (macId && macId.length) {
                                    const adminMacAddress = macId[0].adminMacAddress;
                                    const json = {
                                        ...billData[0][0],
                                        itemsData: billData && billData[1] ? billData[1] : [],
                                        firmData: billData && billData[2] ? billData[2][0] : [],
                                        ...({ customerDetails: billData && billData[3][0] ? billData[3][0] : '' }),
                                        ...({ tableInfo: billData[4][0] }),
                                        subTokens: billData[5].map(item => item.subTokenNumber).sort((a, b) => a - b).join(", "),
                                    }
                                    req?.io?.emit('updateTableView');
                                    req?.io?.emit(`print_Bill_${adminMacAddress}`, json);
                                    return res.status(200).send(json);
                                } else {
                                    return res.status(404).send('Main Server Not Found');
                                }
                            }
                        })
                    }
                });
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Server Ip For Captain App

const findServerIpByApp = (req, res) => {
    try {
        return res.status(200).send("Success");
    } catch (error) {
        console.error('An error occurred', error);
        return res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    addDineInOrderByApp,
    getSubTokensByBillIdForApp,
    removeSubTokenDataByIdForApp,
    updateSubTokenDataByIdForApp,
    isTableEmpty,
    printTableBillForApp,
    findServerIpByApp,
    getSubTokenDataByIdForApp
}