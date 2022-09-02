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
      console.log(expressValidatorErrors[0]);
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
        res.status(400).json(requestErrors);
        console.log(requestErrors[0]);
      }
    }
    // si hubo algun error en las validaciones
    endRequest(req, res, next);
    return;
  }

  // si no hubo ningun tipo de error en las validaciones
  next();
}

module.exports = validateRequestFields;