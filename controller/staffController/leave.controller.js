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
            const statusId = String("regular_" + uid1.getTime());
            const data = {
                employeeId: req.body.employeeId,
                numLeave: req.body.numLeave,
                leaveReason: req.body.leaveReason ? req.body.leaveReason.trim() : null,
                leaveDate: new Date(req.body.leaveDate ? req.body.leaveDate : "10/10/1001").toString().slice(4, 15)
            }
            console.log('//', data);
            if (!data.employeeId || !data.numLeave || !data.leaveDate || !data.leaveReason) {
                return res.status(400).send("Please Fill all the feilds")
            }
            sql_query_addLeave = `INSERT INTO staff_leave_data(
                                                                    leaveId,
                                                                    userId,
                                                                    employeeId,
                                                                    numLeave,
                                                                    leaveReason,
                                                                    leaveStatus,
                                                                    leaveDate
                                                                )
                                                                VALUES(
                                                                    '${leaveId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                    ${data.numLeave},
                                                                    NULLIF('${data.leaveReason}','null'),
                                                                    '${statusId}',
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

const addLeaveForAllEmployee = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const holidayId = String("holiday_" + uid1.getTime());
            const numLeave = req.body.numLeave
            const leaveReason = req.body.leaveReason ? req.body.leaveReason.trim() : null;
            const leaveDate = new Date(req.body.leaveDate ? req.body.leaveDate : "10/10/1001").toString().slice(4, 15);

            if (!numLeave || !leaveReason || !leaveDate) {
                return res.status(400).send("Please Fill all the feilds")
            }

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
                            string = "(" + "'" + leaveId + "'" + "," + "'" + userId + "'" + "," + string + "'" + data + "'" + "," + numLeave + "," + 'NULLIF(' + "'" + leaveReason + "'" + ',' + "'" + 'null' + "'" + ')' + "," + "'" + holidayId + "'" + "," + "STR_TO_DATE('" + leaveDate + "','%b %d %Y')" + ")";
                        else
                            string = string + ",(" + "'" + leaveId + "'" + "," + "'" + userId + "'" + "," + "'" + data + "'" + "," + numLeave + "," + 'NULLIF(' + "'" + leaveReason + "'" + ',' + "'" + 'null' + "'" + ')' + "," + "'" + holidayId + "'" + "," + "STR_TO_DATE('" + leaveDate + "','%b %d %Y')" + ")";
                    });
                    return string;

                }
                console.log(">?>?>/////", addAllLeave())
                sql_query_addLeave = `
                INSERT INTO staff_holiday_data(holidayId, userId, numLeave, holidayReason, holidayDate)
                VALUES('${holidayId}', '${userId}', ${numLeave}, NULLIF('${leaveReason}','null'), STR_TO_DATE('${leaveDate}','%b %d %Y'));
                INSERT INTO staff_leave_data (leaveId, userId, employeeId, numLeave, leaveReason, leaveStatus, leaveDate) VALUES ${addAllLeave()}`;
                pool.query(sql_query_addLeave, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send('Holiday Add Success Fully');
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

// Remove Leave

const removeEmployeeLeave = (req, res) => {
    try {
        const leaveId = req.query.leaveId;

        // Get the leave entry from the database
        pool.query(`SELECT leaveId, leaveDate FROM staff_leave_data WHERE leaveId = '${leaveId}'`, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Query", err);
                return res.status(500).send('Database Error');
            }

            if (rows && rows.length) {
                // Check if the leave date is in the current month
                const leaveDate = new Date(rows[0].leaveDate);
                const currentDate = new Date();

                if (leaveDate.getMonth() === currentDate.getMonth() && leaveDate.getFullYear() === currentDate.getFullYear()) {
                    // Delete the leave entry because it's in the current month
                    const sqlQueryRemoveDetails = `DELETE FROM staff_leave_data WHERE leaveId = '${leaveId}'`;
                    pool.query(sqlQueryRemoveDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Query", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Leave Deleted Successfully");
                    });
                } else {
                    return res.status(400).send('Leave is not in the current month');
                }
            } else {
                return res.status(400).send('Leave ID not found');
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Leave

const updateEmployeeLeave = (req, res) => {
    try {

        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const leaveId = req.body.leaveId;
            // Get the leave entry from the database
            pool.query(`SELECT leaveId, leaveDate FROM staff_leave_data WHERE leaveId = '${leaveId}'`, (err, rows) => {
                if (err) {
                    console.error("An error occurred in SQL Query", err);
                    return res.status(500).send('Database Error');
                }

                if (rows && rows.length) {
                    // Check if the leave date is in the current month
                    const leaveDate = new Date(rows[0].leaveDate);
                    const currentDate = new Date();

                    if (leaveDate.getMonth() === currentDate.getMonth() && leaveDate.getFullYear() === currentDate.getFullYear()) {
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
                        const sqlQueryUpdateDetails = `UPDATE
                                                            staff_leave_data
                                                        SET
                                                            userId = '${userId}',
                                                            employeeId = '${data.employeeId}',
                                                            numLeave = ${data.numLeave},
                                                            leaveReason = NULLIF('${data.leaveReason}','null'),
                                                            leaveDate =  STR_TO_DATE('${data.leaveDate}','%b %d %Y')
                                                        WHERE leaveId = '${leaveId}'`;
                        pool.query(sqlQueryUpdateDetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Query", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Leave Update Successfully");
                        });
                    } else {
                        return res.status(400).send('Leave is not in the current month');
                    }
                } else {
                    return res.status(400).send('Leave ID not found');
                }
            });
        } else {
            res.status(401).send("Please Login First.....!");
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Holiday

const removeEmployeeHoliday = (req, res) => {
    try {
        const holidayId = req.query.holidayId;

        if (!holidayId) {
            return res.status(400).send('HolidayId Not Found');
        }
        // Get the leave entry from the database
        pool.query(`SELECT holidayId, holidayDate FROM staff_holiday_data WHERE holidayId = '${holidayId}'`, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Query", err);
                return res.status(500).send('Database Error');
            }

            if (rows && rows.length) {
                // Check if the leave date is in the current month
                const leaveDate = new Date(rows[0].holidayDate);
                const currentDate = new Date();

                if (leaveDate.getMonth() === currentDate.getMonth() && leaveDate.getFullYear() === currentDate.getFullYear()) {
                    // Delete the leave entry because it's in the current month
                    const sqlQueryRemoveDetails = `DELETE FROM staff_leave_data WHERE staff_leave_data.leaveStatus = '${holidayId}';
                                                   DELETE FROM staff_holiday_data WHERE staff_holiday_data.holidayId = '${holidayId}'`;
                    pool.query(sqlQueryRemoveDetails, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Query", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Holiday Deleted Successfully");
                    });
                } else {
                    return res.status(400).send('Holiday is not in the current month');
                }
            } else {
                return res.status(400).send('HolidayId ID not found');
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}


module.exports = {
    addEmployeeLeave,
    addLeaveForAllEmployee,
    removeEmployeeLeave,
    updateEmployeeLeave,
    removeEmployeeHoliday
}

