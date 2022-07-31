const { request, response } = require("express");

const validateReqFilesField = (param, validExtensions) => {
  return (req = request, res = response, next) => {
    const { files } = req;
    if (files.length === 0) {
      const msg = {
        text: 'Ingrese al menos una imágen',
        type: 'red'
      };
      req.customError = {
        errors: [{ msg, param, location: 'body' }]
      }
      next();
      return;
    }
    files.forEach(file => {
      const splitName = file.originalname.split('.');
      const extension = splitName[splitName.length - 1];
      if (!validExtensions.includes(extension)) {
        if (req.customError === null) {
          req.customError = {
            errors: []
          };
        }
        const { errors } = req.customError;
        const msg = {
          text: `La extensión .${extension} no es válida.`,
          type: 'red'
        };
        errors.push({ msg, param, location: 'body' });
        req.customError.errors = errors;
      }
    });
    next();
  };
}

module.exports = {
  validateReqFilesField
}