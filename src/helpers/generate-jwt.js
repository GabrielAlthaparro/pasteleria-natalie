const jwt = require('jsonwebtoken');

const generateJWT = (id) => {
  return new Promise((resolve, reject) => {
    const payload = { id };

    jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '24h' },
      (err, token) => {

        if (err) { 
          reject('Error al generar el token');
          return;
        }
        resolve(token);
      });
  });
}

module.exports = generateJWT;