'use strict';
const { validationResult } = require('express-validator');
const { endRequest } = require('../middlewares');

const validateRequestFields = (req = request, res = response, next) => {
  req.routedOk = true;
  const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
    const format = {
      msg: {
        text: msg,
        type: 'red'
      }
    }
    return format;
  };

  const expressValidatorResult = validationResult(req).formatWith(errorFormatter);
  const { customErrors } = req;

  if (!expressValidatorResult.isEmpty() || !customErrors.isEmpty()) {

    const expressValidatorErrors = expressValidatorResult.array(); // si no hay errores, []
    const customBadRequestErrors = customErrors.getBadRequestErrors(); // si no hay errores, []
    const customSpecialError = customErrors.getSpecialError(); // si no hay errores, null

    if (customSpecialError !== null) { // si ocurrio algún error personalizado
      const { status, msg, ...others } = customSpecialError;
      res.status(status).json({ msg, ...others });
      console.log(customSpecialError);
    } else {
      // solo tengo que devolver bad requests, alguno de los dos no esta vacio
      const requestErrors = [
        ...expressValidatorErrors,
        ...customBadRequestErrors
      ];
      res.status(400).json(requestErrors);
      console.log(requestErrors[0]);
    }
    // si hubo algun error en las validaciones
    endRequest(req, res, next);
    return;
  }
  // si no hubo ningun tipo de error en las validaciones
  next();
}

module.exports = validateRequestFields;