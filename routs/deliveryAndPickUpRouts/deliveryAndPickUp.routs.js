const express = require('express');
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

// Person Routs

const personController = require("../../controller/deliveryAndPickUpController/person.controller.js");

router.get('/ddlPersonData', protect, personController.ddlPersonData);
router.get('/getStaticsForPerson', protect, personController.getStaticsForPerson);
router.get('/getDeliveryPersonList', protect, personController.getDeliveryPersonList);
router.post('/addDeliveryPerson', protect, personController.addDeliveryPerson);
router.delete('/removeDeliveryPerson', protect, personController.removeDeliveryPerson);
router.post('/updateDeliveryPerson', protect, personController.updateDeliveryPerson);
router.get('/getDeliveryDataByPerson', protect, personController.getDeliveryDataByPerson);

// Delivery Routs

const deliveryController = require("../../controller/deliveryAndPickUpController/delivery.controller.js");

router.get('/getOnDeliveryData', protect, deliveryController.getOnDeliveryData);
router.get('/getDeliveryDataByToken', protect, deliveryController.getDeliveryDataByToken);
router.post('/addDeliveryData', protect, deliveryController.addDeliveryData);
router.delete('/removeDeliveryData', protect, deliveryController.removeDeliveryData);
router.post('/updateDeliveryData', protect, deliveryController.updateDeliveryData);
router.get('/updateDeliveryPerson', protect, deliveryController.updateDeliveryPerson);
router.get('/stopDeliveryData', protect, deliveryController.stopDeliveryData);
router.post('/changePayTypeByDelivery', protect, deliveryController.changePayTypeByDelivery);

// Pick Up Routs

const pickUpController = require("../../controller/deliveryAndPickUpController/pickUp.controller.js");

router.get('/getDisplayTokenNumbr', protect, pickUpController.getDisplayTokenNumbr);
router.get('/getTokenList', protect, pickUpController.getTokenList);
router.get('/revertTokenStatus', protect, pickUpController.revertTokenStatus);
router.get('/updateTokenToDisplay', protect, pickUpController.updateTokenToDisplay);
router.get('/clearAllDisplayToken', protect, pickUpController.clearAllDisplayToken);
router.get('/setAllTokenComplete', protect, pickUpController.setAllTokenComplete);
router.get('/speakTokenNumber', protect, pickUpController.speakTokenNumber);

module.exports = router;