const pool = require('../../database');
const pool2 = require('../../databasePool');
const jwt = require("jsonwebtoken");
const { periodDatas } = require('./menuFunction.controller')
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const ensureDirExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const CATEGORY_IMG_DIR = path.join(__dirname, '../../asset/categoryImg');
ensureDirExists(CATEGORY_IMG_DIR);

const isImageFile = (file) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetypeOk = filetypes.test(file.mimetype);
    const extOk = filetypes.test(path.extname(file.originalname).toLowerCase());
    return mimetypeOk && extOk;
};

const subCategoryImgStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            ensureDirExists(CATEGORY_IMG_DIR);
            cb(null, CATEGORY_IMG_DIR);
        } catch (e) {
            cb(e);
        }
    },
    filename: (req, file, cb) => {
        const rawSubCategoryId = (req.body && (req.body.subCategoryId || req.body.subCategoryId === 0))
            ? req.body.subCategoryId
            : req.query.subCategoryId;

        const subCategoryId = String(rawSubCategoryId || '').trim();
        // subCategoryId is also used as the filename base, so keep it filesystem-safe.
        // Existing IDs in this project look like: subCategory_<timestamp>
        if (!/^[a-zA-Z0-9_-]+$/.test(subCategoryId)) {
            cb(new Error('Invalid subCategoryId for image upload.'));
            return;
        }

        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${subCategoryId}${ext}`);
    },
});

const uploadSubCategoryImageMiddleware = multer({
    storage: subCategoryImgStorage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (isImageFile(file)) cb(null, true);
        else cb(new Error('Only image files with jpg, jpeg, or png extensions are allowed.'));
    },
}).any();

const deleteCategoryImgFiles = async (fileNamesToDelete) => {
    await Promise.all(
        fileNamesToDelete.map(async (fileName) => {
            const filePath = path.join(CATEGORY_IMG_DIR, fileName);
            try {
                await fs.promises.unlink(filePath);
            } catch (e) {
                // Ignore missing files; the replace logic is best-effort.
            }
        })
    );
};

const getExistingCategoryImgFiles = async (subCategoryId) => {
    const allFiles = await fs.promises.readdir(CATEGORY_IMG_DIR);
    return allFiles.filter((f) => f.startsWith(`${subCategoryId}.`));
};

// Get Sub Category Data

const getSubCategoryList = (req, res) => {
    try {
        const page = req.query.page;
        const numPerPage = req.query.numPerPage;
        const skip = (page - 1) * numPerPage;
        const limit = skip + ',' + numPerPage;

        var date = new Date(), y = date.getFullYear(), m = (date.getMonth());
        var firstDay = new Date(y, m, 1).toString().slice(4, 15);
        var lastDay = new Date(y, m + 1, 0).toString().slice(4, 15);
        const startDate = (req.query.startDate ? req.query.startDate : '').slice(4, 15);
        const endDate = (req.query.endDate ? req.query.endDate : '').slice(4, 15);

        sql_querry_getCountDetails = `SELECT count(*) as numRows FROM item_subCategory_data`;
        pool.query(sql_querry_getCountDetails, (err, rows, fields) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            } else {
                const numRows = rows[0].numRows;
                const numPages = Math.ceil(numRows / numPerPage);
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
                                                iscd.imgLink,
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
                                                iscd.subCategoryName ASC
                                                LIMIT ${limit}`;
                pool.query(sql_query_getDetails, (err, rows, fields) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');;
                    } else {
                        if (numRows === 0) {
                            const rows = [{
                                'msg': 'No Data Found'
                            }]
                            return res.status(200).send({ rows, numRows });
                        } else {
                            const datas = Object.values(JSON.parse(JSON.stringify(rows)));
                            if (datas.length) {
                                periodDatas(datas)
                                    .then((data) => {
                                        const rows = datas.map((item, index) => (
                                            { ...item, periods: data[index].periods }
                                        ))
                                        return res.status(200).send({ rows, numRows });
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
            }
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Sub Category Data

const getSubCategoryListForMobile = (req, res) => {
    try {
        const menuId = req.query.menuId ? req.query.menuId : process.env.BASE_MENU;
        sql_querry_getddlCategory = `SELECT 
                                            subCategoryId, 
                                            subCategoryName,
                                            (
                                                SELECT COUNT(*)
                                                FROM item_menuList_data imd
                                                WHERE imd.itemSubCategory = subCategoryId
                                            ) AS numberOfItem,
                                            CASE
                                                WHEN EXISTS (
                                                    SELECT 1
                                                    FROM item_unitWisePrice_data iup
                                                    JOIN item_menuList_data id ON id.itemId = iup.itemId
                                                    WHERE id.itemSubCategory = subCategoryId
                                                      AND iup.status = 1 AND iup.menuCategoryId = '${menuId}'
                                                ) THEN true
                                                ELSE false
                                            END AS status,
                                            imgLink AS imageLink
                                         FROM item_subCategory_data
                                         HAVING status = 1
                                         ORDER BY displayRank ASC`;

        pool.query(sql_querry_getddlCategory, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Get DDL For SubCategory

const ddlSubCategory = (req, res) => {
    try {
        const menuId = req.query.menuId ? req.query.menuId : null
        if (menuId) {
            sql_querry_getddlCategory = `SELECT 
                                            subCategoryId, 
                                            subCategoryName,
                                            (
                                                SELECT COUNT(*)
                                                FROM item_menuList_data imd
                                                WHERE imd.itemSubCategory = subCategoryId
                                            ) AS numberOfItem,
                                            CASE
                                                WHEN EXISTS (
                                                    SELECT 1
                                                    FROM item_unitWisePrice_data iup
                                                    JOIN item_menuList_data id ON id.itemId = iup.itemId
                                                    WHERE id.itemSubCategory = subCategoryId
                                                      AND iup.status = 1 AND iup.menuCategoryId = '${menuId}'
                                                ) THEN true
                                                ELSE false
                                            END AS status
                                         FROM item_subCategory_data
                                         ORDER BY displayRank ASC`;
        } else {
            sql_querry_getddlCategory = `SELECT 
                                            subCategoryId, 
                                            subCategoryName,
                                            (
                                                SELECT COUNT(*)
                                                FROM item_menuList_data imd
                                                WHERE imd.itemSubCategory = subCategoryId
                                            ) AS numberOfItem
                                         FROM item_subCategory_data
                                         ORDER BY displayRank ASC`;
        }

        pool.query(sql_querry_getddlCategory, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send(data);
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
}

// Add Sub-Category Data

const addSubCategoryData = (req, res) => {
    try {
        const uid1 = new Date();
        const subCategoryId = String("subCategory_" + uid1.getTime());

        const data = {
            categoryId: req.body.categoryId,
            subCategoryName: req.body.subCategoryName.trim(),
            displayRank: req.body.displayRank
        }
        if (!data.subCategoryName || !data.categoryId || !data.displayRank) {
            return res.status(400).send("Please Fill All The Fields");
        } else {
            req.body.productName = pool.query(`SELECT subCategoryName FROM item_subCategory_data WHERE subCategoryName = '${data.subCategoryName}'`, function (err, row) {
                if (err) {
                    console.error("An error occurred in SQL Queery", err);
                    return res.status(500).send('Database Error');
                }
                if (row && row.length) {
                    return res.status(400).send('SubCategory is Already In Use');
                } else {
                    const sql_querry_addCategory = `INSERT INTO item_subCategory_data (subCategoryId, categoryId, subCategoryName, displayRank)
                                                    VALUES ('${subCategoryId}', '${data.categoryId}', '${data.subCategoryName}', ${data.displayRank})`;
                    pool.query(sql_querry_addCategory, (err, data) => {
                        if (err) {
                            console.error("An error occurred in SQL Queery", err);
                            return res.status(500).send('Database Error');
                        }
                        return res.status(200).send("SubCategory Added Successfully");
                    })
                }
            })
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Remove Sub-Category Data

const removeSubCategoryData = (req, res) => {
    try {
        let token;
        token = req.headers ? req.headers.authorization.split(" ")[1] : null;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const rights = decoded.id.rights;
            if (rights == 1) {
                const subCategoryId = req.query.subCategoryId.trim();
                req.query.subCategoryId = pool.query(`SELECT subCategoryId FROM item_subCategory_data WHERE subCategoryId = '${subCategoryId}'`, (err, row) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    if (row && row.length) {
                        const sql_querry_removedetails = `DELETE FROM item_subCategory_data WHERE subCategoryId = '${subCategoryId}'`;
                        pool.query(sql_querry_removedetails, (err, data) => {
                            if (err) {
                                console.error("An error occurred in SQL Queery", err);
                                return res.status(500).send('Database Error');
                            }
                            return res.status(200).send("SubCategory Deleted Successfully");
                        })
                    } else {
                        return res.send('SubCategoryId Not Found');
                    }
                })
            } else {
                return res.status(400).send('You are Not Authorised');
            }
        } else {
            return res.status(404).send('Please Login First...!');
        }
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Update Sub-Category Data

const updateSubCategoryData = (req, res) => {
    try {
        const data = {
            subCategoryId: req.body.subCategoryId,
            categoryId: req.body.categoryId,
            subCategoryName: req.body.subCategoryName.trim(),
            displayRank: req.body.displayRank
        }
        if (!data.subCategoryName || !data.categoryId || !data.displayRank) {
            return res.status(400).send("Please Fill All The Fields");
        }
        const sql_querry_updatedetails = `UPDATE
                                              item_subCategory_data
                                          SET
                                              categoryId = '${data.categoryId}',
                                              subCategoryName = '${data.subCategoryName}',
                                              displayRank = ${data.displayRank}
                                          WHERE subCategoryId = '${data.subCategoryId}'`;
        pool.query(sql_querry_updatedetails, (err, data) => {
            if (err) {
                console.error("An error occurred in SQL Queery", err);
                return res.status(500).send('Database Error');
            }
            return res.status(200).send("subCategory Updated Successfully");
        })
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Add Sub Category Period Data

const addSubCategoryPeriod = (req, res) => {
    try {
        const periodData = req.body;

        if (periodData && periodData.subCategoryId && periodData.periodIntervels && periodData.periodIntervels.length > 0) {
            if (periodData.periodIntervels.length > 3) {
                res.status(400).send("Only Three intervals are allowed");
            }
            else {
                const periodJson = periodData.periodIntervels
                let addPeriodData = periodJson.map((item, index) => {
                    let uniqueId = `period_${Date.now() + index}`; // Generating a unique ID using current timestamp
                    return `('${uniqueId}', '${periodData.subCategoryId}', '${item.startTime}', '${item.endTIme}')`;
                }).join(', ');

                const sql_querry_addCategory = `INSERT INTO item_subCategoryPeriod_data (periodId, subCategoryId, startTime, endTime)
                                                VALUES ${addPeriodData}`;
                pool.query(sql_querry_addCategory, (err, data) => {
                    if (err) {
                        console.error("An error occurred in SQL Queery", err);
                        return res.status(500).send('Database Error');
                    }
                    return res.status(200).send("Perioad Added Successfully");
                })
            }
        } else {
            res.status(400).send("Please Fill All The Fields...!");
        }

    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Update Sub Category Data

const updateSubCategoryPeriod = (req, res) => {
    pool2.getConnection((err, conn) => {
        if (err) {
            console.log('Connection Error', err)
            return res.status(500).send('Database Connection Error');
        }
        try {
            conn.beginTransaction((err) => {
                if (err) {
                    console.log('Error In Transaction');
                    return res.status(500).send('Transaction Error');
                }
                const periodData = req.body;

                if (periodData && periodData.subCategoryId) {
                    const periodJson = periodData.periodIntervels
                    sql_querry_removeOldPeriods = `DELETE FROM item_subCategoryPeriod_data WHERE subCategoryId = '${periodData.subCategoryId}'`;
                    conn.query(sql_querry_removeOldPeriods, (err, data) => {
                        if (err) {
                            conn.rollback(() => {
                                console.error("An error occurred in SQL Queery 1", err);
                                conn.release();
                                return res.status(500).send('Database Error 1');
                            })
                        } else if (periodJson.length) {
                            let addPeriodData = periodJson.map((item, index) => {
                                let uniqueId = `period_${Date.now() + index}`; // Generating a unique ID using current timestamp
                                return `('${uniqueId}', '${periodData.subCategoryId}', '${item.startTime}', '${item.endTime}')`;
                            }).join(', ');

                            const sql_querry_addCategory = `INSERT INTO item_subCategoryPeriod_data (periodId, subCategoryId, startTime, endTime)
                                                            VALUES ${addPeriodData}`;
                            conn.query(sql_querry_addCategory, (err, data) => {
                                if (err) {
                                    conn.rollback(() => {
                                        console.error("An error occurred in SQL Queery 2", err);
                                        conn.release();
                                        return res.status(500).send('Database Error');
                                    })
                                } else {
                                    conn.commit((err) => {
                                        if (err) {
                                            conn.rollback(() => {
                                                console.error("An error occurred in SQL Queery 1", err);
                                                conn.release();
                                                return res.status(500).send('Database Error');
                                            })
                                        } else {
                                            conn.release();
                                            return res.status(200).send("Perioad Update Successfully");
                                        }
                                    })
                                }
                            })
                        } else {
                            conn.commit((err) => {
                                if (err) {
                                    conn.rollback(() => {
                                        console.error("An error occurred in SQL Queery", err);
                                        conn.release();
                                        return res.status(500).send('Database Error');
                                    })
                                } else {
                                    conn.release();
                                    console.log('success;>>');
                                    return res.status(200).send("Perioad Remove Successfully");
                                }
                            })
                        }
                    })
                } else {
                    conn.rollback(() => {
                        conn.release();
                        return res.status(400).send("Please provide SubCategoryId");
                    })
                }
            })
        } catch (error) {
            conn.rollback(() => {
                console.error('An error occurred', error);
                conn.release();
                return res.status(500).json('Internal Server Error');
            })
        }
    })
}

// Upload Sub-Category Image

const uploadSubCategoryImage = (req, res) => {
    try {
        uploadSubCategoryImageMiddleware(req, res, async (err) => {
            if (err) {
                return res.status(500).send(err.message || 'File Upload Error');
            }

            const subCategoryId =
                (req.body && req.body.subCategoryId !== undefined && req.body.subCategoryId !== null)
                    ? String(req.body.subCategoryId).trim()
                    : (req.query && req.query.subCategoryId ? String(req.query.subCategoryId).trim() : '');

            if (!subCategoryId) {
                return res.status(400).send('Please provide subCategoryId');
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(subCategoryId)) {
                return res.status(400).send('Invalid subCategoryId');
            }

            const files = req.files || [];
            if (!files.length) {
                return res.status(400).send('Please select an image file');
            }
            if (files.length !== 1) {
                // Reject multi-file upload to keep a single image per subCategoryId.
                try {
                    await deleteCategoryImgFiles(files.map((f) => f.filename));
                } catch (e) {
                    // Non-fatal; the DB won't be updated because we return early.
                }
                return res.status(400).send('Please upload only one photo');
            }

            const uploadedFile = files[0];
            const newFileName = uploadedFile.filename;

            try {
                // Update first, then delete old images only after DB update succeeded.
                const imgLink = `menuItemrouter/getSubCategoryImagebyName?imageName=${newFileName}`;
                const sql = `UPDATE item_subCategory_data SET imgLink = ? WHERE subCategoryId = ?`;

                pool.query(sql, [imgLink, subCategoryId], async (dbErr, result) => {
                    if (dbErr) {
                        // DB failed -> delete newly uploaded image so we don't leave orphan files.
                        try {
                            await deleteCategoryImgFiles([newFileName]);
                        } catch (e) { }
                        return res.status(500).send('Database Error');
                    }

                    if (!result || result.affectedRows === 0) {
                        try {
                            await deleteCategoryImgFiles([newFileName]);
                        } catch (e) { }
                        return res.status(404).send('subCategoryId Not Found');
                    }

                    // Delete any previous images for this subCategoryId (excluding the just-uploaded one).
                    try {
                        const existingFiles = await getExistingCategoryImgFiles(subCategoryId);
                        const toDelete = existingFiles.filter((f) => f !== newFileName);
                        await deleteCategoryImgFiles(toDelete);
                    } catch (e) {
                        // Non-fatal: image replacement already succeeded, but cleanup failed.
                    }

                    return res.status(200).send({ message: 'SubCategory image updated successfully', imgLink });
                });
            } catch (e) {
                // Best-effort cleanup if something unexpected happens before DB callback.
                try {
                    await deleteCategoryImgFiles([newFileName]);
                } catch (_) { }
                return res.status(500).send('Internal Server Error');
            }
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).json('Internal Server Error');
    }
}

// Get Sub-Category Image By Name

const getSubCategoryImagebyName = (req, res) => {
    try {
        const imageName = req.query.imageName;
        if (!imageName) return res.status(400).send('Please provide imageName');

        // Prevent path traversal (only allow filename portion)
        const safeImageName = path.basename(imageName);
        if (safeImageName !== imageName) return res.status(400).send('Invalid imageName');

        const imagePath = path.join(CATEGORY_IMG_DIR, safeImageName);
        const imageExt = path.extname(safeImageName).toLowerCase();
        const contentType =
            imageExt === '.png' ? 'image/png' :
                imageExt === '.jpg' || imageExt === '.jpeg' ? 'image/jpeg' :
                    'application/octet-stream';

        fs.readFile(imagePath, (err, data) => {
            if (err) {
                return res.status(404).send('Image not found');
            }
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', data.length);
            res.end(data);
        });
    } catch (error) {
        console.error('An error occurred', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    getSubCategoryList,
    ddlSubCategory,
    addSubCategoryData,
    removeSubCategoryData,
    updateSubCategoryData,
    addSubCategoryPeriod,
    updateSubCategoryPeriod,
    getSubCategoryListForMobile,
    uploadSubCategoryImage,
    getSubCategoryImagebyName,
}