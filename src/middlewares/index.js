'use strict';
const request = require('./request');
const errorsMiddlewares = require('./errors-middlewares');
const validateReqFiles = require('./validate-req-files');

module.exports = {
  ...request,
  ...errorsMiddlewares,
  ...validateReqFiles
}