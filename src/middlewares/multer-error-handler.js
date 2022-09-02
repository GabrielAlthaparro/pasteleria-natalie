'use strict';
const multer = require('multer');
const multerErrorHandler = () => {
  return (err, req, res, next) => {
    console.log(err.code);
    if (err instanceof multer.MulterError && req.customError?.status === undefined) { // si no ocurrio previamente un error especial
      const msg = {
        text: 'Se están recibiendo archivos en un campo incorrecto',
        type: 'red'
      }
      if (req.customError === null) { // si no hay previos errores por bad request
        req.customError = { errors: [{ msg }] };
      } else { // si ya existen otros errores por bad requests
        req.customError.errors.push({ msg });
      }
    }
    next();
  };
};

module.exports = multerErrorHandler;