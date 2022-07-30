const { request, response } = require("express");

const validateReqFilesField = (param, validExtensions) => {
  return (req = request, res = response, next) => {
    const { files } = req;
    // console.log(files);
    if (files.length === 0) {
      const msg = {
        text: 'Ingrese al menos una imágen',
        type: 'red'
      };
      req.customErrors = [
        {
          msg,
          param
        }
      ]
    }

    files.forEach(file => {
      const splitName = file.originalname.split('.');
      const extension = splitName[splitName.length - 1];
      if (!validExtensions.includes(extension)) {
        if (!req.customErrors) req.customErrors = [];
        const msg = {
          text: `La extensión .${extension} no es válida. Extensiones válidas: ${validExtensions}`,
          type: 'red'
        }
        req.customErrors.push({
          msg,
          param
        })
      }
    });
    next();
  };
}

module.exports = {
  validateReqFilesField
}