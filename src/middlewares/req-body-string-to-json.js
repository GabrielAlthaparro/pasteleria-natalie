'use strict';
const reqBodyStringToJSON = (req, res, next) => {
  if (typeof req.body === 'string') {
    req.body = JSON.parse(req.body);
  }
  next();
}

module.exports = reqBodyStringToJSON