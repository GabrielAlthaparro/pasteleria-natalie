'use strict';

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
        } else {
          req.customError.errors.push({ msg, param, location: 'body' });
        }
      }
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

const validateReqMaxFiles = (param, cantidadMaxima) => {
  return (req = request, res = response, next) => {
    const { files = [] } = req;
    if (files.length > cantidadMaxima) {
      const msg = {
        text: `No se pueden subir más de ${cantidadMaxima} fotos en una sola petición`,
        type: 'red'
      };
      if (req.customError?.status === undefined) { // si no ocurrio previamente un error especial
        if (req.customError === null) { // si no hay errores previos por bad request
          req.customError = { errors: [{ msg, param, location: 'body' }] };
        } else {
          req.customError.errors.push({ msg, param, location: 'body' });
        }
      }
    }
    next();
  }
}

module.exports = {
  validateReqFilesNotEmpty,
  validateReqFilesExtensions,
  validateReqMaxFiles
}