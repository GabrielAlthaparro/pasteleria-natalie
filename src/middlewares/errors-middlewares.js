'use strict';
const multer = require('multer');
const multerErrorHandler = () => {
  return (err, req, res, next) => {
    console.log(err.code);
    if (err instanceof multer.MulterError) {
      req.customErrors.addBadRequestError('Se están recibiendo archivos en un campo incorrecto');
    }
    next();
  };
};

const expressJsonErrorHandler = (err, req, res, next) => {
  console.log(err);
  req.customErrors.addSpecialError({ status: 400, text: 'Error al recibir el body' });
  next();
}

module.exports = {
  multerErrorHandler,
  expressJsonErrorHandler
};