const pool = require('../../database');
const jwt = require("jsonwebtoken");
const { PDFDocument, StandardFonts, rgb, PageSizes } = require("pdf-lib");
const { writeFileSync, readFileSync } = require("fs");
const { Readable } = require('stream');


async function createPDF(res, data) {
    try {

        const monthlySalaryCut = data[0];
        if (monthlySalaryCut.length > 0) {
            monthlySalaryCut[0].Remain = data[4][0].lastRemainAmt;
        }
        const advanceCutData = data[1];
        if (advanceCutData.length > 0) {
            advanceCutData[0]["Remain Advance"] = data[4][0].lastAdvanceAmt;
        }
        const fineCutData = data[2];
        if (fineCutData.length > 0) {
            fineCutData[0]["Remain Fine"] = data[4][0].lastFineAmt;
        }
        const employeeName = data[5][0].employeeNickName;
        const position = data[5][0].position;
        const employeeMobileNumber = data[5][0].employeeMobileNumber;
        const maxLeave = data[5][0].maxLeave;
        const salary = data[5][0].salary;
        const perDaySalary = data[5][0].perDaySalary;
        const msDataJson = Object.values(JSON.parse(JSON.stringify(monthlySalaryCut)));
        const advanceJson = Object.values(JSON.parse(JSON.stringify(advanceCutData)));
        const fineJson = Object.values(JSON.parse(JSON.stringify(fineCutData)));
        const totalSalary = data[4][0].remainSalaryAmt;
        const totalAdvance = data[4][0].remainAdvanceAmt;
        const totalFine = data[4][0].remainFineAmt;
        const salaryPay = data[3][0].salaryPay;
        const advanceCut = data[3][0].advanceCut;
        const fineCut = data[3][0].fineCut;
        const remainSalary = totalSalary - salaryPay - advanceCut - fineCut;
        const remainAdvace = totalAdvance - advanceCut;
        const remainFine = totalFine - fineCut;
        const trasactionId = data[3][0].trasactionId;
        const salaryDate = data[3][0].salaryDate;
        const salaryTime = data[3][0].salaryTime;
        function getCurrentDateTime() {
            const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
            const dateTimeString = new Date().toLocaleString('en-In', options);
            return dateTimeString;
        }

        const currentDateTime = getCurrentDateTime();
        console.log(currentDateTime);
        const document = await PDFDocument.load(readFileSync(process.env.STAFF_INVOICE_BHAGWATI_URL));
        const helveticaFont = await document.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await document.embedFont(StandardFonts.HelveticaBold);
        const firstPage = document.getPage(0);

        firstPage.moveTo(105, 530);
        firstPage.drawText(`Download Date & Time : ${currentDateTime}`, {
            x: 380,
            y: 830,
            size: 7,
            fontSize: 100,
            font: helveticaFont
        })

        firstPage.drawText(trasactionId, {
            x: 140,
            y: 635,
            size: 10,
            fontSize: 100,
            font: helveticaBoldFont
        })

        firstPage.drawText(salaryDate, {
            x: 140,
            y: 621,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(salaryTime, {
            x: 140,
            y: 606,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(employeeName, {
            x: 300,
            y: 635,
            size: 10,
            fontSize: 100,
            font: helveticaBoldFont
        })

        firstPage.drawText(position, {
            x: 300,
            y: 621,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(employeeMobileNumber, {
            x: 300,
            y: 606,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(`Salary: ${salary} Rs.`, {
            x: 450,
            y: 635,
            size: 10,
            fontSize: 100,
            font: helveticaFont
        })

        firstPage.drawText(`Max Leave: ${maxLeave}`, {
            x: 450,
            y: 621,
            size: 9,
            font: helveticaFont
        })

        firstPage.drawText(`PerDay Salary: ${perDaySalary}`, {
            x: 450,
            y: 606,
            size: 9,
            font: helveticaFont
        })

        const signatureData = {
            salaryGiven: 'Signature of Salary Given',
            employee: 'Signature of Employee'
        };

        // const cellWidth = customCellWidth || 83; // Default cell width if not provided
        // const cellHeight = customCellHeight || 20; // Default cell height if not provided
        const tableX = 50;
        let tableY = firstPage.getHeight() - 290;
        let currentPage = firstPage;


        function drawTable(dynamicData, cellWidth, cellHeight) {
            let tableXPosition = tableX;

            // Draw table headers
            for (const key in dynamicData[0]) {
                const headerText = key;
                const textWidth = helveticaBoldFont.widthOfTextAtSize(headerText, 12);
                const xCentered = tableXPosition + (cellWidth - textWidth) / 2;

                // Draw header text
                currentPage.drawText(headerText, {
                    x: xCentered,
                    y: tableY - 14.5,
                    font: helveticaBoldFont,
                    size: 11,
                    color: rgb(0, 0, 0),
                });

                // Draw header border
                currentPage.drawRectangle({
                    x: tableXPosition,
                    y: tableY - 19.5,
                    width: cellWidth,
                    height: cellHeight,
                    borderWidth: 1, // Border width in points
                    borderColor: rgb(0, 0, 0), // Border color
                });

                tableXPosition += cellWidth;
            }

            tableY -= cellHeight;

            // Draw table rows
            for (const rowData of dynamicData) {
                if (tableY <= 70) {
                    // Create a new page if the current page is filled with data
                    currentPage = document.addPage(PageSizes.A4);
                    tableY = currentPage.getHeight() - 70;
                    tableXPosition = tableX;

                    // Draw table headers on the new page
                    for (const key in dynamicData[0]) {
                        const headerText = key;
                        const textWidth = helveticaBoldFont.widthOfTextAtSize(headerText, 12);
                        const xCentered = tableXPosition + (cellWidth - textWidth) / 2;

                        // Draw header text
                        currentPage.drawText(headerText, {
                            x: xCentered,
                            y: tableY - 14.5,
                            font: helveticaBoldFont,
                            size: 11,
                            color: rgb(0, 0, 0),
                        });

                        // Draw header border
                        currentPage.drawRectangle({
                            x: tableXPosition,
                            y: tableY - 19.5,
                            width: cellWidth,
                            height: cellHeight,
                            borderWidth: 1, // Border width in points
                            borderColor: rgb(0, 0, 0), // Border color
                        });

                        tableXPosition += cellWidth;
                    }

                    tableY -= cellHeight;
                }

                // Draw table data
                tableXPosition = tableX;
                for (const key in rowData) {
                    const cellText = rowData[key].toString();
                    const textWidth = helveticaFont.widthOfTextAtSize(cellText, 12);

                    // Calculate horizontal position to center-align the text
                    const xCentered = tableXPosition + (cellWidth - textWidth) / 2;

                    // Draw cell content with centered alignment
                    currentPage.drawText(cellText, {
                        x: xCentered,
                        y: tableY - cellHeight + 5,
                        font: helveticaFont,
                        size: 10,
                        color: rgb(0, 0, 0),
                    });

                    // Draw cell border
                    currentPage.drawRectangle({
                        x: tableXPosition,
                        y: tableY - cellHeight,
                        width: cellWidth,
                        height: cellHeight,
                        borderWidth: 1, // Border width in points
                        borderColor: rgb(0, 0, 0), // Border color
                    });

                    tableXPosition += cellWidth;
                }
                tableY -= cellHeight;
            }
        }

        const headingText1 = "Monthly Salary :";
        const headingText2 = "Advance Cut :";
        const headingText3 = "Fine Cut :";

        if (msDataJson != '') {

            currentPage.drawText(headingText1, {
                x: tableX,
                y: tableY + 10, // Adjust the Y position as needed
                font: helveticaBoldFont,
                size: 14,
                color: rgb(0, 0, 0),
            });

            // Draw the first table
            drawTable(msDataJson, 63, 20);

            // Add spacing between tables
            tableY -= 20 * 2;
        }

        if (advanceJson != '') {

            currentPage.drawText(headingText2, {
                x: tableX,
                y: tableY + 10, // Adjust the Y position as needed
                font: helveticaBoldFont,
                size: 14,
                color: rgb(0, 0, 0),
            });

            // Draw the second table
            drawTable(advanceJson, 101, 20);

            // Add spacing between tables
            tableY -= 20 * 2;
        }

        if (fineJson != '') {

            currentPage.drawText(headingText3, {
                x: tableX,
                y: tableY + 10, // Adjust the Y position as needed
                font: helveticaBoldFont,
                size: 14,
                color: rgb(0, 0, 0),
            });

            // Draw the third table
            drawTable(fineJson, 101, 20);

            // Add spacing between tables
            tableY -= 20 * 2;
        }

        const sectionData = [
            { text: 'Total Salary', middleObject: ':', value: totalSalary.toLocaleString('en-IN'), height: 10 },
            { text: 'Total Advance', middleObject: ':', value: totalAdvance.toLocaleString('en-IN'), height: 20 },
            { text: 'Total Fine', middleObject: ':', value: totalFine.toLocaleString('en-IN'), height: 20 },
            { text: 'Salary Pay', middleObject: ':', value: salaryPay.toLocaleString('en-IN'), height: 20 },
            { text: 'Advance Cut', middleObject: ':', value: advanceCut.toLocaleString('en-IN'), height: 20 },
            { text: 'Fine Cut', middleObject: ':', value: fineCut.toLocaleString('en-IN'), height: 20 },
            { text: 'Remain Salary', middleObject: ':', value: remainSalary.toLocaleString('en-IN'), height: 20 },
            { text: 'Remain Advance', middleObject: ':', value: remainAdvace.toLocaleString('en-IN'), height: 20 },
            { text: 'Remain Fine', middleObject: ':', value: remainFine.toLocaleString('en-IN'), height: 20 },
        ];

        for (const section of sectionData) {
            if (tableY - section.height < 40) {
                // Create a new page
                currentPage = document.addPage(PageSizes.A4);
                tableY = currentPage.getHeight() - 30;
            }

            currentPage.drawText(section.text, {
                x: tableX,
                y: tableY - section.height,
                font: helveticaFont,
                size: 12,
                color: rgb(0, 0, 0),
            });

            currentPage.drawText(section.middleObject, {
                x: tableX + 110,
                y: tableY - section.height,
                font: helveticaFont,
                size: 12,
                color: rgb(0, 0, 0),
            });

            currentPage.drawText(section.value, {
                x: tableX + 140,
                y: tableY - section.height,
                font: helveticaFont,
                size: 12,
                color: rgb(0, 0, 0),
            });

            if (section.text === 'Total Fine' || section.text === 'Fine Cut') {
                // Draw a line after the "Total Fine" section
                const lineStartX = tableX;
                const lineEndX = tableX + 200;
                const lineY = tableY - section.height - 5; // Adjust the position as needed
                currentPage.drawLine({
                    start: { x: lineStartX, y: lineY },
                    end: { x: lineEndX, y: lineY },
                    thickness: 1, // Line thickness
                    color: rgb(0, 0, 0), // Line color
                });
            }


            // Adjust the tableY position
            tableY -= section.height;
        }

        const totalHeight = sectionData.reduce((sum, section) => sum + section.height, 0);
        // console.log(totalHeight)

        const signatureTextHeight = 62; // Define the height for signature text
        const thankYouTextHeight = 62; // Define the height for thank you text
        console.log(tableY - totalHeight < -100)
        if (tableY - totalHeight - signatureTextHeight < -100) {
            currentPage = document.addPage(PageSizes.A4);
            tableY = currentPage.getHeight() - 40;
        }

        // Draw the signature text
        currentPage.drawText(signatureData.salaryGiven, {
            x: tableX,
            y: tableY - signatureTextHeight, // Adjust the Y position as needed
            font: helveticaFont,
            size: 12,
            color: rgb(0, 0, 0),
        });

        currentPage.drawText(signatureData.employee, {
            x: tableX + 375, // Adjust the X position as needed
            y: tableY - signatureTextHeight, // Adjust the Y position as needed
            font: helveticaFont,
            size: 12,
            color: rgb(0, 0, 0),
        });

        console.log(tableY - totalHeight - signatureTextHeight - thankYouTextHeight < -100)
        if (tableY - totalHeight - signatureTextHeight - thankYouTextHeight < -100) {
            currentPage = document.addPage(PageSizes.A4);
            tableY = currentPage.getHeight() + 30;
        }

        currentPage.drawText("Thank You", {
            x: 264, // Centered horizontally
            y: tableY - signatureTextHeight - thankYouTextHeight, // Adjust the Y position as needed
            font: helveticaBoldFont,
            size: 12,
            color: rgb(0, 0, 0),
            textAlign: 'Center', // Center align the text
        });

        const pdfBytes = await document.save();

        const stream = new Readable();
        stream.push(pdfBytes);
        stream.push(null);

        const fileName = 'jane-doe.pdf'; // Set the desired file name

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        stream.pipe(res);
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).json('Internal Server Error');
    }
    // writeFileSync("jane-doe.pdf", await document.save());
}

const getEmployeeInvoice = (req, res) => {
    try {
        const invoiceId = req.query.invoiceId;
        const employeeId = req.query.employeeId;
        if (!invoiceId || !employeeId) {
            return res.status(400).send("InvoiceId OR employeeId Not Found")
        }
        const sqlQuery_monthlySalary = `SELECT
                                        DATE_FORMAT(smsd.msStartDate, '%b-%y') AS "Month",
                                        smsd.totalSalary AS "Salary",
                                        smsd.totalSalary AS "Remain",
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
                                        ) AS "Leave",
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
                                    ) AS "Deduction",
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
                                    ) AS "Work Days"
                                    FROM
                                        staff_monthlySalary_data AS smsd
                                    JOIN staff_employee_data AS e
                                    ON
                                        smsd.employeeId = e.employeeId
                                    WHERE
                                        smsd.employeeId = '${employeeId}' AND smsd.monthlySalaryId IN(
                                        SELECT
                                            COALESCE(
                                                staff_msWiseSalaryId_data.monthlySalaryId,
                                                NULL
                                            )
                                        FROM
                                            staff_msWiseSalaryId_data
                                        WHERE
                                            staff_msWiseSalaryId_data.salaryId IN(
                                            SELECT
                                                COALESCE(
                                                    staff_salary_data.salaryId, 
                                                    NULL
                                                )
                                            FROM
                                                staff_salary_data
                                            WHERE
                                                staff_salary_data.remainSalaryId = '${invoiceId}'
                                        )
                                    )
                                    ORDER BY
                                        smsd.msStartDate ASC`;
        const sqlQuery_AdvanceData = `SELECT
                                        CONCAT(
                                            user_details.userFirstName,
                                            ' ',
                                            user_details.userLastName
                                        ) AS "Given By",
                                        advanceAmount AS "Advance Amount",
                                        advanceAmount AS "Remain Advance",
                                        advanceComment "Comment",
                                        DATE_FORMAT(advanceDate, '%d %b %Y') AS "Date"
                                    FROM
                                        staff_advance_data
                                    LEFT JOIN user_details ON user_details.userId = staff_advance_data.userId
                                    WHERE
                                        employeeId = '${employeeId}' AND advanceId IN(
                                        SELECT
                                            COALESCE(
                                                salary_salaryWiseAdvanceId_data.advanceId,
                                                NULL
                                            )
                                        FROM
                                            salary_salaryWiseAdvanceId_data
                                        WHERE
                                            salary_salaryWiseAdvanceId_data.salaryId IN(
                                            SELECT
                                                COALESCE(
                                                    staff_salary_data.salaryId,
                                                    NULL
                                                )
                                            FROM
                                                staff_salary_data
                                            WHERE
                                                staff_salary_data.remainSalaryId = '${invoiceId}'
                                        )
                                    )
                                    ORDER BY
                                        advanceDate ASC,
                                        advanceCreationDate ASC`;
        const sqlQuery_FineData = `SELECT
                                        CONCAT(
                                            user_details.userFirstName,
                                            ' ',
                                            user_details.userLastName
                                        ) AS "Given By",
                                        fineAmount AS "Fine Amount",
                                        fineAmount  AS "Remain Fine",
                                        reason AS "Reason",
                                        DATE_FORMAT(fineDate, '%d-%b-%Y') AS "Date"
                                    FROM
                                        staff_fine_data
                                    LEFT JOIN user_details ON user_details.userId = staff_fine_data.userId
                                    WHERE
                                        employeeId = '${employeeId}' AND fineId IN(
                                        SELECT
                                            COALESCE(
                                                salary_salaryWiseFineId_data.fineId,
                                                NULL
                                            )
                                        FROM
                                            salary_salaryWiseFineId_data
                                        WHERE
                                            salary_salaryWiseFineId_data.salaryId IN(
                                            SELECT
                                                COALESCE(
                                                    staff_salary_data.salaryId,
                                                    NULL
                                                )
                                            FROM
                                                staff_salary_data
                                            WHERE
                                                staff_salary_data.remainSalaryId = '${invoiceId}'
                                        )
                                    )
                                    ORDER BY
                                        fineDate ASC,
                                        fineCreationDate ASC`;
        const sqlQuery_TransactionData = `SELECT
                                            RIGHT(staff_salary_data.remainSalaryId, 10) AS trasactionId,
                                            CONCAT(
                                                user_details.userFirstName,
                                                ' ',
                                                user_details.userLastName
                                            ) AS userName,
                                            COALESCE(
                                                MAX(
                                                    CASE WHEN salaryType = 'Advance Cut' THEN salaryAmount
                                                END
                                            ),
                                            0
                                        ) AS advanceCut,
                                        COALESCE(
                                            MAX(
                                                CASE WHEN salaryType = 'Fine Cut' THEN salaryAmount
                                            END
                                        ),
                                        0
                                        ) AS fineCut,
                                        COALESCE(
                                            MAX(
                                                CASE WHEN salaryType = 'Salary Pay' THEN salaryAmount
                                            END
                                        ),
                                        0
                                        ) AS salaryPay,
                                        salaryComment,
                                        DATE_FORMAT(salaryDate, '%W, %d %M %Y') AS salaryDate,
                                        DATE_FORMAT(salaryCreationDate, '%h:%i %p') AS salaryTime
                                        FROM
                                            staff_salary_data
                                        LEFT JOIN user_details ON user_details.userId = staff_salary_data.userId
                                        WHERE staff_salary_data.remainSalaryId = '${invoiceId}' AND staff_salary_data.employeeId = '${employeeId}'`;
        const sqlQuery_RemainHistory = `SELECT
                                            remainSalaryAmt,
                                            lastRemainAmt,
                                            remainAdvanceAmt,
                                            lastAdvanceAmt,
                                            remainFineAmt,
                                            lastFineAmt
                                        FROM
                                            staff_remainSalaryHistory_data
                                        WHERE remainSalaryId = '${invoiceId}' AND employeeId = '${employeeId}'`;
        const sqlQuery_EmployeeData = `SELECT
                                        sed.employeeNickName,
                                        CONCAT(
                                            staff_category_data.staffCategoryName,
                                            ' (',
                                            sed.designation,
                                            ')'
                                        ) AS position,
                                        sed.employeeMobileNumber,
                                        sed.maxLeave,
                                        FORMAT(sed.salary,0) AS salary,
                                        FORMAT(FLOOR(sed.salary / 30),0) AS perDaySalary
                                    FROM
                                        staff_employee_data AS sed
                                    LEFT JOIN staff_category_data ON staff_category_data.staffCategoryId = sed.category
                                    WHERE sed.employeeId = '${employeeId}'`;
        const sql_query_transactionTable = `${sqlQuery_monthlySalary};
                                            ${sqlQuery_AdvanceData};
                                            ${sqlQuery_FineData};
                                            ${sqlQuery_TransactionData};
                                            ${sqlQuery_RemainHistory};
                                            ${sqlQuery_EmployeeData}`;
        pool.query(sql_query_transactionTable, (err, data) => {
            if (err) {
                console.error("An error occurd in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            createPDF(res, data)
                .then(() => {
                    console.log('PDF created successfully');
                    res.status(200);
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Error creating PDF');
                });
        })
    } catch (error) {
        console.error('An error occurd', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getEmployeeInvoice
}