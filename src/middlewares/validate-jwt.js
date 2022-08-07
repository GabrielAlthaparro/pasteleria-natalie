const { request, response } = require('express');
const jwt = require('jsonwebtoken');

const validateJWT = async (req = request, res = response, next) => {
  const token = req.header('token');
  if (!token) { next(); return; }

  let payload;

  try {
    payload = await getPayload(token);
  } catch (err) {
    console.log(err);
    const msg = {
      text: 'Token inválido, inicie sesión nuevamente',
      type: 'red',
      token: null
    };
    req.customError = {
      status: 401,
      msg
    };
    next();
    return;
  }

  let { id: mail } = payload;
  const { con } = req;
  const queryGetUser = 'SELECT mail, nombre, apellido FROM user WHERE mail = ?';
  const paramsGetUser = [mail];
  try {
    const [results] = await con.execute(queryGetUser, paramsGetUser);
    if (results.length === 0) throw 'ID verificado, pero usuario no se encuentra en la Base de Datos';

    const [userAuthenticated] = results;
    req.userAuthenticated = userAuthenticated;

  } catch (err) {
    console.log(err);

    const msg = {
      text: 'Ocurrio un error al obtener la información para validar su usuario',
      type: 'red'
    }
    req.customError = {
      status: 500,
      msg
    }
  }
  next();
  return;
}

const getPayload = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.SECRET_KEY, (err, payload) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(payload);
    })
  })
}

module.exports = { validateJWT };