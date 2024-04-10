const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { generateToken } = require('../../utils/genrateToken');

// Get User API

const getUserDetails = async (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const userRights = decoded.id.rights;
            if (userRights == 1) {
                const page = req.query.page;
                const numPerPage = req.query.numPerPage;
                const skip = (page - 1) * numPerPage;
                const limit = skip + ',' + numPerPage;
                sql_querry_getdetails = `SELECT count(*) as numRows FROM user_details  WHERE user_details.userId NOT IN ('${userId}')`;
                pool.query(sql_querry_getdetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    } else {
                        const numRows = rows[0].numRows;
                        const numPages = Math.ceil(numRows / numPerPage);
                        pool.query(`SELECT userId, CONCAT(userFirstName,' ',userLastName) AS userFullName, userGender, userName, password, emailAddress, user_rights.rightsName FROM user_details
                                    INNER JOIN user_rights ON user_rights.rightsId = user_details.userRights
                                    WHERE user_details.userId NOT IN ('${userId}')
                                    ORDER BY user_rights.positionNumber LIMIT ` + limit, (err, rows, fields) => {
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

            } else {
                return res.status(400).send('Unauthorised Person');
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

// User Login API

const authUser = async (req, res) => {
    try {
        const user = {
            userName: req.body.userName,
            Password: req.body.Password
        }
        console.log(">>>", user);
        const sql_querry_authuser = `SELECT * FROM user_details WHERE userName = '${user.userName}'`;
        pool.query(sql_querry_authuser, (err, data) => {
            if (err) {
                process.exit(1);
                // console.error("An error occurd in SQL Queery", err);
                // return res.status(500).send('Database Error');
            }
            // console.log("<<<",data[0].agentPassword === user.agentPassword,data,user.agentPassword)
            if (data[0] && data[0].password == user.Password) {
                res.json({
                    userId: data[0].userId,
                    userRights: data[0].userRights,
                    userName: data[0].userFirstName + " " + data[0].userLastName,
                    token: generateToken({ id: data[0].userId, rights: data[0].userRights }),
                });
                console.log("??", generateToken({ id: data[0].userId, rights: data[0].userRights }), new Date().toLocaleString());
            }
            else {
                res.status(400);
                res.send("Invalid Email or Password");
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Rights DDL API

const ddlRights = (req, res) => {
    try {
        sql_querry_ddlRights = `SELECT rightsId, rightsName FROM user_rights ORDER BY positionNumber`;
        pool.query(sql_querry_ddlRights, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).json(data);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add User API

const addUserDetails = async (req, res) => {
    try {

        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userRights = decoded.id.rights;
            if (userRights == 1) {
                const uid1 = new Date();
                const id = String("user_" + uid1.getTime());
                console.log("...", id);

                const data = {
                    userFirstName: req.body.userFirstName.trim(),
                    userLastName: req.body.userLastName.trim(),
                    userGender: req.body.userGender.trim(),
                    userName: req.body.userName.trim(),
                    password: req.body.password.trim(),
                    emailId: req.body.emailId ? req.body.emailId.trim() : null,
                    userRights: req.body.userRights
                }
                if (!data.userFirstName || !data.userLastName || !data.userGender || !data.userName || !data.password || !data.userRights) {
                    res.status(400);
                    res.send("Please Fill all the feilds")
                } else {
                    req.body.userName = pool.query(`SELECT userName FROM user_details WHERE userName = '${data.userName}'`, function (err, row) {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        if (row && row.length) {
                            return res.status(400).send('userName is Already In Use');
                        } else {
                            const sql_querry_addUser = `INSERT INTO user_details (userId, userFirstName, userLastName, userGender, userName, password, emailAddress, userRights)  
                                                 VALUES ('${id}','${data.userFirstName}','${data.userLastName}','${data.userGender}','${data.userName}','${data.password}',NULLIF('${data.emailId}','null'),${data.userRights})`;
                            pool.query(sql_querry_addUser, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                return res.status(200).send("User Added Successfully");
                            })
                        }
                    })
                }
            } else {
                return res.status(400).send('Unauthorised Person');
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

// Remove User API

const removeUserDetails = async (req, res) => {

    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userRights = decoded.id.rights;
            if (userRights == 1) {
                userId = req.query.userId
                req.query.userId = pool.query(`SELECT userId FROM user_details WHERE userId= '${userId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM user_details WHERE userId = '${userId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("User Deleted Successfully");
                        })
                    } else {
                        return res.status(400).send('user is Already Deleted');
                    }
                })
            } else {
                return res.status(400).send('Unauthorised Person');
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

// Fill User For Update 

const fillUserDetails = (req, res) => {
    try {
        const userId = req.query.userId
        sql_querry_fillUser = `SELECT userId, userFirstName, userLastName, userGender ,userName, password, emailAddress, userRights FROM user_details WHERE userId = '${userId}'`;
        pool.query(sql_querry_fillUser, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data[0]);
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
}

// Update User API

const updateUserDetails = async (req, res) => {
    try {

        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userRights = decoded.id.rights;
            if (userRights == 1) {
                const data = {
                    userId: req.body.userId,
                    userFirstName: req.body.userFirstName.trim(),
                    userLastName: req.body.userLastName.trim(),
                    userGender: req.body.userGender.trim(),
                    userName: req.body.userName.trim(),
                    password: req.body.password.trim(),
                    emailId: req.body.emailId ? req.body.emailId.trim() : null,
                    userRights: req.body.userRights
                }
                const sql_querry_updatedetails = `UPDATE user_details SET userFirstName = '${data.userFirstName}',
                                                                  userLastName = '${data.userLastName}',
                                                                  userGender = '${data.userGender}',
                                                                  userName = '${data.userName}',
                                                                  password = '${data.password}',
                                                                  emailAddress = NULLIF('${data.emailId}','null'),
                                                                  userRights = ${data.userRights} 
                                                            WHERE userId = '${data.userId}'`;
                pool.query(sql_querry_updatedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("User Updated Successfully");
                })
            } else {
                return res.status(400).send('Unauthorised Person');
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
    authUser,
    getUserDetails,
    ddlRights,
    addUserDetails,
    removeUserDetails,
    updateUserDetails,
    fillUserDetails
}