const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { generateToken } = require('../../utils/genrateToken');
const { json } = require('express');

function generateMonthlyUpdateQuery(data) {
    let query = 'UPDATE staff_monthlySalary_data\nSET remainSalary = CASE\n';

    data.forEach((item) => {
        const { monthlySalaryId, remainSalary } = item;
        query += `    WHEN monthlySalaryId = '${monthlySalaryId}' THEN ROUND(${remainSalary})\n`;
    });

    query += '    ELSE remainSalary\nEND\n';

    const monthlySalaryIds = data.map((item) => `${item.monthlySalaryId}`).join(', ');
    query += `WHERE monthlySalaryId IN (${monthlySalaryIds});`;

    return query;
}

function generateAdvanceUpdateQuery(data) {
    let query = 'UPDATE staff_advance_data\nSET remainAdvanceAmount = CASE\n';

    data.forEach((item) => {
        const { advanceId, remainAdvance } = item;
        query += `    WHEN advanceId = '${advanceId}' THEN ROUND(${remainAdvance})\n`;
    });

    query += '    ELSE remainAdvanceAmount\nEND\n';

    const advanceIds = data.map((item) => `'${item.advanceId}'`).join(', ');
    query += `WHERE advanceId IN (${advanceIds});`;

    return query;
}

function generateFineUpdateQuery(data) {
    let query = 'UPDATE staff_fine_data\nSET remainFineAmount = CASE\n';

    data.forEach((item) => {
        const { fineId, remainFine } = item;
        query += `      WHEN fineId = '${fineId}' THEN ROUND(${remainFine})\n`;
    });

    query += '    ELSE remainFineAmount\nEND\n';

    const fineIds = data.map((item) => `'${item.fineId}'`).join(', ');
    query += `WHERE fineId IN (${fineIds});`;

    return query;
}

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
                const creditId = String("credit_" + uid1.getTime());
                const remainSalaryId = String("remainSalary_" + uid1.getTime());
                const bonusId = String("bonus_" + uid1.getTime());
                const InactivatedData = req.data;
                console.log('Inactivate', InactivatedData);
                console.log('body', req.body);


                const data = {
                    employeeId: InactivatedData && InactivatedData.employeeId ? InactivatedData.employeeId : req.body.employeeId,
                    payAmount: InactivatedData && InactivatedData.payAmount ? InactivatedData.payAmount : req.body.payAmount,
                    totalSalary: InactivatedData && InactivatedData.totalSalary ? InactivatedData.totalSalary : req.body.totalSalary,
                    fineAmount: InactivatedData && InactivatedData.fineAmount ? InactivatedData.fineAmount : req.body.fineAmount,
                    advanceAmount: InactivatedData && InactivatedData.advanceAmount ? InactivatedData.advanceAmount : req.body.advanceAmount,
                    paymentDue: InactivatedData && InactivatedData.paymentDue ? InactivatedData.paymentDue : req.body.paymentDue,
                    amountType: InactivatedData && InactivatedData.amountType ? InactivatedData.amountType : req.body.amountType,
                    comment: InactivatedData && InactivatedData.comment ? InactivatedData.comment : req.body.comment,
                    amountDate: InactivatedData && InactivatedData.amountDate ? InactivatedData.amountDate : new Date(req.body.amountDate).toString().slice(4, 15)
                }

                console.log('//', data);
                if (!data.employeeId || 0 > data.payAmount || !data.amountType || !data.amountDate) {
                    return res.status(400).send("Please Fill all the feilds")
                }

                const salaryAmtWOAdv = data.totalSalary - data.payAmount;
                const remainSalaryAmtWOAdv = salaryAmtWOAdv - data.fineAmount;

                if (req.body.amountType == '1') {
                    sql_querry_getMsdata = `SELECT remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC;
                                            SELECT remainAdvanceAmount FROM staff_advance_data WHERE employeeId = '${data.employeeId}' AND remainAdvanceAmount != 0 ORDER BY advanceDate ASC;
                                            SELECT remainFineAmount FROM staff_fine_data WHERE employeeId = '${data.employeeId}' AND fineStatus = 1 AND remainFineAmount != 0 ORDER BY fineDate ASC`;
                    pool.query(sql_querry_getMsdata, (err, msdata) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }

                        // Monthly Salary Last Remain Sum
                        const msdata1 = msdata[0];
                        const remainSalaryValues = msdata1.map(row => row.remainSalary);
                        console.log('vvvv', remainSalaryValues, remainSalaryValues != '');
                        const sumOfRemainSalaryValues = remainSalaryValues.reduce((total, currentValue) => total + currentValue, 0);

                        // Advance Last Remain Sum
                        const msdata2 = msdata[1];
                        const remainAdvanceValues = msdata2.map(row => row.remainAdvanceAmount);
                        const sumOfRemainAdvanceValues = remainAdvanceValues.reduce((total, currentValue) => total + currentValue, 0);

                        // Fine Salary Last Remain Sum
                        const msdata3 = msdata[2];
                        const remainFineValues = msdata3.map(row => row.remainFineAmount);
                        const sumOfRemainFineValues = remainFineValues.reduce((total, currentValue) => total + currentValue, 0);
                        if (remainSalaryValues != '') {
                            sql_querry_addRemainSlaryHistory = `INSERT INTO staff_remainSalaryHistory_data (
                                                                                                            remainSalaryId,
                                                                                                            employeeId,
                                                                                                            remainSalaryAmt,
                                                                                                            lastRemainAmt,
                                                                                                            remainAdvanceAmt,
                                                                                                            lastAdvanceAmt,
                                                                                                            remainFineAmt,
                                                                                                            lastFineAmt
                                                                                                        )
                                                                                                        VALUES(
                                                                                                            '${remainSalaryId}',
                                                                                                            '${data.employeeId}',
                                                                                                            ${sumOfRemainSalaryValues},
                                                                                                            ${remainSalaryValues[0] ? remainSalaryValues[0] : 0},
                                                                                                            ${sumOfRemainAdvanceValues},
                                                                                                            ${remainAdvanceValues[0] ? remainAdvanceValues[0] : 0},
                                                                                                            ${sumOfRemainFineValues},
                                                                                                            ${remainFineValues[0] ? remainFineValues[0] : 0}
                                                                                                        )`;
                        } else {
                            sql_querry_addRemainSlaryHistory = `SELECT remainSalaryAmt FROM staff_remainSalaryHistory_data`;
                        }

                        pool.query(sql_querry_addRemainSlaryHistory, (err, addData) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            console.log('remain Salary Added success');
                            if ((data.fineAmount > 0 || data.advanceAmount > 0) && salaryAmtWOAdv > 0) {
                                if (data.fineAmount > 0) {
                                    if (salaryAmtWOAdv <= data.fineAmount) {
                                        console.log('fine moto');
                                        sql_querry_getFinedetail = `SELECT fineId, fineAmount, remainFineAmount AS remainFine FROM staff_fine_data WHERE employeeId = '${data.employeeId}' AND fineStatus = 1 AND remainFineAmount != 0 ORDER BY fineDate ASC`;
                                        pool.query(sql_querry_getFinedetail, (err, datas) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                return res.status(500).send('Database Error');
                                            }
                                            const oldFineData = Object.values(JSON.parse(JSON.stringify(datas)));
                                            const fineData = Object.values(JSON.parse(JSON.stringify(datas)));
                                            const fineOutData = [
                                                { fineId: 1, payFineAmount: salaryAmtWOAdv }
                                            ];
                                            const desiredFineAmount = fineOutData[0].payFineAmount;
                                            console.log('jyare fine vadhare hoy tyare ni desiredAmount', desiredFineAmount);

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
                                            console.log("jyare fine vadhare hoy tyare malto Updated fineData:", fineData);
                                            const updatedFinedata = fineData.filter((obj) => {
                                                if (obj.remainFine != obj.fineAmount) {
                                                    return obj;
                                                }
                                            })
                                            const swFId = updatedFinedata.map((obj) => {
                                                if (obj.remainFine != obj.fineAmount) {
                                                    return obj.fineId;
                                                }
                                            })

                                            const remainingFineByIds = swFId.map(fineId => {
                                                const fineIds = oldFineData.find(item => item.fineId === fineId);
                                                return fineIds ? fineIds.remainFine : undefined;
                                            });

                                            const remainingFineByIds1 = swFId.map(fineId => {
                                                const fineIds = fineData.find(item => item.fineId === fineId);
                                                return fineIds ? fineIds.remainFine : undefined;
                                            });

                                            const remainFineAmt = remainingFineByIds.map((value, index) => value - remainingFineByIds1[index]);

                                            // Use map to combine the arrays and format them
                                            const combinedData = swFId.map((id, index) => `('${cutFine}','${id}',ROUND(${remainFineAmt[index]},2))`);

                                            // Join the array elements into a single string
                                            const sallaryWiseFineId = combinedData.join(',');

                                            // Output the resulting string
                                            console.log(sallaryWiseFineId);

                                            let sumOfRemainFine = 0;
                                            fineData.forEach((item) => {
                                                sumOfRemainFine += item.remainFine;
                                            });

                                            // console.log("Sum of remainFine:", sumOfRemainFine)
                                            const updateQuery = generateFineUpdateQuery(updatedFinedata);
                                            pool.query(updateQuery, (err, result) => {
                                                if (err) {
                                                    console.error("An error occurred while updating fineData", err);
                                                    return res.status(500).send('Database Error');
                                                }
                                                const totalCutamountOffine = data.fineAmount - sumOfRemainFine;
                                                sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    remainSalaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${cutFine}',
                                                                    '${remainSalaryId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${totalCutamountOffine},
                                                                    'Fine Cut',
                                                                    ${data.comment ? `'${data.comment}'` : null},
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseFineId_data (salaryId, fineId, cutFineAmount) VALUES ${sallaryWiseFineId}`;
                                                pool.query(sql_query_addDetail, (err, add) => {
                                                    if (err) {
                                                        console.error("An error occurd in SQL Queery", err);
                                                        return res.status(500).send('Database Error');
                                                    }
                                                    if (req.body.amountType == '1') {
                                                        sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                        pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                            if (err) {
                                                                console.error("An error occurd in SQL Queery", err);
                                                                return res.status(500).send('Database Error');
                                                            }
                                                            const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                            const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                            console.log('fine', msData);

                                                            const salaryOutData = [
                                                                { monthlySalaryId: 1, paySalaryAmount: salaryAmtWOAdv }
                                                            ];
                                                            const desiredSalaryAmount = salaryOutData[0].paySalaryAmount;
                                                            console.log('jyare fine vadhare hoy tyare ni desiredAmount', desiredFineAmount);
                                                            // console.log("?????", desiredSalaryAmount);

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

                                                            const updatedmsData = msData.filter((obj) => {
                                                                if (obj.remainSalary != obj.totalSalary) {
                                                                    return obj;
                                                                }
                                                            })
                                                            console.log("badho fine cut thaya pachi malti monthly salary,Updated msData:", updatedmsData);
                                                            const swMsId = updatedmsData.map((obj) => {
                                                                if (obj.remainSalary != obj.totalSalary) {
                                                                    return obj.monthlySalaryId;
                                                                }
                                                            })

                                                            const remainingSalaryByIds = swMsId.map(sId => {
                                                                const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                return salaryIds ? salaryIds.remainSalary : undefined;
                                                            });

                                                            const remainingSalaryByIds1 = swMsId.map(sId => {
                                                                const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                return salaryIds ? salaryIds.remainSalary : undefined;
                                                            });

                                                            const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                            // Use map to combine the arrays and format them
                                                            const combinedData = swMsId.map((id, index) => `('${cutFine}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                            // Join the array elements into a single string
                                                            const msWiseSid = combinedData.join(',');

                                                            // Output the resulting string
                                                            console.log(msWiseSid);

                                                            sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                            // console.log('><><', sql_querry_addmsFid)
                                                            pool.query(sql_querry_addmsFid, (err, result) => {
                                                                if (err) {
                                                                    console.error("An error occurred while updating msData", err);
                                                                    return res.status(500).send('Database Error');
                                                                }
                                                            })
                                                            const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                            pool.query(updateQuery, (err, result) => {
                                                                if (err) {
                                                                    console.error("An error occurred while updating msData", err);
                                                                    return res.status(500).send('Database Error');
                                                                }
                                                                else if (data.payAmount != 0 && req.body.amountType == '1') {
                                                                    sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                                    pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                        if (err) {
                                                                            console.error("An error occurd in SQL Queery", err);
                                                                            return res.status(500).send('Database Error');
                                                                        }
                                                                        const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                        const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                        console.log(msData);

                                                                        const salaryOutData = [
                                                                            { monthlySalaryId: 1, paySalaryAmount: data.payAmount }
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
                                                                        const updatedmsData = msData.filter((obj) => {
                                                                            if (obj.remainSalary != obj.totalSalary) {
                                                                                return obj;
                                                                            }
                                                                        })
                                                                        console.log('><', updatedmsData);
                                                                        const swFId = updatedmsData.map((obj) => {
                                                                            if (obj.remainSalary != obj.totalSalary) {
                                                                                return obj.monthlySalaryId;
                                                                            }
                                                                        })

                                                                        const remainingSalaryByIds = swFId.map(sId => {
                                                                            const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                            return salaryIds ? salaryIds.remainSalary : undefined;
                                                                        });

                                                                        const remainingSalaryByIds1 = swFId.map(sId => {
                                                                            const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                            return salaryIds ? salaryIds.remainSalary : undefined;
                                                                        });

                                                                        const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                                        // Use map to combine the arrays and format them
                                                                        const combinedData = swFId.map((id, index) => `('${salaryId}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                                        // Join the array elements into a single string
                                                                        const msWiseSid = combinedData.join(',');

                                                                        // Output the resulting string
                                                                        console.log(msWiseSid);

                                                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryId) VALUES ${msWiseSid}`
                                                                        pool.query(sql_querry_addmsFid, (err, result) => {
                                                                            if (err) {
                                                                                console.error("An error occurred while updating msData", err);
                                                                                return res.status(500).send('Database Error');
                                                                            }
                                                                        })
                                                                        const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                                        pool.query(updateQuery, (err, result) => {
                                                                            if (err) {
                                                                                console.error("An error occurred while updating msData", err);
                                                                                return res.status(500).send('Database Error');
                                                                            }
                                                                        })
                                                                    })
                                                                }
                                                            })
                                                        })
                                                    }
                                                    // console.log('Advance CutOff');
                                                })
                                                // console.log("FineData updated successfully:");

                                                // Here you can continue with the rest of your code or send the response to the client if this is part of an API endpoint.
                                            });
                                        })
                                    } else {
                                        console.log('fine nano')
                                        sql_query_allZeroRemainFine = `SELECT
                                                                        COALESCE(fineId, NULL) AS fineId, remainFineAmount
                                                                    FROM
                                                                        staff_fine_data
                                                                    WHERE
                                                                        employeeId = '${data.employeeId}' AND fineStatus = 1 AND remainFineAmount != 0;
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
                                                                                employeeId = '${data.employeeId}' AND fineStatus = 1 AND remainFineAmount != 0
                                                                        )`;
                                        pool.query(sql_query_allZeroRemainFine, (err, result) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                return res.status(500).send('Database Error');
                                            }
                                            sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                            pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                if (err) {
                                                    console.error("An error occurd in SQL Queery", err);
                                                    return res.status(500).send('Database Error');
                                                }
                                                const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                console.log('fine ochho hoy pachii monthly salary', msData);

                                                const salaryOutData = [
                                                    { monthlySalaryId: 1, paySalaryAmount: data.fineAmount }
                                                ];
                                                const desiredSalaryAmount = salaryOutData[0].paySalaryAmount;
                                                console.log('fine kapya pachhi pay amount vadi dezire', desiredSalaryAmount);

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
                                                console.log("after fine Updated msData:", msData);
                                                const updatedmsData = msData.filter((obj) => {
                                                    if (obj.remainSalary != obj.totalSalary) {
                                                        return obj;
                                                    }
                                                })
                                                const swFId = updatedmsData.map((obj) => {
                                                    if (obj.remainSalary !== obj.totalSalary) {
                                                        return obj.monthlySalaryId;
                                                    }
                                                })

                                                const remainingSalaryByIds = swFId.map(sId => {
                                                    const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                });

                                                const remainingSalaryByIds1 = swFId.map(sId => {
                                                    const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                });

                                                const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                // Use map to combine the arrays and format them
                                                const combinedData = swFId.map((id, index) => `('${cutFine}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                // Join the array elements into a single string
                                                const msWiseSid = combinedData.join(',');

                                                // Output the resulting string
                                                console.log(msWiseSid);


                                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                pool.query(sql_querry_addmsFid, (err, result) => {
                                                    if (err) {
                                                        console.error("An error occurred while updating msData", err);
                                                        // return res.status(500).send('Database Error');
                                                    }
                                                    const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                    pool.query(updateQuery, (err, result) => {
                                                        if (err) {
                                                            console.error("An error occurred while updating msData", err);
                                                            return res.status(500).send('Database Error');
                                                        }
                                                        if (data.advanceAmount != 0) {
                                                            console.log('cccc', remainSalaryAmtWOAdv, data.advanceAmount);
                                                            console.log(remainSalaryAmtWOAdv <= data.advanceAmount);
                                                            if (remainSalaryAmtWOAdv <= data.advanceAmount) {
                                                                console.log('fine pachi advance moto');
                                                                sql_querry_getAdvanceDetails = `SELECT advanceId, advanceAmount, remainAdvanceAmount AS remainAdvance FROM staff_advance_data WHERE employeeId = '${data.employeeId}' AND remainAdvanceAmount != 0 ORDER BY advanceDate ASC`;
                                                                pool.query(sql_querry_getAdvanceDetails, (err, datas) => {
                                                                    if (err) {
                                                                        console.error("An error occurd in SQL Queery", err);
                                                                        return res.status(500).send('Database Error');
                                                                    }
                                                                    const oldAdvanceData = Object.values(JSON.parse(JSON.stringify(datas)));
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
                                                                    const updatedAdvancedata = advanceData.filter((obj) => {
                                                                        if (obj.remainAdvance != obj.advanceAmount) {
                                                                            return obj;
                                                                        }
                                                                    })
                                                                    const swAId = updatedAdvancedata.map((obj) => {
                                                                        if (obj.remainAdvance != obj.advanceAmount) {
                                                                            return obj.advanceId;
                                                                        }
                                                                    })

                                                                    const remainingAdvanceByIds = swAId.map(advanceId => {
                                                                        const advanceIds = oldAdvanceData.find(item => item.advanceId === advanceId);
                                                                        return advanceIds ? advanceIds.remainAdvance : undefined;
                                                                    });

                                                                    const remainingAdvanceByIds1 = swAId.map(advanceId => {
                                                                        const advanceIds = advanceData.find(item => item.advanceId === advanceId);
                                                                        return advanceIds ? advanceIds.remainAdvance : undefined;
                                                                    });

                                                                    const remainAdvanceAmt = remainingAdvanceByIds.map((value, index) => value - remainingAdvanceByIds1[index]);

                                                                    // Use map to combine the arrays and format them
                                                                    const combinedData = swAId.map((id, index) => `('${cutAdvance}','${id}',ROUND(${remainAdvanceAmt[index]},2))`);

                                                                    // Join the array elements into a single string
                                                                    const sallaryWiseAdvanceId = combinedData.join(',');

                                                                    // Output the resulting string
                                                                    console.log(sallaryWiseAdvanceId);

                                                                    let sumOfUpdatedadvanceRemain = 0;
                                                                    advanceData.forEach((item) => {
                                                                        sumOfUpdatedadvanceRemain += item.remainAdvance;
                                                                    });

                                                                    console.log("Sum of prevaios advanceFine:", sumOfUpdatedadvanceRemain)
                                                                    const updateQuery = generateAdvanceUpdateQuery(updatedAdvancedata);
                                                                    pool.query(updateQuery, (err, result) => {
                                                                        if (err) {
                                                                            console.error("An error occurred while updating fineData", err);
                                                                            // return res.status(500).send('Database Error');
                                                                        }

                                                                        console.log("AdvanceData updated successfully:");

                                                                        const totalCutamountOffAdvance = data.advanceAmount - sumOfUpdatedadvanceRemain;
                                                                        sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                                                salaryId,
                                                                                                remainSalaryId,
                                                                                                userId,
                                                                                                employeeId,
                                                                                                salaryAmount,
                                                                                                salaryType,
                                                                                                salaryComment,
                                                                                                salaryDate
                                                                                            )
                                                                                            VALUES(
                                                                                                '${cutAdvance}',
                                                                                                '${remainSalaryId}',
                                                                                                '${userId}',
                                                                                                '${data.employeeId}',
                                                                                                 ${totalCutamountOffAdvance},
                                                                                                'Advance Cut',
                                                                                               ${data.comment ? `'${data.comment}'` : null},
                                                                                                STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                                            );
                                                                        INSERT INTO salary_salaryWiseAdvanceId_data (salaryId, advanceId, cutAdvanceAmount) VALUES ${sallaryWiseAdvanceId}`
                                                                        pool.query(sql_query_addDetail, (err, add) => {
                                                                            if (err) {
                                                                                console.error("An error occurd in SQL Queery", err);
                                                                                return res.status(500).send('Database Error');
                                                                            }
                                                                            console.log('Advance CutOff');

                                                                            sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                                            pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                                if (err) {
                                                                                    console.error("An error occurd in SQL Queery", err);
                                                                                    return res.status(500).send('Database Error');
                                                                                }
                                                                                const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                                const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                                console.log('adv', msData);

                                                                                const salaryOutData = [
                                                                                    { monthlySalaryId: 1, paySalaryAmount: totalCutamountOffAdvance }
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
                                                                                console.log(" after advance Updated msData:", msData);
                                                                                const updatedmsData = msData.filter((obj) => {
                                                                                    if (obj.remainSalary != obj.totalSalary) {
                                                                                        return obj;
                                                                                    }
                                                                                })
                                                                                const swFId = updatedmsData.map((obj) => {
                                                                                    if (obj.remainSalary != obj.totalSalary) {
                                                                                        return obj.monthlySalaryId;
                                                                                    }
                                                                                })

                                                                                const remainingSalaryByIds = swFId.map(sId => {
                                                                                    const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                                                });

                                                                                const remainingSalaryByIds1 = swFId.map(sId => {
                                                                                    const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                                                });

                                                                                const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                                                // Use map to combine the arrays and format them
                                                                                const combinedData = swFId.map((id, index) => `('${cutAdvance}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                                                // Join the array elements into a single string
                                                                                const msWiseSid = combinedData.join(',');

                                                                                // Output the resulting string
                                                                                console.log(msWiseSid);

                                                                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                                                pool.query(sql_querry_addmsFid, (err, result) => {
                                                                                    if (err) {
                                                                                        console.error("An error occurred while updating msData", err);
                                                                                        return res.status(500).send('Database Error');
                                                                                    }
                                                                                })
                                                                                const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                                                pool.query(updateQuery, (err, result) => {
                                                                                    if (err) {
                                                                                        console.error("An error occurred while updating msData", err);
                                                                                        return res.status(500).send('Database Error');
                                                                                    }
                                                                                    if (data.payAmount != 0 && req.body.amountType == '1') {
                                                                                        sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                                                        pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                                            if (err) {
                                                                                                console.error("An error occurd in SQL Queery", err);
                                                                                                return res.status(500).send('Database Error');
                                                                                            }
                                                                                            const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                                            const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                                            console.log(msData);

                                                                                            const salaryOutData = [
                                                                                                { monthlySalaryId: 1, paySalaryAmount: data.payAmount }
                                                                                            ];
                                                                                            const desiredSalaryAmount = salaryOutData[0].paySalaryAmount;
                                                                                            console.log("pay slary", desiredSalaryAmount);

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
                                                                                            const updatedmsData = msData.filter((obj) => {
                                                                                                if (obj.remainSalary != obj.totalSalary) {
                                                                                                    return obj;
                                                                                                }
                                                                                            })
                                                                                            console.log('><', updatedmsData);
                                                                                            const swFId = updatedmsData.map((obj) => {
                                                                                                if (obj.remainSalary != obj.totalSalary) {
                                                                                                    return obj.monthlySalaryId;
                                                                                                }
                                                                                            })

                                                                                            const remainingSalaryByIds = swFId.map(sId => {
                                                                                                const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                                                return salaryIds ? salaryIds.remainSalary : undefined;
                                                                                            });

                                                                                            const remainingSalaryByIds1 = swFId.map(sId => {
                                                                                                const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                                                return salaryIds ? salaryIds.remainSalary : undefined;
                                                                                            });

                                                                                            const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                                                            // Use map to combine the arrays and format them
                                                                                            const combinedData = swFId.map((id, index) => `('${salaryId}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                                                            // Join the array elements into a single string
                                                                                            const msWiseSid = combinedData.join(',');

                                                                                            // Output the resulting string
                                                                                            console.log(msWiseSid);

                                                                                            sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                                                            pool.query(sql_querry_addmsFid, (err, result) => {
                                                                                                if (err) {
                                                                                                    console.error("An error occurred while updating msData", err);
                                                                                                    return res.status(500).send('Database Error');
                                                                                                }
                                                                                            })
                                                                                            const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                                                            pool.query(updateQuery, (err, result) => {
                                                                                                if (err) {
                                                                                                    console.error("An error occurred while updating msData", err);
                                                                                                    return res.status(500).send('Database Error');
                                                                                                }
                                                                                            })
                                                                                        })
                                                                                    }
                                                                                })
                                                                            })
                                                                        })
                                                                    });
                                                                })
                                                            } else {
                                                                console.log('fine pachhi advance nano');
                                                                sql_query_allZeroRemainFine = `SELECT
                                                                        advanceId, remainAdvanceAmount
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

                                                                    const swCutAdvanceAmt = allAdvanceId.map((obj) => {
                                                                        return obj.remainAdvanceAmount;
                                                                    })

                                                                    // Use map to combine the arrays and format them
                                                                    const combinedDataAdvance = swAId.map((id, index) => `('${cutAdvance}','${id}',ROUND(${swCutAdvanceAmt[index]},2))`);

                                                                    // Join the array elements into a single string
                                                                    const sallaryWiseAllAdvanceId = combinedDataAdvance.join(',');

                                                                    // Output the resulting string
                                                                    console.log(sallaryWiseAllAdvanceId);

                                                                    sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                                            salaryId,
                                                                                            remainSalaryId,
                                                                                            userId,
                                                                                            employeeId,
                                                                                            salaryAmount,
                                                                                            salaryType,
                                                                                            salaryComment,
                                                                                            salaryDate
                                                                                        )
                                                                                        VALUES(
                                                                                            '${cutAdvance}',
                                                                                            '${remainSalaryId}',
                                                                                            '${userId}',
                                                                                            '${data.employeeId}',
                                                                                             ${data.advanceAmount},
                                                                                            'Advance Cut',
                                                                                           ${data.comment ? `'${data.comment}'` : null},
                                                                                            STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                                        );
                                                                    INSERT INTO salary_salaryWiseAdvanceId_data (salaryId, advanceId, cutAdvanceAmount) VALUES ${sallaryWiseAllAdvanceId}`;
                                                                    pool.query(sql_query_addDetail, (err, add) => {
                                                                        if (err) {
                                                                            console.error("An error occurd in SQL Queery", err);
                                                                            return res.status(500).send('Database Error');
                                                                        }
                                                                        // console.log('All Advance Is Done');
                                                                    })
                                                                    sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                                    pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                        if (err) {
                                                                            console.error("An error occurd in SQL Queery", err);
                                                                            return res.status(500).send('Database Error');
                                                                        }
                                                                        const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                        const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                        console.log('adv', msData);

                                                                        const salaryOutData = [
                                                                            { monthlySalaryId: 1, paySalaryAmount: data.advanceAmount }
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
                                                                        console.log(" after advance Updated msData:", msData);
                                                                        const updatedmsData = msData.filter((obj) => {
                                                                            if (obj.remainSalary != obj.totalSalary) {
                                                                                return obj;
                                                                            }
                                                                        })
                                                                        const swFId = updatedmsData.map((obj) => {
                                                                            if (obj.remainSalary != obj.totalSalary) {
                                                                                return obj.monthlySalaryId;
                                                                            }
                                                                        })

                                                                        const remainingSalaryByIds = swFId.map(sId => {
                                                                            const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                            return salaryIds ? salaryIds.remainSalary : undefined;
                                                                        });

                                                                        const remainingSalaryByIds1 = swFId.map(sId => {
                                                                            const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                            return salaryIds ? salaryIds.remainSalary : undefined;
                                                                        });

                                                                        const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                                        // Use map to combine the arrays and format them
                                                                        const combinedData = swFId.map((id, index) => `('${cutAdvance}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                                        // Join the array elements into a single string
                                                                        const msWiseSid = combinedData.join(',');

                                                                        // Output the resulting string
                                                                        console.log(msWiseSid);
                                                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                                        pool.query(sql_querry_addmsFid, (err, result) => {
                                                                            if (err) {
                                                                                console.error("An error occurred while updating msData", err);
                                                                                return res.status(500).send('Database Error');
                                                                            }
                                                                        })
                                                                        const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                                        pool.query(updateQuery, (err, result) => {
                                                                            if (err) {
                                                                                console.error("An error occurred while updating msData", err);
                                                                                return res.status(500).send('Database Error');
                                                                            }
                                                                            if (data.payAmount != 0 && req.body.amountType == '1') {
                                                                                sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                                                pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                                    if (err) {
                                                                                        console.error("An error occurd in SQL Queery", err);
                                                                                        return res.status(500).send('Database Error');
                                                                                    }
                                                                                    const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));;
                                                                                    const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                                    console.log(msData);

                                                                                    const salaryOutData = [
                                                                                        { monthlySalaryId: 1, paySalaryAmount: data.payAmount }
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
                                                                                    const updatedmsData = msData.filter((obj) => {
                                                                                        if (obj.remainSalary != obj.totalSalary) {
                                                                                            return obj;
                                                                                        }
                                                                                    })
                                                                                    console.log('><', updatedmsData);
                                                                                    const swFId = updatedmsData.map((obj) => {
                                                                                        if (obj.remainSalary != obj.totalSalary) {
                                                                                            return obj.monthlySalaryId;
                                                                                        }
                                                                                    })

                                                                                    const remainingSalaryByIds = swFId.map(sId => {
                                                                                        const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                                        return salaryIds ? salaryIds.remainSalary : undefined;
                                                                                    });

                                                                                    const remainingSalaryByIds1 = swFId.map(sId => {
                                                                                        const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                                        return salaryIds ? salaryIds.remainSalary : undefined;
                                                                                    });

                                                                                    const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                                                    // Use map to combine the arrays and format them
                                                                                    const combinedData = swFId.map((id, index) => `('${salaryId}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                                                    // Join the array elements into a single string
                                                                                    const msWiseSid = combinedData.join(',');

                                                                                    // Output the resulting string
                                                                                    console.log(msWiseSid);

                                                                                    sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                                                    pool.query(sql_querry_addmsFid, (err, result) => {
                                                                                        if (err) {
                                                                                            console.error("An error occurred while updating msData", err);
                                                                                            return res.status(500).send('Database Error');
                                                                                        }
                                                                                    })
                                                                                    const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                                                    pool.query(updateQuery, (err, result) => {
                                                                                        if (err) {
                                                                                            console.error("An error occurred while updating msData", err);
                                                                                            return res.status(500).send('Database Error');
                                                                                        }
                                                                                    })

                                                                                })
                                                                            }
                                                                        })
                                                                    })
                                                                })
                                                            }
                                                        }
                                                        else if (data.payAmount != 0 && req.body.amountType == '1') {
                                                            sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                            pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                if (err) {
                                                                    console.error("An error occurd in SQL Queery", err);
                                                                    return res.status(500).send('Database Error');
                                                                }
                                                                const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                console.log(msData);

                                                                const salaryOutData = [
                                                                    { monthlySalaryId: 1, paySalaryAmount: data.payAmount }
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
                                                                const updatedmsData = msData.filter((obj) => {
                                                                    if (obj.remainSalary != obj.totalSalary) {
                                                                        return obj;
                                                                    }
                                                                })
                                                                console.log('><', updatedmsData);
                                                                const swFId = updatedmsData.map((obj) => {
                                                                    if (obj.remainSalary != obj.totalSalary) {
                                                                        return obj.monthlySalaryId;
                                                                    }
                                                                })

                                                                const remainingSalaryByIds = swFId.map(sId => {
                                                                    const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                                });

                                                                const remainingSalaryByIds1 = swFId.map(sId => {
                                                                    const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                                });

                                                                const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                                // Use map to combine the arrays and format them
                                                                const combinedData = swFId.map((id, index) => `('${salaryId}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                                // Join the array elements into a single string
                                                                const msWiseSid = combinedData.join(',');

                                                                // Output the resulting string
                                                                console.log(msWiseSid);

                                                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                                pool.query(sql_querry_addmsFid, (err, result) => {
                                                                    if (err) {
                                                                        console.error("An error occurred while updating msData", err);
                                                                        return res.status(500).send('Database Error');
                                                                    }
                                                                })
                                                                const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                                pool.query(updateQuery, (err, result) => {
                                                                    if (err) {
                                                                        console.error("An error occurred while updating msData", err);
                                                                        return res.status(500).send('Database Error');
                                                                    }
                                                                })
                                                            })
                                                        }
                                                    })
                                                })

                                            })
                                            // console.log("msData updated successfully");
                                            console.log('malyoooo[[', result[0])
                                            const allFineId = result[0];
                                            const swFId = allFineId.map((obj) => {
                                                return obj.fineId;
                                            })
                                            const swCutFineAmt = allFineId.map((obj) => {
                                                return obj.remainFineAmount
                                            })

                                            // Use map to combine the arrays and format them
                                            const combinedData = swFId.map((id, index) => `('${cutFine}','${id}',ROUND(${swCutFineAmt[index]},2))`);

                                            // Join the array elements into a single string
                                            const sallaryWiseAllFineId = combinedData.join(',');

                                            // Output the resulting string
                                            console.log(sallaryWiseAllFineId);

                                            sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    remainSalaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${cutFine}',
                                                                    '${remainSalaryId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${data.fineAmount},
                                                                    'Fine Cut',
                                                                   ${data.comment ? `'${data.comment}'` : null},
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseFineId_data (salaryId, fineId, cutFineAmount) VALUES ${sallaryWiseAllFineId}`;
                                            pool.query(sql_query_addDetail, (err, add) => {
                                                if (err) {
                                                    console.error("An error occurd in SQL Queery", err);
                                                }
                                                // console.log('Fine CutOff');
                                            })
                                        })
                                    }
                                }
                                else if (data.advanceAmount > 0) {
                                    console.log('?avyu')
                                    if (remainSalaryAmtWOAdv <= data.advanceAmount) {
                                        console.log('only advance motot')
                                        sql_querry_getAdvanceDetails = `SELECT advanceId, advanceAmount, remainAdvanceAmount AS remainAdvance FROM staff_advance_data WHERE employeeId = '${data.employeeId}' AND remainAdvanceAmount != 0 ORDER BY advanceDate ASC`;
                                        pool.query(sql_querry_getAdvanceDetails, (err, datas) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                return res.status(500).send('Database Error');
                                            }
                                            const oldAdvanceData = Object.values(JSON.parse(JSON.stringify(datas)));
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
                                            const updatedAdvancedata = advanceData.filter((obj) => {
                                                if (obj.remainAdvance != obj.advanceAmount) {
                                                    return obj;
                                                }
                                            })
                                            console.log('upda adv', updatedAdvancedata)
                                            const swAId = updatedAdvancedata.map((obj) => {
                                                if (obj.remainAdvance != obj.advanceAmount) {
                                                    return obj.advanceId;
                                                }
                                            })

                                            const remainingAdvanceByIds = swAId.map(advanceId => {
                                                const advanceIds = oldAdvanceData.find(item => item.advanceId === advanceId);
                                                return advanceIds ? advanceIds.remainAdvance : undefined;
                                            });

                                            const remainingAdvanceByIds1 = swAId.map(advanceId => {
                                                const advanceIds = advanceData.find(item => item.advanceId === advanceId);
                                                return advanceIds ? advanceIds.remainAdvance : undefined;
                                            });

                                            const remainAdvanceAmt = remainingAdvanceByIds.map((value, index) => value - remainingAdvanceByIds1[index]);

                                            // Use map to combine the arrays and format them
                                            const combinedData = swAId.map((id, index) => `('${cutAdvance}','${id}',ROUND(${remainAdvanceAmt[index]},2))`);

                                            // Join the array elements into a single string
                                            const sallaryWiseAdvanceId = combinedData.join(',');

                                            // Output the resulting string
                                            console.log(sallaryWiseAdvanceId);

                                            let sumOfUpdatedadvanceRemain = 0;
                                            advanceData.forEach((item) => {
                                                sumOfUpdatedadvanceRemain += item.remainAdvance;
                                            });

                                            console.log("Sum of prevaios advanceFine:", sumOfUpdatedadvanceRemain)
                                            const updateQuery = generateAdvanceUpdateQuery(updatedAdvancedata);
                                            pool.query(updateQuery, (err, result) => {
                                                if (err) {
                                                    console.error("An error occurred while updating fineData", err);
                                                    return res.status(500).send('Database Error');
                                                }

                                                console.log("AdvanceData updated successfully:");

                                                const totalCutamountOffAdvance = data.advanceAmount - sumOfUpdatedadvanceRemain;
                                                sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    remainSalaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${cutAdvance}',
                                                                    '${remainSalaryId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${totalCutamountOffAdvance},
                                                                    'Advance Cut',
                                                                   ${data.comment ? `'${data.comment}'` : null},
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseAdvanceId_data (salaryId, advanceId, cutAdvanceAmount) VALUES ${sallaryWiseAdvanceId}`
                                                pool.query(sql_query_addDetail, (err, add) => {
                                                    if (err) {
                                                        console.error("An error occurd in SQL Queery", err);
                                                        return res.status(500).send('Database Error');
                                                    }
                                                    console.log('Advance CutOff');

                                                    sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                    pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                        if (err) {
                                                            console.error("An error occurd in SQL Queery", err);
                                                            return res.status(500).send('Database Error');
                                                        }
                                                        const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                        const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                        console.log('adv', msData);

                                                        const salaryOutData = [
                                                            { monthlySalaryId: 1, paySalaryAmount: totalCutamountOffAdvance }
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
                                                        const updatedmsData = msData.filter((obj) => {
                                                            if (obj.remainSalary != obj.totalSalary) {
                                                                return obj;
                                                            }
                                                        })
                                                        const swFId = updatedmsData.map((obj) => {
                                                            if (obj.remainSalary != obj.totalSalary) {
                                                                return obj.monthlySalaryId;
                                                            }
                                                        })

                                                        const remainingSalaryByIds = swFId.map(sId => {
                                                            const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                            return salaryIds ? salaryIds.remainSalary : undefined;
                                                        });

                                                        const remainingSalaryByIds1 = swFId.map(sId => {
                                                            const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                            return salaryIds ? salaryIds.remainSalary : undefined;
                                                        });

                                                        const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                        // Use map to combine the arrays and format them
                                                        const combinedData = swFId.map((id, index) => `('${cutAdvance}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                        // Join the array elements into a single string
                                                        const msWiseSid = combinedData.join(',');

                                                        // Output the resulting string
                                                        console.log(msWiseSid);

                                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                        pool.query(sql_querry_addmsFid, (err, result) => {
                                                            if (err) {
                                                                console.error("An error occurred while updating msData", err);
                                                                return res.status(500).send('Database Error');
                                                            }
                                                        })
                                                        const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                        pool.query(updateQuery, (err, result) => {
                                                            if (err) {
                                                                console.error("An error occurred while updating msData", err);
                                                                return res.status(500).send('Database Error');
                                                            }
                                                            if (data.payAmount != 0 && req.body.amountType == '1') {
                                                                sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                                pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                    if (err) {
                                                                        console.error("An error occurd in SQL Queery", err);
                                                                        return res.status(500).send('Database Error');
                                                                    }
                                                                    const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                    const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                                    console.log(msData);

                                                                    const salaryOutData = [
                                                                        { monthlySalaryId: 1, paySalaryAmount: data.payAmount }
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
                                                                    const updatedmsData = msData.filter((obj) => {
                                                                        if (obj.remainSalary != obj.totalSalary) {
                                                                            return obj;
                                                                        }
                                                                    })
                                                                    console.log('><', updatedmsData);
                                                                    const swFId = updatedmsData.map((obj) => {
                                                                        if (obj.remainSalary != obj.totalSalary) {
                                                                            return obj.monthlySalaryId;
                                                                        }
                                                                    })

                                                                    const remainingSalaryByIds = swFId.map(sId => {
                                                                        const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                        return salaryIds ? salaryIds.remainSalary : undefined;
                                                                    });

                                                                    const remainingSalaryByIds1 = swFId.map(sId => {
                                                                        const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                        return salaryIds ? salaryIds.remainSalary : undefined;
                                                                    });

                                                                    const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                                    // Use map to combine the arrays and format them
                                                                    const combinedData = swFId.map((id, index) => `('${salaryId}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                                    // Join the array elements into a single string
                                                                    const msWiseSid = combinedData.join(',');

                                                                    // Output the resulting string
                                                                    console.log(msWiseSid);

                                                                    sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                                    pool.query(sql_querry_addmsFid, (err, result) => {
                                                                        if (err) {
                                                                            console.error("An error occurred while updating msData", err);
                                                                            return res.status(500).send('Database Error');
                                                                        }
                                                                    })
                                                                    const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                                    pool.query(updateQuery, (err, result) => {
                                                                        if (err) {
                                                                            console.error("An error occurred while updating msData", err);
                                                                            return res.status(500).send('Database Error');
                                                                        }
                                                                    })
                                                                })
                                                            }
                                                        })
                                                    })
                                                })
                                            });
                                        })
                                    } else {
                                        console.log('only advaance nano');
                                        sql_query_allZeroRemainFine = `SELECT
                                                                        advanceId, remainAdvanceAmount
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

                                            const swCutAdvanceAmt = allAdvanceId.map((obj) => {
                                                return obj.remainAdvanceAmount;
                                            })

                                            // Use map to combine the arrays and format them
                                            const combinedDataAdvance = swAId.map((id, index) => `('${cutAdvance}','${id}',ROUND(${swCutAdvanceAmt[index]},2))`);

                                            // Join the array elements into a single string
                                            const sallaryWiseAllAdvanceId = combinedDataAdvance.join(',');

                                            // Output the resulting string
                                            console.log(sallaryWiseAllAdvanceId);

                                            // const sallaryWiseAllAdvanceId = () => {

                                            //     var string = ''
                                            //     swAId.forEach((data, index) => {
                                            //         if (index == 0)
                                            //             string = "(" + "'" + cutAdvance + "'" + "," + string + "'" + data + "'" + ")";
                                            //         else
                                            //             string = string + ",(" + "'" + cutAdvance + "'" + "," + "'" + data + "'" + ")";
                                            //     });
                                            //     return string;

                                            // }
                                            // console.log('><><><', sallaryWiseAllAdvanceId());
                                            sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    remainSalaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${cutAdvance}',
                                                                    '${remainSalaryId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${data.advanceAmount},
                                                                    'Advance Cut',
                                                                   ${data.comment ? `'${data.comment}'` : null},
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseAdvanceId_data (salaryId, advanceId, cutAdvanceAmount) VALUES ${sallaryWiseAllAdvanceId}`;
                                            pool.query(sql_query_addDetail, (err, add) => {
                                                if (err) {
                                                    console.error("An error occurd in SQL Queery", err);
                                                    return res.status(500).send('Database Error');
                                                }
                                                console.log('All Advance Is Done');
                                            })
                                            sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                            pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                if (err) {
                                                    console.error("An error occurd in SQL Queery", err);
                                                    return res.status(500).send('Database Error');
                                                }
                                                const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                console.log(msData);

                                                const salaryOutData = [
                                                    { monthlySalaryId: 1, paySalaryAmount: data.advanceAmount }
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
                                                const updatedmsData = msData.filter((obj) => {
                                                    if (obj.remainSalary != obj.totalSalary) {
                                                        return obj;
                                                    }
                                                })
                                                const swFId = updatedmsData.map((obj) => {
                                                    if (obj.remainSalary != obj.totalSalary) {
                                                        return obj.monthlySalaryId;
                                                    }
                                                })

                                                const remainingSalaryByIds = swFId.map(sId => {
                                                    const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                });

                                                const remainingSalaryByIds1 = swFId.map(sId => {
                                                    const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                });

                                                const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                // Use map to combine the arrays and format them
                                                const combinedData = swFId.map((id, index) => `('${cutAdvance}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                // Join the array elements into a single string
                                                const msWiseSid = combinedData.join(',');

                                                // Output the resulting string
                                                console.log(msWiseSid);

                                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                pool.query(sql_querry_addmsFid, (err, result) => {
                                                    if (err) {
                                                        console.error("An error occurred while updating msData", err);
                                                        return res.status(500).send('Database Error');
                                                    }

                                                })
                                                const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                pool.query(updateQuery, (err, result) => {
                                                    if (err) {
                                                        console.error("An error occurred while updating msData", err);
                                                        return res.status(500).send('Database Error');
                                                    }
                                                    if (data.payAmount != 0 && req.body.amountType == '1') {
                                                        sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                        pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                            if (err) {
                                                                console.error("An error occurd in SQL Queery", err);
                                                                return res.status(500).send('Database Error');
                                                            }
                                                            const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));;
                                                            const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                            console.log(msData);

                                                            const salaryOutData = [
                                                                { monthlySalaryId: 1, paySalaryAmount: data.payAmount }
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
                                                            const updatedmsData = msData.filter((obj) => {
                                                                if (obj.remainSalary != obj.totalSalary) {
                                                                    return obj;
                                                                }
                                                            })
                                                            console.log('><', updatedmsData);
                                                            const swFId = updatedmsData.map((obj) => {
                                                                if (obj.remainSalary != obj.totalSalary) {
                                                                    return obj.monthlySalaryId;
                                                                }
                                                            })

                                                            const remainingSalaryByIds = swFId.map(sId => {
                                                                const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                                return salaryIds ? salaryIds.remainSalary : undefined;
                                                            });

                                                            const remainingSalaryByIds1 = swFId.map(sId => {
                                                                const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                                return salaryIds ? salaryIds.remainSalary : undefined;
                                                            });

                                                            const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                            // Use map to combine the arrays and format them
                                                            const combinedData = swFId.map((id, index) => `('${salaryId}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                            // Join the array elements into a single string
                                                            const msWiseSid = combinedData.join(',');

                                                            // Output the resulting string
                                                            console.log(msWiseSid);
                                                            sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`;
                                                            pool.query(sql_querry_addmsFid, (err, result) => {
                                                                if (err) {
                                                                    console.error("An error occurred while updating msData", err);
                                                                    return res.status(500).send('Database Error');
                                                                }
                                                            })
                                                            const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                            pool.query(updateQuery, (err, result) => {
                                                                if (err) {
                                                                    console.error("An error occurred while updating msData", err);
                                                                    return res.status(500).send('Database Error');
                                                                }
                                                            })
                                                        })
                                                    }
                                                })
                                            })
                                        })
                                    }
                                }
                            } else {
                                if (salaryAmtWOAdv < 0) {
                                    sql_query_addAdvanceDetail = `INSERT INTO staff_advance_data(
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
                                                                     ABS(${salaryAmtWOAdv}),
                                                                     ABS(${salaryAmtWOAdv}),
                                                                   ${data.comment ? `'${data.comment}'` : null},
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                )`;
                                    pool.query(sql_query_addAdvanceDetail, (err, rest) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
                                        else if (data.payAmount != 0 && req.body.amountType == '1' && data.totalSalary > 0) {
                                            sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                            pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                if (err) {
                                                    console.error("An error occurd in SQL Queery", err);
                                                    return res.status(500).send('Database Error');
                                                }
                                                const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                                console.log(msData);

                                                const salaryOutData = [
                                                    { monthlySalaryId: 1, paySalaryAmount: data.totalSalary }
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
                                                const updatedmsData = msData.filter((obj) => {
                                                    if (obj.remainSalary != obj.totalSalary) {
                                                        return obj;
                                                    }
                                                })
                                                console.log('><', updatedmsData);
                                                const swFId = updatedmsData.map((obj) => {
                                                    if (obj.remainSalary != obj.totalSalary) {
                                                        return obj.monthlySalaryId;
                                                    }
                                                })

                                                const remainingSalaryByIds = swFId.map(sId => {
                                                    const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                });

                                                const remainingSalaryByIds1 = swFId.map(sId => {
                                                    const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                                    return salaryIds ? salaryIds.remainSalary : undefined;
                                                });

                                                const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                                // Use map to combine the arrays and format them
                                                const combinedData = swFId.map((id, index) => `('${salaryId}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                                // Join the array elements into a single string
                                                const msWiseSid = combinedData.join(',');

                                                // Output the resulting string
                                                console.log(msWiseSid);

                                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                                pool.query(sql_querry_addmsFid, (err, result) => {
                                                    if (err) {
                                                        console.error("An error occurred while updating msData", err);
                                                        return res.status(500).send('Database Error');
                                                    }
                                                })

                                                const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                                pool.query(updateQuery, (err, result) => {
                                                    if (err) {
                                                        console.error("An error occurred while updating msData", err);
                                                        return res.status(500).send('Database Error');
                                                    }
                                                })

                                            })
                                        }
                                    })
                                }
                                else if (data.payAmount != 0 && req.body.amountType == '1') {
                                    sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                    pool.query(sql_querry_getFinedetail, (err, datas) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
                                        const oldMsdData = Object.values(JSON.parse(JSON.stringify(datas)));
                                        const msData = Object.values(JSON.parse(JSON.stringify(datas)));
                                        console.log(msData);

                                        const salaryOutData = [
                                            { monthlySalaryId: 1, paySalaryAmount: data.payAmount }
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
                                        const updatedmsData = msData.filter((obj) => {
                                            if (obj.remainSalary != obj.totalSalary) {
                                                return obj;
                                            }
                                        })
                                        console.log('><', updatedmsData);
                                        const swFId = updatedmsData.map((obj) => {
                                            if (obj.remainSalary != obj.totalSalary) {
                                                return obj.monthlySalaryId;
                                            }
                                        })

                                        const remainingSalaryByIds = swFId.map(sId => {
                                            const salaryIds = oldMsdData.find(item => item.monthlySalaryId === sId);
                                            return salaryIds ? salaryIds.remainSalary : undefined;
                                        });

                                        const remainingSalaryByIds1 = swFId.map(sId => {
                                            const salaryIds = msData.find(item => item.monthlySalaryId === sId);
                                            return salaryIds ? salaryIds.remainSalary : undefined;
                                        });

                                        const remainMsAmt = remainingSalaryByIds.map((value, index) => value - remainingSalaryByIds1[index]);

                                        // Use map to combine the arrays and format them
                                        const combinedData = swFId.map((id, index) => `('${salaryId}','${id}',ROUND(${remainMsAmt[index]},2))`);

                                        // Join the array elements into a single string
                                        const msWiseSid = combinedData.join(',');

                                        // Output the resulting string
                                        console.log(msWiseSid);

                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId, cutSalaryAmount) VALUES ${msWiseSid}`
                                        pool.query(sql_querry_addmsFid, (err, result) => {
                                            if (err) {
                                                console.error("An error occurred while updating msData", err);
                                                return res.status(500).send('Database Error');
                                            }
                                        })
                                        const updateQuery = generateMonthlyUpdateQuery(updatedmsData);
                                        pool.query(updateQuery, (err, result) => {
                                            if (err) {
                                                console.error("An error occurred while updating msData", err);
                                                return res.status(500).send('Database Error');
                                            }
                                        })
                                    })
                                }
                            }

                            if (data.totalSalary > 0) {
                                if (data.payAmount != 0) {
                                    sql_query_addDetail = `INSERT INTO staff_salary_data(
                                                                    salaryId,
                                                                    remainSalaryId,
                                                                    userId,
                                                                    employeeId,
                                                                    salaryAmount,
                                                                    salaryType,
                                                                    salaryComment,
                                                                    salaryDate
                                                                )
                                                                VALUES(
                                                                    '${salaryId}',
                                                                    '${remainSalaryId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                    ${salaryAmtWOAdv < 0 ? data.totalSalary : data.payAmount},
                                                                    'Salary Pay',
                                                                   ${data.comment ? `'${data.comment}'` : null},
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                )`
                                } else {
                                    return res.status(200).send("Data Added SuccsessFully");
                                }
                            } else {
                                return res.status(200).send("Advance Added Successfully");
                            }
                            pool.query(sql_query_addDetail, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
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
                                    return res.status(200).send("Data Added Successfully");
                                })
                            })
                        })
                    })
                } else if (req.body.amountType == '2' || req.body.amountType == '3') {
                    if (req.body.amountType == '2') {
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
                                                                   ${data.comment ? `'${data.comment}'` : null},
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                )`
                    } else if (req.body.amountType == '3') {
                        sql_query_addDetail = `INSERT INTO staff_fine_data(
                                                                    fineId,
                                                                    userId,
                                                                    employeeId,
                                                                    fineAmount,
                                                                    remainFineAmount,
                                                                    fineStatus,
                                                                    reason,
                                                                    fineDate
                                                                )
                                                                VALUES(
                                                                    '${fineId}',
                                                                    '${userId}',
                                                                    '${data.employeeId}',
                                                                     ${data.payAmount},
                                                                     ${data.payAmount},
                                                                     true,
                                                                   ${data.comment ? `'${data.comment}'` : null},
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                )`;
                    }
                    pool.query(sql_query_addDetail, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("Data Added Successfully");
                    })
                } else if (req.body.amountType == '4') {
                    if (data.advanceAmount > 0 && data.advanceAmount >= data.payAmount) {
                        sql_querry_getAdvanceDetails = `SELECT advanceId, advanceAmount, remainAdvanceAmount AS remainAdvance FROM staff_advance_data WHERE employeeId = '${data.employeeId}' AND remainAdvanceAmount != 0 ORDER BY advanceDate ASC`;
                        pool.query(sql_querry_getAdvanceDetails, (err, datas) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            const orignalAdvanceData = Object.values(JSON.parse(JSON.stringify(datas)));
                            const advanceData = Object.values(JSON.parse(JSON.stringify(datas)));
                            const advanceOutData = [
                                { payAdvanceAmount: data.payAmount }
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
                            const updatedAdvancedata = advanceData.filter((obj) => {
                                if (obj.remainAdvance != obj.advanceAmount) {
                                    return obj;
                                }
                            })
                            console.log('upda adv', updatedAdvancedata)
                            const swAId = updatedAdvancedata.map((obj) => {
                                if (obj.remainAdvance != obj.advanceAmount) {
                                    return obj.advanceId;
                                }
                            })

                            const remainingcreditByIds = swAId.map(creId => {
                                const creditId = orignalAdvanceData.find(item => item.advanceId === creId);
                                return creditId ? creditId.remainAdvance : undefined;
                            });

                            const remainingcreditByIds1 = swAId.map(creId => {
                                const creditId = advanceData.find(item => item.advanceId === creId);
                                return creditId ? creditId.remainAdvance : undefined;
                            });

                            const remainCreditQty = remainingcreditByIds.map((value, index) => value - remainingcreditByIds1[index]);

                            // Use map to combine the arrays and format them
                            const combinedData = swAId.map((id, index) => `('${creditId}','${id}',ROUND(${remainCreditQty[index]},2))`);

                            // Join the array elements into a single string
                            const creditWiseAdvanceId = combinedData.join(',');

                            // Output the resulting string
                            console.log(creditWiseAdvanceId);

                            let sumOfUpdatedadvanceRemain = 0;
                            advanceData.forEach((item) => {
                                sumOfUpdatedadvanceRemain += item.remainAdvance;
                            });

                            console.log("Sum of prevaios advanceFine:", sumOfUpdatedadvanceRemain)
                            const updateQuery = generateAdvanceUpdateQuery(updatedAdvancedata);
                            pool.query(updateQuery, (err, result) => {
                                if (err) {
                                    console.error("An error occurred while updating fineData", err);
                                    return res.status(500).send('Database Error');
                                }

                                console.log("AdvanceData updated successfully:");
                                sql_query_addDetail = `INSERT INTO staff_creditAdvanceFine_data(
                                                                                                cafId,
                                                                                                userId,
                                                                                                employeeId,
                                                                                                creditAmount,
                                                                                                creditType,
                                                                                                creditComent,
                                                                                                creditDate
                                                                                            )
                                                                                            VALUES(
                                                                                                '${creditId}',
                                                                                                '${userId}',
                                                                                                '${data.employeeId}',
                                                                                                 ${data.payAmount},
                                                                                                'Advance',
                                                                                               ${data.comment ? `'${data.comment}'` : null},
                                                                                                STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                                            );
                                                   INSERT INTO staff_creditWiseAdvanceId_data (creditId, advanceId, cutCreditAmount) VALUES ${creditWiseAdvanceId}`
                                pool.query(sql_query_addDetail, (err, add) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    return res.status(200).send('Your Amount is Credited Successfully');
                                })
                            })
                        })
                    } else {
                        return res.status(401).send('You can not credit Advance');
                    }
                } else if (req.body.amountType == '5') {
                    console.log('ffjkfjfjfj', data.fineAmount > 0 && data.fineAmount >= data.payAmount, data.fineAmount, data.payAmount);
                    if (data.fineAmount > 0 && data.fineAmount >= data.payAmount) {
                        sql_querry_getFinedetail = `SELECT fineId, fineAmount,remainFineAmount AS remainFine FROM staff_fine_data WHERE employeeId = '${data.employeeId}' AND fineStatus = 1 AND remainFineAmount != 0 ORDER BY fineDate ASC`;
                        pool.query(sql_querry_getFinedetail, (err, datas) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            const orignalFineData = Object.values(JSON.parse(JSON.stringify(datas)));
                            const fineData = Object.values(JSON.parse(JSON.stringify(datas)));
                            const fineOutData = [
                                { fineId: 1, payFineAmount: data.payAmount }
                            ];
                            const desiredFineAmount = fineOutData[0].payFineAmount;
                            console.log('jyare fine vadhare hoy tyare ni desiredAmount', desiredFineAmount);

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
                            console.log("jyare fine vadhare hoy tyare malto Updated fineData:", fineData);
                            const updatedFinedata = fineData.filter((obj) => {
                                if (obj.remainFine != obj.fineAmount) {
                                    return obj;
                                }
                            })
                            const swFId = updatedFinedata.map((obj) => {
                                if (obj.remainFine != obj.fineAmount) {
                                    return obj.fineId;
                                }
                            })

                            const remainingcreditByIds = swFId.map(creId => {
                                const creditId = orignalFineData.find(item => item.fineId === creId);
                                return creditId ? creditId.remainFine : undefined;
                            });

                            const remainingcreditByIds1 = swFId.map(creId => {
                                const creditId = fineData.find(item => item.fineId === creId);
                                return creditId ? creditId.remainFine : undefined;
                            });

                            const remainCreditQty = remainingcreditByIds.map((value, index) => value - remainingcreditByIds1[index]);

                            // Use map to combine the arrays and format them
                            const combinedData = swFId.map((id, index) => `('${creditId}','${id}',ROUND(${remainCreditQty[index]},2))`);

                            // Join the array elements into a single string
                            const creditWiseFineId = combinedData.join(',');

                            // Output the resulting string
                            console.log(creditWiseFineId);


                            // const creditWiseFineId = () => {

                            //     var string = ''
                            //     swFId.forEach((data, index) => {
                            //         if (index == 0)
                            //             string = "(" + "'" + creditId + "'" + "," + string + "'" + data + "'" + ")";
                            //         else
                            //             string = string + ",(" + "'" + creditId + "'" + "," + "'" + data + "'" + ")";
                            //     });
                            //     return string;

                            // }
                            // console.log(">?>?>/////", sallaryWiseFineId())
                            let sumOfRemainFine = 0;
                            fineData.forEach((item) => {
                                sumOfRemainFine += item.remainFine;
                            });

                            // console.log("Sum of remainFine:", sumOfRemainFine)
                            const updateQuery = generateFineUpdateQuery(updatedFinedata);
                            pool.query(updateQuery, (err, result) => {
                                if (err) {
                                    console.error("An error occurred while updating fineData", err);
                                    return res.status(500).send('Database Error');
                                }
                                console.log("AdvanceData updated successfully:");
                                sql_query_addDetail = `INSERT INTO staff_creditAdvanceFine_data(
                                                                                                cafId,
                                                                                                userId,
                                                                                                employeeId,
                                                                                                creditAmount,
                                                                                                creditType,
                                                                                                creditComent,
                                                                                                creditDate
                                                                                            )
                                                                                            VALUES(
                                                                                                '${creditId}',
                                                                                                '${userId}',
                                                                                                '${data.employeeId}',
                                                                                                 ${data.payAmount},
                                                                                                'Fine',
                                                                                               ${data.comment ? `'${data.comment}'` : null},
                                                                                                STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                                            );
                                                   INSERT INTO staff_creditWiseFineId_data (creditId, fineId, cutCreditAmount) VALUES ${creditWiseFineId}`
                                pool.query(sql_query_addDetail, (err, add) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    return res.status(200).send('Your Amount is Credited Successfully');
                                })
                            })
                        })
                    } else {
                        return res.status(401).send('You can not credit Fine');
                    }
                } else if (req.body.amountType == '6') {
                    if (data.comment.length == 0) {
                        return res.status(400).send('Please Add Comment');
                    }
                    sql_query_addDetail = `INSERT INTO staff_bonus_data (
                                                                            bonusId,
                                                                            userId,
                                                                            employeeId,
                                                                            bonusAmount,
                                                                            bonusComment,
                                                                            bonusDate
                                                                        )
                                                                    VALUES(
                                                                        '${bonusId}',
                                                                        '${userId}',
                                                                        '${data.employeeId}',
                                                                         ${data.payAmount},
                                                                       ${data.comment ? `'${data.comment}'` : null},
                                                                        STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                    )`;
                    pool.query(sql_query_addDetail, (err, add) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send('Your Amount is Credited Successfully');
                    })
                } else {
                    return res.status(400).send('Please Select AmountType');
                }
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

// Remove Salary History 

const removeSalariesByIds = (salaryId) => {
    return new Promise((resolve, reject) => {
        try {
            // Iterate through each salaryId in the array

            let salaryop = salaryId
            salaryop = pool.query(`SELECT salaryId FROM staff_salary_data WHERE salaryId = '${salaryId}'`, (err, row) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    reject('Database Error');;
                }
                if (row && row.length) {
                    sql_querry_getSalaryStatus = `SELECT salaryId, salaryAmount, salaryType FROM staff_salary_data WHERE salaryId = '${salaryId}'`;
                    pool.query(sql_querry_getSalaryStatus, (err, data) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            reject('Database Error');;
                        }
                        console.log(data)
                        const desiredSalaryAmount = data[0].salaryAmount;
                        const salaryStatus = data[0].salaryType
                        if (salaryStatus == 'Fine Cut') {
                            sql_querry_getFineData = `SELECT
                                                        staff_fine_data.fineId,
                                                        COALESCE(swFid.cutFineAmt,0) + COALESCE(staff_fine_data.remainFineAmount,0) AS fineAmount,
                                                        remainFineAmount AS remainFine
                                                    FROM
                                                        staff_fine_data
                                                    INNER JOIN(
                                                        SELECT
                                                            salary_salaryWiseFineId_data.fineId,
                                                            salary_salaryWiseFineId_data.cutFineAmount AS cutFineAmt
                                                        FROM
                                                            salary_salaryWiseFineId_data
                                                        WHERE
                                                            salary_salaryWiseFineId_data.salaryId = '${salaryId}'
                                                    ) AS swFid
                                                    ON
                                                        staff_fine_data.fineId = swFid.fineId
                                                    WHERE
                                                        staff_fine_data.fineId IN(
                                                        SELECT
                                                            COALESCE(fineId, NULL)
                                                        FROM
                                                            salary_salaryWiseFineId_data
                                                        WHERE
                                                            salaryId = '${salaryId}'
                                                    )
                                                    ORDER BY
                                                        fineCreationDate ASC`;
                            pool.query(sql_querry_getFineData, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    reject('Database Error');;;
                                }
                                console.log(">>>", Object.values(JSON.parse(JSON.stringify(data))));
                                const fineData = Object.values(JSON.parse(JSON.stringify(data)));
                                let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
                                console.log("fine><?", desiredAmount);
                                let totalCost = 0; // Total cost of filling the buckets

                                for (let i = 0; i < fineData.length; i++) {
                                    const fineIn = fineData[i];
                                    const availableSpace = fineIn.fineAmount - fineIn.remainFine; // Calculate the available space for the product

                                    if (desiredAmount <= availableSpace) {
                                        // If the desired amount can fit completely in the current amount in entry
                                        fineIn.remainFine += desiredAmount;
                                        totalCost += desiredAmount * fineIn.fineAmount;
                                        break; // Exit the loop since the desired amount has been inserted
                                    } else {
                                        // If the desired amount cannot fit completely in the current amount in entry
                                        fineIn.remainFine = fineIn.fineAmount;
                                        totalCost += availableSpace * fineIn.fineAmount;
                                        desiredAmount -= availableSpace;
                                    }
                                }

                                console.log("Updated fineData:", fineData);
                                const updatedFinedata = fineData.filter((obj) => {
                                    // if (obj.remainFine != obj.fineAmount) {
                                    return obj;
                                    // }
                                })

                                const sql_qurey_updatedRemainFineAmt = generateFineUpdateQuery(updatedFinedata);
                                pool.query(sql_qurey_updatedRemainFineAmt, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        reject('Database Error');;
                                    }
                                    sql_qurey_getMsdata = `SELECT
                                                                staff_monthlySalary_data.monthlySalaryId,
                                                                COALESCE(staff_monthlySalary_data.remainSalary,0) + COALESCE(msWid.cutAmt,0) AS totalAmount,
                                                                remainSalary AS remainSalary
                                                            FROM
                                                                staff_monthlySalary_data
                                                            INNER JOIN(
                                                                SELECT
                                                                    staff_msWiseSalaryId_data.monthlySalaryId,
                                                                    staff_msWiseSalaryId_data.cutSalaryAmount AS cutAmt
                                                                FROM
                                                                    staff_msWiseSalaryId_data
                                                                WHERE
                                                                    staff_msWiseSalaryId_data.salaryId = '${salaryId}'
                                                            ) AS  msWid
                                                            ON
                                                                staff_monthlySalary_data.monthlySalaryId = msWid.monthlySalaryId
                                                            WHERE
                                                                staff_monthlySalary_data.monthlySalaryId IN(
                                                                SELECT
                                                                    COALESCE(monthlySalaryId, NULL)
                                                                FROM
                                                                    staff_msWiseSalaryId_data
                                                                WHERE
                                                                    salaryId = '${salaryId}'
                                                            )
                                                            ORDER BY
                                                                msCreationDate ASC`;
                                    pool.query(sql_qurey_getMsdata, (err, data) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            reject('Database Error');;
                                        }
                                        const monthlySalaryData = Object.values(JSON.parse(JSON.stringify(data)));

                                        let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
                                        console.log("fine ms><?", desiredAmount);
                                        let totalCost = 0; // Total cost of filling the buckets

                                        for (let i = 0; i < monthlySalaryData.length; i++) {
                                            const salaryIn = monthlySalaryData[i];
                                            const availableSpace = salaryIn.totalAmount - salaryIn.remainSalary; // Calculate the available space for the product

                                            if (desiredAmount <= availableSpace) {
                                                // If the desired amount can fit completely in the current amount in entry
                                                salaryIn.remainSalary += desiredAmount;
                                                totalCost += desiredAmount * salaryIn.totalAmount;
                                                break; // Exit the loop since the desired amount has been inserted
                                            } else {
                                                // If the desired amount cannot fit completely in the current amount in entry
                                                salaryIn.remainSalary = salaryIn.totalAmount;
                                                totalCost += availableSpace * salaryIn.totalAmount;
                                                desiredAmount -= availableSpace;
                                            }
                                        }

                                        console.log("Updated monthlySalaryData:", monthlySalaryData);
                                        const updatedMsdata = monthlySalaryData.filter((obj) => {
                                            // if (obj.remainSalary != obj.totalAmount) {
                                            return obj;
                                            // }
                                        })

                                        const sql_qurey_updatedRemainmsAmt = generateMonthlyUpdateQuery(updatedMsdata);
                                        pool.query(sql_qurey_updatedRemainmsAmt, (err, data) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                reject('Database Error');;
                                            }
                                            sql_qurey_removePaySalary = `DELETE FROM staff_salary_data WHERE salaryId = '${salaryId}'`;
                                            pool.query(sql_qurey_removePaySalary, (err, data) => {
                                                if (err) {
                                                    console.error("An error occurd in SQL Queery", err);
                                                    reject('Database Error');;
                                                }
                                                resolve('FineCut Deleted Success');;
                                            })
                                        })
                                    })
                                })
                            })
                        } else if (salaryStatus == 'Advance Cut') {
                            sql_querry_getAdvanceData = `SELECT
                                                            staff_advance_data.advanceId,
                                                            COALESCE(saWid.cutAdvanceAmt,0) + COALESCE(staff_advance_data.remainAdvanceAmount,0) AS advanceAmount,
                                                            remainAdvanceAmount AS remainAdvance
                                                        FROM
                                                            staff_advance_data
                                                        INNER JOIN(
                                                            SELECT
                                                                salary_salaryWiseAdvanceId_data.advanceId,
                                                                salary_salaryWiseAdvanceId_data.cutAdvanceAmount AS cutAdvanceAmt
                                                            FROM
                                                                salary_salaryWiseAdvanceId_data
                                                            WHERE
                                                                salary_salaryWiseAdvanceId_data.salaryId = '${salaryId}'
                                                        ) AS saWid
                                                        ON
                                                            staff_advance_data.advanceId = saWid.advanceId
                                                        WHERE
                                                            staff_advance_data.advanceId IN(
                                                            SELECT
                                                                COALESCE(advanceId, NULL)
                                                            FROM
                                                                salary_salaryWiseAdvanceId_data
                                                            WHERE
                                                                salaryId = '${salaryId}'
                                                        )
                                                        ORDER BY
                                                            advanceCreationDate ASC;`;
                            pool.query(sql_querry_getAdvanceData, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    reject('Database Error');;
                                }
                                const advanceData = Object.values(JSON.parse(JSON.stringify(data)));

                                let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
                                console.log("advance ><?", desiredAmount);
                                let totalCost = 0; // Total cost of filling the buckets

                                for (let i = 0; i < advanceData.length; i++) {
                                    const advanceIn = advanceData[i];
                                    const availableSpace = advanceIn.advanceAmount - advanceIn.remainAdvance; // Calculate the available space for the product

                                    if (desiredAmount <= availableSpace) {
                                        // If the desired amount can fit completely in the current amount in entry
                                        advanceIn.remainAdvance += desiredAmount;
                                        totalCost += desiredAmount * advanceIn.advanceAmount;
                                        break; // Exit the loop since the desired amount has been inserted
                                    } else {
                                        // If the desired amount cannot fit completely in the current amount in entry
                                        advanceIn.remainAdvance = advanceIn.advanceAmount;
                                        totalCost += availableSpace * advanceIn.advanceAmount;
                                        desiredAmount -= availableSpace;
                                    }
                                }

                                console.log("Updated advanceData:", advanceData);
                                const UpdatedAdvanceData = advanceData.filter((obj) => {
                                    // if (obj.remainAdvance != obj.advanceAmount) {
                                    return obj;
                                    // }
                                })

                                const sql_qurey_updatedRemainAdvAmt = generateAdvanceUpdateQuery(UpdatedAdvanceData);
                                pool.query(sql_qurey_updatedRemainAdvAmt, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        reject('Database Error');;
                                    }
                                    sql_qurey_getMsdata = `SELECT
                                                                staff_monthlySalary_data.monthlySalaryId,
                                                                COALESCE(staff_monthlySalary_data.remainSalary,0) + COALESCE(msWid.cutAmt,0) AS totalAmount,
                                                                remainSalary AS remainSalary
                                                            FROM
                                                                staff_monthlySalary_data
                                                            INNER JOIN(
                                                                SELECT
                                                                    staff_msWiseSalaryId_data.monthlySalaryId,
                                                                    staff_msWiseSalaryId_data.cutSalaryAmount AS cutAmt
                                                                FROM
                                                                    staff_msWiseSalaryId_data
                                                                WHERE
                                                                    staff_msWiseSalaryId_data.salaryId = '${salaryId}'
                                                            ) AS  msWid
                                                            ON
                                                                staff_monthlySalary_data.monthlySalaryId = msWid.monthlySalaryId
                                                            WHERE
                                                                staff_monthlySalary_data.monthlySalaryId IN(
                                                                SELECT
                                                                    COALESCE(monthlySalaryId, NULL)
                                                                FROM
                                                                    staff_msWiseSalaryId_data
                                                                WHERE
                                                                    salaryId = '${salaryId}'
                                                            )
                                                            ORDER BY
                                                                msCreationDate ASC`;
                                    pool.query(sql_qurey_getMsdata, (err, data) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            reject('Database Error');;
                                        }
                                        const monthlySalaryData = Object.values(JSON.parse(JSON.stringify(data)));

                                        let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
                                        console.log("aad ms><?", desiredAmount);
                                        let totalCost = 0; // Total cost of filling the buckets

                                        for (let i = 0; i < monthlySalaryData.length; i++) {
                                            const salaryIn = monthlySalaryData[i];
                                            const availableSpace = salaryIn.totalAmount - salaryIn.remainSalary; // Calculate the available space for the product

                                            if (desiredAmount <= availableSpace) {
                                                // If the desired amount can fit completely in the current amount in entry
                                                salaryIn.remainSalary += desiredAmount;
                                                totalCost += desiredAmount * salaryIn.totalAmount;
                                                break; // Exit the loop since the desired amount has been inserted
                                            } else {
                                                // If the desired amount cannot fit completely in the current amount in entry
                                                salaryIn.remainSalary = salaryIn.totalAmount;
                                                totalCost += availableSpace * salaryIn.totalAmount;
                                                desiredAmount -= availableSpace;
                                            }
                                        }

                                        console.log("Updated monthlySalaryData:", monthlySalaryData);

                                        const sql_qurey_updatedRemainmsAmt = generateMonthlyUpdateQuery(monthlySalaryData);
                                        pool.query(sql_qurey_updatedRemainmsAmt, (err, data) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                reject('Database Error');;
                                            }
                                            sql_qurey_removePaySalary = `DELETE FROM staff_salary_data WHERE salaryId = '${salaryId}'`;
                                            pool.query(sql_qurey_removePaySalary, (err, data) => {
                                                if (err) {
                                                    console.error("An error occurd in SQL Queery", err);
                                                    reject('Database Error');;
                                                }
                                                resolve('AdvanceCut Deleted Success');
                                            })
                                        })
                                    })
                                })
                            })
                        } else {
                            sql_qurey_getMsdata = `SELECT
                                                        staff_monthlySalary_data.monthlySalaryId,
                                                        COALESCE(staff_monthlySalary_data.remainSalary,0) + COALESCE(msWid.cutAmt,0) AS totalAmount,
                                                        remainSalary AS remainSalary
                                                    FROM
                                                        staff_monthlySalary_data
                                                    INNER JOIN(
                                                        SELECT
                                                            staff_msWiseSalaryId_data.monthlySalaryId,
                                                            staff_msWiseSalaryId_data.cutSalaryAmount AS cutAmt
                                                        FROM
                                                            staff_msWiseSalaryId_data
                                                        WHERE
                                                            staff_msWiseSalaryId_data.salaryId = '${salaryId}'
                                                    ) AS  msWid
                                                    ON
                                                        staff_monthlySalary_data.monthlySalaryId = msWid.monthlySalaryId
                                                    WHERE
                                                        staff_monthlySalary_data.monthlySalaryId IN(
                                                        SELECT
                                                            COALESCE(monthlySalaryId, NULL)
                                                        FROM
                                                            staff_msWiseSalaryId_data
                                                        WHERE
                                                            salaryId = '${salaryId}'
                                                    )
                                                    ORDER BY
                                                        msCreationDate ASC`;
                            pool.query(sql_qurey_getMsdata, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    reject('Database Error');;
                                }
                                const monthlySalaryData = Object.values(JSON.parse(JSON.stringify(data)));

                                let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
                                console.log("ms ><?", desiredSalaryAmount);
                                let totalCost = 0; // Total cost of filling the buckets

                                for (let i = 0; i < monthlySalaryData.length; i++) {
                                    const salaryIn = monthlySalaryData[i];
                                    const availableSpace = salaryIn.totalAmount - salaryIn.remainSalary; // Calculate the available space for the product

                                    if (desiredAmount <= availableSpace) {
                                        // If the desired amount can fit completely in the current amount in entry
                                        salaryIn.remainSalary += desiredAmount;
                                        totalCost += desiredAmount * salaryIn.totalAmount;
                                        break; // Exit the loop since the desired amount has been inserted
                                    } else {
                                        // If the desired amount cannot fit completely in the current amount in entry
                                        salaryIn.remainSalary = salaryIn.totalAmount;
                                        totalCost += availableSpace * salaryIn.totalAmount;
                                        desiredAmount -= availableSpace;
                                    }
                                }

                                console.log("Updated monthlySalaryData:", monthlySalaryData);
                                const updatedmsData = monthlySalaryData.filter((obj) => {
                                    // if (obj.remainSalary != obj.totalAmount) {
                                    return obj;
                                    // }
                                })
                                console.log('?>?>', updatedmsData);
                                const sql_qurey_updatedRemainmsAmt = generateMonthlyUpdateQuery(updatedmsData);
                                pool.query(sql_qurey_updatedRemainmsAmt, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        reject('Database Error');;
                                    }
                                    sql_qurey_removePaySalary = `DELETE FROM staff_salary_data WHERE salaryId = '${salaryId}'`;
                                    pool.query(sql_qurey_removePaySalary, (err, data) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            reject('Database Error');
                                        }
                                        resolve('salary Deleted Success');
                                    })
                                })
                            })
                        }
                    })
                } else {
                    console.log(`Transaction Not Found ${salaryId}`)
                    reject('Transaction Not Found');
                }
            })
            console.log(`Transaction Deleted Successfully for salaryId: ${salaryId}`);
        } catch (error) {
            console.error('An error occurred', error);
            reject('Internal Server Error');
        }
    })
}

const removeSalaryTranction = (req, res) => {
    try {
        const transactionId = req.query.transactionId;
        if (!transactionId) {
            return res.status(401).send('Please Fill TransactionId')
        }
        req.query.transactionId = pool.query(`SELECT remainSalaryId FROM staff_remainSalaryHistory_data WHERE remainSalaryId = '${transactionId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            console.log(row, row.length);
            if (row && row.length) {
                sql_querry_getSalartIdBytransactionId = `SELECT salaryId FROM staff_salary_data WHERE remainSalaryId = '${transactionId}'`;
                pool.query(sql_querry_getSalartIdBytransactionId, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const ids = data;
                    const salaryIdArray = ids.map((obj) => {
                        return obj.salaryId
                    })
                    const salaryIdsToRemove = salaryIdArray;
                    const sql_querry_removeRemainSalary = `DELETE FROM staff_remainSalaryHistory_data WHERE remainSalaryId = '${transactionId}'`;
                    if (salaryIdsToRemove.length > 0) {
                        if (salaryIdsToRemove.length == 3) {
                            Promise.all(
                                [removeSalariesByIds(salaryIdsToRemove[0])]
                            ).then(() => {
                                Promise.all(
                                    [removeSalariesByIds(salaryIdsToRemove[1])]
                                ).then(() => {
                                    Promise.all(
                                        [removeSalariesByIds(salaryIdsToRemove[2])]
                                    ).then(() => {
                                        pool.query(sql_querry_removeRemainSalary, (err, datas) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                return res.status(500).send('Database Error');
                                            }
                                            return res.status(200).send('Transaction Deleted SuccessFullu');
                                        })
                                    }).catch((error) => {
                                        return res.status(400).send(error);
                                    })
                                }).catch((error) => {
                                    return res.status(400).send(error);
                                })
                            }).catch((error) => {
                                return res.status(400).send(error);
                            })
                        } else if (salaryIdsToRemove.length == 2) {
                            Promise.all(
                                [removeSalariesByIds(salaryIdsToRemove[0])]
                            ).then(() => {
                                Promise.all(
                                    [removeSalariesByIds(salaryIdsToRemove[1])]

                                ).then(() => {
                                    pool.query(sql_querry_removeRemainSalary, (err, datas) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
                                        return res.status(200).send('Transaction Deleted SuccessFullu');
                                    })
                                }).catch((error) => {
                                    return res.status(400).send(error);
                                })
                            }).catch((error) => {
                                return res.status(400).send(error);
                            })
                        } else if (salaryIdsToRemove.length == 1) {
                            Promise.all(
                                [removeSalariesByIds(salaryIdsToRemove[0])]
                            ).then(() => {
                                pool.query(sql_querry_removeRemainSalary, (err, datas) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    return res.status(200).send('Transaction Deleted SuccessFullu');
                                })
                            }).catch((error) => {
                                return res.status(400).send(error);
                            })
                        }
                    } else {
                        return res.status(401).send('Array is Empty');
                    }
                })
            } else {
                return res.status(401).send('TransactionId Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Credit Amount 

const removeCreditTransaction = (req, res) => {
    try {
        const creditId = req.query.creditId
        req.query.stockOutId = pool.query(`SELECT cafId FROM staff_creditAdvanceFine_data WHERE cafId = '${creditId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                sql_querry_getSalaryStatus = `SELECT cafId ,creditAmount ,creditType FROM staff_creditAdvanceFine_data WHERE cafId = '${creditId}'`;
                console.log('joooaaa', sql_querry_getSalaryStatus);
                pool.query(sql_querry_getSalaryStatus, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const creditType = data[0].creditType
                    const creditAmount = data[0].creditAmount
                    if (creditType == 'Advance') {
                        sql_querry_getAdvanceData = `SELECT
                                                        staff_advance_data.advanceId,
                                                        crWid.cutAmt AS advanceAmount,
                                                        remainAdvanceAmount AS remainAdvance
                                                    FROM
                                                        staff_advance_data
                                                    INNER JOIN(
                                                        SELECT
                                                            staff_creditWiseAdvanceId_data.advanceId,
                                                            staff_creditWiseAdvanceId_data.cutCreditAmount AS cutAmt
                                                        FROM
                                                            staff_creditWiseAdvanceId_data
                                                        WHERE
                                                            staff_creditWiseAdvanceId_data.creditId = '${creditId}'
                                                    ) AS crWid
                                                    ON
                                                        staff_advance_data.advanceId = crWid.advanceId
                                                    WHERE
                                                        staff_advance_data.advanceId IN(
                                                            SELECT
                                                                COALESCE(advanceId, NULL)
                                                            FROM
                                                                staff_creditWiseAdvanceId_data
                                                            WHERE
                                                                creditId = '${creditId}'
                                                        )
                                                    ORDER BY
                                                        advanceCreationDate ASC;`;
                        pool.query(sql_querry_getAdvanceData, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            const advanceData = Object.values(JSON.parse(JSON.stringify(data)));

                            let desiredAmount = creditAmount; // Desired amount to be inserted into the buckets
                            console.log("><?", desiredAmount);
                            let totalCost = 0; // Total cost of filling the buckets

                            for (let i = 0; i < advanceData.length; i++) {
                                const advanceIn = advanceData[i];
                                const availableSpace = advanceIn.advanceAmount - advanceIn.remainAdvance; // Calculate the available space for the product

                                if (desiredAmount <= availableSpace) {
                                    // If the desired amount can fit completely in the current amount in entry
                                    advanceIn.remainAdvance += desiredAmount;
                                    totalCost += desiredAmount * advanceIn.advanceAmount;
                                    break; // Exit the loop since the desired amount has been inserted
                                } else {
                                    // If the desired amount cannot fit completely in the current amount in entry
                                    advanceIn.remainAdvance = advanceIn.advanceAmount;
                                    totalCost += availableSpace * advanceIn.advanceAmount;
                                    desiredAmount -= availableSpace;
                                }
                            }

                            console.log("Updated advanceData:", advanceData);
                            const UpdatedAdvanceData = advanceData.filter((obj) => {
                                // if (obj.remainAdvance != obj.advanceAmount) {
                                return obj;
                                // }
                            })

                            const sql_qurey_updatedRemainAdvAmt = generateAdvanceUpdateQuery(UpdatedAdvanceData);
                            pool.query(sql_qurey_updatedRemainAdvAmt, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                sql_qurey_removeCredit = `DELETE FROM staff_creditAdvanceFine_data WHERE cafId = '${creditId}'`;
                                pool.query(sql_qurey_removeCredit, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    return res.status(200).send('Transaction Deleted Successfully');
                                })
                            })
                        })
                    } else if (creditType == 'Fine') {
                        sql_querry_getFineData = `SELECT
                                                    staff_fine_data.fineId,
                                                    crWid.cutAmt AS fineAmount,
                                                    remainFineAmount AS remainFine
                                                FROM
                                                    staff_fine_data
                                                INNER JOIN(
                                                    SELECT
                                                        staff_creditWiseFineId_data.fineId,
                                                        staff_creditWiseFineId_data.cutCreditAmount AS cutAmt
                                                    FROM
                                                        staff_creditWiseFineId_data
                                                    WHERE
                                                        staff_creditWiseFineId_data.creditId = '${creditId}'
                                                ) AS crWid
                                                ON
                                                    staff_fine_data.fineId = crWid.fineId
                                                WHERE
                                                    staff_fine_data.fineId IN(
                                                    SELECT
                                                        COALESCE(fineId, NULL)
                                                    FROM
                                                        staff_creditWiseFineId_data
                                                    WHERE
                                                        creditId = '${creditId}'
                                                )
                                                ORDER BY
                                                    fineCreationDate ASC`;
                        pool.query(sql_querry_getFineData, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            console.log(">>>", Object.values(JSON.parse(JSON.stringify(data))));
                            const fineData = Object.values(JSON.parse(JSON.stringify(data)));
                            let desiredAmount = creditAmount; // Desired amount to be inserted into the buckets
                            console.log("><?", desiredAmount);
                            let totalCost = 0; // Total cost of filling the buckets

                            for (let i = 0; i < fineData.length; i++) {
                                const fineIn = fineData[i];
                                const availableSpace = fineIn.fineAmount - fineIn.remainFine; // Calculate the available space for the product

                                if (desiredAmount <= availableSpace) {
                                    // If the desired amount can fit completely in the current amount in entry
                                    fineIn.remainFine += desiredAmount;
                                    totalCost += desiredAmount * fineIn.fineAmount;
                                    break; // Exit the loop since the desired amount has been inserted
                                } else {
                                    // If the desired amount cannot fit completely in the current amount in entry
                                    fineIn.remainFine = fineIn.fineAmount;
                                    totalCost += availableSpace * fineIn.fineAmount;
                                    desiredAmount -= availableSpace;
                                }
                            }

                            console.log("Updated fineData:", fineData);
                            const updatedFinedata = fineData.filter((obj) => {
                                // if (obj.remainFine != obj.fineAmount) {
                                return obj;
                                // }
                            })

                            const sql_qurey_updatedRemainFineAmt = generateFineUpdateQuery(updatedFinedata);
                            pool.query(sql_qurey_updatedRemainFineAmt, (err, data) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                sql_qurey_removeCredit = `DELETE FROM staff_creditAdvanceFine_data WHERE cafId = '${creditId}'`;
                                pool.query(sql_qurey_removeCredit, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    return res.status(200).send('Transaction Deleted Successfully');
                                })
                            })
                        })
                    }
                })
            }
            else {
                return res.send('Transaction Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Employee Active Or Inactive API

const updateEmployeeStatus = (req, res, next) => {
    try {
        const employeeStatus = req.body.employeeStatus;
        const payStatus = req.body.payStatus;
        const proratedSalary = req.body.proratedSalary ? req.body.proratedSalary : 0;
        const data = {
            employeeId: req.body.employeeId,
            payAmount: req.body.payAmount,
            totalSalary: req.body.totalSalary ? req.body.totalSalary : 0,
            fineAmount: req.body.fineAmount ? req.body.fineAmount : 0,
            advanceAmount: req.body.advanceAmount ? req.body.advanceAmount : 0,
            paymentDue: req.body.paymentDue ? req.body.paymentDue : 0,
            amountType: req.body.amountType,
            comment: req.body.comment ? req.body.comment.trim() : null,
            amountDate: new Date(req.body.amountDate ? req.body.amountDate : "10/10/1001").toString().slice(4, 15)
        }
        if (!data.employeeId) {
            return res.status(401).send('EmployeeId Not Found');
        }
        sql_querry_getEmployeeJoiningDate = `SELECT employeeJoiningDate FROM staff_employee_data WHERE employeeId = '${data.employeeId}'`;
        pool.query(sql_querry_getEmployeeJoiningDate, (err, result) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const joiningDate = new Date(result[0].employeeJoiningDate).toString().slice(4, 15);
            if (employeeStatus == false) {
                if (proratedSalary != 0) {
                    sql_querry_addHalfMonthlySalary = `INSERT INTO staff_monthlySalary_data (employeeId, totalSalary, remainSalary, maxLeave, remainLeave, msStartDate, msEndDate)
                                                        VALUES ('${data.employeeId}',${proratedSalary},${proratedSalary},0,0,STR_TO_DATE('${joiningDate}','%b %d %Y'),DATE_SUB(CURDATE(), INTERVAL 1 DAY))`;
                } else {
                    sql_querry_addHalfMonthlySalary = `SELECT * FROM staff_employee_data`;
                }
                pool.query(sql_querry_addHalfMonthlySalary, (err, result) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    sql_querry_updateStatus = `UPDATE staff_employee_data SET employeeStatus = false WHERE employeeId = '${data.employeeId}'`;
                    pool.query(sql_querry_updateStatus, (err, result) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        if (payStatus == true) {
                            req.data = data; // Set data as a property of req
                            next(); // Move to the next middleware or route handler
                        } else {
                            return res.status(200).send('Employee Inactivated');
                        }
                    })
                })
            } else {
                sql_querry_updateActiveEmployeeStatus = `UPDATE staff_employee_data SET 
                                                                    employeeJoiningDate = CURDATE(), 
                                                                    employeeStatus = TRUE
                                                        WHERE
                                                            employeeId = '${data.employeeId}'`;
                pool.query(sql_querry_updateActiveEmployeeStatus, (err, result) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send('Employee Activated');
                })
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update fine Status

const updateFineStatus = (req, res) => {
    try {
        const fineId = req.query.fineId;
        const employeeId = req.query.employeeId;
        const fineStatus = req.query.fineStatus;
        if (fineStatus == true) {
            sql_querry_updatefineStatus = `UPDATE staff_fine_data SET fineStatus = true WHERE fineId = '${fineId}' AND employeeId = '${employeeId}'`;
        } else {
            sql_querry_updatefineStatus = `UPDATE staff_fine_data SET fineStatus = false WHERE fineId = '${fineId}' AND employeeId = '${employeeId}'`;
        }
        pool.query(sql_querry_updatefineStatus, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send('Fine Status Updated');
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Advance

const removeAdvanceTransaction = (req, res) => {
    try {
        const advanceId = req.query.advanceId;
        req.query.advanceId = pool.query(`SELECT advanceId FROM staff_advance_data WHERE advanceId = '${advanceId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                sql_querry_removedetails = `DELETE FROM staff_advance_data WHERE advanceId = '${advanceId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Advance Deleted Successfully");
                })
            } else {
                return res.status(400).send('Id is Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Fine

const removeFineTransaction = (req, res) => {
    try {
        const fineId = req.query.fineId;
        req.query.fineId = pool.query(`SELECT fineId FROM staff_fine_data WHERE fineId = '${fineId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                sql_querry_removedetails = `DELETE FROM staff_fine_data WHERE fineId = '${advanceId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Fine Deleted Successfully");
                })
            } else {
                return res.status(400).send('Id is Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Remove Bonus

const removeBonusTransaction = (req, res) => {
    try {
        const bonusId = req.query.bonusId;
        req.query.bonusId = pool.query(`SELECT bonusId FROM staff_bonus_data WHERE bonusId = '${bonusId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                sql_querry_removedetails = `DELETE FROM staff_bonus_data WHERE bonusId = '${bonusId}'`;
                pool.query(sql_querry_removedetails, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Bonus Deleted Successfully");
                })
            } else {
                return res.status(400).send('Id is Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

const removeMonthlySalary = (req, res) => {
    try {
        const monthlySalaryId = req.query.monthlySalaryId;
        req.query.monthlySalaryId = pool.query(`SELECT monthlySalaryId, employeeId FROM staff_monthlySalary_data WHERE monthlySalaryId = '${monthlySalaryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                const employeeId = row[0].employeeId;
                sql_querry_chkStatus = `SELECT employeeStatus FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
                pool.query(sql_querry_chkStatus, (err, chks) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const status = chks[0].employeeStatus;
                    console.log(status);
                    if (status == 0) {
                        sql_querry_removedetails = `DELETE FROM staff_monthlySalary_data WHERE monthlySalaryId = '${monthlySalaryId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("Monthly Salary Deleted Successfully");
                        })
                    } else {
                        return res.status(500).send('Employee Is Active, You can Not Update Monthly Salary');
                    }
                })
            } else {
                return res.status(400).send('Id is Not Found');
            }
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// updateFine Transaction

const updateFineTransaction = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const uid1 = new Date();
            const newfineId = String("fine_" + uid1.getTime());
            const fineId = req.query.fineId;
            const fineReduceAmt = req.query.fineReduceAmt;
            sql_get_oldFineAmt = `SELECT employeeId, reason, remainFineAmount, DATE_FORMAT(fineDate, '%d-%b-%Y') AS fineDate FROM staff_fine_data WHERE fineId = '${fineId}'`;
            pool.query(sql_get_oldFineAmt, (err, data) => {
                if (err) {
                    console.error("An error occurd in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                const remainFineAmt = data[0].remainFineAmount ? data[0].remainFineAmount : 0;
                const employeeId = data[0].employeeId;
                const oldReson = data[0].reason ? data[0].reason : null;
                const fineDate = data[0].fineDate;
                const newFineAmt = remainFineAmt - fineReduceAmt;
                console.log(remainFineAmt, ' ?', employeeId, ' ?', oldReson, ' ?', fineDate, ' ?', newFineAmt);
                if (remainFineAmt != 0) {
                    sql_querry_updateFine = `UPDATE
                                                staff_fine_data
                                            SET
                                                userId = '${userId}',
                                                fineAmount = ${fineReduceAmt},
                                                remainFineAmount = ${fineReduceAmt},
                                                fineStatus = true
                                            WHERE fineId = '${fineId}'`;
                    pool.query(sql_querry_updateFine, (err, result) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        sql_querry_addRemainFine = `INSERT INTO staff_fine_data (
                                                                                    fineId,
                                                                                    userId,
                                                                                    employeeId,
                                                                                    fineAmount,
                                                                                    remainFineAmount,
                                                                                    fineStatus,
                                                                                    reason,
                                                                                    reduceFineReson,
                                                                                    fineDate
                                                                                )
                                                                                VALUES(
                                                                                    '${newfineId}',
                                                                                    '${userId}',
                                                                                    '${employeeId}',
                                                                                    ${newFineAmt},
                                                                                    ${newFineAmt},
                                                                                    false,
                                                                                    NULLIF('${oldReson}','null'),
                                                                                    'Reduce From Rs. ${remainFineAmt} Fine',
                                                                                    STR_TO_DATE('${fineDate}','%d-%b-%Y')
                                                                                )`;
                        pool.query(sql_querry_addRemainFine, (err, addResult) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send('Fine Amount is Reduce SuccessFully');
                        })
                    })
                } else {
                    return res.status(401).send('Fine Amount is 0, You Can not Reduce');
                }
            })
        } else {
            res.status(401).send("Please Login First.....!");
        }
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

// Update Monthly Salary

const updateMonthlySalary = (req, res) => {
    try {
        let token;
        token = req.headers.authorization.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id.id;
            const userRights = decoded.id.rights;
            if (userRights == 1) {
                const monthlySalaryId = req.query.monthlySalaryId;
                const msEndDate = new Date(req.query.msEndDate).toString().slice(4, 15);

                sql_calculate_proratedSalaey = `SELECT
                                                    staff_monthlySalary_data.employeeId,
                                                    (remainLeave - sed.maxleave) AS remainMaxLeave,
                                                    (
                                                        (
                                                        SELECT
                                                            COALESCE(
                                                                SUM(staff_leave_data.numLeave),
                                                                0
                                                            )
                                                        FROM
                                                            staff_leave_data
                                                        WHERE
                                                            employeeId = staff_monthlySalary_data.employeeId AND staff_leave_data.leaveDate BETWEEN staff_monthlySalary_data.msStartDate AND staff_monthlySalary_data.msEndDate
                                                    )
                                                    ) AS takenLaeave,
                                                    sed.salary,
                                                    FLOOR(
                                                        sed.salary / DAY(
                                                            LAST_DAY(
                                                                staff_monthlySalary_data.msStartDate
                                                            )
                                                        )
                                                    ) AS perDaySalary,
                                                    DATEDIFF(
                                                        DATE_FORMAT(
                                                            STR_TO_DATE('${msEndDate}', '%b %d %Y'),
                                                            '%Y/%m/%d'
                                                        ),
                                                        staff_monthlySalary_data.msStartDate
                                                    ) AS numOfDay
                                                FROM
                                                    staff_monthlySalary_data
                                                INNER JOIN(
                                                    SELECT
                                                        employeeId,
                                                        salary,
                                                        maxLeave
                                                    FROM
                                                        staff_employee_data
                                                ) AS sed
                                                ON
                                                    staff_monthlySalary_data.employeeId = sed.employeeId
                                                WHERE
                                                    monthlySalaryId = ${monthlySalaryId}`;
                console.log(sql_calculate_proratedSalaey);
                pool.query(sql_calculate_proratedSalaey, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const remainMaxLeave = data[0].remainMaxLeave;
                    const takenLaeave = data[0].takenLaeave;
                    const perDaySalary = data[0].perDaySalary;
                    const numOfDay = data[0].numOfDay;
                    const leaveCalculate = remainMaxLeave - takenLaeave < 0 ? remainMaxLeave - takenLaeave : 0;
                    const proratedSalary = (numOfDay * perDaySalary) + (leaveCalculate * perDaySalary);
                    const employeeId = data[0].employeeId;
                    console.log(proratedSalary, employeeId);
                    sql_querry_chkStatus = `SELECT employeeStatus FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
                    pool.query(sql_querry_chkStatus, (err, chks) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const status = chks[0].employeeStatus;
                        console.log(status);
                        if (status == 0) {
                            sql_querry_updateMonthlySalary = `UPDATE
                                                            staff_monthlySalary_data
                                                        SET
                                                            totalSalary = ${proratedSalary},
                                                            remainSalary = ${proratedSalary},
                                                            maxLeave = ${remainMaxLeave},
                                                            remainLeave = 0,
                                                            msEndDate =  DATE_FORMAT(DATE_SUB(STR_TO_DATE('${msEndDate}', '%b %d %Y'), INTERVAL 1 DAY), '%Y/%m/%d')
                                                        WHERE
                                                            monthlySalaryId = ${monthlySalaryId}`;
                            pool.query(sql_querry_updateMonthlySalary, (err, result) => {
                                if (err) {
                                    console.error("An error occurd in SQL Queery", err);
                                    return res.status(500).send('Database Error');
                                }
                                return res.status(200).send('Monthly Salary Updated SuccessFully');
                            })
                        } else {
                            return res.status(500).send('Employee Is Active, You can Not Update Monthly Salary');
                        }
                    })
                    return res.status(200).send('Monthly Salary Updated SuccessFully');
                })
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

module.exports = {
    addAmountOfSFA,
    removeSalaryTranction,
    removeCreditTransaction,
    updateEmployeeStatus,
    updateFineStatus,
    removeAdvanceTransaction,
    removeBonusTransaction,
    removeFineTransaction,
    removeMonthlySalary,
    updateFineTransaction,
    updateMonthlySalary
}
