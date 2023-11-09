const pool = require('../../database');

// Get Bank List

const getBankList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        sql_querry_getCountdetails = `SELECT count(*) AS numRows FROM bank_data`;
        pool.query(sql_querry_getCountdetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);


                sql_queries_getdetails = `SELECT bankId, bankName, bankShortForm, bankAccountNumber, ifscCode, bankDisplayName, bankIconName FROM bank_data 
                                          Order BY bankName limit ${limit}`;
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

const addBankData = (req, res) => {
    try {
        const uid1 = new Date();
        const bankId = String('bank_' + uid1.getTime());
        const data = {
            bankName: req.body.bankName.trim(),
            bankDisplayName: req.body.bankDisplayName.trim(),
            bankIconName: req.body.bankIconName.trim(),
            bankShortForm: req.body.bankShortForm ? req.body.bankShortForm.trim() : null,
            bankAccountNumber: req.body.bankAccountNumber ? req.body.bankAccountNumber.trim() : null,
            ifscCode: req.body.ifscCode ? req.body.ifscCode.trim() : null,
        }
        if (!data.bankName || !data.bankDisplayName || !data.bankIconName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.bankDisplayName = pool.query(`SELECT bankDisplayName FROM bank_data WHERE bankDisplayName = '${data.bankDisplayName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('Bank is Already In Use');
                } else {
                    const sql_querry_addDetails = `INSERT INTO bank_data(bankId, bankName, bankDisplayName, bankShortForm, bankIconName, bankAccountNumber, ifscCode)
                                                   VALUES('${bankId}', '${data.bankName}', '${data.bankDisplayName}', ${data.bankShortForm ? `'${data.bankShortForm}'` : null}, '${data.bankIconName}', ${data.bankAccountNumber ? `'${data.bankAccountNumber}'` : null}, ${data.ifscCode ? `'${data.ifscCode}'` : null})`;
                    pool.query(sql_querry_addDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Bank Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Remove Bank Data

const removeBankData = async (req, res) => {
    try {
        var bankId = req.query.bankId.trim();
        if (!bankId) {
            return res.status(404).send('bankId Not Found');
        }
        req.query.bankId = pool.query(`SELECT bankId FROM bank_data WHERE bankId = '${bankId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const sql_querry_removedetails = `DELETE FROM bank_data WHERE bankId = '${bankId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Bank Deleted Successfully");
                })
            } else {
                return res.send('bankId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Main Category Data

const updateBankData = (req, res) => {
    try {
        const bankId = req.body.bankId;
        const data = {
            bankName: req.body.bankName.trim(),
            bankDisplayName: req.body.bankDisplayName.trim(),
            bankIconName: req.body.bankIconName.trim(),
            bankShortForm: req.body.bankShortForm.trim(),
            bankAccountNumber: req.body.bankAccountNumber ? req.body.bankAccountNumber.trim() : null,
            ifscCode: req.body.ifscCode ? req.body.ifscCode.trim() : null
        }
        if (!data.bankName || !data.bankDisplayName || !data.bankIconName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            pool.query(`SELECT bankDisplayName FROM bank_data WHERE bankId NOT IN ('${bankId}')`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const rowarr = Object.values(JSON.parse(JSON.stringify(row)));
                const bankNameList = rowarr.map(e => e.bankDisplayName ? e.bankDisplayName.toLowerCase() : '')
                if (bankNameList.includes(data.bankDisplayName.toLowerCase())) {
                    return res.status(400).send('Bank is Already In Use');
                }
                else {
                    const sql_querry_updateDetails = `UPDATE
                                                        bank_data
                                                      SET
                                                        bankName = '${data.bankName}',
                                                        bankDisplayName = '${data.bankDisplayName}',
                                                        bankIconName = '${data.bankIconName}',
                                                        bankShortForm = '${data.bankShortForm}',
                                                        bankAccountNumber = ${data.bankAccountNumber ? `'${data.bankAccountNumber}'` : null},
                                                        ifscCode = ${data.ifscCode ? `'${data.ifscCode}'` : null}
                                                      WHERE
                                                        bankId = '${bankId}'`;
                    pool.query(sql_querry_updateDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Bank Update Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Dropdown List For Bank

const ddlToData = (req, res) => {
    try {
        const sql_query_getDDlData = `SELECT bankId AS toId, bankDisplayName AS toName FROM bank_data`;
        pool.query(sql_query_getDDlData, (err, data) => {
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

module.exports = { addBankData, updateBankData, removeBankData, ddlToData, getBankList }