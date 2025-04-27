const pool = require('../../database');
const jwt = require("jsonwebtoken");
const excelJS = require("exceljs");
const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

function formatMonthYear(inputDate) {
    const dateObj = new Date(inputDate);

    // Define an array of month names
    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Get the month and year from the date object
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();

    // Format the date as "Month - YYYY"
    const formattedDate = `${month} - ${year}`;

    return formattedDate;
}

// Export Excel For Employee Table

const exportExcelSheetForEmployeeMonthlySalaryDataById = (req, res) => {

    const employeeId = req.query.employeeId;
    const startMonth = req.query.startMonth;
    const endMonth = req.query.endMonth;

    const commonQuery = `SELECT
                            smsd.monthlySalaryId,
                            smsd.totalSalary,
                            smsd.remainSalary,
                            smsd.maxLeave,
                            COALESCE(FLOOR(e.salary / DAY(msEndDate)),0) AS perDaySalary,
                            DATE_FORMAT(msStartDate, '%d-%m-%Y') AS startDate,
                            DATE_FORMAT(smsd.msStartDate, '%M %Y') AS salaryMonth,
                            CONCAT(
                                DATE_FORMAT(msStartDate, '%d-%b-%Y'),
                                ' To ',
                                DATE_FORMAT(msEndDate, '%d-%b-%Y')
                            ) AS monthDate,
                            COALESCE(
                                (
                                SELECT
                                    SUM(sld.numLeave)
                                FROM
                                    staff_leave_data AS sld
                                WHERE
                                    sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                            ),
                            0
                            ) AS takenLeaves,
                            COALESCE(
                                (
                                SELECT
                                    (
                                        DATEDIFF(
                                            smsd.msEndDate,
                                            smsd.msStartDate
                                        ) + 1 - COALESCE(SUM(sld.numLeave),
                                        0)
                                    )
                                FROM
                                    staff_leave_data AS sld
                                WHERE
                                    sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                            ),
                            0
                            ) AS presentDays,
                            COALESCE(
                                (
                                SELECT
                                    SUM(sad.advanceAmount)
                                FROM
                                    staff_advance_data AS sad
                                WHERE
                                    sad.employeeId = '${employeeId}' AND sad.advanceDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                            ),
                            0
                            ) AS amountOfAdvance,
                            COALESCE(
                                (
                                SELECT
                                    SUM(sfd.fineAmount)
                                FROM
                                    staff_fine_data AS sfd
                                WHERE
                                    sfd.employeeId = '${employeeId}' AND sfd.fineDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                            ),
                            0
                            ) AS amountOfFine,
                        -- Calculate remaining available leave days (maxLeave - takenLeaves)
                        CASE WHEN smsd.maxLeave -(
                            SELECT
                                COALESCE(SUM(sld.numLeave),
                                0)
                            FROM
                                staff_leave_data AS sld
                            WHERE
                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                        ) < 0 THEN ABS(
                            smsd.maxLeave -(
                            SELECT
                                COALESCE(SUM(sld.numLeave),
                                0)
                            FROM
                                staff_leave_data AS sld
                            WHERE
                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                        )
                        ) ELSE 0
                        END AS extraLeaves,
                        -- Calculate total remaining salary
                        (
                            CASE WHEN smsd.maxLeave -(
                            SELECT
                                COALESCE(SUM(sld.numLeave),
                                0)
                            FROM
                                staff_leave_data AS sld
                            WHERE
                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                        ) < 0 THEN ABS(
                            smsd.maxLeave -(
                            SELECT
                                COALESCE(SUM(sld.numLeave),
                                0)
                            FROM
                                staff_leave_data AS sld
                            WHERE
                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                        )
                        ) ELSE 0
                        END
                        ) *(
                            COALESCE(FLOOR(e.salary / 30),
                            0)
                        ) AS deductionSalaryOfLeave
                        FROM
                            staff_monthlySalary_data AS smsd
                        JOIN staff_employee_data AS e
                        ON
                            smsd.employeeId = e.employeeId`;
    if (req.query.startMonth && req.query.endMonth) {
        sql_queries_getdetails = `${commonQuery} 
                                    WHERE smsd.employeeId = '${employeeId}' AND DATE_FORMAT(msEndDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY smsd.msStartDate DESC`;
    } else {
        sql_queries_getdetails = `${commonQuery} 
                                    WHERE smsd.employeeId = '${employeeId}' 
                                    ORDER BY smsd.msStartDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Monthly Salary List"); // New Worksheet

        if (req.query.startMonth && req.query.endMonth) {
            worksheet.mergeCells('A1', 'L1');
            worksheet.getCell('A1').value = `Monthly Salary From ${startMonth} To ${endMonth}`;
        } else {
            worksheet.mergeCells('A1', 'L1');
            worksheet.getCell('A1').value = `Monthly Salary All Data`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Salary Month', 'Salary', 'Remain Salary', 'Per Day Salary', 'Max Leave', 'Taken Leave', 'Extra Leave', 'Deduction Salary', 'Advance Amount', 'Fine Amount', 'Working Days'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "salaryMonth", width: 20 },
            { key: "totalSalary", width: 20 },
            { key: "remainSalary", width: 20 },
            { key: "perDaySalary", width: 20 },
            { key: "maxLeave", width: 20 },
            { key: "takenLeaves", width: 20 },
            { key: "extraLeaves", width: 20 },
            { key: "deductionSalaryOfLeave", width: 20 },
            { key: "amountOfAdvance", width: 20 },
            { key: "amountOfFine", width: 20 },
            { key: "presentDays", width: 20 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            { formula: `SUM(C3:C${arr.length + 2})` },
            { formula: `SUM(D3:D${arr.length + 2})` },
            '',
            { formula: `SUM(F3:F${arr.length + 2})` },
            { formula: `SUM(G3:G${arr.length + 2})` },
            { formula: `SUM(H3:H${arr.length + 2})` },
            { formula: `SUM(I3:I${arr.length + 2})` },
            { formula: `SUM(J3:J${arr.length + 2})` },
            { formula: `SUM(K3:K${arr.length + 2})` },
            { formula: `SUM(L3:L${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForAdvanceData = (req, res) => {

    const employeeId = req.query.employeeId;
    const startMonth = req.query.startMonth;
    const endMonth = req.query.endMonth;

    const commanQuarryOfAdvance = `SELECT
                                    advanceId,
                                    user_details.userName AS givenBy,
                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                    advanceAmount,
                                    remainAdvanceAmount,
                                    advanceComment,
                                    advanceDate AS sortAdvance,
                                    DATE_FORMAT(advanceDate,'%d-%b-%Y') AS advanceDate,
                                    DATE_FORMAT(advanceCreationDate,'%h:%i %p') AS givenTime
                                FROM
                                    staff_advance_data
                                LEFT JOIN user_details ON user_details.userId = staff_advance_data.userId`;
    if (req.query.startMonth && req.query.endMonth) {
        sql_queries_getdetails = `${commanQuarryOfAdvance}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(advanceDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY sortAdvance DESC, advanceCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfAdvance}
                                    WHERE employeeId = '${employeeId}'
                                    ORDER BY sortAdvance DESC, advanceCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Advance List"); // New Worksheet

        if (req.query.startMonth && req.query.endMonth) {
            worksheet.mergeCells('A1', 'G1');
            worksheet.getCell('A1').value = `Advanve Salary From ${startMonth} To ${endMonth}`;
        } else {
            worksheet.mergeCells('A1', 'G1');
            worksheet.getCell('A1').value = `Advance Salary All Data`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Advance Amt.', 'Remain Advance Amt.', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "advanceAmount", width: 20 },
            { key: "remainAdvanceAmount", width: 25 },
            { key: "advanceComment", width: 30 },
            { key: "advanceDate", width: 20 },
            { key: "givenTime", width: 10 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            { formula: `SUM(C3:C${arr.length + 2})` },
            { formula: `SUM(D3:D${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForFineData = (req, res) => {

    const employeeId = req.query.employeeId;
    const startMonth = req.query.startMonth;
    const endMonth = req.query.endMonth;
    const fineStatus = req.query.fineStatus;

    const commanQuarryOfFine = `SELECT
                                    fineId,
                                    user_details.userName AS givenBy,
                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                    fineAmount,
                                    remainFineAmount,
                                    fineStatus,
                                    fineDate AS sortFine,
                                    IF(fineStatus = 1, 'Consider', 'Ignore') AS fineStatusName,
                                    CONCAT(COALESCE(reason,''),IF(reason != '' AND reduceFineReson != '',', ',''),COALESCE(reduceFineReson,'')) AS reason,
                                    DATE_FORMAT(fineDate, '%d-%b-%Y') AS fineDate,
                                    DATE_FORMAT(fineCreationDate, '%h:%i %p') AS givenTime
                                FROM
                                    staff_fine_data
                                LEFT JOIN user_details ON user_details.userId = staff_fine_data.userId`;
    if (req.query.startMonth && req.query.endMonth && req.query.fineStatus) {
        sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE employeeId = '${employeeId}' AND fineStatus = ${fineStatus} AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY sortFine DESC ,fineCreationDate DESC`;
    } else if (req.query.startMonth && req.query.endMonth) {
        sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY sortFine DESC ,fineCreationDate DESC`;
    } else if (req.query.fineStatus) {
        sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE employeeId = '${employeeId}' AND fineStatus = ${fineStatus}
                                    ORDER BY sortFine DESC ,fineCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE employeeId = '${employeeId}'
                                    ORDER BY sortFine DESC ,fineCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Fine List"); // New Worksheet

        if (req.query.startMonth && req.query.endMonth) {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Fine From ${startMonth} To ${endMonth}`;
        } else {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `All Fine Data`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Fine Amt.', 'Remain Fine Amt.', 'Status', 'Reasone', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "fineAmount", width: 20 },
            { key: "remainFineAmount", width: 20 },
            { key: "fineStatusName", width: 20 },
            { key: "reason", width: 30 },
            { key: "fineDate", width: 20 },
            { key: "givenTime", width: 10 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            { formula: `SUM(C3:C${arr.length + 2})` },
            { formula: `SUM(D3:D${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForBonusData = (req, res) => {

    const employeeId = req.query.employeeId;
    const startMonth = req.query.startMonth;
    const endMonth = req.query.endMonth;

    const commanQuarryOfBonus = `SELECT
                                    bonusId,
                                    user_details.userName AS givenBy,
                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                    bonusAmount,
                                    bonusComment,
                                    bonusDate AS sortBonus,
                                    DATE_FORMAT(bonusDate, '%d-%b-%Y') AS bonusDate,
                                    DATE_FORMAT(bonusCreationDate, '%h:%i %p') AS givenTime
                                FROM
                                    staff_bonus_data
                                LEFT JOIN user_details ON user_details.userId = staff_bonus_data.userId`;
    if (req.query.startMonth && req.query.endMonth) {
        sql_queries_getdetails = `${commanQuarryOfBonus}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(bonusDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY sortBonus DESC, bonusCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfBonus}
                                    WHERE employeeId = '${employeeId}'
                                    ORDER BY sortBonus DESC, bonusCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Bonus List"); // New Worksheet

        if (req.query.startMonth && req.query.endMonth) {
            worksheet.mergeCells('A1', 'F1');
            worksheet.getCell('A1').value = `Bonus From ${startMonth} To ${endMonth}`;
        } else {
            worksheet.mergeCells('A1', 'F1');
            worksheet.getCell('A1').value = `All Bonus Data`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Bonus Amt.', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "bonusAmount", width: 20 },
            { key: "bonusComment", width: 30 },
            { key: "bonusDate", width: 20 },
            { key: "givenTime", width: 10 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            { formula: `SUM(C3:C${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForCreditData = (req, res) => {

    const employeeId = req.query.employeeId;
    const startMonth = req.query.startMonth;
    const endMonth = req.query.endMonth;

    const commanQuarryOfCreditData = `SELECT
                                        cafId,
                                        user_details.userName AS givenBy,
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                        creditAmount,
                                        creditType,
                                        creditComent,
                                        creditDate AS sortCredit,
                                        DATE_FORMAT(creditDate, '%d-%b-%Y') AS creditDate,
                                        DATE_FORMAT(creditCreationDate, '%h:%i %p') AS givenTime 
                                    FROM
                                        staff_creditAdvanceFine_data
                                    LEFT JOIN user_details ON user_details.userId = staff_creditAdvanceFine_data.userId`;
    if (req.query.startMonth && req.query.endMonth) {
        sql_queries_getdetails = `${commanQuarryOfCreditData}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(creditDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY sortCredit DESC ,creditCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfCreditData}
                                    WHERE employeeId = '${employeeId}'
                                    ORDER BY sortCredit DESC ,creditCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Credit List"); // New Worksheet

        if (req.query.startMonth && req.query.endMonth) {
            worksheet.mergeCells('A1', 'G1');
            worksheet.getCell('A1').value = `Credit From ${startMonth} To ${endMonth}`;
        } else {
            worksheet.mergeCells('A1', 'G1');
            worksheet.getCell('A1').value = `All Credit Data`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Credit Amt.', 'Type', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "creditAmount", width: 20 },
            { key: "creditType", width: 20 },
            { key: "creditComent", width: 30 },
            { key: "creditDate", width: 20 },
            { key: "givenTime", width: 10 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            { formula: `SUM(C3:C${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForLeaveData = (req, res) => {

    const employeeId = req.query.employeeId;
    const startMonth = req.query.startMonth;
    const endMonth = req.query.endMonth;

    const commanQuarryOfLeave = `SELECT
                                    leaveId,
                                   	user_details.userName AS givenBy,
                                	CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                    numLeave,
                                    leaveReason,
                                    leaveDate AS sortLeave,
                                    DATE_FORMAT(leaveDate,'%d-%m-%Y') AS dateLeave,
                                    DATE_FORMAT(leaveDate,'%W, %d %M %Y') AS leaveDate
                                FROM
                                    staff_leave_data
                                LEFT JOIN user_details ON user_details.userId = staff_leave_data.userId`;
    if (req.query.startMonth && req.query.endMonth) {
        sql_queries_getdetails = `${commanQuarryOfLeave}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(leaveDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY sortLeave DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfLeave}
                                    WHERE employeeId = '${employeeId}'
                                    ORDER BY sortLeave DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Leave List"); // New Worksheet

        if (req.query.startMonth && req.query.endMonth) {
            worksheet.mergeCells('A1', 'E1');
            worksheet.getCell('A1').value = `Leave From ${startMonth} To ${endMonth}`;
        } else {
            worksheet.mergeCells('A1', 'E1');
            worksheet.getCell('A1').value = `All Leave Data`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Num. Of Leave', 'Reason', 'Date'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "numLeave", width: 20 },
            { key: "leaveReason", width: 30 },
            { key: "leaveDate", width: 30 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            { formula: `SUM(C3:C${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForTransactionData = (req, res) => {

    const employeeId = req.query.employeeId;
    const startMonth = req.query.startMonth;
    const endMonth = req.query.endMonth;

    const commanTransactionQuarry = `SELECT
                                        remainSalaryId,
                                        RIGHT(remainSalaryId,10) AS trasactionId,
                                        user_details.userName AS givenBy,
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END),0) AS advanceCut,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END),0) AS fineCut,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END),0) AS salaryPay,
                                        salaryComment,
                                        salaryDate AS sortSalary,
                                        DATE_FORMAT(salaryDate,'%W, %d %M %Y') AS salaryDate,
                                        DATE_FORMAT(salaryCreationDate,'%h:%i %p') AS salaryTime
                                    FROM
                                        staff_salary_data
                                    LEFT JOIN user_details ON user_details.userId = staff_salary_data.userId`;
    if (req.query.startMonth && req.query.endMonth) {
        sql_queries_getdetails = `${commanTransactionQuarry}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(staff_salary_data.salaryDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    GROUP BY remainSalaryId
                                    ORDER BY sortSalary DESC, salaryCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanTransactionQuarry}
                                    WHERE employeeId = '${employeeId}'
                                    GROUP BY remainSalaryId
                                    ORDER BY sortSalary DESC, salaryCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Tranction List"); // New Worksheet

        if (req.query.startMonth && req.query.endMonth) {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `Transaction From ${startMonth} To ${endMonth}`;
        } else {
            worksheet.mergeCells('A1', 'I1');
            worksheet.getCell('A1').value = `All Transaction Data`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Transaction Id', 'Given By', 'Salary Pay', 'Advance Cut', 'Fine Cut', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "trasactionId", width: 20 },
            { key: "userName", width: 20 },
            { key: "salaryPay", width: 23 },
            { key: "advanceCut", width: 23 },
            { key: "fineCut", width: 23 },
            { key: "salaryComment", width: 40 },
            { key: "salaryDate", width: 30 },
            { key: "salaryTime", width: 10 },

        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            '',
            { formula: `SUM(D3:D${arr.length + 2})` },
            { formula: `SUM(E3:E${arr.length + 2})` },
            { formula: `SUM(F3:F${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

// Export Excel Table For All Payment Data

const exportExcelSheetForAllTransactionData = (req, res) => {

    const searchNumber = req.query.searchNumber;
    var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
    var firstDay = new Date(y, m, 1).toString().slice(4, 15);
    var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
    const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
    const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
    const commanTransactionQuarry = `SELECT
                                        remainSalaryId,
                                        RIGHT(remainSalaryId,10) AS trasactionId,
                                        user_details.userName AS givenBy,
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                        sed.employeeNickName AS employeeName,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryId END),null) AS cutAdvanceId,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryId END),null) AS cutFineId,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryId END),null) AS salaryId,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END),0) AS advanceCut,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END),0) AS fineCut,
                                        COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END),0) AS salaryPay,
                                        salaryComment,
                                        salaryDate AS sortSalary,
                                        DATE_FORMAT(salaryDate,'%W, %d %M %Y') AS salaryDate,
                                        DATE_FORMAT(salaryCreationDate,'%h:%i %p') AS salaryTime
                                    FROM
                                        staff_salary_data
                                    LEFT JOIN user_details ON user_details.userId = staff_salary_data.userId
                                    INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_salary_data.employeeId`;
    if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE staff_salary_data.salaryDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                GROUP BY remainSalaryId
                                                ORDER BY sortSalary DESC, salaryCreationDate DESC`;
    } else if (req.query.searchNumber) {
        console.log('hyy2');
        sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE remainSalaryId LIKE '%` + searchNumber + `%'
                                                GROUP BY remainSalaryId
                                                ORDER BY sortSalary DESC, salaryCreationDate DESC`;
    } else {
        console.log('hyy3');
        sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE staff_salary_data.salaryDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY remainSalaryId
                                                ORDER BY salaryDate DESC, salaryCreationDate DESC`;
    }
    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Tranction List"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'J1');
            worksheet.getCell('A1').value = `Transaction From ${startDate} To ${endDate}`;
        } else {
            worksheet.mergeCells('A1', 'J1');
            worksheet.getCell('A1').value = `Transaction From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Transaction Id', 'Given By', 'Employee', 'Salary Pay', 'Advance Cut', 'Fine Cut', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "trasactionId", width: 20 },
            { key: "userName", width: 20 },
            { key: "employeeName", width: 20 },
            { key: "salaryPay", width: 23 },
            { key: "advanceCut", width: 23 },
            { key: "fineCut", width: 23 },
            { key: "salaryComment", width: 40 },
            { key: "salaryDate", width: 30 },
            { key: "salaryTime", width: 10 },

        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            '',
            '',
            { formula: `SUM(E3:E${arr.length + 2})` },
            { formula: `SUM(F3:F${arr.length + 2})` },
            { formula: `SUM(G3:G${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForAllAdvanceData = (req, res) => {

    var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
    var firstDay = new Date(y, m, 1).toString().slice(4, 15);
    var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
    const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
    const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

    const commanQuarryOfAdvance = `SELECT
                                        advanceId,
                                        user_details.userName AS givenBy,
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                        sed.employeeNickName AS employeeName,
                                        advanceAmount,
                                        remainAdvanceAmount,
                                        advanceComment,
                                        advanceDate AS sortAdvance,
                                        DATE_FORMAT(advanceDate,'%d-%b-%Y') AS advanceDate,
                                        DATE_FORMAT(advanceCreationDate,'%h:%i %p') AS givenTime
                                    FROM
                                        staff_advance_data
                                    LEFT JOIN user_details ON user_details.userId = staff_advance_data.userId
                                    INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_advance_data.employeeId`;
    if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarryOfAdvance}
                                    WHERE advanceDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY sortAdvance DESC, advanceCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfAdvance}
                                    WHERE advanceDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY sortAdvance DESC, advanceCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Advance List"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Advanve Salary From ${startDate} To ${endDate}`;
        } else {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Advanve Salary From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Employee', 'Advance Amt.', 'Remain Advance Amt.', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "EmployeeName", width: 20 },
            { key: "advanceAmount", width: 20 },
            { key: "remainAdvanceAmount", width: 25 },
            { key: "advanceComment", width: 30 },
            { key: "advanceDate", width: 20 },
            { key: "givenTime", width: 10 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            '',
            { formula: `SUM(D3:D${arr.length + 2})` },
            { formula: `SUM(E3:E${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForAllFineData = (req, res) => {

    var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
    var firstDay = new Date(y, m, 1).toString().slice(4, 15);
    var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
    const fineStatus = req.query.fineStatus;
    const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
    const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

    const commanQuarryOfFine = `SELECT
                                    fineId,
                                    user_details.userName AS givenBy,
                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                    sed.employeeNickName AS employeeName,
                                    staff_fine_data.employeeId AS employeeId,
                                    fineAmount,
                                    remainFineAmount,
                                    fineStatus,
                                    IF(fineStatus = 1, 'Consider', 'Ignore') AS fineStatusName,
                                    reason,
                                    reduceFineReson,
                                    fineDate AS sortFine,
                                    DATE_FORMAT(fineDate, '%d-%b-%Y') AS fineDate,
                                    DATE_FORMAT(fineCreationDate, '%h:%i %p') AS givenTime
                                FROM
                                    staff_fine_data
                                LEFT JOIN user_details ON user_details.userId = staff_fine_data.userId
                                INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_fine_data.employeeId`;
    if (req.query.startDate && req.query.endDate && req.query.fineStatus) {
        sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE fineStatus = ${fineStatus} AND fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY sortFine DESC ,fineCreationDate DESC`;
    } else if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY sortFine DESC ,fineCreationDate DESC`;
    } else if (req.query.fineStatus) {
        sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE fineStatus = ${fineStatus}
                                    ORDER BY sortFine DESC ,fineCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE fineDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY sortFine DESC ,fineCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Fine List"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Fine From ${startDate} To ${endDate}`;
        } else {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Fine From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Employee', 'Fine Amt.', 'Remain Fine Amt.', 'Status', 'Reasone', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "employeeName", width: 20 },
            { key: "fineAmount", width: 20 },
            { key: "remainFineAmount", width: 20 },
            { key: "fineStatusName", width: 20 },
            { key: "reason", width: 30 },
            { key: "fineDate", width: 20 },
            { key: "givenTime", width: 10 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            '',
            { formula: `SUM(D3:D${arr.length + 2})` },
            { formula: `SUM(E3:E${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForAllBonusData = (req, res) => {

    var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
    var firstDay = new Date(y, m, 1).toString().slice(4, 15);
    var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
    const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
    const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

    const commanQuarryOfBonus = `SELECT
                                    bonusId,
                                    user_details.userName AS givenBy,
                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                    sed.employeeNickName AS employeeName,
                                    bonusAmount,
                                    bonusComment,
                                    bonusDate AS sortBonus,
                                    DATE_FORMAT(bonusDate, '%d-%b-%Y') AS bonusDate,
                                    DATE_FORMAT(bonusCreationDate, '%h:%i %p') AS givenTime
                                FROM
                                    staff_bonus_data
                                LEFT JOIN user_details ON user_details.userId = staff_bonus_data.userId
                                INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_bonus_data.employeeId`;
    if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarryOfBonus}
                                    WHERE bonusDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY sortBonus DESC, bonusCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfBonus}
                                    WHERE bonusDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY sortBonus DESC, bonusCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Bonus List"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'G1');
            worksheet.getCell('A1').value = `Bonus From ${startDate} To ${endDate}`;
        } else {
            worksheet.mergeCells('A1', 'G1');
            worksheet.getCell('A1').value = `Bonus From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Employee', 'Bonus Amt.', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "Employee", width: 20 },
            { key: "bonusAmount", width: 20 },
            { key: "bonusComment", width: 30 },
            { key: "bonusDate", width: 20 },
            { key: "givenTime", width: 10 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            '',
            { formula: `SUM(D3:D${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForAllCreditData = (req, res) => {

    var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
    var firstDay = new Date(y, m, 1).toString().slice(4, 15);
    var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
    const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
    const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

    const commanQuarryOfCreditData = `SELECT
                                        cafId,
                                        user_details.userName AS givenBy,
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                        sed.employeeNickName AS employeeName,
                                        creditAmount,
                                        creditType,
                                        creditComent,
                                        creditDate AS sortCredit,
                                        DATE_FORMAT(creditDate, '%d-%b-%Y') AS creditDate,
                                        DATE_FORMAT(creditCreationDate, '%h:%i %p') AS givenTime 
                                    FROM
                                        staff_creditAdvanceFine_data
                                    LEFT JOIN user_details ON user_details.userId = staff_creditAdvanceFine_data.userId
                                    INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_creditAdvanceFine_data.employeeId`;
    if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarryOfCreditData}
                                    WHERE creditDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY sortCredit DESC ,creditCreationDate DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfCreditData}
                                    WHERE creditDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY sortCredit DESC ,creditCreationDate DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Credit List"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Credit From ${startDate} To ${endDate}`;
        } else {
            worksheet.mergeCells('A1', 'H1');
            worksheet.getCell('A1').value = `Credit From ${firstDay} To ${lastDay}`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Employee', 'Credit Amt.', 'Type', 'Comment', 'Date', 'Time'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "employeeName", width: 20 },
            { key: "creditAmount", width: 20 },
            { key: "creditType", width: 20 },
            { key: "creditComent", width: 30 },
            { key: "creditDate", width: 20 },
            { key: "givenTime", width: 10 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            '',
            { formula: `SUM(D3:D${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};

const exportExcelSheetForAllLeaveData = (req, res) => {

    const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
    const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
    const currentDate = new Date().toString().slice(4, 15);

    const commanQuarryOfLeave = `SELECT
                                    leaveId,
                                   	user_details.userName AS givenBy,
                                	CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS userName,
                                    sed.employeeNickName AS employeeName,
                                    numLeave,
                                    leaveReason,
                                    leaveDate AS sortLeave,
                                    DATE_FORMAT(leaveDate,'%d-%m-%Y') dateLeave,
                                    DATE_FORMAT(leaveDate,'%W, %d %M %Y') leaveDate
                                FROM
                                    staff_leave_data
                                LEFT JOIN user_details ON user_details.userId = staff_leave_data.userId
                                INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_leave_data.employeeId`;
    if (req.query.startDate && req.query.endDate) {
        sql_queries_getdetails = `${commanQuarryOfLeave}
                                    WHERE leaveDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY sortLeave DESC`;
    } else {
        sql_queries_getdetails = `${commanQuarryOfLeave}
                                    WHERE leaveDate = CURDATE()
                                    ORDER BY sortLeave DESC`;
    }

    pool.query(sql_queries_getdetails, async (err, rows) => {
        if (err) return res.status(404).send(err);
        const workbook = new excelJS.Workbook();  // Create a new workbook
        const worksheet = workbook.addWorksheet("Leave List"); // New Worksheet

        if (req.query.startDate && req.query.endDate) {
            worksheet.mergeCells('A1', 'F1');
            worksheet.getCell('A1').value = `Leave From ${startDate} To ${endDate}`;
        } else {
            worksheet.mergeCells('A1', 'F1');
            worksheet.getCell('A1').value = `Today Leave List Of Employee (${currentDate})`;
        }

        /*Column headers*/
        worksheet.getRow(2).values = ['S no.', 'Given By', 'Employee', 'Num. Of Leave', 'Reason', 'Date'];

        // Column for data in excel. key must match data key
        worksheet.columns = [
            { key: "s_no", width: 10, },
            { key: "userName", width: 20 },
            { key: "employeeName", width: 20 },
            { key: "numLeave", width: 20 },
            { key: "leaveReason", width: 30 },
            { key: "leaveDate", width: 30 }
        ]
        //Looping through User data
        const arr = rows
        console.log(">>>", arr);
        let counter = 1;
        arr.forEach((user) => {
            user.s_no = counter;
            worksheet.addRow(user); // Add data in worksheet
            counter++;
        });
        // Making first line in excel bold
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            height = 200
        });
        worksheet.getRow(2).eachCell((cell) => {
            cell.font = { bold: true, size: 13 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 20;

        worksheet.getRow(arr.length + 3).values = [
            'Total:',
            '',
            '',
            { formula: `SUM(D3:D${arr.length + 2})` }
        ];
        worksheet.getRow(arr.length + 3).eachCell((cell) => {
            cell.font = { bold: true, size: 14 }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        })

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                row.height = 20
            });
        });
        try {
            const data = await workbook.xlsx.writeBuffer()
            var fileName = new Date().toString().slice(4, 15) + ".xlsx";
            console.log(">>>", fileName);
            res.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            res.type = 'blob';
            res.send(data)
        } catch (err) {
            throw new Error(err);
        }
    })
};


// Export PDF Function

async function createPDF(res, datas, sumFooterArray, tableHeading) {
    try {
        // Create a new PDF document
        const doc = new jsPDF();

        // JSON data
        const jsonData = datas;
        // console.log(jsonData);

        // Get the keys from the first JSON object to set as columns
        const keys = Object.keys(jsonData[0]);

        // Define columns for the auto table, including a "Serial No." column
        const columns = [
            { header: 'Sr.', dataKey: 'serialNo' }, // Add Serial No. column
            ...keys.map(key => ({ header: key, dataKey: key }))
        ]

        // Convert JSON data to an array of arrays (table rows) and add a serial number
        const data = jsonData.map((item, index) => [index + 1, ...keys.map(key => item[key]), '', '']);

        // Initialize the sum columns with empty strings
        if (sumFooterArray) {
            data.push(sumFooterArray);
        }

        // Add auto table to the PDF document
        doc.text(15, 15, tableHeading);
        doc.autoTable({
            startY: 20,
            head: [columns.map(col => col.header)], // Extract headers correctly
            body: data,
            theme: 'grid',
            styles: {
                cellPadding: 2, // Add padding to cells for better appearance
                halign: 'center', // Horizontally center-align content
                fontSize: 10
            },
        });

        const pdfBytes = await doc.output();
        const fileName = 'jane-doe.pdf'; // Set the desired file name

        // Set the response headers for the PDF download
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        // Stream the PDF to the client for download
        res.send(pdfBytes);


        // Save the PDF to a file
        // const pdfFilename = 'output.pdf';
        // fs.writeFileSync(pdfFilename, doc.output());
        // console.log(`PDF saved as ${pdfFilename}`);
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Export Pdf Table For All Payment Data

const exportPdfForAllTransactionData = (req, res) => {
    try {
        const searchNumber = req.query.searchNumber;
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        const commanTransactionQuarry = `SELECT
                                            RIGHT(remainSalaryId,10) AS "Transaction No.",
                                            CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                            sed.employeeNickName AS Employee,
                                            COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END),0) AS "Cut Advance",
                                            COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END),0) AS "Cut Fine",
                                            COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END),0) AS "Pay Salary",
                                            salaryComment AS Comment,
                                            DATE_FORMAT(salaryDate,'%W, %d %M %Y') AS Date,
                                            DATE_FORMAT(salaryCreationDate,'%h:%i %p') AS Time
                                        FROM
                                            staff_salary_data
                                        LEFT JOIN user_details ON user_details.userId = staff_salary_data.userId
                                        INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_salary_data.employeeId`;
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE staff_salary_data.salaryDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                                GROUP BY remainSalaryId
                                                ORDER BY salaryDate DESC, salaryCreationDate DESC`;
        } else if (req.query.searchNumber) {
            sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE remainSalaryId LIKE '%` + searchNumber + `%'
                                                GROUP BY remainSalaryId
                                                ORDER BY salaryDate DESC, salaryCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${commanTransactionQuarry}
                                                WHERE staff_salary_data.salaryDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                                GROUP BY remainSalaryId
                                                ORDER BY salaryDate DESC, salaryCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumCutAdvance = abc.reduce((total, item) => total + (item['Cut Advance'] || 0), 0);
            const sumCutFine = abc.reduce((total, item) => total + (item['Cut Fine'] || 0), 0);
            const sumPaySalary = abc.reduce((total, item) => total + (item['Pay Salary'] || 0), 0);
            const sumFooterArray = ['Total', '', '', '', sumCutAdvance, sumCutFine, sumPaySalary];

            if (req.query.startDate && req.query.endDate) {
                tableHeading = `Transaction Data From ${startDate} To ${endDate}`;
            } else {
                tableHeading = `Transaction Data From ${firstDay} To ${lastDay}`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForAllAdvanceData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

        const commanQuarryOfAdvance = `SELECT
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                        sed.employeeNickName AS "Employee",
                                        advanceAmount AS "Advance Amt.",
                                        remainAdvanceAmount AS "Remain Amt.",
                                        advanceComment AS Comment,
                                        DATE_FORMAT(advanceDate,'%d-%b-%Y') AS Date,
                                        DATE_FORMAT(advanceCreationDate,'%h:%i %p') AS Time
                                    FROM
                                        staff_advance_data
                                    LEFT JOIN user_details ON user_details.userId = staff_advance_data.userId
                                    INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_advance_data.employeeId`;
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanQuarryOfAdvance}
                                    WHERE advanceDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY advanceDate DESC, advanceCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${commanQuarryOfAdvance}
                                    WHERE advanceDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY advanceDate DESC, advanceCreationDate DESC`;
        }

        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumAdvanceAmount = abc.reduce((total, item) => total + (item['Advance Amt.'] || 0), 0);
            const sumRemainAdvanceAmount = abc.reduce((total, item) => total + (item['Remain Amt.'] || 0), 0);
            const sumFooterArray = ['Total', '', '', sumAdvanceAmount, sumRemainAdvanceAmount];

            if (req.query.startDate && req.query.endDate) {
                tableHeading = `Advance Data From ${startDate} To ${endDate}`;
            } else {
                tableHeading = `Advance Data From ${firstDay} To ${lastDay}`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForALLFineData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const fineStatus = req.query.fineStatus;
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

        const commanQuarryOfFine = `SELECT
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                        sed.employeeNickName AS employeeName,
                                        fineAmount AS "Fine Amt.",
                                        remainFineAmount AS "Remain Amt.",
                                        IF(fineStatus = 1, 'Consider', 'Ignore') AS Status,
                                        CONCAT(COALESCE(reason,''),IF(reason != '' AND reduceFineReson != '',', ',''),COALESCE(reduceFineReson,'')) AS Reason,
                                        DATE_FORMAT(fineDate, '%d-%b-%Y') AS Date,
                                        DATE_FORMAT(fineCreationDate, '%h:%i %p') AS Time
                                    FROM
                                        staff_fine_data
                                    LEFT JOIN user_details ON user_details.userId = staff_fine_data.userId
                                    INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_fine_data.employeeId`;
        if (req.query.startDate && req.query.endDate && req.query.fineStatus) {
            sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE fineStatus = ${fineStatus} AND fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY fineDate DESC ,fineCreationDate DESC`;
        } else if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE fineDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY fineDate DESC ,fineCreationDate DESC`;
        } else if (req.query.fineStatus) {
            sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE fineStatus = ${fineStatus}
                                    ORDER BY fineDate DESC ,fineCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${commanQuarryOfFine}
                                    WHERE fineDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY fineDate DESC ,fineCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumFineAmount = abc.reduce((total, item) => total + (item['Fine Amt.'] || 0), 0);
            const sumRemainFineAmount = abc.reduce((total, item) => total + (item['Remain Amt.'] || 0), 0);
            console.log(sumFineAmount, sumRemainFineAmount);
            const sumFooterArray = ['Total', '', '', sumFineAmount, sumRemainFineAmount];
            if (req.query.startDate && req.query.endDate && req.query.fineStatus) {
                tableHeading = `Fine Data From ${startDate} To ${endDate} (${fineStatus == 1 ? 'Consider Fine' : 'Ignore Fine'})`;
            } else if (req.query.startDate && req.query.endDate) {
                tableHeading = `Fine Data From ${startDate} To ${endDate}`;
            } else if (req.query.fineStatus) {
                tableHeading = `All ${fineStatus == 1 ? 'Consider Fine' : 'Ignore Fine'} Fine Data`;
            } else {
                tableHeading = `Fine Data From ${firstDay} To ${lastDay}`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForAllBonusData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

        const commanQuarryOfBonus = `SELECT
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                        sed.employeeNickName AS Employee,
                                        bonusAmount AS "Bonus Amt.",
                                        bonusComment Comment,
                                        DATE_FORMAT(bonusDate, '%d-%b-%Y') AS Date,
                                        DATE_FORMAT(bonusCreationDate, '%h:%i %p') AS Time
                                    FROM
                                        staff_bonus_data
                                    LEFT JOIN user_details ON user_details.userId = staff_bonus_data.userId
                                    INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_bonus_data.employeeId`;
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanQuarryOfBonus}
                                    WHERE bonusDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY bonusDate DESC, bonusCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${commanQuarryOfBonus}
                                    WHERE bonusDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                    ORDER BY bonusDate DESC, bonusCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumBonusAmount = abc.reduce((total, item) => total + (item['Bonus Amt.'] || 0), 0);
            const sumFooterArray = ['Total', '', '', sumBonusAmount];

            if (req.query.startDate && req.query.endDate) {
                tableHeading = `Bonus Data From ${startDate} To ${endDate}`;
            } else {
                tableHeading = `Bonus Data From ${firstDay} To ${lastDay}`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForAllCreditData = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

        const commanQuarryOfCreditData = `SELECT
                                            CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                            sed.employeeNickName AS "Employee",
                                            creditAmount AS "Credit Amt.",
                                            creditType AS "Credit Type",
                                            creditComent AS Comment,
                                            DATE_FORMAT(creditDate, '%d-%b-%Y') AS Date,
                                            DATE_FORMAT(creditCreationDate, '%h:%i %p') AS Time 
                                        FROM
                                            staff_creditAdvanceFine_data
                                        LEFT JOIN user_details ON user_details.userId = staff_creditAdvanceFine_data.userId
                                        INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_creditAdvanceFine_data.employeeId`;
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanQuarryOfCreditData}
                                        WHERE creditDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                        ORDER BY creditDate DESC ,creditCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${commanQuarryOfCreditData}
                                        WHERE creditDate BETWEEN STR_TO_DATE('${firstDay}','%b %d %Y') AND STR_TO_DATE('${lastDay}','%b %d %Y')
                                        ORDER BY creditDate DESC ,creditCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumCreditAmount = abc.reduce((total, item) => total + (item['Credit Amt.'] || 0), 0);
            const sumFooterArray = ['Total', '', '', sumCreditAmount];

            if (req.query.startDate && req.query.endDate) {
                tableHeading = `Credit Data From ${startDate} To ${endDate}`;
            } else {
                tableHeading = `Credit Data From ${firstDay} To ${lastDay}`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForAllLeaveData = (req, res) => {
    try {

        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);
        const currentDate = new Date().toString().slice(4, 15);

        const commanQuarryOfLeave = `SELECT
                                    	CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                        sed.employeeNickName AS Employee,
                                        numLeave AS "Num. Of Leave",
                                        leaveReason AS Reason,
                                        DATE_FORMAT(leaveDate,'%W, %d %M %Y') "Leave Date"
                                    FROM
                                        staff_leave_data
                                    LEFT JOIN user_details ON user_details.userId = staff_leave_data.userId
                                    INNER JOIN staff_employee_data AS sed ON sed.employeeId = staff_leave_data.employeeId`;
        if (req.query.startDate && req.query.endDate) {
            sql_queries_getdetails = `${commanQuarryOfLeave}
                                    WHERE leaveDate BETWEEN STR_TO_DATE('${startDate}','%b %d %Y') AND STR_TO_DATE('${endDate}','%b %d %Y')
                                    ORDER BY leaveDate DESC`;
        } else {
            sql_queries_getdetails = `${commanQuarryOfLeave}
                                    WHERE leaveDate = CURDATE()
                                    ORDER BY leaveDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows.length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows)));
            const sumLeave = abc.reduce((total, item) => total + (item['Num. Of Leave'] || 0), 0);
            const sumFooterArray = ['Total', '', '', sumLeave];

            if (req.query.startDate && req.query.endDate) {
                tableHeading = `Leave Data From ${startDate} To ${endDate}`;
            } else {
                tableHeading = `Today Leave List Of Employee (${currentDate})`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export PDF For Employee Table

const exportPdfForEmployeeMonthlySalaryData = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;

        const getEmployeeName = `SELECT employeeFirstName AS employeeName FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
        const commonQuery = `SELECT
                            DATE_FORMAT(smsd.msStartDate, '%M %Y') AS Month,
                            smsd.totalSalary AS Salary,
                            smsd.remainSalary AS "Remain Salary",
                            COALESCE(FLOOR(e.salary / DAY(msEndDate)),0) AS "Per Day Salary",
                             COALESCE(
                                (
                                SELECT
                                    SUM(sad.advanceAmount)
                                FROM
                                    staff_advance_data AS sad
                                WHERE
                                    sad.employeeId = '${employeeId}' AND sad.advanceDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                            ),
                            0
                            ) AS "Advance Amt.",
                            COALESCE(
                                (
                                SELECT
                                    SUM(sfd.fineAmount)
                                FROM
                                    staff_fine_data AS sfd
                                WHERE
                                    sfd.employeeId = '${employeeId}' AND sfd.fineDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                            ),
                            0
                            ) AS "Fine Amt.",
                            smsd.maxLeave AS "Max Leave",
                            COALESCE(
                                (
                                SELECT
                                    SUM(sld.numLeave)
                                FROM
                                    staff_leave_data AS sld
                                WHERE
                                    sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                            ),
                            0
                            ) AS "Taken Leave",
                        -- Calculate remaining available leave days (maxLeave - takenLeaves)
                        CASE WHEN smsd.maxLeave -(
                            SELECT
                                COALESCE(SUM(sld.numLeave),
                                0)
                            FROM
                                staff_leave_data AS sld
                            WHERE
                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                        ) < 0 THEN ABS(
                            smsd.maxLeave -(
                            SELECT
                                COALESCE(SUM(sld.numLeave),
                                0)
                            FROM
                                staff_leave_data AS sld
                            WHERE
                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                        )
                        ) ELSE 0
                        END AS "E. Leave",
                        -- Calculate total remaining salary
                        (
                            CASE WHEN smsd.maxLeave -(
                            SELECT
                                COALESCE(SUM(sld.numLeave),
                                0)
                            FROM
                                staff_leave_data AS sld
                            WHERE
                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                        ) < 0 THEN ABS(
                            smsd.maxLeave -(
                            SELECT
                                COALESCE(SUM(sld.numLeave),
                                0)
                            FROM
                                staff_leave_data AS sld
                            WHERE
                                sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                        )
                        ) ELSE 0
                        END
                        ) *(
                            COALESCE(FLOOR(e.salary / 30),
                            0)
                        ) AS "Deduction Salary",
                        COALESCE(
                                (
                                SELECT
                                    (
                                        DATEDIFF(
                                            smsd.msEndDate,
                                            smsd.msStartDate
                                        ) + 1 - COALESCE(SUM(sld.numLeave),
                                        0)
                                    )
                                FROM
                                    staff_leave_data AS sld
                                WHERE
                                    sld.employeeId = '${employeeId}' AND sld.leaveDate BETWEEN smsd.msStartDate AND smsd.msEndDate
                            ),
                            0
                            ) AS "Working Days"
                        FROM
                            staff_monthlySalary_data AS smsd
                        JOIN staff_employee_data AS e
                        ON
                            smsd.employeeId = e.employeeId`;
        if (req.query.startMonth && req.query.endMonth) {
            sql_queries_getdetails = `${getEmployeeName};
                                      ${commonQuery} 
                                        WHERE smsd.employeeId = '${employeeId}' AND DATE_FORMAT(msEndDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                        ORDER BY smsd.msStartDate DESC`;
        } else {
            sql_queries_getdetails = `${getEmployeeName};
                                      ${commonQuery} 
                                        WHERE smsd.employeeId = '${employeeId}' 
                                        ORDER BY smsd.msStartDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const sumSalaryAmount = abc.reduce((total, item) => total + item.Salary, 0);
            const sumRemainSalaryAmount = abc.reduce((total, item) => total + (item['Remain Amt.'] || 0), 0);
            const sumAdvanceAmount = abc.reduce((total, item) => total + (item['Advance Amt.'] || 0), 0);
            const sumFineAmount = abc.reduce((total, item) => total + (item['Fine Amt.'] || 0), 0);
            const sumMaxLeave = abc.reduce((total, item) => total + (item['Max Leave'] || 0), 0);
            const sumTakenLeave = abc.reduce((total, item) => total + (item['Taken Leave'] || 0), 0);
            const sumExtraLeave = abc.reduce((total, item) => total + (item['E. Leave'] || 0), 0);
            const sumDeductionSalary = abc.reduce((total, item) => total + (item['Deduction Salary'] || 0), 0);
            const sumWorkingDays = abc.reduce((total, item) => total + (item['Working Days'] || 0), 0);
            const sumFooterArray = ['Total', '', sumSalaryAmount, sumRemainSalaryAmount, '', sumAdvanceAmount, sumFineAmount, sumMaxLeave, sumTakenLeave, sumExtraLeave, sumDeductionSalary, sumWorkingDays];
            const employeeName = rows[0][0].employeeName;
            if (req.query.startMonth && req.query.endMonth) {
                const startMonthName = formatMonthYear(startMonth);
                console.log(startMonthName);
                const endMonthName = formatMonthYear(endMonth);
                console.log(endMonthName);
                tableHeading = `Monthly Salary Data From ${startMonthName} To ${endMonthName} (${employeeName})`;
            } else {
                tableHeading = `All Monthly Salary Data (${employeeName})`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForAdvanceData = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;

        const getEmployeeName = `SELECT employeeFirstName AS employeeName FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
        const commanQuarryOfAdvance = `SELECT
                                           CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                           advanceAmount AS "Advance Amt.",
                                           remainAdvanceAmount AS "Remain Amt.",
                                           advanceComment AS Comment,
                                           DATE_FORMAT(advanceDate,'%d-%b-%Y') AS Date,
                                           DATE_FORMAT(advanceCreationDate,'%h:%i %p') AS Time
                                       FROM
                                           staff_advance_data
                                       LEFT JOIN user_details ON user_details.userId = staff_advance_data.userId`;
        if (req.query.startMonth && req.query.endMonth) {
            sql_queries_getdetails = `${getEmployeeName};
                                        ${commanQuarryOfAdvance}
                                        WHERE employeeId = '${employeeId}' AND DATE_FORMAT(advanceDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                        ORDER BY advanceDate DESC, advanceCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${getEmployeeName};
                                        ${commanQuarryOfAdvance}
                                        WHERE employeeId = '${employeeId}'
                                        ORDER BY advanceDate DESC, advanceCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const sumAdvanceAmount = abc.reduce((total, item) => total + (item['Advance Amt.'] || 0), 0);
            const sumRemainAdvanceAmount = abc.reduce((total, item) => total + (item['Remain Amt.'] || 0), 0);
            const sumFooterArray = ['Total', '', sumAdvanceAmount, sumRemainAdvanceAmount];
            const employeeName = rows[0][0].employeeName;
            if (req.query.startMonth && req.query.endMonth) {
                const startMonthName = formatMonthYear(startMonth);
                console.log(startMonthName);
                const endMonthName = formatMonthYear(endMonth);
                console.log(endMonthName);
                tableHeading = `Advance Data From ${startMonthName} To ${endMonthName} (${employeeName})`;
            } else {
                tableHeading = `All Advance Data (${employeeName})`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForFineData = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;
        const fineStatus = req.query.fineStatus;

        const getEmployeeName = `SELECT employeeFirstName AS employeeName FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
        const commanQuarryOfFine = `SELECT
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                        fineAmount AS "Fine Amt.",
                                        remainFineAmount AS "Remain Amt.",
                                        IF(fineStatus = 1, 'Consider', 'Ignore') AS Status,
                                        CONCAT(COALESCE(reason,''),IF(reason != '' AND reduceFineReson != '',', ',''),COALESCE(reduceFineReson,'')) AS Reason,
                                        DATE_FORMAT(fineDate, '%d-%b-%Y') AS Date,
                                        DATE_FORMAT(fineCreationDate, '%h:%i %p') AS Time
                                    FROM
                                        staff_fine_data
                                    LEFT JOIN user_details ON user_details.userId = staff_fine_data.userId`;
        if (req.query.startMonth && req.query.endMonth && req.query.fineStatus) {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanQuarryOfFine}
                                    WHERE employeeId = '${employeeId}' AND fineStatus = ${fineStatus} AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY fineDate DESC ,fineCreationDate DESC`;
        } else if (req.query.startMonth && req.query.endMonth) {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanQuarryOfFine}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(fineDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY fineDate DESC ,fineCreationDate DESC`;
        } else if (req.query.fineStatus) {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanQuarryOfFine}
                                    WHERE employeeId = '${employeeId}' AND fineStatus = ${fineStatus}
                                    ORDER BY fineDate DESC ,fineCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanQuarryOfFine}
                                    WHERE employeeId = '${employeeId}'
                                    ORDER BY fineDate DESC ,fineCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const sumFineAmount = abc.reduce((total, item) => total + (item['Fine Amt.'] || 0), 0);
            const sumRemainFineAmount = abc.reduce((total, item) => total + (item['Remain Amt.'] || 0), 0);
            console.log(sumFineAmount, sumRemainFineAmount);
            const sumFooterArray = ['Total', '', sumFineAmount, sumRemainFineAmount];
            const employeeName = rows[0][0].employeeName;
            if (req.query.startMonth && req.query.endMonth && req.query.fineStatus) {
                const startMonthName = formatMonthYear(startMonth);
                console.log(startMonthName);
                const endMonthName = formatMonthYear(endMonth);
                console.log(endMonthName);
                tableHeading = `Fine Data From ${startMonthName} To ${endMonthName} (${fineStatus == 1 ? 'Consider Fine' : 'Ignore Fine'}) (${employeeName})`;
            } else if (req.query.startMonth && req.query.endMonth) {
                const startMonthName = formatMonthYear(startMonth);
                console.log(startMonthName);
                const endMonthName = formatMonthYear(endMonth);
                console.log(endMonthName);
                tableHeading = `Fine Data From ${startMonthName} To ${endMonthName} (${employeeName})`;
            } else if (req.query.fineStatus) {
                tableHeading = `All ${fineStatus == 1 ? 'Consider Fine' : 'Ignore Fine'} Fine Data (${employeeName})`;
            } else {
                tableHeading = `All Fine Data (${employeeName})`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForBonusData = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;

        const getEmployeeName = `SELECT employeeFirstName AS employeeName FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
        const commanQuarryOfBonus = `SELECT
                                    CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                    bonusAmount AS "Bonus Amt.",
                                    bonusComment AS Comment,
                                    DATE_FORMAT(bonusDate, '%d-%b-%Y') AS Date,
                                    DATE_FORMAT(bonusCreationDate, '%h:%i %p') AS Time
                                FROM
                                    staff_bonus_data
                                LEFT JOIN user_details ON user_details.userId = staff_bonus_data.userId`;
        if (req.query.startMonth && req.query.endMonth) {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanQuarryOfBonus}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(bonusDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY bonusDate DESC, bonusCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanQuarryOfBonus}
                                    WHERE employeeId = '${employeeId}'
                                    ORDER BY bonusDate DESC, bonusCreationDate DESC`;
        }

        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const sumBonusAmount = abc.reduce((total, item) => total + (item['Bonus Amt.'] || 0), 0);
            const sumFooterArray = ['Total', '', sumBonusAmount];
            const employeeName = rows[0][0].employeeName;
            if (req.query.startMonth && req.query.endMonth) {
                const startMonthName = formatMonthYear(startMonth);
                console.log(startMonthName);
                const endMonthName = formatMonthYear(endMonth);
                console.log(endMonthName);
                tableHeading = `Bonus Data From ${startMonthName} To ${endMonthName} (${employeeName})`;
            } else {
                tableHeading = `All Bonus Data (${employeeName})`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForCreditData = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;

        const getEmployeeName = `SELECT employeeFirstName AS employeeName FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
        const commanQuarryOfCreditData = `SELECT
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                        creditAmount AS "Credit Amt.",
                                        creditType AS "Credit Type",
                                        creditComent AS Comment,
                                        DATE_FORMAT(creditDate, '%d-%b-%Y') AS Date,
                                        DATE_FORMAT(creditCreationDate, '%h:%i %p') AS Time 
                                    FROM
                                        staff_creditAdvanceFine_data
                                    LEFT JOIN user_details ON user_details.userId = staff_creditAdvanceFine_data.userId`;
        if (req.query.startMonth && req.query.endMonth) {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanQuarryOfCreditData}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(creditDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    ORDER BY creditDate DESC ,creditCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanQuarryOfCreditData}
                                    WHERE employeeId = '${employeeId}'
                                    ORDER BY creditDate DESC ,creditCreationDate DESC`;
        }
        console.log(sql_queries_getdetails);
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const sumCreditAmount = abc.reduce((total, item) => total + (item['Credit Amt.'] || 0), 0);
            const sumFooterArray = ['Total', '', sumCreditAmount];
            const employeeName = rows[0][0].employeeName;
            if (req.query.startMonth && req.query.endMonth) {
                const startMonthName = formatMonthYear(startMonth);
                console.log(startMonthName);
                const endMonthName = formatMonthYear(endMonth);
                console.log(endMonthName);
                tableHeading = `Credit Data From ${startMonthName} To ${endMonthName} (${employeeName})`;
            } else {
                tableHeading = `All Credit Data (${employeeName})`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForLeaveData = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;

        const getEmployeeName = `SELECT employeeFirstName AS employeeName FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
        const commanQuarryOfLeave = `SELECT
                                	CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                    numLeave AS "Num. Of Leave",
                                    leaveReason AS Reason,
                                    DATE_FORMAT(leaveDate,'%W, %d %M %Y') AS "Leave Date"
                                FROM
                                    staff_leave_data
                                LEFT JOIN user_details ON user_details.userId = staff_leave_data.userId`;
        if (req.query.startMonth && req.query.endMonth) {
            sql_queries_getdetails = `${getEmployeeName};
                                        ${commanQuarryOfLeave}
                                        WHERE employeeId = '${employeeId}' AND DATE_FORMAT(leaveDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                        ORDER BY leaveDate DESC`;
        } else {
            sql_queries_getdetails = `${getEmployeeName};
                                        ${commanQuarryOfLeave}
                                        WHERE employeeId = '${employeeId}'
                                        ORDER BY leaveDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const sumLeave = abc.reduce((total, item) => total + (item['Num. Of Leave'] || 0), 0);
            const sumFooterArray = ['Total', '', sumLeave];
            const employeeName = rows[0][0].employeeName;
            if (req.query.startMonth && req.query.endMonth) {
                const startMonthName = formatMonthYear(startMonth);
                console.log(startMonthName);
                const endMonthName = formatMonthYear(endMonth);
                console.log(endMonthName);
                tableHeading = `Leave Data From ${startMonthName} To ${endMonthName} (${employeeName})`;
            } else {
                tableHeading = `All Leave Data (${employeeName})`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

const exportPdfForTransactionData = (req, res) => {
    try {
        const employeeId = req.query.employeeId;
        const startMonth = req.query.startMonth;
        const endMonth = req.query.endMonth;

        const getEmployeeName = `SELECT employeeFirstName AS employeeName FROM staff_employee_data WHERE employeeId = '${employeeId}'`;
        const commanTransactionQuarry = `SELECT
                                        RIGHT(remainSalaryId,10) AS "Transaction Id",
                                        CONCAT(user_details.userFirstName,' ',user_details.userLastName) AS "Given By",
                                        COALESCE(MAX(CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount END),0) AS "Cut Advance",
                                        COALESCE(MAX(CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount END),0) AS "Cut Fine",
                                        COALESCE(MAX(CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount END),0) AS "Pay Salary",
                                        salaryComment AS Comment,
                                        DATE_FORMAT(salaryDate,'%W, %d %b %Y') AS Date,
                                        DATE_FORMAT(salaryCreationDate,'%h:%i %p') AS Time
                                    FROM
                                        staff_salary_data
                                    LEFT JOIN user_details ON user_details.userId = staff_salary_data.userId`;
        if (req.query.startMonth && req.query.endMonth) {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanTransactionQuarry}
                                    WHERE employeeId = '${employeeId}' AND DATE_FORMAT(staff_salary_data.salaryDate,'%Y-%m') BETWEEN '${startMonth}' AND '${endMonth}'
                                    GROUP BY remainSalaryId
                                    ORDER BY salaryDate DESC, salaryCreationDate DESC`;
        } else {
            sql_queries_getdetails = `${getEmployeeName};
                                    ${commanTransactionQuarry}
                                    WHERE employeeId = '${employeeId}'
                                    GROUP BY remainSalaryId
                                    ORDER BY salaryDate DESC, salaryCreationDate DESC`;
        }
        pool.query(sql_queries_getdetails, (err, rows) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (rows && rows[1].length <= 0) {
                return res.status(400).send('No Data Found');
            }
            const abc = Object.values(JSON.parse(JSON.stringify(rows[1])));
            const sumCutAdvance = abc.reduce((total, item) => total + (item['Cut Advance'] || 0), 0);
            const sumCutFine = abc.reduce((total, item) => total + (item['Cut Fine'] || 0), 0);
            const sumPaySalary = abc.reduce((total, item) => total + (item['Pay Salary'] || 0), 0);
            const sumFooterArray = ['Total', '', '', sumCutAdvance, sumCutFine, sumPaySalary];
            const employeeName = rows[0][0].employeeName;
            if (req.query.startMonth && req.query.endMonth) {
                const startMonthName = formatMonthYear(startMonth);
                console.log(startMonthName);
                const endMonthName = formatMonthYear(endMonth);
                console.log(endMonthName);
                tableHeading = `Transaction Data From ${startMonthName} To ${endMonthName} (${employeeName})`;
            } else {
                tableHeading = `All Transaction Data (${employeeName})`;
            }

            createPDF(res, abc, sumFooterArray, tableHeading)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    // Export Excel For Employee Table
    exportExcelSheetForEmployeeMonthlySalaryDataById,
    exportExcelSheetForAdvanceData,
    exportExcelSheetForFineData,
    exportExcelSheetForBonusData,
    exportExcelSheetForCreditData,
    exportExcelSheetForLeaveData,
    exportExcelSheetForTransactionData,
    exportPdfForEmployeeMonthlySalaryData,

    // Export Excel Table For All Payment Data
    exportExcelSheetForAllTransactionData,
    exportExcelSheetForAllAdvanceData,
    exportExcelSheetForAllFineData,
    exportExcelSheetForAllBonusData,
    exportExcelSheetForAllCreditData,
    exportExcelSheetForAllLeaveData,

    // Export Pdf Table For All Payment Data
    exportPdfForAllTransactionData,
    exportPdfForAllAdvanceData,
    exportPdfForALLFineData,
    exportPdfForAllBonusData,
    exportPdfForAllCreditData,
    exportPdfForAllLeaveData,

    // Export PDF For Employee Table
    exportPdfForAdvanceData,
    exportPdfForFineData,
    exportPdfForBonusData,
    exportPdfForCreditData,
    exportPdfForLeaveData,
    exportPdfForTransactionData
}