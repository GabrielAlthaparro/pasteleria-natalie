const multerErrorHandler = (param, cantidadMaximaArchivos) => {
  return (err, req, res, next) => {
    console.log(err);
    if (err && req.customError?.status === undefined) { // si no ocurrio previamente un error especial
      let error;
      if (err.code === 'LIMIT_FILE_COUNT') {
        const msg = {
          text: `Solo se pueden subir hasta ${cantidadMaximaArchivos} imágenes juntas. Para agregar más, debe hacerlo en otra petición`,
          type: 'red'
        }
        error = { msg, location: 'body', param };
      } else {
        const msg = {
          text: 'Se están recibiendo archivos en un campo incorrecto',
          type: 'red'
        }
        error = { msg, location: 'body', param: err.field };
      }
      if (req.customError === null) { // si no hay previos errores por bad request
        req.customError = { errors: [error] };
      } else { // si ya existen otros errores por bad requests
        req.customError.errors.push(error);
      }
    }
    next();
  };
};

module.exports = multerErrorHandler;