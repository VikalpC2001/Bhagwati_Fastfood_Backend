const pool = require('../../database');

// Product Dropdown API

const ddlProduct = (req, res) => {
    try {
        const sql_querry_getddlProduct = `SELECT productId, productName FROM inventory_product_data ORDER BY productName`;
        pool.query(sql_querry_getddlProduct, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}


// Add Product API

const addProduct = async (req, res) => {
    try {

        const uid1 = new Date();
        const productId = String("product_" + uid1.getTime());
        console.log("...", productId);

        const data = {
            productName: req.body.productName.trim(),
            minProductQty: req.body.minProductQty,
            minProductUnit: req.body.minProductUnit.trim()
        }
        console.log(">>?>?>?>", data.productName);
        if (!data.productName || !data.minProductQty || !data.minProductUnit) {
            res.status(400);
            res.send("Please Add Product")
        } else {
            req.body.productName = pool.query(`SELECT productName FROM inventory_product_data WHERE productName = '${data.productName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Product is Already In Use');
                } else {
                    const sql_querry_addUser = `INSERT INTO inventory_product_data (productId, productName, minProductQty, minProductUnit)  
                                                 VALUES ('${productId}','${data.productName}',${data.minProductQty},'${data.minProductUnit}')`;
                    pool.query(sql_querry_addUser, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Product Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Product API

const removeProduct = async (req, res) => {

    try {
        productId = req.query.productId.trim();
        req.query.productId = pool.query(`SELECT productId FROM inventory_product_data WHERE productId= '${productId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM inventory_product_data WHERE productId = '${productId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.json({ status: 200, message: "Product Deleted Successfully" })
                })
            } else {
                return res.send('ProductId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Product API

const updateProduct = async (req, res) => {
    try {
        const data = {
            productId: req.body.productId.trim(),
            productName: req.body.productName.trim(),
            minProductQty: req.body.minProductQty,
            minProductUnit: req.body.minProductUnit.trim()
        }
        const sql_querry_updatedetails = `UPDATE inventory_product_data SET productName = '${data.productName}',
                                                                            minProductQty = ${data.minProductQty},
                                                                            minProductUnit = '${data.minProductUnit}'
                                                                      WHERE productId = '${data.productId}'`;
        pool.query(sql_querry_updatedetails, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send("Product Updated Successfully");
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    addProduct,
    updateProduct,
    removeProduct,
    ddlProduct
}