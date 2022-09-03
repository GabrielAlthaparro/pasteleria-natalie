'use strict';
const request = require('./request');
const errorsMiddlewares = require('./errors-middlewares');
const validateReqFiles = require('./validate-req-files');
const appInit = require('./app-init');

module.exports = {
  ...request,
  ...errorsMiddlewares,
  ...validateReqFiles,
  appInit
}