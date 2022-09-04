'use strict';
const { Router } = require('express');
const { header, param, body } = require('express-validator');

const {
  validateExistsIdMessage,
  validateJWT,
  validateRequestFields } = require('../helpers');

const { sendBudget } = require('../controllers/emails.controller');
const { endRequest } = require('../middlewares');

const router = Router();

router.post('/:id', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim()
    .custom(validateJWT),

  param('id', 'ID inválido')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdMessage).bail()
    .custom((value, { req }) => req.messageDB.estado === 2 ? false : true).bail().withMessage('Ya se respondio esta solicitud'),

  body('mensaje', 'Mensaje inválido')
    .notEmpty().bail().withMessage('El mensaje no puede estar vacío')
    .customSanitizer(value => value.toString()).trim(),

  validateRequestFields
], sendBudget, endRequest);

module.exports = router;