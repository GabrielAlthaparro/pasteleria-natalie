'use strict';
const jwt = require('jsonwebtoken');

const getPayload = token => {
  const payload = jwt.decode(token); // si falla, hace un throw
  return payload;
};

const verifyAndGetPayload = token => {
  const payload = jwt.verify(token, process.env.SECRET_KEY); // si falla, hace un throw
  return payload;
};

const generateJWT = id => {
  const payload = { id };
  const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '15m' }); // si falla, hace un throw
  return token;
}

module.exports = {
  getPayload,
  verifyAndGetPayload,
  generateJWT
}