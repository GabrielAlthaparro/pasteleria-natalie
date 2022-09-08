'use strict';
const bcrypt = require('bcryptjs');

const { generateJWT, getPayload, verifyAndGetPayload } = require('../helpers');

const login = async (req, res, next) => {
  const { password: receivedPassword } = req.body;
  const { con } = req;

  let userDB;
  let passwordOk = false;
  try {
    const [usersRows] = await con.query('SELECT id, email, nombre, apellido, password FROM user');
    userDB = usersRows[0]; // porque solo hay un usuario
    passwordOk = await bcrypt.compare(receivedPassword, userDB.password);
  } catch (err) {
    console.log(err);
    sendServerLoginError(res);
    return next();
  }
  if (!passwordOk) {
    const msg = { text: 'Contraseña incorrecta', type: 'red' };
    res.status(401).json({ msg });
    return next();
  }

  // usuario validado
  try {
    const token = await generateJWT(userDB.id);
    const [insertResult] = await con.execute('INSERT INTO user_tokens VALUES (?, ?)', [userDB.id, token]);
    if (insertResult.affectedRows === 0) throw 'Error al registrar el token en DB';

    const msg = { text: 'Sesión iniciada correctamente', type: 'green' };
    const { id, email, password, ...userPublicData } = userDB;
    res.json({ msg, token, user: userPublicData });
  } catch (err) {
    console.log(err);
    sendServerLoginError(res);
  }
  next();
};
const sendServerLoginError = res => {
  const msg = { text: 'Error al iniciar sesión', type: 'red' };
  res.status(500).json({ msg });
}

const logout = async (req, res, next) => {
  const { con } = req;
  const { token } = req.headers;

  const jwtVerication = await verifyAndGetPayload(token);
  if (!jwtVerication.isValid && jwtVerication.err !== 'TokenExpiredError') {
    sendInvalidToken(res);
    return next();
  }

  try {
    const { id: idUser } = getPayload(token);
    const [userTokens] = await con.execute('SELECT token FROM user_tokens WHERE id_user = ? AND token = ?', [idUser, token]);
    if (userTokens.length === 0) { // ya no esta registrado ese token
      sendLogoutOK(res);
      return next();
    }

    await con.beginTransaction();
    if (jwtVerication.isValid) { // si token no es válido es por expiración, no hace falta guardarlo en la tabla de invalid_tokens 
      const [insertResult] = await con.execute(`INSERT INTO invalid_tokens (token) VALUES (?)`, [token]);
      if (insertResult.affectedRows === 0) throw 'Error al registrar el token en tabla de invalid_tokens';
    }
    await con.execute('DELETE FROM user_tokens WHERE id_user = ? AND token = ?', [idUser, token]);
    await con.commit();
    sendLogoutOK(res);

  } catch (err) {
    console.log(err);
    const msg = { text: 'Error al cerrar sesión', type: 'red' };
    res.status(500).json({ msg });
  }
  next();
}
const sendLogoutOK = res => {
  const msg = { text: 'Session cerrada correctamente', type: 'green' };
  res.json({ msg });
}
const sendInvalidToken = res => {
  const msg = { text: 'Token inválido', type: 'red' };
  res.status(401).json({ msg });
}

module.exports = {
  login,
  logout
};
