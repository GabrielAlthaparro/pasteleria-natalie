const formidable = import('formidable');
const { endRequest } = require('./request');


const formidableErrorHandler = cantidadMaximaArchivos => {
  return (err, req, res, next) => {
    console.log(err);
    if (req.customError?.status === undefined) { // si no ocurrio previamente un error especial
      let error;
      if (err.code === 1015) {
        const msg = {
          text: `Solo se pueden subir hasta ${cantidadMaximaArchivos} imágenes juntas. Para agregar más, debe hacerlo en otra petición`,
          type: 'red'
        }
        error = { msg };
      } else {
        const msg = {
          text: 'Formulario inválido',
          type: 'red'
        }
        error = { msg };
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

module.exports = formidableErrorHandler;