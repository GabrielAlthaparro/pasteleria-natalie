'use strict';
const appInit = require('./app-init');
const errorsMiddlewares = require('./errors-middlewares');
const request = require('./request');
const validateReqFiles = require('./validate-req-files');

module.exports = {
  appInit,
  ...request,
  ...errorsMiddlewares,
  ...validateReqFiles
}