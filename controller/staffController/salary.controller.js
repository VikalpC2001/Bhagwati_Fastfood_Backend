const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { generateToken } = require('../../utils/genrateToken');
const { calculateDueSalary } = require('../staffController/employee.controller');

// ADD Salary, Fine and Advance

const addAmountOfSFA = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const userRights = decoded.id.rights;
            if (userRights == 1) {
                const uid1 = new Date();
                const salaryId = String("salary_" + uid1.getTime());
                const cutFine = String("cutFine_" + uid1.getTime());
                const cutAdvance = String("cutAdvance_" + uid1.getTime());
                const advanceId = String("advance_" + uid1.getTime());
                const fineId = String("fine_" + uid1.getTime());
                const data = {
                    employeeId: req.body.employeeId,
                    payAmount: req.body.payAmount,
                    amountType: req.body.amountType,
                    comment: req.body.comment ? req.body.comment.trim() : null,
                    amountDate: new Date(req.body.amountDate ? req.body.amountDate : "10/10/1001").toString().slice(4, 15)
                }
                console.log('//', data);
                if (!data.employeeId || 0 > data.payAmount || !data.amountType || !data.amountDate) {
                    return res.status(400).send("Please Fill all the feilds")
                }
                if (req.body.amountType == '1') {
                    sql_querry_getFinedetail = `SELECT monthlySalaryId, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                    pool.query(sql_querry_getFinedetail, (err, datas) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const msData = Object.values(JSON.parse(JSON.stringify(datas)));

                        const salaryOutData = [
                            { monthlySalaryId: 1, paySalaryAmount: 100 }
                        ];
                        const desiredSalaryAmount = salaryOutData[0].paySalaryAmount;
                        console.log("?????", desiredSalaryAmount);

                        // Calculate total Salary out price
                        let remainingSalary = desiredSalaryAmount;

                        // Sort Salary in data by Salary in price in ascending order
                        const sortedmsData = msData
                        for (const salaryOut of salaryOutData) {
                            let paySalaryAmount = salaryOut.paySalaryAmount;

                            for (const salaryIn of sortedmsData) {
                                const { remainSalary } = salaryIn;

                                if (remainSalary > 0) {
                                    const salaryToUse = Math.min(paySalaryAmount, remainSalary, remainingSalary);

                                    remainingSalary -= salaryToUse;
                                    paySalaryAmount -= salaryToUse;
                                    salaryIn.remainSalary -= salaryToUse;
                                    if (remainingSalary <= 0) {
                                        break;
                                    }
                                }
                            }
                            if (remainingSalary <= 0) {
                                break;
                            }
                        }
                        // Print updated msData
                        console.log("Updated msData:", msData);

                        function generateUpdateQuery(data) {
                            let query = 'UPDATE staff_monthlySalary_data\nSET remainSalary = CASE\n';

                            data.forEach((item) => {
                                const { monthlySalaryId, remainSalary } = item;
                                query += `    WHEN monthlySalaryId = '${monthlySalaryId}' THEN ${remainSalary}\n`;
                            });

                            query += '    ELSE remainSalary\nEND\n';

                            const monthlySalaryIds = data.map((item) => `'${item.monthlySalaryId}'`).join(', ');
                            query += `WHERE fineId IN (${monthlySalaryIds});`;

                            return query;
                        }
                    })
                }
                // calculateDueSalary(data.employeeId)
                //     .then((allSalaryData) => {

                //         const salaryAmtWOAdv = allSalaryData.totalSalary + allSalaryData.sumOfLeaveSalary - data.payAmount;
                //         const remainSalaryAmtWOAdv = salaryAmtWOAdv - allSalaryData.fineAmount;
                //     })
                if (req.body.amountType == '1') {
                    if (allSalaryData.fineAmount > 0) {
                        if (salaryAmtWOAdv < allSalaryData.fineAmount && salaryAmtWOAdv != allSalaryData.fineAmount) {
                            sql_querry_getFinedetail = `SELECT fineId, remainFineAmount AS remainFine FROM staff_fine_data WHERE employeeId = '${data.employeeId}' AND remainFineAmount != 0 ORDER BY fineDate ASC`;
                            pool.query(sql_querry_getFinedetail, (err, datas) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                const fineData = Object.values(JSON.parse(JSON.stringify(datas)));
                                const fineOutData = [
                                    { fineId: 1, payFineAmount: salaryAmtWOAdv }
                                ];
                                const desiredFineAmount = fineOutData[0].payFineAmount;
                                console.log("?????", desiredFineAmount);

                                // Calculate total Fine out price
                                let remainingFine = desiredFineAmount;

                                // Sort Fine in data by Fine in price in ascending order
                                const sortedfineData = fineData
                                for (const fineOut of fineOutData) {
                                    let payFineAmount = fineOut.payFineAmount;

                                    for (const fineIn of sortedfineData) {
                                        const { remainFine } = fineIn;

                                        if (remainFine > 0) {
                                            const quantityToUse = Math.min(payFineAmount, remainFine, remainingFine);

                                            remainingFine -= quantityToUse;
                                            payFineAmount -= quantityToUse;
                                            fineIn.remainFine -= quantityToUse;
                                            if (remainingFine <= 0) {
                                                break;
                                            }
                                        }
                                    }
                                    if (remainingFine <= 0) {
                                        break;
                                    }
                                }
                                // Print updated fineData
                                console.log("Updated fineData:", fineData);
                                const swFId = fineData.map((obj) => {
                                    return obj.fineId;
                                })
                                const sallaryWiseFineId = () => {

                                    var string = ''
                                    swFId.forEach((data, index) => {
                                        if (index == 0)
                                            string = "(" + "'" + cutFine + "'" + "," + string + "'" + data + "'" + ")";
                                        else
                                            string = string + ",(" + "'" + cutFine + "'" + "," + "'" + data + "'" + ")";
                                    });
                                    return string;

                                }
                                console.log(">?>?>/////", sallaryWiseFineId())
                                let sumOfRemainFine = 0;
                                fineData.forEach((item) => {
                                    sumOfRemainFine += item.remainFine;
                                });

                                console.log("Sum of remainFine:", sumOfRemainFine)
                                const updateQuery = generateUpdateQuery(fineData);
                                pool.query(updateQuery, (err, result) => {
                                    if (err) {
                                        console.error("An error occurred while updating fineData", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    const totalCutamountOffine = allSalaryData.fineAmount - sumOfRemainFine;
                                    sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${cutFine}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${totalCutamountOffine},
                                                                    'Fine Cut',
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseFineId_data (salaryId, fineId) VALUES ${sallaryWiseFineId()}`;
                                    pool.query(sql_query_addDetail, (err, add) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }

                                        console.log('Advance CutOff');
                                    })

                                    console.log("FineData updated successfully:");

                                    // Here you can continue with the rest of your code or send the response to the client if this is part of an API endpoint.
                                });

                                function generateUpdateQuery(data) {
                                    let query = 'UPDATE staff_fine_data\nSET remainFineAmount = CASE\n';

                                    data.forEach((item) => {
                                        const { fineId, remainFine } = item;
                                        query += `    WHEN fineId = '${fineId}' THEN ${remainFine}\n`;
                                    });

                                    query += '    ELSE remainFineAmount\nEND\n';

                                    const fineIds = data.map((item) => `'${item.fineId}'`).join(', ');
                                    query += `WHERE fineId IN (${fineIds});`;

                                    return query;
                                }
                            })
                        } else {
                            sql_query_allZeroRemainFine = `SELECT
                                                                        COALESCE(fineId, NULL)
                                                                    FROM
                                                                        staff_fine_data
                                                                    WHERE
                                                                        employeeId = '${data.employeeId}' AND remainFineAmount != 0;
                                                                  UPDATE
                                                                        staff_fine_data
                                                                    SET
                                                                        remainFineAmount = 0
                                                                    WHERE
                                                                        fineId IN(
                                                                            SELECT
                                                                                COALESCE(fineId, NULL)
                                                                            FROM
                                                                                staff_fine_data
                                                                            WHERE
                                                                                employeeId = '${data.employeeId}' AND remainFineAmount != 0
                                                                        )`;
                            pool.query(sql_query_allZeroRemainFine, (err, result) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                console.log(result[0])
                                const allFineId = result[0];
                                const swFId = allFineId.map((obj) => {
                                    return obj.fineId;
                                })
                                const sallaryWiseAllFineId = () => {

                                    var string = ''
                                    swFId.forEach((data, index) => {
                                        if (index == 0)
                                            string = "(" + "'" + cutFine + "'" + "," + string + "'" + data + "'" + ")";
                                        else
                                            string = string + ",(" + "'" + cutFine + "'" + "," + "'" + data + "'" + ")";
                                    });
                                    return string;

                                }
                                console.log('><><><', sallaryWiseAllFineId());
                                sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${cutFine}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${allSalaryData.fineAmount},
                                                                    'Fine Cut',
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseFineId_data (salaryId, fineId) VALUES ${sallaryWiseAllFineId()}`
                                pool.query(sql_query_addDetail, (err, add) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    console.log('Fine CutOff');
                                })
                            })
                        }
                    }
                    if (allSalaryData.advanceAmount > 0) {
                        if (remainSalaryAmtWOAdv < allSalaryData.advanceAmount && remainSalaryAmtWOAdv != allSalaryData.advanceAmount) {
                            sql_querry_getAdvanceDetails = `SELECT advanceId, remainAdvanceAmount AS remainAdvance FROM staff_advance_data WHERE employeeId = '${data.employeeId}' AND remainAdvanceAmount != 0 ORDER BY advanceDate ASC`;
                            pool.query(sql_querry_getAdvanceDetails, (err, datas) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                const advanceData = Object.values(JSON.parse(JSON.stringify(datas)));
                                const advanceOutData = [
                                    { payAdvanceAmount: remainSalaryAmtWOAdv }
                                ];
                                const desiredAdvanceAmount = advanceOutData[0].payAdvanceAmount;
                                console.log("?????", desiredAdvanceAmount);

                                // Calculate total Advance out price
                                let remainingAdvance = desiredAdvanceAmount;

                                // Sort Advance in data by Advance in price in ascending order
                                const sortedadvanceData = advanceData
                                for (const advanceOut of advanceOutData) {
                                    let payAdvanceAmount = advanceOut.payAdvanceAmount;

                                    for (const AdvanceIn of sortedadvanceData) {
                                        const { remainAdvance } = AdvanceIn;

                                        if (remainAdvance > 0) {
                                            const quantityToUse = Math.min(payAdvanceAmount, remainAdvance, remainingAdvance);

                                            remainingAdvance -= quantityToUse;
                                            payAdvanceAmount -= quantityToUse;
                                            AdvanceIn.remainAdvance -= quantityToUse;

                                            if (remainingAdvance <= 0) {
                                                break;
                                            }
                                        }
                                    }
                                    if (remainingAdvance <= 0) {
                                        break;
                                    }
                                }

                                // Print updated advanceData
                                console.log("Updated advanceData:", advanceData);
                                const swAId = advanceData.map((obj) => {
                                    return obj.advanceId;
                                })
                                const sallaryWiseAdvanceId = () => {

                                    var string = ''
                                    swAId.forEach((data, index) => {
                                        if (index == 0)
                                            string = "(" + "'" + cutAdvance + "'" + "," + string + "'" + data + "'" + ")";
                                        else
                                            string = string + ",(" + "'" + cutAdvance + "'" + "," + "'" + data + "'" + ")";
                                    });
                                    return string;

                                }
                                console.log(">?>?>/////", sallaryWiseAdvanceId())
                                let sumOfUpdatedadvanceRemain = 0;
                                advanceData.forEach((item) => {
                                    sumOfUpdatedadvanceRemain += item.remainAdvance;
                                });

                                console.log("Sum of prevaios advanceFine:", sumOfUpdatedadvanceRemain)
                                const updateQuery = generateUpdateQuery(advanceData);
                                pool.query(updateQuery, (err, result) => {
                                    if (err) {
                                        console.error("An error occurred while updating fineData", err);
                                        return res.status(500).send('Database Error');
                                    }

                                    console.log("AdvanceData updated successfully:");

                                    const totalCutamountOffAdvance = allSalaryData.advanceAmount - sumOfUpdatedadvanceRemain;
                                    sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${cutAdvance}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${totalCutamountOffAdvance},
                                                                    'Advance Cut',
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseAdvanceId_data (salaryId, advanceId) VALUES ${sallaryWiseAdvanceId()}`
                                    pool.query(sql_query_addDetail, (err, add) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
                                        console.log('Advance CutOff');
                                    })
                                });

                                function generateUpdateQuery(data) {
                                    let query = 'UPDATE staff_advance_data\nSET remainAdvanceAmount = CASE\n';

                                    data.forEach((item) => {
                                        const { advanceId, remainAdvance } = item;
                                        query += `    WHEN advanceId = '${advanceId}' THEN ${remainAdvance}\n`;
                                    });

                                    query += '    ELSE remainAdvanceAmount\nEND\n';

                                    const advanceIds = data.map((item) => `'${item.advanceId}'`).join(', ');
                                    query += `WHERE advanceId IN (${advanceIds});`;

                                    return query;
                                }
                            })
                        } else {
                            sql_query_allZeroRemainFine = `SELECT
                                                                        advanceId
                                                                    FROM
                                                                        staff_advance_data
                                                                    WHERE
                                                                        employeeId = '${data.employeeId}' AND remainAdvanceAmount != 0;
                                                                UPDATE
                                                                    staff_advance_data
                                                                SET
                                                                    remainAdvanceAmount = 0
                                                                WHERE
                                                                advanceId IN(
                                                                    SELECT
                                                                        COALESCE(advanceId, NULL)
                                                                    FROM
                                                                        staff_advance_data
                                                                    WHERE
                                                                        employeeId = '${data.employeeId}' AND remainAdvanceAmount != 0
                                                                    )`;
                            pool.query(sql_query_allZeroRemainFine, (err, result) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                console.log(result[0])
                                const allAdvanceId = result[0];
                                const swAId = allAdvanceId.map((obj) => {
                                    return obj.advanceId;
                                })
                                const sallaryWiseAllAdvanceId = () => {

                                    var string = ''
                                    swAId.forEach((data, index) => {
                                        if (index == 0)
                                            string = "(" + "'" + cutAdvance + "'" + "," + string + "'" + data + "'" + ")";
                                        else
                                            string = string + ",(" + "'" + cutAdvance + "'" + "," + "'" + data + "'" + ")";
                                    });
                                    return string;

                                }
                                console.log('><><><', sallaryWiseAllAdvanceId());
                                sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${cutAdvance}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${allSalaryData.advanceAmount},
                                                                    'Advance Pay',
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseAdvanceId_data (salaryId, advanceId) VALUES ${sallaryWiseAllAdvanceId()}`;
                                pool.query(sql_query_addDetail, (err, add) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    console.log('All Advance Is Done');
                                })
                            })
                        }
                    }
                }
                sql_update_lastPaymentDate = `UPDATE
                                                            staff_employee_data
                                                        SET

                                                            employeeLastPaymentDate = CURDATE()
                                                        WHERE
                                                            employeeId = '${data.employeeId}'`;
                pool.query(sql_update_lastPaymentDate, (err, updateLpd) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    console.log('Date Updated');
                })
                if (allSalaryData.paymentDue >= 0 && allSalaryData.paymentDue == req.body.payAmount && req.body.amountType == '1') {
                    sql_update_joinIngDate = `UPDATE
                                                            staff_employee_data
                                                        SET
                                                            employeeJoiningDate = DATE_FORMAT(CURDATE(), '%Y-%m-01'),
                                                            totalSalary = 0
                                                        WHERE
                                                            employeeId = '${data.employeeId}'`;
                    pool.query(sql_update_joinIngDate, (err, update) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        console.log('Joining Date Updated');
                    })
                } else if (allSalaryData.paymentDue < 0 && req.body.amountType == '1') {
                    sql_update_joinIngDate = `UPDATE
                                                            staff_employee_data
                                                        SET
                                                            employeeJoiningDate = DATE_FORMAT(CURDATE(), '%Y-%m-01'),
                                                            totalSalary = 0
                                                        WHERE
                                                            employeeId = '${data.employeeId}'`;
                    pool.query(sql_update_joinIngDate, (err, update) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        console.log('Joining Date Updated');
                    })
                }
                if (data.payAmount != 0) {
                    if (req.body.amountType == '1') {
                        sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${salaryId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${data.payAmount},
                                                                    'Salary Pay',
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                )`
                    } else if (req.body.amountType == '2') {
                        sql_query_addDetail = `INSERT INTO staff_advance_data(
                                                                    advanceId,
                                                                    userId,
                                                                    employeeId,
                                                                    advanceAmount,
                                                                    remainAdvanceAmount,
                                                                    advanceComment,
                                                                    advanceDate
                                                                )
                                                                VALUES(
                                                                   '${advanceId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${data.payAmount},
                                                                     ${data.payAmount},
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                )`
                    } else if (req.body.amountType == '3') {
                        sql_query_addDetail = `INSERT INTO staff_fine_data(
                                                                    fineId,
                                                                    userId,
                                                                    employeeId,
                                                                    fineAmount,
                                                                    remainFineAmount,
                                                                    reason,
                                                                    fineDate
                                                                )
                                                                VALUES(
                                                                    '${fineId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${data.payAmount},
                                                                     ${data.payAmount},
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                )`;
                    } else {
                        return res.status(400).send("Please Select Amount Type");
                    }
                } else {
                    return res.status(200).send("Data Added Successfully");
                }
                console.log('hyyy',)
                pool.query(sql_query_addDetail, (err, data) => {
                    console.log('hyyy', sql_query_addDetail);
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Data Added Successfully");
                })

                    .catch((error) => {
                        console.error("Error:", error);
                    });
            } else {
                return res.status(400).send('Unauthorised Person');
            }
        } else {
            res.status(401).send("Please Login Firest.....!");
        }

    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// add Leave Api

const addEmployeeLeave = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const leaveId = String("leave_" + uid1.getTime());
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


module.exports = {
    addAmountOfSFA,
    addEmployeeLeave
}