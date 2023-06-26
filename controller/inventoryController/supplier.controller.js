const pool = require('../../database');

//Get Supplier Data API

const getSupplierdata = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        sql_querry_getdetails = `SELECT count(*) as numRows FROM inventory_supplier_data`;
        pool.query(sql_querry_getdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                pool.query(`SELECT sd.supplierId, CONCAT(supplierFirstName, ' ', supplierLastName) AS supplierName, sd.supplierFirmName, sd.supplierPhoneNumber, GROUP_CONCAT(inventory_product_data.productName SEPARATOR ', ') as productList,
                            COALESCE(sisd.total_price, 0) - COALESCE(sosd.total_paid, 0) AS remainingAmount FROM inventory_supplier_data AS sd
                            INNER JOIN inventory_supplierProducts_data ON inventory_supplierProducts_data.supplierId = sd.supplierId
                            INNER JOIN inventory_product_data ON inventory_product_data.productId = inventory_supplierProducts_data.productId
                            LEFT JOIN
                                        (
                                            SELECT
                                                inventory_stockIn_data.supplierId,
                                                SUM(inventory_stockIn_data.totalPrice) AS total_price
                                            FROM
                                                inventory_stockIn_data
                                            WHERE inventory_stockIn_data.stockInPaymentMethod = 'debit'
                                            GROUP BY
                                                inventory_stockIn_data.supplierId
                                        ) AS sisd ON sd.supplierId = sisd.supplierId
                            LEFT JOIN
                                        (
                                            SELECT
                                                inventory_supplierTransaction_data.supplierId,
                                                SUM(inventory_supplierTransaction_data.paidAmount) AS total_paid
                                            FROM
                                                inventory_supplierTransaction_data
                                            GROUP BY
                                                inventory_supplierTransaction_data.supplierId
                                        ) AS sosd ON sd.supplierId = sosd.supplierId
                            GROUP BY inventory_supplierProducts_data.supplierId LIMIT `+ limit, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        console.log(rows);
                        console.log(numRows);
                        console.log("Total Page :-", numPages);
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                })
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add Supplier API

const addSupplierDetails = async (req, res) => {
    try {

        const uid1 = new Date();
        const supplierId = String("supplier_" + uid1.getTime());
        console.log("...", supplierId.toString());

        const data = {
            supplierFirstName: req.body.supplierFirstName.trim(),
            supplierLastName: req.body.supplierLastName.trim(),
            supplierFirmName: req.body.supplierFirmName.trim(),
            supplierFirmAddress: req.body.supplierFirmAddress.trim(),
            supplierNickName: req.body.supplierNickName.trim(),
            supplierPhoneNumber: req.body.supplierPhoneNumber.trim(),
            supplierEmailId: req.body.supplierEmailId ? req.body.supplierEmailId.trim() : null,
            productId: req.body.productId ? req.body.productId : null
        }
        console.log("hello ff", data.productId);

        const supllierProducts = () => {
            if (data.productId === null) {
                return res.status(400).send("Please Select Product");
            } else {
                var string = ''
                data.productId.forEach((data, index) => {
                    if (index == 0)
                        string = "(" + "'" + supplierId + "'" + "," + string + "'" + data + "'" + ")";
                    else
                        string = string + ",(" + "'" + supplierId + "'" + "," + "'" + data + "'" + ")";
                });
                return string;
            }
        }

        if (!data.supplierFirstName || !data.supplierLastName || !data.supplierFirmName || !data.supplierFirmAddress || !data.supplierPhoneNumber || !data.supplierEmailId || !data.productId) {
            res.status(400);
            res.send("Please Fill all the feilds");
        } else {
            req.body.supplierFirmName = pool.query(`SELECT supplierFirmName FROM inventory_supplier_data WHERE supplierFirmName = '${data.supplierFirmName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Supplier is Already In Use');
                } else {
                    sql_querry_addSupplier = `INSERT INTO inventory_supplier_data (supplierId, supplierFirstName, supplierLastName, supplierFirmName, supplierFirmAddress, supplierNickName, supplierPhoneNumber, supplierEmailId)
                                              VALUES ('${supplierId}','${data.supplierFirstName}','${data.supplierLastName}','${data.supplierFirmName}','${data.supplierFirmAddress}','${data.supplierNickName}','${data.supplierPhoneNumber}',NULLIF('${data.supplierEmailId}','null'))`;
                    pool.query(sql_querry_addSupplier, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        sql_queries_addsupllierProducts = `INSERT INTO inventory_supplierProducts_data (supplierId, productId) VALUES ${supllierProducts()}`;
                        pool.query(sql_queries_addsupllierProducts, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Supplier Added Successfully");
                        })
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Supplier API

const removeSupplierDetails = async (req, res) => {

    try {
        const supplierId = req.query.supplierId
        req.query.userId = pool.query(`SELECT supplierId FROM inventory_supplier_data WHERE supplierId = '${supplierId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM inventory_supplier_data WHERE supplierId = '${supplierId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("supplierId Deleted Successfully");
                })
            } else {
                return res.send('supplierId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Fill Supplier For Update 

const fillSupplierDetails = (req, res) => {
    try {
        const supplierId = req.query.supplierId
        sql_querry_fillUser = `SELECT supplierId, supplierFirstName, supplierLastName, supplierFirmName, supplierFirmAddress, supplierNickName, supplierPhoneNumber, supplierEmailId FROM inventory_supplier_data WHERE supplierId =  '${supplierId}';
                               SELECT GROUP_CONCAT(productId SEPARATOR ',') as productList FROM inventory_supplierProducts_data WHERE supplierId =  '${supplierId}' GROUP BY supplierId;`;
        pool.query(sql_querry_fillUser, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const supplierData = data[0][0];
            var a = data[1][0].productList;
            b = a.split(",");
            console.log(b);
            const allData = {
                ...supplierData,
                productId: b
            }
            return res.status(200).send(allData);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Update Supplier API

const updateSupplierDetails = async (req, res) => {
    try {
        const supplierId = req.body.supplierId;
        const data = {
            supplierFirstName: req.body.supplierFirstName.trim(),
            supplierLastName: req.body.supplierLastName.trim(),
            supplierFirmName: req.body.supplierFirmName.trim(),
            supplierFirmAddress: req.body.supplierFirmAddress.trim(),
            supplierNickName: req.body.supplierNickName.trim(),
            supplierPhoneNumber: req.body.supplierPhoneNumber.trim(),
            supplierEmailId: req.body.supplierEmailId ? req.body.supplierEmailId.trim() : null,
            productId: req.body.productId
        }

        const supllierProducts = () => {
            var string = ''
            data.productId.forEach((data, index) => {
                if (index == 0)
                    string = "(" + "'" + supplierId + "'" + "," + string + "'" + data + "'" + ")";
                else
                    string = string + ",(" + "'" + supplierId + "'" + "," + "'" + data + "'" + ")";
            });
            return string;
        }

        console.log("><><><><><><", supllierProducts());

        const sql_querry_updatedetails = `UPDATE inventory_supplier_data SET supplierFirstName = '${data.supplierFirstName}', 
                                                                             supplierLastName = '${data.supplierLastName}',
                                                                             supplierFirmName = '${data.supplierFirmName}',
                                                                             supplierFirmAddress = '${data.supplierFirmAddress}',
                                                                             supplierNickName = '${data.supplierNickName}',
                                                                             supplierPhoneNumber = '${data.supplierPhoneNumber}',
                                                                             supplierEmailId = NULLIF('${data.supplierEmailId}','null')
                                                                       WHERE supplierId = '${supplierId}'`;
        pool.query(sql_querry_updatedetails, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            sql_querry_deleteSupplierProducts = `DELETE FROM inventory_supplierProducts_data WHERE supplierId = '${supplierId}'`;
            pool.query(sql_querry_deleteSupplierProducts, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                sql_queries_addsupllierProducts = `INSERT INTO inventory_supplierProducts_data (supplierId, productId) VALUES ${supllierProducts()}`;
                pool.query(sql_queries_addsupllierProducts, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Supplier Updated Successfully");
                })
            })
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getSupplierdata,
    addSupplierDetails,
    removeSupplierDetails,
    fillSupplierDetails,
    updateSupplierDetails
}