const pool = require('../../database');
const jwt = require("jsonwebtoken");
const pool2 = require('../../databasePool');

// Get Comment List

const getComment = async (req, res) => {
    try {
        var sql_queries_getCategoryTable = `SELECT
                                                bcd.commentId,
                                                bcd.comment
                                            FROM
                                                billing_comment_data AS bcd
                                            ORDER BY bcd.comment`;

        pool.query(sql_queries_getCategoryTable, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                const data = rows.map((e) => {
                    return e.comment
                })
                return res.status(200).send(data);
            }
        });
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Comment API

const addComment = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const uid1 = new Date();
                const commentId = String("Comment_" + uid1.getTime());

                const data = {
                    comment: req.body.comment.trim(),
                }
                if (!data.comment) {
                    return res.status(400).send("Please Add Comment");
                } else {
                    pool.query(`SELECT comment FROM billing_comment_data WHERE comment = '${data.comment}'`, function (err, row) {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        } else if (row && row.length) {
                            return res.status(400).send('Comment is Already In Use');
                        } else {
                            const sql_querry_addCategory = `INSERT INTO billing_comment_data (commentId, comment)  
                                                            VALUES ('${commentId}','${data.comment}')`;
                            pool.query(sql_querry_addCategory, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                return res.status(200).send("Comment Added Successfully");
                            })
                        }
                    })
                }
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

// Remove Comment API

const removeComment = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const commentId = req.query.commentId.trim();
                req.query.commentId = pool.query(`SELECT commentId FROM billing_comment_data WHERE commentId = '${commentId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM billing_comment_data WHERE commentId = '${commentId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Comment Deleted Successfully");
                        })
                    } else {
                        return res.send('CommentId Not Found');
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

// Update Comment API

const updateComment = async (req, res) => {
    try {
        const data = {
            commentId: req.body.commentId.trim(),
            comment: req.body.comment.trim()
        }
        if (!data.comment) {
            return res.status(400).send("Please Add Comment");
        } else {

        }
        pool.query(`SELECT comment FROM billing_comment_data WHERE comment = '${data.comment}' AND commentId != '${data.commentId}'`, function (err, row) {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (row && row.length) {
                return res.status(400).send('Comment is Already In Use');
            } else {
                const sql_querry_updatedetails = `UPDATE billing_comment_data SET comment = '${data.comment}'
                                                  WHERE commentId = '${data.commentId}'`;
                pool.query(sql_querry_updatedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Comment Updated Successfully");
                })
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// add Bill no test

// const billNoTest = (req, res) => {
//     try {
//         let sql_queries_getOldBillNo = `SELECT id, MAX(billNo) AS billNo FROM billing_test_no WHERE creationDate = (SELECT MAX(creationDate) FROM billing_test_no)`;
//         pool.query(sql_queries_getOldBillNo, (err, data) => {
//             if (err) {
//                 console.error("An error occurd in SQL Queery", err);
//                 return res.status(500).send('Database Error');
//             } else {
//                 const lastBillNo = data && data[0] && data[0].billNo ? data[0].billNo : 0;
//                 console.log()
//                 let sql_queries_addBillNo = `INSERT INTO billing_test_no(billNo)
//                                              VALUES(${lastBillNo} + 1)`;
//                 pool.query(sql_queries_addBillNo, (err, data) => {
//                     if (err) {
//                         console.error("An error occurd in SQL Queery", err);
//                         return res.status(500).send('Database Error');
//                     } else {
//                         return res.status(200).send('Bill Added Success');
//                     }
//                 })
//             }
//         })
//     } catch (error) {
//         console.error('An error occurd', error);
//         res.status(500).send('Internal Server Error');
//     }
// }


const billNoTest = (req, res) => {
    try {
        pool2.getConnection((err, connection) => {
            const firmId = req.query.firmId;
            if (err) {
                console.error("Error getting database connection:", err);
                return res.status(500).send('Database Error');
            }

            connection.beginTransaction((err) => {
                if (err) {
                    console.error("Error beginning transaction:", err);
                    connection.release();
                    return res.status(500).send('Database Error');
                }

                connection.query(`SELECT COALESCE(MAX(billNo),0) AS lastBillNo, COALESCE(MAX(tokenNo),0) AS tokenNo, DATE(creationDate) AS lastDate FROM billing_test_no WHERE firmed = '${firmId}' AND creationDate = (SELECT MAX(creationDate) FROM billing_test_no) FOR UPDATE;`, (err, result) => {
                    if (err) {
                        console.error("Error selecting last bill number:", err);
                        connection.rollback(() => {
                            connection.release();
                            return res.status(500).send('Database Error');
                        });
                    } else {
                        const lastBillNo = result && result[0] && result[0].lastBillNo ? result[0].lastBillNo : 0;
                        const tokenNo = result && result[0] && result[0].tokenNo ? result[0].tokenNo : 0;
                        const uid1 = new Date();

                        const lastDate = new Date(result[0].lastDate);
                        const currentDate = new Date();

                        if (lastDate.toDateString() === currentDate.toDateString()) {
                            nextTokenNo = tokenNo + 1;
                        } else {
                            nextTokenNo = 1;
                        }

                        const nextBillNo = lastBillNo + 1;
                        const billId = String("bill_" + uid1.getTime() + '_' + nextBillNo);

                        connection.query('INSERT INTO billing_test_no (billNo, id, firmed, tokenNo) VALUES (?,?,?,?)', [nextBillNo, billId, firmId, nextTokenNo], (err) => {
                            if (err) {
                                console.error("Error inserting new bill number:", err);
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
                                        return res.status(200).send('Bill Added Successfully');
                                    }
                                });
                            }
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('Internal Server Error');
    }
};





module.exports = {
    getComment,
    addComment,
    removeComment,
    updateComment,
    billNoTest
}