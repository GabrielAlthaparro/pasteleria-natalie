'use strict';
const validateRequestFields = require('./validate-request-fields');
const files = require('./files');
const indexArray = require('./indexArray');
const validators = require('./validators');
const jwt = require('./jwt');

module.exports = {
  ...files,
  ...indexArray,
  ...validators,
  ...jwt,
  validateRequestFields,
}