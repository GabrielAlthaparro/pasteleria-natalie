const { request, response } = require('express');
const requestBodyStringToJSON = (req = request, res = response, next) => {
  if (typeof req.body === 'string') {
    req.body = JSON.parse(req.body);
  }
  next();
}

module.exports = requestBodyStringToJSON