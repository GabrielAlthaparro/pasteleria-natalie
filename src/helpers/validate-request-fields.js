const { request, response } = require('express');
const { validationResult } = require('express-validator');
const { deleteTmpFilesBuffers } = require('./files');

const validateRequestFields = (req = request, res = response, next) => {
  const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
    const format = {
      msg: {
        text: msg,
        type: 'red'
      },
      param,
      location
    }
    return format;
  };

  const expressValidatorResult = validationResult(req).formatWith(errorFormatter);
  const { customError } = req;

  if (!expressValidatorResult.isEmpty() || customError !== null) {
    const expressValidatorErrors = expressValidatorResult.array(); // si no hay errores, []

    if (customError === null) {
      // si no ocurrio ningun error personalizado
      res.status(400).json(expressValidatorErrors);

    } else {
      // sino, que tipo de error personalizado ocurrio?
      const { status } = customError;
      if (status !== undefined) { // si ocurrio algun error especial
        
        const { msg } = customError;
        res.status(status).json({ msg });
      } else { // sino solo ocurrieron bad requests
        
        const { errors: customErrors } = customError;
        const requestErrors = [
          ...expressValidatorErrors,
          ...customErrors
        ];
        console.log(requestErrors);
        res.status(400).json(requestErrors);
      }
    }

    const { con, files } = req;
    try {
      con.release();
    } catch (err) {
      console.log('Error al liberar la conexión');
      console.log(err);
    }

    if (files !== undefined) deleteTmpFilesBuffers(files);
    return;
  }

  // si no hubo ningun tipo de error en las validaciones
  req.routedOk = true;
  next();
}

module.exports = validateRequestFields
