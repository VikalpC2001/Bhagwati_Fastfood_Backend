const pool = require('../../database');

// Product Dropdown API

const ddlProduct = (req, res) => {
    try {
        const sql_querry_getddlProduct = `SELECT p.productId, UCASE(p.productName) AS productName, p.minProductUnit AS productUnit,
                                                COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) AS remainingStock
                                            FROM
                                                inventory_product_data AS p
                                            LEFT JOIN
                                                    (
                                                        SELECT
                                                            inventory_stockIn_data.productId,
                                                            ROUND(SUM(inventory_stockIn_data.productQty),2) AS total_quantity
                                                        FROM
                                                            inventory_stockIn_data
                                                        GROUP BY
                                                            inventory_stockIn_data.productId
                                                    ) AS si ON p.productId = si.productId
                                            LEFT JOIN
                                                    (
                                                        SELECT
                                                            inventory_stockOut_data.productId,
                                                            ROUND(SUM(inventory_stockOut_data.productQty),2) AS total_quantity
                                                        FROM
                                                            inventory_stockOut_data
                                                        GROUP BY
                                                            inventory_stockOut_data.productId
                                                    ) AS so ON p.productId = so.productId
                                            ORDER BY p.productName`;
        pool.query(sql_querry_getddlProduct, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Product Wise Supplier DDL & Unit API

const productWiseSupplierDDL = (req, res) => {
    try {

        const productId = req.query.productId;
        sql_querry_getddlandUnit = `SELECT inventory_supplierProducts_data.supplierId, UPPER(inventory_supplier_data.supplierNickName) AS supplierNickName FROM inventory_supplierProducts_data
                                    INNER JOIN inventory_supplier_data ON inventory_supplier_data.supplierId = inventory_supplierProducts_data.supplierId
                                    WHERE productId = '${productId}'`;
        pool.query(sql_querry_getddlandUnit, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })

    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// StockOut Category Dropdown API

const ddlStockOutCategory = (req, res) => {
    try {
        const sql_querry_getddlCategory = `SELECT stockOutCategoryId, UPPER(stockOutCategoryName) AS stockOutCategoryName FROM inventory_stockOutCategory_data ORDER BY stockOutCategoryName`;
        pool.query(sql_querry_getddlCategory, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}


module.exports = {
    ddlProduct,
    productWiseSupplierDDL,
    ddlStockOutCategory
}