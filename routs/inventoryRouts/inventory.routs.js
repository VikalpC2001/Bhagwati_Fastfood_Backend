const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Product Routs

const productController = require("../../controller/inventoryController/product.controller.js");

router.post('/addProduct', protect, productController.addProduct);
router.post('/updateProduct', protect, productController.updateProduct);
router.delete('/removeProduct', protect, productController.removeProduct);
router.get('/getProductList', protect, productController.getProductList);
router.get('/getProductListCounter', protect, productController.getProductListCounter);
router.get('/getProductCountDetailsById', protect, productController.getProductCountDetailsById);
router.get('/getSupplierByProductId', protect, productController.getSupplierByProductId);
router.get('/getProductDetailsTable', protect, productController.getProductDetailsTable);
router.get('/exportExcelSheetForProductTable', protect, productController.exportExcelSheetForProductTable);

// Supplier Routs

const supplierController = require("../../controller/inventoryController/supplier.controller.js");

router.get('/getSupplierdata', supplierController.getSupplierdata);
router.post('/addSupplierDetails', protect, supplierController.addSupplierDetails);
router.post('/updateSupplierDetails', protect, supplierController.updateSupplierDetails);
router.delete('/removeSupplierDetails', protect, supplierController.removeSupplierDetails);
router.get('/fillSupplierDetails', protect, supplierController.fillSupplierDetails);
router.get('/getSupplierDetailsById', protect, supplierController.getSupplierDetailsById);
router.get('/getSupplierCounterDetailsById', protect, supplierController.getSupplierCounterDetailsById);
router.get('/getProductDetailsBySupplierId', protect, supplierController.getProductDetailsBySupplierId);
router.get('/getAllProductDetailsBySupplierId', protect, supplierController.getAllProductDetailsBySupplierId);
router.get('/exportExcelSheetForAllProductBySupplierId', protect, supplierController.exportExcelSheetForAllProductBySupplierId);

// StockIn Routs

const stockInController = require("../../controller/inventoryController/stockIn.controller.js");

router.post('/addStockInDetails', protect, stockInController.addStockInDetails);
router.delete('/removeStockInTransaction', protect, stockInController.removeStockInTransaction);
router.post('/updateStockInTransaction', protect, stockInController.updateStockInTransaction);
router.get('/fillStockInTransaction', protect, stockInController.fillStockInTransaction);
router.get('/getStockInList', protect, stockInController.getStockInList);
router.get('/exportExcelSheetForStockin', protect, stockInController.exportExcelSheetForStockin);

// StockOut Category Routs

const stockOutCategoryController = require("../../controller/inventoryController/stockOutCategory.controller.js");

router.get('/getCategoryList', protect, stockOutCategoryController.getCategoryList);
router.post('/addstockOutCategory', protect, stockOutCategoryController.addstockOutCategory);
router.delete('/removeStockOutCategory', protect, stockOutCategoryController.removeStockOutCategory);
router.post('/updateStockOutCategory', protect, stockOutCategoryController.updateStockOutCategory);

// StockOut Routs

const stockOutController = require("../../controller/inventoryController/stockOut.controller.js");

router.post('/addStockOutDetails', protect, stockOutController.addStockOutDetails);
router.delete('/removeStockOutTransaction', protect, stockOutController.removeStockOutTransaction);
router.get('/fillStockOutTransaction', protect, stockOutController.fillStockOutTransaction);
router.post('/updateStockOutTransaction', protect, stockOutController.updateStockOutTransaction);
router.get('/getStockOutList', protect, stockOutController.getStockOutList);
router.get('/exportExcelSheetForStockout', protect, stockOutController.exportExcelSheetForStockout);
router.get('/getCategoryWiseUsedByProduct', protect, stockOutController.getCategoryWiseUsedByProduct);
router.get('/getUpdateStockOutList', protect, stockOutController.getUpdateStockOutList);
router.get('/getUpdateStockOutListById', protect, stockOutController.getUpdateStockOutListById);
router.get('/categoryWisedUsed', stockOutController.categoryWisedUsed);
router.get('/categoryWisedUsedPrice', stockOutController.categoryWisedUsedPrice);

// Supplier Transaction Routs

const supplierTransactionController = require("../../controller/inventoryController/supplierTransaction.controller.js");

router.post('/addSupplierTransactionDetails', protect, supplierTransactionController.addSupplierTransactionDetails);
router.post('/updateSupplierTransactionDetails', protect, supplierTransactionController.updateSupplierTransactionDetails);
router.delete('/removeSupplierTransactionDetails', protect, supplierTransactionController.removeSupplierTransactionDetails);
router.get('/fillSupplieTransactionrDetails', protect, supplierTransactionController.fillSupplieTransactionrDetails);
router.get('/getDebitTransactionList', protect, supplierTransactionController.getDebitTransactionList);
router.get('/getCashTransactionList', protect, supplierTransactionController.getCashTransactionList);
router.get('/exportExcelSheetForDebitTransactionList', protect, supplierTransactionController.exportExcelSheetForDebitTransactionList);
router.get('/exportExcelSheetForCashTransactionList', protect, supplierTransactionController.exportExcelSheetForCashTransactionList);
router.get('/getCashTransactionCounter', protect, supplierTransactionController.getCashTransactionCounter);
router.get('/getDebitTransactionCounter', protect, supplierTransactionController.getDebitTransactionCounter);
router.get('/exportTransactionInvoice', protect, supplierTransactionController.exportTransactionInvoice);
router.get('/exportExcelSheetForDeditTransaction', protect, supplierTransactionController.exportExcelSheetForDeditTransaction);

// Inventory Dropdown List Routs

const ddlInventoryController = require("../../controller/inventoryController/ddlInventory.controller.js");

router.get('/productWiseSupplierDDL', protect, ddlInventoryController.productWiseSupplierDDL);
router.get('/ddlStockOutCategory', protect, ddlInventoryController.ddlStockOutCategory);
router.get('/ddlProduct', protect, ddlInventoryController.ddlProduct);

// Bulk Delete Routs

const bulkDeleteController = require("../../controller/inventoryController/bulkDeleteInventory.controller.js");

router.delete('/emptyModifiedHistoryOfStockOut', protect, bulkDeleteController.emptyModifiedHistoryOfStockOut);
router.delete('/emptyModifiedHistoryOfStockOutById', protect, bulkDeleteController.emptyModifiedHistoryOfStockOutById);


module.exports = router;