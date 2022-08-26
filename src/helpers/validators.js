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
  const query = 'SELECT id FROM `productos` WHERE id = ?';
  const params = [id];
  try {
    const [results] = await con.execute(query, params);
    if (results.length === 0) throw `No existe un producto registrado con el ID ${id}`;
  } catch (err) {
    console.log(err);
    if (err.sql === undefined) { // si no fue un error de sql
      throw err; // disparo mi error para el express validator
    } else {
      req.customError = { status: 500, msg: 'Error interno al validar el tipo de producto' };
    }
  }
};

const validateArrayImagenes = (imagenes, { req }) => {
  // validaciones de imagenes
  if (req.files.length === 0) {
    if (imagenes.length === 0 || imagenes[0].principal === false) throw 'Se quiere reemplazar la imágen principal, pero no se envió una nueva';
  }
  if (imagenes.length >= 2 && (imagenes[0].principal && imagenes[1].principal)) throw 'Se enviaron dos imágenes principales';
  return true;
}

module.exports = {
  validateExistsIdTipo,
  validateExistsIdProduct,
  validateArrayImagenes
}