const pool = require('../../database');
const jwt = require("jsonwebtoken");

// add Leave Api

const addEmployeeLeave = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const leaveId = "leave_" + Math.random().toString(36).substring(2, 15);
            const data = {
                employeeId: req.body.employeeId,
                numLeave: req.body.numLeave,
                leaveReason: req.body.leaveReason ? req.body.leaveReason.trim() : null,
                leaveDate: new Date(req.body.leaveDate ? req.body.leaveDate : "10/10/1001").toString().slice(4, 15)
            }
            console.log('//', data);
            if (!data.employeeId || !data.numLeave || !data.leaveDate) {
                return res.status(400).send("Please Fill all the feilds")
            }
            sql_query_addLeave = `INSERT INTO staff_leave_data(
                                                                    leaveId,
                                                                    userId,
                                                                    employeeId,
                                                                    numLeave,
                                                                    leaveReason,
                                                                    leaveDate
                                                                )
                                                                VALUES(
                                                                    '${leaveId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                    ${data.numLeave},
                                                                    NULLIF('${data.leaveReason}','null'),
                                                                    STR_TO_DATE('${data.leaveDate}','%b %d %Y')
                                                                )`;
            pool.query(sql_query_addLeave, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                return res.status(200).send("Data Added Successfully");
            })
        } else {
            res.status(401).send("Please Login Firest.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add leave For All Active Employee

const addLeaveForAllEployee = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const numLeave = req.body.numLeave
            const leaveReason = req.body.leaveReason ? req.body.leaveReason.trim() : null;
            const leaveDate = new Date(req.body.leaveDate ? req.body.leaveDate : "10/10/1001").toString().slice(4, 15)

            sql_query_getAllActiveEmployeeId = `SELECT employeeId FROM staff_employee_data WHERE employeeStatus = 1`;
            pool.query(sql_query_getAllActiveEmployeeId, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const employeeIdsArray = data.map(item => item.employeeId);
                console.log('><><', employeeIdsArray);
                const addAllLeave = () => {

                    var string = ''
                    employeeIdsArray.forEach((data, index) => {
                        const leaveId = "leave_" + Math.random().toString(36).substring(2, 15);

                        if (index == 0)
                            string = "(" + "'" + leaveId + "'" + "," + "'" + userId + "'" + "," + string + "'" + data + "'" + "," + numLeave + "," + 'NULLIF(' + "'" + leaveReason + "'" + ',' + "'" + 'null' + "'" + ')' + "," + "STR_TO_DATE('" + leaveDate + "','%b %d %Y')" + ")";
                        else
                            string = string + ",(" + "'" + leaveId + "'" + "," + "'" + userId + "'" + "," + "'" + data + "'" + "," + numLeave + "," + 'NULLIF(' + "'" + leaveReason + "'" + ',' + "'" + 'null' + "'" + ')' + "," + "STR_TO_DATE('" + leaveDate + "','%b %d %Y')" + ")";
                    });
                    return string;

                }
                console.log(">?>?>/////", addAllLeave())
                sql_query_addLeave = `INSERT INTO staff_leave_data (leaveId, userId, employeeId, numLeave, leaveReason, leaveDate) VALUES ${addAllLeave()}`
                pool.query(sql_query_addLeave, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send('Leaves Add Success Fully');
                })
            })
        } else {
            res.status(401).send("Please Login First.....!");
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    addEmployeeLeave,
    addLeaveForAllEployee
}

