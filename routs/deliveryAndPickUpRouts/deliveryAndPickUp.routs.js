const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Person Routs

const personController = require("../../controller/deliveryAndPickUpController/person.controller.js");

router.get('/ddlPersonData', protect, personController.ddlPersonData);
router.get('/getDeliveryPersonList', protect, personController.getDeliveryPersonList);
router.post('/addDeliveryPerson', protect, personController.addDeliveryPerson);
router.delete('/removeDeliveryPerson', protect, personController.removeDeliveryPerson);
router.post('/updateDeliveryPerson', protect, personController.updateDeliveryPerson);

// Delivery Routs

const deliveryController = require("../../controller/deliveryAndPickUpController/delivery.controller.js");

router.get('/getOnDeliveryData', protect, deliveryController.getOnDeliveryData);
router.get('/getDeliveryDataByToken', protect, deliveryController.getDeliveryDataByToken);
router.post('/addDeliveryData', protect, deliveryController.addDeliveryData);
router.delete('/removeDeliveryData', protect, deliveryController.removeDeliveryData);
router.post('/updateDeliveryData', protect, deliveryController.updateDeliveryData);


module.exports = router;