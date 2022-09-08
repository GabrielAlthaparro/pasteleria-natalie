'use strict';
const jwt = require('jsonwebtoken');

const getPayload = token => {
  const payload = jwt.decode(token); // si falla, hace un throw
  return payload;
};

const verifyAndGetPayload = token => {
  return new Promise(resolve => {
    jwt.verify(token, process.env.SECRET_KEY, (err, payload) => {
      if (err) {
        resolve({ isValid: false, err: err.name });
      } else {
        resolve({ isValid: true, payload });
      }
    })
  });
};

const verifyAndGetPayloadSync = token => {
  const payload = jwt.verify(token, process.env.SECRET_KEY);
  return payload;
};

const generateJWT = id => {
  return new Promise(resolve => {
    const payload = { id };
    jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '1h' }, (err, token) => {
      if (err) {
        reject(err);
      } else {
        resolve(token);
      }
    });
  });
};

module.exports = {
  getPayload,
  verifyAndGetPayload,
  verifyAndGetPayloadSync,
  generateJWT,
}