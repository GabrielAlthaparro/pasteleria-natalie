'use strict';

const { verifyAndGetPayload } = require("./jwt");

const validateJWT = async (token, { req }) => {
  // let payload;
  try {
    const payload = verifyAndGetPayload(token);
    // jwt es valido, me fijo si ese jwt sirve todavia (por si cerro la sesión)
    const { con } = req;
    try {
      const [tokensRows] = await con.execute('SELECT * FROM tokens WHERE token = ?', [token]);
      if (tokensRows.length !== 0) { // si se cerro la sesión con ese token
        req.customErrors.addSpecialError({ status: 401, text: 'Token inválido, inicie sesión nuevamente', token: null });
        throw 'El JWT es válido, pero se cerro la sesión con él';
      } else { // usuario correcto
        const { id: idUser } = payload;
        const [usersRows] = await con.execute('SELECT email, nombre, apellido FROM user WHERE id = ?', [idUser]);
        if (usersRows.length === 0) throw 'Su usuario no se encuentra en la Base de Datos';
        req.userAuthenticated = usersRows[0];
      }
    } catch (err) {
      if (err.sql === undefined) throw err;
      req.customErrors.addSpecialError({ status: 500, text: 'Ocurrio un error al obtener la información para validar su usuario' });
      throw undefined;
    }
  } catch (err) { // fallo la verificacion del token
    console.log(err);
    req.customErrors.addSpecialError({ status: 401, text: 'Token inválido, inicie sesión nuevamente', token: null });
    throw undefined;
  }
}


const validateExistsIdTipo = async (tipo, { req }) => {
  const { con } = req;
  try {
    const [tiposRows] = await con.execute('SELECT * FROM tipos WHERE id = ?', [tipo]);
    if (tiposRows.length === 0) throw `Tipo no existe en DB`;
  } catch (err) {
    console.log(err);
    if (err.sql === undefined) throw err;
    req.customErrors.addSpecialError({ status: 500, text: 'Error interno al validar el tipo de producto' });
    throw undefined; // para que express validator reciba un error
  }
};

const validateExistsIdProduct = async (id, { req }) => {
  const { con } = req;
  try {
    const [productsRows] = await con.execute('SELECT * FROM productos WHERE id = ?', [id]);
    if (productsRows.length === 0) throw `No existe un producto registrado con el ID ${id}`;
    req.productDB = productsRows[0];
  } catch (err) {
    console.log(err);
    if (err.sql === undefined) throw err;
    req.customErrors.addSpecialError({ status: 500, text: 'Error interno al si existe el producto' });
    throw undefined;
  }
};

const validateExistsProducts = async (products, { req }) => {
  const { con } = req;
  try {
    let qGetProducts = 'SELECT * FROM productos WHERE id IN (';
    const pGetProducts = [];
    for (const product of products) {
      qGetProducts += '?,';
      pGetProducts.push(product.id);
    }
    qGetProducts = qGetProducts.substring(0, qGetProducts.length - 1) + ')';// borrar coma final y cerrar parentesis
    const [productsRows] = await con.execute(qGetProducts, pGetProducts);
    if (productsRows.length !== products.length) throw 'Los productos que solicita son incorrectos';
    req.productsDB = productsRows;
  } catch (err) {
    console.log(err);
    if (err.sql === undefined) throw err;
    req.customErrors.addSpecialError({ status: 500, text: 'Error interno al validar si existen los productos' });
    throw undefined;
  }
};

const validateExistsIdMessage = async (id, { req }) => {
  const { con } = req;
  try {
    const [messageRows] = await con.execute('SELECT * FROM mensajes WHERE id = ?', [id]);
    if (messageRows.length === 0) throw `No existe un mensaje registrado con el ID ${id}`;
    req.messageDB = messageRows[0];
  } catch (err) {
    console.log(err);
    if (err.sql === undefined) throw err;
    req.customErrors.addSpecialError({ status: 500, text: 'Error interno al validar si existe el mensaje' });
    throw undefined;
  }
};

const validateIDsNotRepeatInArray = array => {
  array.sort((a, b) => a.id - b.id);
  let previousID = -1;
  for (const elem of array) {
    if (elem.id === previousID) return false;
    previousID = elem.id;
  }
  return true;
}

module.exports = {
  validateExistsIdTipo,
  validateExistsIdProduct,
  validateExistsIdMessage,
  validateIDsNotRepeatInArray,
  validateExistsProducts,
  validateJWT
}