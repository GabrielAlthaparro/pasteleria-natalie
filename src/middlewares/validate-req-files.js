'use strict';

const validateReqFilesNotEmpty = () => {
  return (req, res, next) => {
    const { files = [] } = req;
    if (files.length === 0) {
      req.customErrors.addBadRequestError('Ingrese al menos una imágen');
    }
    next();
  };
}

const validateReqFilesExtensions = validExtensions => {
  return (req, res, next) => {
    const { files = [] } = req;
    files.forEach(file => {
      const splitName = file.originalname.split('.');
      const extension = splitName[splitName.length - 1];
      if (!validExtensions.includes(extension)) {
        req.customErrors.addBadRequestError(`La extensión .${extension} no es válida`);
      }
    });
    next();
  };
}

const validateReqMaxFiles = (cantidadMaxima) => {
  return (req, res, next) => {
    const { files = [] } = req;
    if (files.length > cantidadMaxima) {
      req.customErrors.addBadRequestError(`No se pueden subir más de ${cantidadMaxima} fotos en una sola petición`);
    }
    next();
  }
}

module.exports = {
  validateReqFilesNotEmpty,
  validateReqFilesExtensions,
  validateReqMaxFiles
}