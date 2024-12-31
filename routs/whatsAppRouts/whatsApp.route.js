const express = require('express')
const router = express.Router();
const { protect } = require("../../middlewares/authMiddlewares.js");

const whatsappController = require("../../controller/whatsappController/whatsapp.controller.js");

router.get('/authUser', whatsappController.meta_wa_callbackurl);
router.post('/addUser', protect, whatsappController.meta_wa_callbackurls);
