const { request, response } = require("express");

const validateReqFilesNotEmpty = (param) => {
  return (req = request, res = response, next) => {
    const { files = [] } = req;
    if (files.length === 0) {
      const msg = {
        text: 'Ingrese al menos una imágen',
        type: 'red'
      };
      if (req.customError?.status === undefined) { // si no ocurrio previamente un error especial
        if (req.customError === null) { // si no hay errores previos por bad request
          req.customError = { errors: [{ msg, param, location: 'body' }] };
        }else{
          req.customError.errors.push({ msg, param, location: 'body' });
        }
      }


      // if (req.customError === null) { // si no habia error antes, lo creo ahora, un bad request
      //   req.customError = {
      //     errors: [{ msg, param, location: 'body' }]
      //   }
      // } else { // si ya existia algun error, me fijo de que tipo (bad request, u otros)
      //   if (req.customError.status === undefined) { // si no es un error especial
      //     if (req.customError.errors !== undefined) { // si ya hay otros errores por bad request
      //       req.customError.errors.push({ msg, param, location: 'body' });
      //     } else {
      //       req.customError.errors = [{ msg, param, location: 'body' }];
      //     }
      //   } // porque si era un error especial, no tengo que hacer nada
      // }
    }
    next();
  };
}

const validateReqFilesExtensions = (param, validExtensions) => {
  return (req = request, res = response, next) => {
    const { files = [] } = req;
    files.forEach(file => {
      const splitName = file.originalname.split('.');
      const extension = splitName[splitName.length - 1];
      if (!validExtensions.includes(extension)) {
        if (req.customError?.status === undefined) { // si no ocurrio previamente un error especial
          if (req.customError === null) { // si no hay errores previos por bad request
            req.customError = { errors: [] };
          }
          const { errors } = req.customError;
          const msg = {
            text: `La extensión .${extension} no es válida`,
            type: 'red'
          };
          errors.push({ msg, param, location: 'body' });
          req.customError.errors = errors;
        }
      }
    });
    next();
  };
}

module.exports = {
  validateReqFilesNotEmpty,
  validateReqFilesExtensions
}