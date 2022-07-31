const { request, response } = require('express');
const { validationResult } = require('express-validator');

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
      res.status(400).json(expressValidatorErrors);
    } else {

      const { status } = customError;
      if (status === 500) {
        const { msg } = customError;
        res.status(500).json({ msg });
      } else {

        const { errors: customErrors } = customError;
        const requestErrors = [
          ...expressValidatorErrors,
          ...customErrors
        ];
        res.status(status || 400).json(requestErrors);
      }
    }

    const { con } = req;
    try {
      con.release();
    } catch (err) {
      console.log('Error al liberar la conexión');
      console.log(err);
    }
    return;
  }

  // si no hubo ningun tipo de error en las validaciones
  req.routedOk = true;
  next();
}

module.exports = validateRequestFields
