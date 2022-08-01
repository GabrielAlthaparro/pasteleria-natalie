const reqBodyStringToJSON = require('../middlewares/req-body-string-to-json');
const request = require('../middlewares/request');
const validateJWT = require('../middlewares/validate-jwt');
const validateReqFiles = require('../middlewares/validate-req-files');

module.exports = {
  reqBodyStringToJSON,
  ...request,
  ...validateJWT,
  ...validateReqFiles
}