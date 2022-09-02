const reqBodyStringToJSON = require('../middlewares/req-body-string-to-json');
const request = require('../middlewares/request');
const multerErrorHandler = require('./multer-error-handler');
const validateReqFiles = require('../middlewares/validate-req-files');

module.exports = {
  reqBodyStringToJSON,
  ...request,
  multerErrorHandler,
  ...validateReqFiles
}