const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { generateToken } = require('../../utils/genrateToken');
const { calculateDueSalary } = require('../staffController/employee.controller');
const { colorToComponents } = require('pdf-lib');

function generateMonthlyUpdateQuery(data) {
    let query = 'UPDATE staff_monthlySalary_data\nSET remainSalary = CASE\n';

    data.forEach((item) => {
        const { monthlySalaryId, remainSalary } = item;
        query += `    WHEN monthlySalaryId = '${monthlySalaryId}' THEN ${remainSalary}\n`;
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
        query += `    WHEN advanceId = '${advanceId}' THEN ${remainAdvance}\n`;
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
        query += `    WHEN fineId = '${fineId}' THEN ${remainFine}\n`;
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
                // calculateDueSalary(data.employeeId)
                //     .then((data) => {

                const salaryAmtWOAdv = data.totalSalary - data.payAmount;
                const remainSalaryAmtWOAdv = salaryAmtWOAdv - data.fineAmount;
                //     })
                if (req.body.amountType == '1') {
                    if ((data.fineAmount > 0 || data.advanceAmount > 0) && salaryAmtWOAdv > 0) {
                        if (data.fineAmount > 0) {
                            if (salaryAmtWOAdv <= data.fineAmount) {
                                console.log('fine moto');
                                sql_querry_getFinedetail = `SELECT fineId, fineAmount,remainFineAmount AS remainFine FROM staff_fine_data WHERE employeeId = '${data.employeeId}' AND remainFineAmount != 0 ORDER BY fineDate ASC`;
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
                                        const totalCutamountOffine = data.fineAmount - sumOfRemainFine;
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
                                            if (req.body.amountType == '1') {
                                                sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                    if (err) {
                                                        console.error("An error occurd in SQL Queery", err);
                                                        return res.status(500).send('Database Error');
                                                    }
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
                                                    const msWiseSid = () => {

                                                        var string = ''
                                                        swMsId.forEach((data, index) => {
                                                            if (index == 0)
                                                                string = "(" + "'" + cutFine + "'" + "," + string + "'" + data + "'" + ")";
                                                            else
                                                                string = string + ",(" + "'" + cutFine + "'" + "," + "'" + data + "'" + ")";
                                                        });
                                                        return string;

                                                    }
                                                    // console.log(">?>?>/////", msWiseSid())
                                                    sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                                const msWiseSid = () => {

                                                                    var string = ''
                                                                    swFId.forEach((data, index) => {
                                                                        if (index == 0)
                                                                            string = "(" + "'" + salaryId + "'" + "," + string + "'" + data + "'" + ")";
                                                                        else
                                                                            string = string + ",(" + "'" + salaryId + "'" + "," + "'" + data + "'" + ")";
                                                                    });
                                                                    return string;

                                                                }
                                                                console.log(">?>?>/////", msWiseSid())
                                                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                                        COALESCE(fineId, NULL) AS fineId
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
                                    sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                    pool.query(sql_querry_getFinedetail, (err, datas) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
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
                                        // console.log(swFId);
                                        const msWiseSid = () => {

                                            var string = ''
                                            swFId.forEach((data, index) => {
                                                if (index == 0)
                                                    string = "(" + "'" + cutFine + "'" + "," + string + data + ")";
                                                else
                                                    string = string + ",(" + "'" + cutFine + "'" + "," + data + ")";
                                            });
                                            return string;

                                        }
                                        // console.log(">?>?>/////", msWiseSid())
                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                    if (remainSalaryAmtWOAdv <= data.advanceAmount) {
                                                        console.log('fine pachi advance moto');
                                                        sql_querry_getAdvanceDetails = `SELECT advanceId, advanceAmount, remainAdvanceAmount AS remainAdvance FROM staff_advance_data WHERE employeeId = '${data.employeeId}' AND remainAdvanceAmount != 0 ORDER BY advanceDate ASC`;
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
                                                            // console.log(">?>?>/////", sallaryWiseAdvanceId())
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

                                                                    sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                                    pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                        if (err) {
                                                                            console.error("An error occurd in SQL Queery", err);
                                                                            return res.status(500).send('Database Error');
                                                                        }
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
                                                                        const msWiseSid = () => {

                                                                            var string = ''
                                                                            swFId.forEach((data, index) => {
                                                                                if (index == 0)
                                                                                    string = "(" + "'" + cutAdvance + "'" + "," + string + "'" + data + "'" + ")";
                                                                                else
                                                                                    string = string + ",(" + "'" + cutAdvance + "'" + "," + "'" + data + "'" + ")";
                                                                            });
                                                                            return string;

                                                                        }
                                                                        console.log(">?>?>/////", msWiseSid())
                                                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                                                    const msWiseSid = () => {

                                                                                        var string = ''
                                                                                        swFId.forEach((data, index) => {
                                                                                            if (index == 0)
                                                                                                string = "(" + "'" + salaryId + "'" + "," + string + "'" + data + "'" + ")";
                                                                                            else
                                                                                                string = string + ",(" + "'" + salaryId + "'" + "," + "'" + data + "'" + ")";
                                                                                        });
                                                                                        return string;

                                                                                    }
                                                                                    // console.log(">?>?>/////", msWiseSid())
                                                                                    sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                            // console.log('><><><', sallaryWiseAllAdvanceId());
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
                                                                     ${data.advanceAmount},
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
                                                                // console.log('All Advance Is Done');
                                                            })
                                                            sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                                            pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                                if (err) {
                                                                    console.error("An error occurd in SQL Queery", err);
                                                                    return res.status(500).send('Database Error');
                                                                }
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
                                                                const msWiseSid = () => {

                                                                    var string = ''
                                                                    swFId.forEach((data, index) => {
                                                                        if (index == 0)
                                                                            string = "(" + "'" + cutAdvance + "'" + "," + string + "'" + data + "'" + ")";
                                                                        else
                                                                            string = string + ",(" + "'" + cutAdvance + "'" + "," + "'" + data + "'" + ")";
                                                                    });
                                                                    return string;

                                                                }
                                                                // console.log(">?>?>/////", msWiseSid())
                                                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                                            const msWiseSid = () => {

                                                                                var string = ''
                                                                                swFId.forEach((data, index) => {
                                                                                    if (index == 0)
                                                                                        string = "(" + "'" + salaryId + "'" + "," + string + "'" + data + "'" + ")";
                                                                                    else
                                                                                        string = string + ",(" + "'" + salaryId + "'" + "," + "'" + data + "'" + ")";
                                                                                });
                                                                                return string;

                                                                            }
                                                                            // console.log(">?>?>/////", msWiseSid())
                                                                            sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                        const msWiseSid = () => {

                                                            var string = ''
                                                            swFId.forEach((data, index) => {
                                                                if (index == 0)
                                                                    string = "(" + "'" + salaryId + "'" + "," + string + "'" + data + "'" + ")";
                                                                else
                                                                    string = string + ",(" + "'" + salaryId + "'" + "," + "'" + data + "'" + ")";
                                                            });
                                                            return string;

                                                        }
                                                        console.log(">?>?>/////", msWiseSid())
                                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                    // console.log('><><><', sallaryWiseAllFineId());
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
                                                                     ${data.fineAmount},
                                                                    'Fine Cut',
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                );
                                                                INSERT INTO salary_salaryWiseFineId_data (salaryId, fineId) VALUES ${sallaryWiseAllFineId()}`
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

                                            sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                            pool.query(sql_querry_getFinedetail, (err, datas) => {
                                                if (err) {
                                                    console.error("An error occurd in SQL Queery", err);
                                                    return res.status(500).send('Database Error');
                                                }
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
                                                const msWiseSid = () => {

                                                    var string = ''
                                                    swFId.forEach((data, index) => {
                                                        if (index == 0)
                                                            string = "(" + "'" + cutAdvance + "'" + "," + string + "'" + data + "'" + ")";
                                                        else
                                                            string = string + ",(" + "'" + cutAdvance + "'" + "," + "'" + data + "'" + ")";
                                                    });
                                                    return string;

                                                }
                                                console.log(">?>?>/////", msWiseSid())
                                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                            const msWiseSid = () => {

                                                                var string = ''
                                                                swFId.forEach((data, index) => {
                                                                    if (index == 0)
                                                                        string = "(" + "'" + salaryId + "'" + "," + string + "'" + data + "'" + ")";
                                                                    else
                                                                        string = string + ",(" + "'" + salaryId + "'" + "," + "'" + data + "'" + ")";
                                                                });
                                                                return string;

                                                            }
                                                            console.log(">?>?>/////", msWiseSid())
                                                            sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                                     ${data.advanceAmount},
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
                                    sql_querry_getFinedetail = `SELECT monthlySalaryId, totalSalary, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE employeeId = '${data.employeeId}' AND remainSalary != 0 ORDER BY msStartDate ASC`;
                                    pool.query(sql_querry_getFinedetail, (err, datas) => {
                                        if (err) {
                                            console.error("An error occurd in SQL Queery", err);
                                            return res.status(500).send('Database Error');
                                        }
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
                                        const msWiseSid = () => {

                                            var string = ''
                                            swFId.forEach((data, index) => {
                                                if (index == 0)
                                                    string = "(" + "'" + cutAdvance + "'" + "," + string + "'" + data + "'" + ")";
                                                else
                                                    string = string + ",(" + "'" + cutAdvance + "'" + "," + "'" + data + "'" + ")";
                                            });
                                            return string;

                                        }
                                        console.log(">?>?>/////", msWiseSid())
                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                    const msWiseSid = () => {

                                                        var string = ''
                                                        swFId.forEach((data, index) => {
                                                            if (index == 0)
                                                                string = "(" + "'" + salaryId + "'" + "," + string + "'" + data + "'" + ")";
                                                            else
                                                                string = string + ",(" + "'" + salaryId + "'" + "," + "'" + data + "'" + ")";
                                                        });
                                                        return string;

                                                    }
                                                    console.log(">?>?>/////", msWiseSid())
                                                    sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                                                    NULLIF('${data.comment}','null'),
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
                                        const msWiseSid = () => {

                                            var string = ''
                                            swFId.forEach((data, index) => {
                                                if (index == 0)
                                                    string = "(" + "'" + salaryId + "'" + "," + string + "'" + data + "'" + ")";
                                                else
                                                    string = string + ",(" + "'" + salaryId + "'" + "," + "'" + data + "'" + ")";
                                            });
                                            return string;

                                        }
                                        console.log(">?>?>/////", msWiseSid())
                                        sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                                const msWiseSid = () => {

                                    var string = ''
                                    swFId.forEach((data, index) => {
                                        if (index == 0)
                                            string = "(" + "'" + salaryId + "'" + "," + string + "'" + data + "'" + ")";
                                        else
                                            string = string + ",(" + "'" + salaryId + "'" + "," + "'" + data + "'" + ")";
                                    });
                                    return string;

                                }
                                console.log(">?>?>/////", msWiseSid())
                                sql_querry_addmsFid = `INSERT INTO staff_msWiseSalaryId_data (salaryId, monthlySalaryId) VALUES ${msWiseSid()}`
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
                }
                if (req.body.amountType == '1' || req.body.amountType == '2' || req.body.amountType == '3') {
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
                    if (data.payAmount != 0) {
                        if (req.body.amountType == '1') {
                            if (data.totalSalary > 0) {
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
                                                                    ${salaryAmtWOAdv < 0 ? data.totalSalary : data.payAmount},
                                                                    'Salary Pay',
                                                                    NULLIF('${data.comment}','null'),
                                                                    STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                )`
                            } else {
                                return res.status(200).send("Advance Added SuccsessFully");
                            }
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
                            const creditWiseAdvanceId = () => {

                                var string = ''
                                swAId.forEach((data, index) => {
                                    if (index == 0)
                                        string = "(" + "'" + creditId + "'" + "," + string + "'" + data + "'" + ")";
                                    else
                                        string = string + ",(" + "'" + creditId + "'" + "," + "'" + data + "'" + ")";
                                });
                                return string;

                            }
                            console.log(">?>?>/////", creditWiseAdvanceId())
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
                                                                                                NULLIF('${data.comment}','null'),
                                                                                                STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                                            );
                                                   INSERT INTO staff_creditWiseAdvanceId_data (creditId, advanceId) VALUES ${creditWiseAdvanceId()}`
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
                    if (data.fineAmount > 0 && data.fineAmount >= data.payAmount) {
                        sql_querry_getFinedetail = `SELECT fineId, fineAmount,remainFineAmount AS remainFine FROM staff_fine_data WHERE employeeId = '${data.employeeId}' AND remainFineAmount != 0 ORDER BY fineDate ASC`;
                        pool.query(sql_querry_getFinedetail, (err, datas) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
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
                            const creditWiseFineId = () => {

                                var string = ''
                                swFId.forEach((data, index) => {
                                    if (index == 0)
                                        string = "(" + "'" + creditId + "'" + "," + string + "'" + data + "'" + ")";
                                    else
                                        string = string + ",(" + "'" + creditId + "'" + "," + "'" + data + "'" + ")";
                                });
                                return string;

                            }
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
                                                                                                NULLIF('${data.comment}','null'),
                                                                                                STR_TO_DATE('${data.amountDate}','%b %d %Y')
                                                                                            );
                                                   INSERT INTO staff_creditWiseFineId_data (creditId, fineId) VALUES ${creditWiseFineId()}`
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

const removeSalaryHistory = (req, res) => {
    try {
        const salaryId = req.query.salaryId
        req.query.stockOutId = pool.query(`SELECT salaryId FROM staff_salary_data WHERE salaryId = '${salaryId}'`, (err, row) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            if (row && row.length) {
                sql_querry_getSalaryStatus = `SELECT salaryId, salaryAmount, salaryType FROM staff_salary_data WHERE salaryId = '${salaryId}'`;
                pool.query(sql_querry_getSalaryStatus, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const desiredSalaryAmount = data[0].salaryAmount
                    const salaryStatus = data[0].salaryType
                    if (salaryStatus == 'Fine Cut') {
                        sql_querry_getFineData = `SELECT fineId, fineAmount ,remainFineAmount AS remainFine FROM staff_fine_data Where fineId IN (SELECT COALESCE(fineId,null) FROM salary_salaryWiseFineId_data WHERE salaryId = '${salaryId}') ORDER BY fineCreationDate ASC`;
                        pool.query(sql_querry_getFineData, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            console.log(">>>", Object.values(JSON.parse(JSON.stringify(data))));
                            const fineData = Object.values(JSON.parse(JSON.stringify(data)));
                            let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
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
                                sql_qurey_getMsdata = `SELECT monthlySalaryId, totalSalary AS totalAmount, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE monthlySalaryId IN (SELECT COALESCE(monthlySalaryId,null) FROM staff_msWiseSalaryId_data WHERE salaryId = '${salaryId}') ORDER BY msCreationDate ASC`;
                                pool.query(sql_qurey_getMsdata, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    const monthlySalaryData = Object.values(JSON.parse(JSON.stringify(data)));

                                    let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
                                    console.log("><?", desiredAmount);
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
                                            return res.status(500).send('Database Error');
                                        }
                                        sql_qurey_removePaySalary = `DELETE FROM staff_salary_data WHERE salaryId = '${salaryId}'`;
                                        pool.query(sql_qurey_removePaySalary, (err, data) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                return res.status(500).send('Database Error');
                                            }
                                            return res.status(200).send('Transaction Deleted Successfully');
                                        })
                                    })
                                })
                            })
                        })
                    } else if (salaryStatus == 'Advance Cut') {
                        sql_querry_getAdvanceData = `SELECT advanceId, advanceAmount AS advanceAmount, remainAdvanceAmount AS remainAdvance FROM staff_advance_data WHERE advanceId IN (SELECT COALESCE(advanceId,null) FROM salary_salaryWiseAdvanceId_data WHERE salaryId = '${salaryId}') ORDER BY advanceCreationDate ASC`;
                        pool.query(sql_querry_getAdvanceData, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            const advanceData = Object.values(JSON.parse(JSON.stringify(data)));

                            let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
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
                                sql_qurey_getMsdata = `SELECT monthlySalaryId, totalSalary AS totalAmount, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE monthlySalaryId IN (SELECT COALESCE(monthlySalaryId,null) FROM staff_msWiseSalaryId_data WHERE salaryId = '${salaryId}') ORDER BY msCreationDate ASC`;
                                pool.query(sql_qurey_getMsdata, (err, data) => {
                                    if (err) {
                                        console.error("An error occurd in SQL Queery", err);
                                        return res.status(500).send('Database Error');
                                    }
                                    const monthlySalaryData = Object.values(JSON.parse(JSON.stringify(data)));

                                    let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
                                    console.log("><?", desiredAmount);
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
                                            return res.status(500).send('Database Error');
                                        }
                                        sql_qurey_removePaySalary = `DELETE FROM staff_salary_data WHERE salaryId = '${salaryId}'`;
                                        pool.query(sql_qurey_removePaySalary, (err, data) => {
                                            if (err) {
                                                console.error("An error occurd in SQL Queery", err);
                                                return res.status(500).send('Database Error');
                                            }
                                            return res.status(200).send('Transaction Deleted Successfully');
                                        })
                                    })
                                })
                            })
                        })
                    } else {
                        sql_qurey_getMsdata = `SELECT monthlySalaryId, totalSalary AS totalAmount, remainSalary AS remainSalary FROM staff_monthlySalary_data WHERE monthlySalaryId IN (SELECT COALESCE(monthlySalaryId,null) FROM staff_msWiseSalaryId_data WHERE salaryId = '${salaryId}') ORDER BY msCreationDate ASC`;
                        pool.query(sql_qurey_getMsdata, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            const monthlySalaryData = Object.values(JSON.parse(JSON.stringify(data)));

                            let desiredAmount = desiredSalaryAmount; // Desired amount to be inserted into the buckets
                            console.log("><?", desiredAmount);
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
                                    return res.status(500).send('Database Error');
                                }
                                sql_qurey_removePaySalary = `DELETE FROM staff_salary_data WHERE salaryId = '${salaryId}'`;
                                pool.query(sql_qurey_removePaySalary, (err, data) => {
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
            } else {
                return res.send('Transaction Not Found');
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
                pool.query(sql_querry_getSalaryStatus, (err, data) => {
                    if (err) {
                        console.error("An error occurd in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    const creditType = data[0].creditType
                    const creditAmount = data[0].creditAmount
                    if (creditType == 'Advance') {
                        sql_querry_getAdvanceData = `SELECT advanceId, advanceAmount AS advanceAmount, remainAdvanceAmount AS remainAdvance FROM staff_advance_data WHERE advanceId IN (SELECT COALESCE(advanceId,null) FROM staff_creditWiseAdvanceId_data WHERE creditId = '${creditId}') ORDER BY advanceCreationDate ASC`;
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
                        sql_querry_getFineData = `SELECT fineId, fineAmount ,remainFineAmount AS remainFine FROM staff_fine_data Where fineId IN (SELECT COALESCE(fineId,null) FROM staff_creditWiseFineId_data WHERE creditId = '${creditId}') ORDER BY fineCreationDate ASC`;
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
        const proratedSalary = req.body.proratedSalary;
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
        sql_querry_getEmployeeJoiningDate = `SELECT employeeJoiningDate FROM staff_employee_data WHERE employeeId = '${data.employeeId}'`;
        pool.query(sql_querry_getEmployeeJoiningDate, (err, result) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            const joiningDate = new Date(result[0].employeeJoiningDate).toString().slice(4, 15);
            if (employeeStatus == false) {
                sql_querry_addHalfMonthlySalary = `INSERT INTO staff_monthlySalary_data (employeeId, totalSalary, remainSalary, msStartDate, msEndDate)
                                                   VALUES ('${data.employeeId}','${proratedSalary}','${proratedSalary}',STR_TO_DATE('${joiningDate}','%b %d %Y'),CURDATE())`;
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

module.exports = {
    addAmountOfSFA,
    removeSalaryHistory,
    removeCreditTransaction,
    updateEmployeeStatus
}

// SELECT
// smsd.employeeId,
//     smsd.msStartDate,
//     smsd.msEndDate,
//     (DATEDIFF(
//         smsd.msEndDate,
//         smsd.msStartDate
//     ) + 1
//         - (
//             SELECT
//         COALESCE(SUM(sl.numLeave),
//                 0)
// FROM
//         staff_leave_data sl
// WHERE
// sl.employeeId = smsd.employeeId AND sl.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
// )) AS totalNumLeave
// FROM
//     staff_monthlySalary_data smsd;

