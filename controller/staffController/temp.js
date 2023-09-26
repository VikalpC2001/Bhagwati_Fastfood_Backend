const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { generateToken } = require('../../utils/genrateToken');

const getCutSalaryDataById = (req, res) => {
    try {
        const salaryIds = ['cutFine_1694764903219', 'cutFine_1694764903219', 'salary_1694764903219'];
        if (!salaryIds || !Array.isArray(salaryIds)) {
            return res.status(400).send('Invalid salaryIds');
        }

        const results = [];
        console.log(results)

        const fetchSalaryData = (index) => {
            if (index >= salaryIds.length) {
                // All data has been fetched, return the results
                return res.status(200).send(results);
            }

            const salaryId = salaryIds[index];

            const sql_query_getRemainSalaryId = `SELECT salaryId, remainSalaryId FROM staff_salary_data WHERE salaryId = '${salaryId}'`;

            pool.query(sql_query_getRemainSalaryId, (err, row) => {
                if (err) {
                    console.error("An error occurred in SQL Query", err);
                    return res.status(500).send('Database Error');
                }

                if (row?.[0]?.salaryId?.length) {
                    const remainSalaryId = row[0].remainSalaryId;
                    var sql_queries_getRemainSalaryData = `SELECT
                                                    remainSalaryAmt,
                                                    lastRemainAmt,
                                                    remainAdvanceAmt,
                                                    lastAdvanceAmt,
                                                    remainFineAmt,
                                                    lastFineAmt
                                                FROM
                                                    staff_remainSalaryHistory_data
                                                WHERE remainSalaryId = '${remainSalaryId}'`;
                    pool.query(sql_queries_getRemainSalaryData, (err, result) => {
                        if (err) {
                            console.error("An error occurd in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        const remainSalaryAmt = result[0].lastRemainAmt;
                        const remainAdvanceAmt = result[0].lastAdvanceAmt;
                        const remainFineAmt = result[0].lastFineAmt;
                        sql_queries_getCutSalaryData = `SELECT
                                                        staff_msWiseSalaryId_data.monthlySalaryId,
                                                        DATE_FORMAT(
                                                            staff_monthlySalary_data.msStartDate,
                                                            '%b %Y'
                                                        ) AS monthYear,
                                                        staff_monthlySalary_data.totalSalary AS originalTotalSalary,
                                                        staff_monthlySalary_data.totalSalary AS totalSalary,
                                                        cutSalaryAmount
                                                    FROM
                                                        staff_msWiseSalaryId_data
                                                    INNER JOIN staff_monthlySalary_data ON staff_monthlySalary_data.monthlySalaryId = staff_msWiseSalaryId_data.monthlySalaryId
                                                    WHERE salaryId = '${salaryId}';
                                                    SELECT
                                                        salary_salaryWiseAdvanceId_data.advanceId,
                                                        staff_advance_data.advanceAmount,
                                                        staff_advance_data.advanceAmount AS remainAdvanceAmount,
                                                        cutAdvanceAmount,
                                                        DATE_FORMAT(staff_advance_data.advanceDate,'%d-%b-%Y') AS advanceDate
                                                    FROM
                                                        salary_salaryWiseAdvanceId_data
                                                    INNER JOIN staff_advance_data ON staff_advance_data.advanceId = salary_salaryWiseAdvanceId_data.advanceId
                                                    WHERE salaryId = '${salaryId}';
                                                    SELECT
                                                        salary_salaryWiseFineId_data.fineId,
                                                        staff_fine_data.fineAmount,
                                                        staff_fine_data.fineAmount AS remainFineAmount,
                                                        cutFineAmount,
                                                        DATE_FORMAT(staff_fine_data.fineDate,'%d-%b-%Y') AS fineDate
                                                    FROM
                                                        salary_salaryWiseFineId_data
                                                    INNER JOIN staff_fine_data ON staff_fine_data.fineId = salary_salaryWiseFineId_data.fineId
                                                    WHERE salaryId = '${salaryId}'`;
                        pool.query(sql_queries_getCutSalaryData, (err, data) => {
                            if (err) {
                                console.error("An error occurd in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            const monthlySalaryCut = data[0][0];
                            if (monthlySalaryCut && monthlySalaryCut.length > 0) {
                                monthlySalaryCut[0][0].totalSalary = remainSalaryAmt;
                            }
                            const advanceSalaryCut = data[1][0];
                            if (advanceSalaryCut && advanceSalaryCut.length > 0) {
                                advanceSalaryCut[1][0].remainAdvanceAmount = remainAdvanceAmt;
                            }
                            const fineSalaryCut = data[2][0];
                            if (fineSalaryCut && fineSalaryCut.length > 0) {
                                fineSalaryCut[2][0].remainFineAmount = remainFineAmt;
                            }
                            results.push({ salaryId, monthlySalaryCut, advanceSalaryCut, fineSalaryCut });
                        })
                    })

                    // Fetch data for the next salaryId
                    fetchSalaryData(index + 1);
                } else {
                    // SalaryId not found, skip to the next one
                    fetchSalaryData(index + 1);
                }
            });
        };

        // Start fetching data for the first salaryId
        fetchSalaryData(0);
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    getCutSalaryDataById
}
