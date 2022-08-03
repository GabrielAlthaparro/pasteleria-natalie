'use strict';

const cors = require('cors');
require('dotenv').config();
const express = require('express');

const getPool = require('./db/getPool');

const {
  startRequest,
  endRequest,
  reqBodyStringToJSON
} = require('./middlewares/');


const app = express();
app.set('port', process.env.PORT || 4000);
app.set('getPool', getPool);

// MIDDLEWARES
app.use(cors());
app.use(startRequest); // configuraciones iniciales
app.use(express.json()); // si se recibe un JSON, se guarda en el body
app.use(express.text()); // si se recibe un text, se guarda en el body
app.use(reqBodyStringToJSON); // si era un texto, lo paso a JSON y lo guardo en el body

// ROUTES
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/auth', require('./routes/auth.routes'));

app.use(endRequest);

app.all('*', (req, res) => {
  res.sendStatus(404);
});

module.exports = app;