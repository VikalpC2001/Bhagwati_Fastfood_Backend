const express = require('express')
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Product Routs

const productController = require("../../controller/inventoryController/product.controller.js");

router.post('/addProduct', protect, productController.addProduct);
router.post('/updateProduct', protect, productController.updateProduct);
router.delete('/removeProduct', protect, productController.removeProduct);
router.get('/ddlProduct', protect, productController.ddlProduct);

// Suppler Routs

const supplierController = require("../../controller/inventoryController/supplier.controller.js");

router.get('/getSupplierdata', supplierController.getSupplierdata);
router.post('/addSupplierDetails', protect, supplierController.addSupplierDetails);
router.post('/updateSupplierDetails', protect, supplierController.updateSupplierDetails);
router.delete('/removeSupplierDetails', protect, supplierController.removeSupplierDetails);
router.get('/fillSupplierDetails', protect, supplierController.fillSupplierDetails);



module.exports = router;