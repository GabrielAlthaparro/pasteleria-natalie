'use strict';
const { Router } = require('express');
const { header, param, body } = require('express-validator');

const { validateJWT } = require('../middlewares')

const validateRequestFields = require('../helpers/validate-request-fields');
const { validateExistsIdMessage } = require('../helpers/validators');

const { sendBudget } = require('../controllers/emails.controller');

const router = Router();

router.post('/:id', [
  header('token', 'Token no enviado')
    .notEmpty().bail()
    .customSanitizer(value => value.toString())
    .trim(),
  validateJWT,

  param('id', 'ID inválido')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdMessage).bail()
    .custom((value, { req }) => req.messageDB.estado === 2 ? false : true).bail().withMessage('Ya se respondio esta solicitud'),
    
  body('mensaje', 'Mensaje inválido')
    .notEmpty().bail().withMessage('El mensaje no puede estar vacío')
    .customSanitizer(value => value.toString()).trim(),

  validateRequestFields
], sendBudget);

module.exports = router;