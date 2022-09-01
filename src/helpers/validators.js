const { request } = require("express");

const validateExistsIdTipo = async (tipo, { req }) => {
  const { con } = req;
  const query = 'SELECT * FROM `tipos` WHERE id = ?';
  const params = [tipo];
  try {
    const [results] = await con.execute(query, params);
    if (results.length === 0) throw `Tipo inválido`;
  } catch (err) {
    console.log(err);
    if (err.sql === undefined) { // si no fue un error de sql
      throw err; // disparo mi error para el express validator
    } else {
      req.customError = { status: 500, msg: 'Error interno al validar el tipo de producto' };
    }
  }
};

const validateExistsIdProduct = async (id, { req }) => {
  const { con } = req;
  const query = 'SELECT * FROM productos WHERE id = ?';
  const params = [id];
  try {
    const [results] = await con.execute(query, params);
    if (results.length === 0) throw `No existe un producto registrado con el ID ${id}`;
    req.productDB = results[0];
  } catch (err) {
    console.log(err);
    if (err.sql === undefined) { // si no fue un error de sql
      throw err; // disparo mi error para el express validator
    } else {
      req.customError = { status: 500, msg: 'Error interno al validar si existe el producto solicitado' };
    }
  }
};

const validateExistsProducts = async (products, { req = request }) => {
  const { con } = req;
  let qGetProducts = 'SELECT * FROM productos WHERE id IN ( ';
  qGetProducts += products.reduce(acc => acc + '?,', ''); // agregar el texto '?,' por cada producto recibido
  qGetProducts = qGetProducts.substring(0, qGetProducts.length - 1) + ')'; // borrar coma del final y cerrar parentesis
  const pGetProducts = products.map(product => product.id);
  const [productsRows] = await con.execute(qGetProducts, pGetProducts);
  if (productsRows.length !== products.length) throw 'Los productos que solicita son incorrectos';
  req.productsDB = productsRows;
};

const validateArrayImagenes = (imagenes, { req }) => {
  // validaciones de imagenes
  if (req.files.length === 0) {
    if (imagenes.length === 0 || imagenes[0].principal === false) throw 'Se quiere reemplazar la imágen principal, pero no se envió una nueva';
  }
  if (imagenes.length >= 2 && (imagenes[0].principal && imagenes[1].principal)) throw 'Se enviaron dos imágenes principales';
  return true;
}

const validateExistsIdMessage = async (id, { req }) => {
  const { con } = req;
  const query = 'SELECT * FROM mensajes WHERE id = ?';
  const params = [id];
  try {
    const [messageRows] = await con.execute(query, params);
    if (messageRows.length === 0) throw `No existe un mensaje registrado con el ID ${id}`;
    req.messageDB = messageRows[0];
  } catch (err) {
    console.log(err);
    if (err.sql === undefined) { // si no fue un error de sql
      throw err; // disparo mi error para el express validator
    } else {
      req.customError = { status: 500, msg: 'Error interno al validar si existe el mensaje' };
    }
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
  validateArrayImagenes,
  validateIDsNotRepeatInArray,
  validateExistsProducts
}