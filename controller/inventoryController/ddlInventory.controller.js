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

// Product Wise Supplier DDL & Unit API

const productWiseSupplierDDL = (req, res) => {
    try {

        const productId = req.query.productId;
        sql_querry_getddlandUnit = `SELECT inventory_supplierProducts_data.supplierId, inventory_supplier_data.supplierNickName FROM inventory_supplierProducts_data
                                    INNER JOIN inventory_supplier_data ON inventory_supplier_data.supplierId = inventory_supplierProducts_data.supplierId
                                    WHERE productId = '${productId}'`;
        pool.query(sql_querry_getddlandUnit, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })

    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// StockOut Category Dropdown API

const ddlStockOutCategory = (req, res) => {
    try {
        const sql_querry_getddlCategory = `SELECT stockOutCategoryId, stockOutCategoryName FROM inventory_stockOutCategory_data ORDER BY stockOutCategoryName`;
        pool.query(sql_querry_getddlCategory, (err, data) => {
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


module.exports = {
    ddlProduct,
    productWiseSupplierDDL,
    ddlStockOutCategory
}