const pool = require('../../database');
const jwt = require("jsonwebtoken");

// Get Customer Data

const getDeliveryPersonList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;
        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM delivery_person_data`;
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
                const sql_query_getDetails = `SELECT 
                                                personId,
                                                personName,
                                                shortName,
                                                isAvailable
                                              FROM 
                                                delivery_person_data
                                              LIMIT ${limit}`;
                pool.query(sql_query_getDetails, (err, rows, fields) => {
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
                });
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Person API

const addDeliveryPerson = async (req, res) => {
    try {
        const uid1 = new Date();
        const personId = String("person_" + uid1.getTime());

        const data = {
            personName: req.body.personName ? req.body.personName : null,
            shortName: req.body.shortName ? req.body.shortName : null,
            isAvailable: req.body.isAvailable ? req.body.isAvailable : true,
        }
        if (!data.personName || !data.shortName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            pool.query(`SELECT shortName FROM delivery_person_data WHERE shortName = '${data.shortName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Short Name is Already In Use');
                } else {
                    const sql_querry_addCategory = `INSERT INTO delivery_person_data (personId, personName, shortName, isAvailable)  
                                                    VALUES ('${personId}','${data.personName}', '${data.shortName}', ${data.isAvailable})`;
                    pool.query(sql_querry_addCategory, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Person Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Person API

const removeDeliveryPerson = async (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const personId = req.query.personId.trim();
                req.query.personId = pool.query(`SELECT personId FROM delivery_person_data WHERE personId = '${personId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM delivery_person_data WHERE personId = '${personId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Person Deleted Successfully");
                        })
                    } else {
                        return res.send('PersonId Not Found');
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

// Update Person API

const updateDeliveryPerson = async (req, res) => {
    try {
        const data = {
            personId: req.body.personId.trim(),
            personName: req.body.personName ? req.body.personName : null,
            shortName: req.body.shortName ? req.body.shortName : null,
            isAvailable: req.body.isAvailable,
        }
        if (!data.personId || !data.personName || !data.shortName) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            pool.query(`SELECT shortName FROM delivery_person_data WHERE shortName = '${data.shortName}' AND personId != '${data.personId}'`, function (err, row) {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                } else if (row && row.length) {
                    return res.status(400).send('Short Name is Already In Use');
                } else {
                    const sql_querry_updatedetails = `UPDATE    
                                                        delivery_person_data 
                                                      SET
                                                         personName = '${data.personName}',
                                                         shortName = '${data.shortName}',
                                                         isAvailable = ${data.isAvailable}
                                                      WHERE personId = '${data.personId}'`;
                    pool.query(sql_querry_updatedetails, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Person Updated Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// DDL Person Data

const ddlPersonData = (req, res) => {
    try {
        const sql_querry_getddlCategory = `SELECT personId, personName FROM delivery_person_data WHERE isAvailable = 1`;
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
    getDeliveryPersonList,
    addDeliveryPerson,
    removeDeliveryPerson,
    updateDeliveryPerson,
    ddlPersonData
}