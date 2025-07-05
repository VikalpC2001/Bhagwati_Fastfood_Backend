const pool = require("../../database");
const { periodDatas } = require('../menuItemController/menuFunction.controller')
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

async function createPDF(res, datas) {
    try {
        const doc = new jsPDF();

        function addSection(doc, title, items, isFirstPage = false, footer) {
            if (!isFirstPage) {
                doc.addPage();
            }
            doc.text(title, 14, 20);

            const tableData = items.map((item, index) => (
                [index + 1, item.itemName, item.soldQty, parseFloat(item.soldRevenue).toLocaleString('en-IN'), item.complimentaryQty, parseFloat(item.complimentaryRevenue).toLocaleString('en-IN'), item.cancelQty, parseFloat(item.cancelRevenue).toLocaleString('en-IN')]
            ));
            tableData.push(footer);


            const head = [
                ['Item Info', '', 'Regular', '', 'Complimentary', '', 'Cancel', ''],
                ['Sr.', 'Item Name', 'Qty', 'Revenue', 'Qty', 'Revenue', 'Qty', 'Revenue']
            ];

            doc.autoTable({
                head: head,
                body: tableData,
                startY: 30,
                theme: 'grid',
                styles: {
                    cellPadding: 2,
                    halign: 'center',
                    fontSize: 10,
                    lineWidth: 0.1, // Add border width
                    lineColor: [192, 192, 192] // Add border color
                },
                headStyles: {
                    lineWidth: 0.1, // Add border width
                    lineColor: [192, 192, 192], // Add border color
                    fontSize: 10,
                    halign: 'center',
                },
                didParseCell: function (data) {
                    if (data.row.section === 'head') {
                        if (data.row.index === 0) {
                            if (data.column.index === 0) {
                                data.cell.colSpan = 2;
                            } else if (data.column.index === 2 || data.column.index === 4 || data.column.index === 6) {
                                data.cell.colSpan = 2;
                            }
                        } else if (data.row.index === 1) {
                            if (data.column.index === 1) {
                                data.cell.rowSpan = 1;
                            }
                        }
                    }
                }
            });
        }

        let isFirstPage = true;
        Object.keys(datas).forEach((key, index) => {
            const section = datas[key];
            const footer = ['Total', '', '', parseFloat(datas[key].totalRevenue).toLocaleString('en-IN'), '', parseFloat(datas[key].totalComplimentaryRevenue).toLocaleString('en-IN'), '', parseFloat(datas[key].totalCancelRevenue).toLocaleString('en-IN')]
            addSection(doc, index + 1 + '. ' + key, section.items, isFirstPage, footer);
            isFirstPage = false;
        });

        const pdfBytes = await doc.output('arraybuffer');
        const fileName = 'jane-doe.pdf'; // Set the desired file name

        // Set the response headers for the PDF download
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        // Stream the PDF to the client for download
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Sub Category Data

const getSubCategoryListForApp = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

        const sql_query_getDetails = `WITH FilteredBillingData AS (
                                          SELECT
                                              itemId,
                                              SUM(price) AS totalRs
                                          FROM
                                              billing_billWiseItem_data
                                          WHERE
                                              billDate BETWEEN STR_TO_DATE('${startDate ? startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${endDate ? endDate : lastDay}', '%b %d %Y')
                                              AND billPayType NOT IN ('Cancel', 'complimentary')
                                              AND billStatus != 'Cancel'
                                          GROUP BY itemId
                                      )
                                      SELECT
                                          iscd.subCategoryId,
                                          iscd.categoryId,
                                          imcd.categoryName,
                                          iscd.subCategoryName,
                                          iscd.displayRank,
                                          COALESCE(SUM(fbd.totalRs), 0) AS totalRs
                                      FROM
                                          item_subCategory_data AS iscd
                                      LEFT JOIN item_mainCategory_data AS imcd ON imcd.categoryId = iscd.categoryId
                                      LEFT JOIN item_menuList_data AS imld ON imld.itemSubCategory = iscd.subCategoryId
                                      LEFT JOIN FilteredBillingData AS fbd ON fbd.itemId = imld.itemId
                                      GROUP BY
                                          iscd.subCategoryId,
                                          iscd.subCategoryName
                                      ORDER BY
                                          iscd.subCategoryName ASC`;
        pool.query(sql_query_getDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');;
            } else {
                if (rows.length == 0) {
                    return res.status(200).send('No Data Found');
                } else {
                    const datas = Object.values(JSON.parse(JSON.stringify(rows)));
                    if (datas.length) {
                        periodDatas(datas)
                            .then((data) => {
                                const rows = datas.map((item, index) => (
                                    { ...item, periods: data[index].periods }
                                ))
                                return res.status(200).send({ rows });
                            }).catch(error => {
                                console.error('Error in processing datas :', error);
                                return res.status(500).send('Internal Error');
                            })
                    } else {
                        return res.status(400).send('No Data Found');
                    }
                }
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Item Sell Report For App

const getItemSalesReportForApp = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            subCategoryId: req.query.subCategoryId ? req.query.subCategoryId : null,
            billType: req.query.billType ? req.query.billType : '',
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        let sql_querry_getDetails = `SELECT
                                         uwi.itemId,
                                         CONCAT(item.itemName,' (',uwi.unit,')') AS itemName,
                                         item.itemSubCategory,
                                         iscd.subCategoryName,
                                         uwi.unit,
                                         SUM(CASE WHEN bbi.billStatus != 'cancel' AND bbi.billPayType != 'complimentary' THEN bbi.qty ELSE 0 END) AS soldQty,
                                         SUM(CASE WHEN bbi.billStatus != 'cancel' AND bbi.billPayType != 'complimentary' THEN bbi.price ELSE 0 END) AS soldRevenue,
                                         SUM(CASE WHEN bbi.billStatus != 'cancel' AND bbi.billPayType = 'complimentary' THEN bbi.qty ELSE 0 END) AS complimentaryQty,
                                         SUM(CASE WHEN bbi.billStatus != 'cancel' AND bbi.billPayType = 'complimentary' THEN bbi.price ELSE 0 END) AS complimentaryRevenue,
                                         SUM(CASE WHEN bbi.billStatus = 'cancel' THEN bbi.qty ELSE 0 END) AS cancelQty,
                                         SUM(CASE WHEN bbi.billStatus = 'cancel' THEN bbi.price ELSE 0 END) AS cancelRevenue
                                     FROM
                                         item_unitWisePrice_data AS uwi
                                     INNER JOIN item_menuList_data AS item ON item.itemId = uwi.itemId
                                     INNER JOIN item_subCategory_data AS iscd ON iscd.subCategoryId = item.itemSubCategory
                                     LEFT JOIN billing_billWiseItem_data AS bbi ON uwi.itemId = bbi.itemId 
                                     AND uwi.unit = bbi.unit 
                                     AND bbi.billDate BETWEEN STR_TO_DATE('${data.startDate ? data.startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${data.endDate ? data.endDate : lastDay}', '%b %d %Y')
                                     AND bbi.billType LIKE '%` + data.billType + `%'
                                     WHERE uwi.menuCategoryId = '${process.env.BASE_MENU}' ${data.subCategoryId ? `AND iscd.subCategoryId = '${data.subCategoryId}'` : ''}
                                     GROUP BY
                                         uwi.itemId,
                                         uwi.unit,
                                         item.itemName,
                                         item.itemSubCategory
                                     ORDER BY
                                         uwi.itemId,
                                         CASE
                                            WHEN uwi.unit = 'NO' THEN 1
                                            WHEN uwi.unit = 'HP' THEN 2
                                            WHEN uwi.unit = 'KG' THEN 3
                                            ELSE 4
                                          END`;
        pool.query(sql_querry_getDetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else if (!data.length) {
                return res.status(404).send('No Data Found');
            } else {
                const result = data.reduce((acc, item) => {
                    const key = item.subCategoryName;
                    if (!acc[key]) {
                        acc[key] = {
                            items: [],
                            totalQty: 0, totalRevenue: 0,
                            totalComplimentaryQty: 0, totalComplimentaryRevenue: 0,
                            totalCancelQty: 0, totalCancelRevenue: 0
                        };
                    }
                    acc[key].items.push(item);
                    if (item.soldRevenue !== null) {
                        acc[key].totalQty += item.soldQty;
                        acc[key].totalRevenue += item.soldRevenue;
                        acc[key].totalComplimentaryQty += item.complimentaryQty;
                        acc[key].totalComplimentaryRevenue += item.complimentaryRevenue;
                        acc[key].totalCancelQty += item.cancelQty;
                        acc[key].totalCancelRevenue += item.cancelRevenue;
                    }
                    return acc;
                }, {});
                return res.status(200).send(result[data[0].subCategoryName]);
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Export Item Sell Report For App

const exportPdfForItemSalesReportForApp = (req, res) => {
    try {
        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);

        const data = {
            subCategoryId: req.query.subCategoryId ? req.query.subCategoryId : null,
            billType: req.query.billType ? req.query.billType : '',
            startDate: (req.query.startDate ? req.query.startDate : '').slice(4, 15),
            endDate: (req.query.endDate ? req.query.endDate : '').slice(4, 15)
        }
        let sql_querry_getDetails = `SELECT
                                         uwi.itemId,
                                         CONCAT(item.itemName,' (',uwi.unit,')') AS itemName,
                                         item.itemSubCategory,
                                         iscd.subCategoryName,
                                         uwi.unit,
                                         SUM(CASE WHEN bbi.billStatus != 'cancel' AND bbi.billPayType != 'complimentary' THEN bbi.qty ELSE 0 END) AS soldQty,
                                         SUM(CASE WHEN bbi.billStatus != 'cancel' AND bbi.billPayType != 'complimentary' THEN bbi.price ELSE 0 END) AS soldRevenue,
                                         SUM(CASE WHEN bbi.billStatus != 'cancel' AND bbi.billPayType = 'complimentary' THEN bbi.qty ELSE 0 END) AS complimentaryQty,
                                         SUM(CASE WHEN bbi.billStatus != 'cancel' AND bbi.billPayType = 'complimentary' THEN bbi.price ELSE 0 END) AS complimentaryRevenue,
                                         SUM(CASE WHEN bbi.billStatus = 'cancel' THEN bbi.qty ELSE 0 END) AS cancelQty,
                                         SUM(CASE WHEN bbi.billStatus = 'cancel' THEN bbi.price ELSE 0 END) AS cancelRevenue
                                     FROM
                                         item_unitWisePrice_data AS uwi
                                     INNER JOIN item_menuList_data AS item ON item.itemId = uwi.itemId
                                     INNER JOIN item_subCategory_data AS iscd ON iscd.subCategoryId = item.itemSubCategory
                                     LEFT JOIN billing_billWiseItem_data AS bbi ON uwi.itemId = bbi.itemId 
                                     AND uwi.unit = bbi.unit 
                                     AND bbi.billDate BETWEEN STR_TO_DATE('${data.startDate ? data.startDate : firstDay}', '%b %d %Y') AND STR_TO_DATE('${data.endDate ? data.endDate : lastDay}', '%b %d %Y')
                                     AND bbi.billType LIKE '%` + data.billType + `%'
                                     WHERE uwi.menuCategoryId = '${process.env.BASE_MENU}' ${data.subCategoryId ? `AND iscd.subCategoryId = '${data.subCategoryId}'` : ''}
                                     GROUP BY
                                         uwi.itemId,
                                         uwi.unit,
                                         item.itemName,
                                         item.itemSubCategory
                                     ORDER BY
                                         uwi.itemId,
                                         CASE
                                            WHEN uwi.unit = 'NO' THEN 1
                                            WHEN uwi.unit = 'HP' THEN 2
                                            WHEN uwi.unit = 'KG' THEN 3
                                            ELSE 4
                                          END`;
        pool.query(sql_querry_getDetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const result = data.reduce((acc, item) => {
                    const key = item.subCategoryName;
                    if (!acc[key]) {
                        acc[key] = {
                            items: [],
                            totalQty: 0, totalRevenue: 0,
                            totalComplimentaryQty: 0, totalComplimentaryRevenue: 0,
                            totalCancelQty: 0, totalCancelRevenue: 0
                        };
                    }
                    acc[key].items.push(item);
                    if (item.soldRevenue !== null) {
                        acc[key].totalQty += item.soldQty;
                        acc[key].totalRevenue += item.soldRevenue;
                        acc[key].totalComplimentaryQty += item.complimentaryQty;
                        acc[key].totalComplimentaryRevenue += item.complimentaryRevenue;
                        acc[key].totalCancelQty += item.cancelQty;
                        acc[key].totalCancelRevenue += item.cancelRevenue;
                    }
                    return acc;
                }, {});
                if (data.length) {
                    createPDF(res, result)
                        .then(() => {
                            console.log('PDF created successfully');
                            res.status(200);
                        })
                        .catch((err) => {
                            console.log(err);
                            res.status(500).send('Error creating PDF');
                        });
                } else {
                    res.status(400).send('No Data Found');
                }
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getItemSalesReportForApp,
    getSubCategoryListForApp,
    exportPdfForItemSalesReportForApp
}