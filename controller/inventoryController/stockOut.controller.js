const pool = require('../../database');
const jwt = require("jsonwebtoken");

// StockOut Add API

const addStockOutDetails = async (req, res) => {
    try {

        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const stockOutId = String("stockOut_" + uid1.getTime());
            console.log("...", stockOutId);

            const data = {
                productId: req.body.productId,
                productQty: req.body.productQty,
                productUnit: req.body.productUnit.trim(),
                stockOutCategory: req.body.stockOutCategory.trim(),
                stockOutComment: req.body.stockOutComment ? req.body.stockOutComment.trim() : null,
                stockOutDate: new Date(req.body.stockOutDate ? req.body.stockOutDate : "10/10/1001").toString().slice(4, 15)
            }
            if (!data.productId || !data.productQty || !data.productUnit || !data.stockOutCategory || !data.stockOutDate) {
                res.status(400);
                res.send("Please Fill all the feilds")
            } else {
                const sql_querry_addStockOut = `INSERT INTO inventory_stockOut_data (stockOutId, userId, productId, productQty, productUnit, stockOutCategory, stockOutComment, stockOutDate)  
                                                VALUES ('${stockOutId}', '${userId}', '${data.productId}', ${data.productQty}, '${data.productUnit}', '${data.stockOutCategory}', NULLIF('${data.stockOutComment}','null'), STR_TO_DATE('${data.stockOutDate}','%b %d %Y'))`;
                pool.query(sql_querry_addStockOut, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Data Added Successfully");
                })
            }

        } else {
            res.status(401);
            res.send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = {
    addStockOutDetails
}

// SELECT
// p.productName, CONCAT(p.minProductQty, " ", p.minProductUnit) AS minProductQty,
//     CONCAT(COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0), " ", p.minProductUnit) AS remainingStock,
//         CASE WHEN COALESCE(si.total_quantity, 0) - COALESCE(so.total_quantity, 0) >= p.minProductQty THEN 'In Stock'
// 		 ELSE 'Out of Stock'
// END AS stockStatus
// FROM
//     inventory_product_data AS p
// LEFT JOIN
//     (
//         SELECT
//             inventory_stockIn_data.productId,
//         SUM(inventory_stockIn_data.productQty) AS total_quantity
//         FROM
//             inventory_stockIn_data
//         GROUP BY
//             inventory_stockIn_data.productId
//     ) AS si ON p.productId = si.productId
// LEFT JOIN
//     (
//         SELECT
//             inventory_stockOut_data.productId,
//         SUM(inventory_stockOut_data.productQty) AS total_quantity
//         FROM
//             inventory_stockOut_data
//         GROUP BY
//             inventory_stockOut_data.productId
//     ) AS so ON p.productId = so.productId
//     WHERE p.productName LIKE '%';