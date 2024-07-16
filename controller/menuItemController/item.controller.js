const pool = require('../../database');
const pool2 = require('../../databasePool');
const jwt = require("jsonwebtoken");
const { generateUpdateQuery, varientDatas } = require('./menuFunction.controller');

// Get Item Data

const getItemData = (req, res) => {
    try {
        const menuId = req.query.menuId ? req.query.menuId : 'base_2001';
        const subCategoryId = req.query.subCategoryId ? req.query.subCategoryId : '';
        const sql_query_staticQuery = `SELECT itemId, itemName, itemGujaratiName, itemCode, itemShortKey, itemSubCategory, spicyLevel, isJain, isPureJain, itemDescription FROM item_menuList_data`;
        if (!menuId) {
            return res.status(404).send('menuId Not Found');
        } else if (req.query.subCategoryId) {
            sql_querry_getItem = `${sql_query_staticQuery}
                                  WHERE itemSubCategory = '${subCategoryId}'
                                  ORDER BY itemCode ASC`;
        } else {
            sql_querry_getItem = `${sql_query_staticQuery}
                                  ORDER BY itemCode ASC`;
        }
        pool.query(sql_querry_getItem, (err, rows) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const datas = Object.values(JSON.parse(JSON.stringify(rows)));
                if (datas.length) {
                    varientDatas(datas, menuId)
                        .then((data) => {
                            const combinedData = datas.map((item, index) => (
                                {
                                    ...item,
                                    variantsList: data[index].varients,
                                    allVariantsList: data[index].allVariantsList,
                                    periods: data[index].periods,
                                    status: data[index].status
                                }
                            ))
                            return res.status(200).send(combinedData);
                        }).catch(error => {
                            console.error('Error in processing datas :', error);
                            return res.status(500).send('Internal Error');
                        });
                } else {
                    return res.status(400).send('No Data Found');
                }
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Item Data

const addItemData = (req, res) => {
    pool2.getConnection((err, conn) => {
        if (err) {
            console.log('Connection Error', err)
            return res.status(500).send('Database Connection Error');
        }
        try {
            conn.beginTransaction((err) => {
                if (err) {
                    console.log('Error In Transaction');
                    return res.status(500).send('Transaction Error');
                } else {
                    const uid1 = new Date();
                    const itemId = String("item_" + uid1.getTime());
                    const itemData = req.body;

                    if (!itemData.itemName || !itemData.itemGujaratiName || !itemData.itemCode || !itemData.itemShortKey || !itemData.itemSubCategory || !itemData.variantsList.length) {
                        conn.rollback(() => {
                            conn.release();
                            return res.status(404).send('Please Fill All The Fields..!');
                        })
                    } else {
                        let sql_query_getOldData = `SELECT itemName FROM item_menuList_data WHERE itemName = '${itemData.itemName}';
                                                    SELECT itemGujaratiName FROM item_menuList_data WHERE itemGujaratiName = '${itemData.itemGujaratiName}';
                                                    SELECT itemCode FROM item_menuList_data WHERE itemCode = '${itemData.itemCode}';
                                                    SELECT itemShortKey FROM item_menuList_data WHERE itemShortKey = '${itemData.itemShortKey}';
                                                    SELECT menuCategoryId FROM item_menuCategory_data`
                        conn.query(sql_query_getOldData, (err, oldDatas) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                conn.rollback(() => {
                                    console.error("An error occurd in SQL Queery 1", err);
                                    conn.release();
                                    return res.status(500).send('Database Error');
                                })
                            } else {
                                const oldData = Object.values(JSON.parse(JSON.stringify(oldDatas)));
                                const menuCategoryList = oldData[4];
                                if (oldData && oldData[0].length > 0) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Item Name is Already In Use');
                                    })
                                } else if (oldData && oldData[1].length > 0) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Item GujaratiName is Already In Use');
                                    })
                                } else if (oldData && oldData[2].length > 0) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Code is Already In Use');
                                    })
                                } else if (oldData && oldData[3].length > 0) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Short Key is Already In Use');
                                    })
                                } else if (!oldData || !oldData[4] || oldData[4].length < 1) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Menu Category Not Found');
                                    })
                                } else {
                                    let sql_querry_addItem = `INSERT INTO item_menuList_data (itemId, itemName, itemGujaratiName, itemCode, itemShortKey, itemSubCategory, spicyLevel, isJain, isPureJain,itemDescription)
                                                              VALUES ('${itemId}', TRIM('${itemData.itemName}'), TRIM('${itemData.itemGujaratiName}'), ${itemData.itemCode} ,TRIM('${itemData.itemShortKey}'), '${itemData.itemSubCategory}', ${itemData.spicyLevel ? itemData.spicyLevel : 0}, ${itemData.isJain ? itemData.isJain : 0}, ${itemData.isPureJain ? itemData.isPureJain : 0}, TRIM(${itemData.itemDescription ? `'${itemData.itemDescription}'` : null}))`;
                                    conn.query(sql_querry_addItem, (err, menu) => {
                                        if (err) {
                                            conn.rollback(() => {
                                                console.error("An error occurd in SQL Queery", err);
                                                conn.release();
                                                return res.status(500).send('Database Error');
                                            })
                                        } else {
                                            const variantJson = itemData.variantsList;

                                            let addvariants = menuCategoryList.map((menuId, index) => {
                                                const tempData = variantJson.map((item, index) => {
                                                    return `('${menuId.menuCategoryId}', '${itemId}', '${item.unit}', ${item.price}, ${item.status})`;
                                                })
                                                return tempData.join(', ')
                                            })

                                            const newAddvarients = addvariants.join(', ');
                                            let sql_querry_addVariants = `INSERT INTO item_unitWisePrice_data (menuCategoryId, itemId, unit, price, status)
                                                                          VALUES ${newAddvarients}`;
                                            conn.query(sql_querry_addVariants, (err, variant) => {
                                                if (err) {
                                                    conn.rollback(() => {
                                                        console.error("An error occurd in SQL Queery", err);
                                                        conn.release();
                                                        return res.status(500).send('Database Error');
                                                    })
                                                }
                                                else {
                                                    conn.commit((err) => {
                                                        if (err) {
                                                            conn.rollback(() => {
                                                                console.error("An error occurd in SQL Queery", err);
                                                                conn.release();
                                                                return res.status(500).send('Database Error');
                                                            })
                                                        } else {
                                                            conn.release();
                                                            return res.status(200).send("Item Added Successfully");
                                                        }
                                                    })
                                                }
                                            })
                                        }
                                    })
                                }
                            }
                        })
                    }
                }
            })
        } catch (error) {
            conn.rollback(() => {
                console.error('An error occurd', error);
                conn.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Remove Item Data

const removeItemData = (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const itemId = req.query.itemId.trim();
                req.query.itemId = pool.query(`SELECT itemId FROM item_menuList_data WHERE itemId = '${itemId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM item_menuList_data WHERE itemId = '${itemId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Item Deleted Successfully");
                        })
                    } else {
                        return res.send('itemId Not Found');
                    }
                })
            } else {
                return res.status(400).send('You are Not Authorised');
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Item Data

const updateItemData = (req, res) => {
    pool2.getConnection((err, conn) => {
        if (err) {
            console.log('Connection Error', err)
            return res.status(500).send('Database Connection Error');
        }
        try {
            conn.beginTransaction((err) => {
                if (err) {
                    console.log('Error In Transaction');
                    return res.status(500).send('Transaction Error');
                } else {
                    const itemData = req.body;
                    if (!itemData.itemName || !itemData.itemGujaratiName || !itemData.itemCode || !itemData.itemShortKey || !itemData.itemSubCategory || !itemData.variantsList.length || !itemData.menuCategoryId) {
                        conn.rollback(() => {
                            conn.release();
                            return res.status(404).send('Please Fill All The Fields..!');
                        })
                    } else {
                        let sql_query_getOldData = `SELECT itemName FROM item_menuList_data WHERE itemName = '${itemData.itemName}' AND itemId != '${itemData.itemId}';
                                                    SELECT itemGujaratiName FROM item_menuList_data WHERE itemGujaratiName = '${itemData.itemGujaratiName}' AND itemId != '${itemData.itemId}';
                                                    SELECT itemCode FROM item_menuList_data WHERE itemCode = '${itemData.itemCode}' AND itemId != '${itemData.itemId}';
                                                    SELECT itemShortKey FROM item_menuList_data WHERE itemShortKey = '${itemData.itemShortKey}' AND itemId != '${itemData.itemId}'`;
                        conn.query(sql_query_getOldData, (err, oldDatas) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                conn.rollback(() => {
                                    console.error("An error occurd in SQL Queery 1", err);
                                    conn.release();
                                    return res.status(500).send('Database Error');
                                })
                            } else {
                                const oldData = Object.values(JSON.parse(JSON.stringify(oldDatas)));
                                if (oldData && oldData[0].length > 0) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Item Name is Already In Use');
                                    })
                                } else if (oldData && oldData[1].length > 0) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Item GujaratiName is Already In Use');
                                    })
                                } else if (oldData && oldData[2].length > 0) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Code is Already In Use');
                                    })
                                } else if (oldData && oldData[3].length > 0) {
                                    conn.rollback(() => {
                                        conn.release();
                                        return res.status(400).send('Short Key is Already In Use');
                                    })
                                } else {
                                    let sql_querry_updateData = `UPDATE
                                                                     item_menuList_data
                                                                 SET
                                                                     itemName = TRIM('${itemData.itemName}'),
                                                                     itemGujaratiName = TRIM('${itemData.itemGujaratiName}'),
                                                                     itemCode = ${itemData.itemCode},
                                                                     itemShortKey = TRIM('${itemData.itemShortKey}'),
                                                                     itemSubCategory = '${itemData.itemSubCategory}',
                                                                     spicyLevel = ${itemData.spicyLevel ? itemData.spicyLevel : 0},
                                                                     isJain = ${itemData.isJain ? itemData.isJain : 0},
                                                                     isPureJain = ${itemData.isPureJain ? itemData.isPureJain : 0},
                                                                     itemDescription = TRIM(${itemData.itemDescription ? `'${itemData.itemDescription}'` : null})
                                                                 WHERE itemId = '${itemData.itemId}'`;
                                    conn.query(sql_querry_updateData, (err, data) => {
                                        if (err) {
                                            conn.rollback(() => {
                                                console.error("An error occurd in SQL Queery", err);
                                                conn.release();
                                                return res.status(500).send('Database Error');
                                            })
                                        } else {
                                            let sql_querry_deleteOldVarients = `DELETE FROM item_unitWisePrice_data WHERE menuCategoryId = '${itemData.menuCategoryId}' AND itemId = '${itemData.itemId}'`;
                                            conn.query(sql_querry_deleteOldVarients, (err, data) => {
                                                if (err) {
                                                    conn.rollback(() => {
                                                        console.error("An error occurd in SQL Queery", err);
                                                        conn.release();
                                                        return res.status(500).send('Database Error');
                                                    })
                                                } else {
                                                    const variantJson = itemData.variantsList;

                                                    const addvariants = variantJson.map((item, index) => {
                                                        return `('${itemData.menuCategoryId}', '${itemData.itemId}', '${item.unit}', ${item.price}, ${item.status})`;
                                                    })

                                                    const newAddvarients = addvariants.join(', ');
                                                    let sql_querry_addVariants = `INSERT INTO item_unitWisePrice_data (menuCategoryId, itemId, unit, price, status)
                                                                                  VALUES ${newAddvarients}`;
                                                    conn.query(sql_querry_addVariants, (err, variant) => {
                                                        if (err) {
                                                            conn.rollback(() => {
                                                                console.error("An error occurd in SQL Queery", err);
                                                                conn.release();
                                                                return res.status(500).send('Database Error');
                                                            })
                                                        }
                                                        else {
                                                            conn.commit((err) => {
                                                                if (err) {
                                                                    conn.rollback(() => {
                                                                        console.error("An error occurd in SQL Queery", err);
                                                                        conn.release();
                                                                        return res.status(500).send('Database Error');
                                                                    })
                                                                } else {
                                                                    conn.release();
                                                                    return res.status(200).send("Item Updated Successfully");
                                                                }
                                                            })
                                                        }
                                                    })
                                                }
                                            })
                                        }
                                    })
                                }
                            }
                        })
                    }
                }
            })
        } catch (error) {
            conn.rollback(() => {
                console.error('An error occurd', error);
                conn.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Update Multiple Item Price

const updateMultipleItemPrice = (req, res) => {
    try {
        const priceJson = req.body;
        const newArray = priceJson.flatMap((item, index) => (
            [...item.variantsList]
        ))
        const validate = newArray.filter((item) => {
            if (item.price <= 0 || !item.uwpId) {
                return item;
            }
        })
        if (validate.length <= 0 || !validate) {
            const sql_qurey_updatedPrice = generateUpdateQuery(newArray);
            pool.query(sql_qurey_updatedPrice, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                return res.status(200).send('Price Updated Successfully');
            })
        }
        else {
            return res.status(401).send('Price can not be zero...!');
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Item Status

const updateItemStatus = (req, res) => {
    try {
        const menuId = req.query.menuId;
        const subCategoryId = req.query.subCategoryId;
        const itemId = req.query.itemId;
        const status = req.query.status;
        if (subCategoryId && menuId && !itemId) {
            sql_querry_updateStatus = `UPDATE
                                           item_unitWisePrice_data
                                       SET 
                                           status = ${status}
                                       WHERE itemId IN 
                                                    (SELECT COALESCE(itemId,null) FROM item_menuList_data WHERE itemSubCategory = '${subCategoryId}') 
                                       AND 
                                             menuCategoryId = '${menuId}'`;
        } else if (itemId && menuId && !subCategoryId) {
            sql_querry_updateStatus = `UPDATE
                                           item_unitWisePrice_data
                                       SET 
                                           status = ${status}
                                       WHERE itemId = '${itemId}' AND menuCategoryId = '${menuId}'`;
        } else {
            return res.status(404).send('Edit Field Not Foud');
        }
        pool.query(sql_querry_updateStatus, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send('Status Updated Successfully');
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getItemData,
    addItemData,
    removeItemData,
    updateItemData,
    updateMultipleItemPrice,
    updateItemStatus
}