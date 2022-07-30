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
    }
    return format;
  };

  const expressValidatorResult = validationResult(req).formatWith(errorFormatter);
  const { customErrors = null } = req;

  if (!expressValidatorResult.isEmpty() || customErrors !== null) {

    let errors;
    if (customErrors !== null) {
      errors = [
        ...expressValidatorResult.array(),
        ...customErrors
      ];
    } else {
      errors = expressValidatorResult.array();
    }
    res.status(400).json(errors);

    const { con } = req;
    con.release();
    return;
  }
  req.routedOk = true;
  next();
}

module.exports = validateRequestFields
