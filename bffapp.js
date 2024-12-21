const express = require('express');
const bodyparser = require('body-parser');
const dotenv = require('dotenv').config();
const cors = require('cors');
const { notFound, erroHandler } = require('./middlewares/errorMiddleware');
const createSocketServer = require('./appSocket');
const http = require('http')
const fs = require('fs');
const app = express()
const port = process.env.PORT;
const userrouter = require('./routs/userRouts/user.routs');
const inventoryrouter = require('./routs/inventoryRouts/inventory.routs');
const staffrouter = require('./routs/staffRouts/staff.routs');
const expenseAndBankrouter = require('./routs/expenseAndBankRouts/expenseAndBank.routs');
const menuItemrouter = require('./routs/menuItemRouts/item.routs');
const billingrouter = require('./routs/billingRouts/billing.routs');
const deliveryAndPickUprouter = require('./routs/deliveryAndPickUpRouts/deliveryAndPickUp.routs');
const captainApprouter = require('./routs/captainAppRouts/captainApp.routs');
const merchantApprouter = require('./routs/merchantAppRouts/merchantApp.routs');

// app.use(cors({
//   credentials: true,
//   origin: [
//     "http://localhost:3000",
//     "http://localhost:5000"
//   ],
//   exposedHeaders: ["set-cookie"],
// }));


app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const server = http.createServer(app);

const io = createSocketServer(server);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())

app.use('/userrouter', userrouter);
app.use('/inventoryrouter', inventoryrouter);
app.use('/staffrouter', staffrouter);
app.use('/expenseAndBankrouter', expenseAndBankrouter);
app.use('/menuItemrouter', menuItemrouter);
app.use('/billingrouter', billingrouter);
app.use('/deliveryAndPickUprouter', deliveryAndPickUprouter);
app.use('/captainApprouter', captainApprouter);
app.use('/merchantApprouter', merchantApprouter);

app.use(notFound);
app.use(erroHandler);

server.listen(port, () => console.log(`Connecion suceesfull ${port}`))