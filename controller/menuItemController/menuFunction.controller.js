const pool = require('../../database');

function generateUpdateQuery(data) {
    let query = 'UPDATE item_unitWisePrice_data\nSET price = CASE\n';

    data.forEach((item) => {
        const { uwpId, price } = item;
        query += `    WHEN uwpId = '${uwpId}' THEN ROUND(${price})\n`;
    });

    query += '    ELSE price\nEND\n';

    const uwpIds = data.map((item) => `'${item.uwpId}'`).join(', ');
    query += `WHERE uwpId IN (${uwpIds});`;

    return query;
}

// Function For Variants and Periods

function getItemVariants(itemId, subCategoryId, menuId, callback) {
    let sql_query_getData = `-- GET ACTIVE VARIANTS
                                SELECT uwpId, unit, price, status
                                FROM item_unitWisePrice_data 
                                WHERE itemId = '${itemId}' AND menuCategoryId = '${menuId}' AND status = 1;
                            -- GET PERIOD
                                SELECT 
                                startTime, 
                                endTime,
                                TIME_FORMAT(startTime,"%h:%i %p") AS displayStartTime,
                                TIME_FORMAT(endTime,"%h:%i %p") AS displayEndTime
                                FROM item_subCategoryPeriod_data 
                                WHERE subCategoryId = '${subCategoryId}';
                            -- GET ALL VARIANTS
                                SELECT uwpId, unit, price, status
                                FROM item_unitWisePrice_data
                                WHERE itemId = '${itemId}' AND menuCategoryId = '${menuId}'`;

    pool.query(sql_query_getData, (err, data) => {
        if (err) {
            console.error("An error occurred in SQL Query", err);
            return callback('Database Error', null);
        }
        // Assuming data is an array of results
        let variantAndPeriod = Object.values(JSON.parse(JSON.stringify(data)));
        if (variantAndPeriod.length != 0) {
            let variantsList = variantAndPeriod[0].length ? variantAndPeriod[0] : [];
            let variantsAllList = variantAndPeriod[2].length ? variantAndPeriod[2] : [];
            let jsonData = {
                varients: variantsList.sort((a, b) => (a.unit == "NO") ? -1 : (b.unit == "NO") ? 1 : 0),
                allVariantsList: variantsAllList.length ? variantsAllList.sort((a, b) => (a.unit == "NO") ? -1 : (b.unit == "NO") ? 1 : 0) : [],
                periods: variantAndPeriod[1].length ? variantAndPeriod[1] : [],
                status: variantsList.length ? true : false
            }
            callback(null, jsonData);
        } else {
            let jsonData = {
                varients: [],
                periods: [],
                status: false
            }
            callback(null, jsonData);
        }
    });
}

function varientsAsync(itemId, subCategoryId, menuId) {
    return new Promise((resolve, reject) => {
        getItemVariants(itemId, subCategoryId, menuId, (err, newJson) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(newJson);
            }
        });
    });
}

async function varientDatas(datas, menuId) {
    const updatedDatas = [];
    for (const e of datas) {
        try {
            const newJson = await varientsAsync(e.itemId, e.itemSubCategory, menuId);
            updatedDatas.push(newJson);
        } catch (error) {
            // Handle errors here
            console.error(error);
        }
    }
    return updatedDatas;
}

// Function For Periods

function getPeriods(subCategoryId, callback) {
    let sql_query_getData = `-- GET PERIOD
                                SELECT startTime, endTime 
                                FROM item_subCategoryPeriod_data 
                                WHERE subCategoryId = '${subCategoryId}'`;

    pool.query(sql_query_getData, (err, data) => {
        if (err) {
            console.error("An error occurred in SQL Query", err);
            return callback('Database Error', null);
        }
        // Assuming data is an array of results
        let period = Object.values(JSON.parse(JSON.stringify(data)));
        if (period.length != 0) {
            let jsonData = {
                periods: period.length ? period : []
            }
            callback(null, jsonData);
        } else {
            let jsonData = {
                periods: []
            }
            callback(null, jsonData);
        }
    });
}

function periodAsync(subCategoryId) {
    return new Promise((resolve, reject) => {
        getPeriods(subCategoryId, (err, newJson) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(newJson);
            }
        });
    });
}

async function periodDatas(datas) {
    const updatedDatas = [];
    for (const e of datas) {
        try {
            const newJson = await periodAsync(e.subCategoryId);
            updatedDatas.push(newJson);
        } catch (error) {
            // Handle errors here
            console.error(error);
        }
    }
    return updatedDatas;
}

module.exports = {
    generateUpdateQuery,
    varientDatas,
    periodDatas
}