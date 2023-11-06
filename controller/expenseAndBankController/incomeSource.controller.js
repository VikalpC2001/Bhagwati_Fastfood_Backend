const pool = require('../../database');

// Get InCome Source List

const getIncomeSourceList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM incomeSource_data`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);


                sql_queries_getdetails = `SELECT sourceId, sourceName FROM incomeSource_data 
                                          Order BY sourceName limit ${limit}`;
                pool.query(sql_queries_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows });
                        } else {
                            return res.status(200).send({ rows, numRows });
                        }
                    }
                });
            }
        })

    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add Main Category

const addIncomeSource = (req, res) => {
    try {
        const uid1 = new Date();
        const sourceId = String('incomeSource_' + uid1.getTime());
        const data = {
            sourceName: req.body.sourceName.trim(),
        }
        if (!data.sourceName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.sourceName = pool.query(`SELECT sourceName FROM incomeSource_data WHERE sourceName = '${data.sourceName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('In-Come Source is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO incomeSource_data(sourceId, sourceName)
                                                VALUES('${sourceId}', '${data.sourceName}')`;
                    pool.query(sql_querry_addDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("In-Come Source Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Remove Main Category Data

const removeIncomeSource = async (req, res) => {

    try {
        var sourceId = req.query.sourceId.trim();
        if (!sourceId) {
            return res.status(404).send('sourceId Not Found');
        }
        req.query.sourceId = pool.query(`SELECT sourceId FROM incomeSource_data WHERE sourceId = '${sourceId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM incomeSource_data WHERE sourceId = '${sourceId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("In-Come Source Deleted Successfully");
                })
            } else {
                return res.send('sourceId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Main Category Data

const updateInComeSource = (req, res) => {
    try {
        const sourceId = req.body.sourceId;
        const data = {
            sourceName: req.body.sourceName.trim(),
        }
        if (!data.sourceName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            pool.query(`SELECT sourceName FROM incomeSource_data WHERE sourceId NOT IN ('${sourceId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const sourceNameList = rowarr.map(e => e.sourceName.toLowerCase())
                if (sourceNameList.includes(data.sourceName.toLowerCase())) {
                    return res.status(400).send('In-Come Source is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                        incomeSource_data
                                                      SET
                                                        sourceName = '${data.sourceName}'
                                                      WHERE
                                                        sourceId = '${sourceId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("In-Come Source Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Dropdown List For From

const ddlFromData = (req, res) => {
    try {
        const sql_query_getDDlData = `SELECT fromId, fromName, status
                                      FROM (
                                          SELECT bankId AS fromId, bankDisplayName AS fromName, true AS status FROM bank_data
                                          UNION
                                          SELECT sourceId AS fromId, sourceName AS fromName, false AS status FROM incomeSource_data
                                      ) AS combined_data
                                      ORDER BY fromName;`;
        pool.query(sql_query_getDDlData, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            // const mergedObject = data[0].concat(data[1]);
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

module.exports = { addIncomeSource, updateInComeSource, removeIncomeSource, ddlFromData, getIncomeSourceList }