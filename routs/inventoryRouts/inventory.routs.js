const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Product Routs

const productController = require("../../controller/inventoryController/product.controller.js");

router.post('/addProduct', protect, productController.addProduct);
router.post('/updateProduct', protect, productController.updateProduct);
router.delete('/removeProduct', protect, productController.removeProduct);
router.get('/fillProductWiseUnit', protect, productController.fillProductWiseUnit);
router.get('/fillProduct', protect, productController.fillProduct);
router.get('/getProductList', protect, productController.getProductList);

// Suppler Routs

const supplierController = require("../../controller/inventoryController/supplier.controller.js");

router.get('/getSupplierdata', supplierController.getSupplierdata);
router.post('/addSupplierDetails', protect, supplierController.addSupplierDetails);
router.post('/updateSupplierDetails', protect, supplierController.updateSupplierDetails);
router.delete('/removeSupplierDetails', protect, supplierController.removeSupplierDetails);
router.get('/fillSupplierDetails', protect, supplierController.fillSupplierDetails);

// StockIn Routs

const stockInController = require("../../controller/inventoryController/stockIn.controller.js");

router.post('/addStockInDetails', protect, stockInController.addStockInDetails);
router.delete('/removeStockInTransaction', protect, stockInController.removeStockInTransaction);
router.post('/updateStockInTransaction', protect, stockInController.updateStockInTransaction);
router.get('/fillStockInTransaction', protect, stockInController.fillStockInTransaction);


// StockOut Category Routs

const stockOutCategoryController = require("../../controller/inventoryController/stockOutCategory.controller.js");

router.post('/addstockOutCategory', protect, stockOutCategoryController.addstockOutCategory);
router.delete('/removeStockOutCategory', protect, stockOutCategoryController.removeStockOutCategory);
router.get('/fillStockOutCategory', protect, stockOutCategoryController.fillStockOutCategory);
router.post('/updateStockOutCategory', protect, stockOutCategoryController.updateStockOutCategory);

// StockOut Routs

const stockOutController = require("../../controller/inventoryController/stockOut.controller.js");

router.post('/addStockOutDetails', protect, stockOutController.addStockOutDetails);

// Inventory Dropdown List Routs

const ddlInventoryController = require("../../controller/inventoryController/ddlInventory.controller.js");

router.get('/productWiseSupplierDDL', protect, ddlInventoryController.productWiseSupplierDDL);
router.get('/ddlStockOutCategory', protect, ddlInventoryController.ddlStockOutCategory);
router.get('/ddlProduct', protect, ddlInventoryController.ddlProduct);



module.exports = router;