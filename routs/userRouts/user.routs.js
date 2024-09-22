const express = require('express')
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

const userController = require("../../controller/userController/user.controller.js");

router.post('/authUser', userController.authUser);
router.post('/addUser', protect, userController.addUserDetails);
router.get('/getUserDetails', protect, userController.getUserDetails);
router.get('/ddlRights', protect, userController.ddlRights);
router.delete('/removeUser', protect, userController.removeUserDetails);
router.post('/updateUserDetails', protect, userController.updateUserDetails);
router.get('/fillUserDetails', protect, userController.fillUserDetails);
router.get('/ddlUsersList', protect, userController.ddlUsersList);

module.exports = router;