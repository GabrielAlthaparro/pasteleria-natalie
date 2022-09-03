'use strict';
require('dotenv').config({ override: true });
const cors = require('cors');
const express = require('express');

const {
  startRequest,
  endRequest,
  expressJsonErrorHandler,
  appInit
} = require('./middlewares');

const app = express();
appInit(app);

// INITIAL MIDDLEWARES
app.use(cors());
app.use(startRequest); // configuraciones iniciales
app.use(express.json()); // si se recibe un JSON, se guarda en el body
app.use(expressJsonErrorHandler);

// ROUTES
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/messages', require('./routes/messages.routes'));
app.use('/api/emails', require('./routes/emails.routes'));

// ENDING MIDDLEWARES
app.use(endRequest);
app.all('*', (req, res) => res.sendStatus(404));

module.exports = app;