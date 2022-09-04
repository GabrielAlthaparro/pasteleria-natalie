'use strict';
const { Router } = require('express');
const { header, param, body } = require('express-validator');

const {
  validateIDsNotRepeatInArray,
  validateExistsProducts,
  validateExistsIdMessage,
  validateJWT,
  validateRequestFields } = require('../helpers');

const {
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
  deleteMessage
} = require('../controllers/messages.controller');
const { endRequest } = require('../middlewares');

const router = Router();


router.get('/', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim()
    .custom(validateJWT),

  validateRequestFields
], getMessages, endRequest);

router.get('/:id', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim()
    .custom(validateJWT),

  param('id', 'ID inválido')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdMessage),

  validateRequestFields
], getMessage, endRequest);


router.post('/', [
  body('email', 'Email inválido')
    .notEmpty().bail().withMessage('El email es obligatorio')
    .customSanitizer(value => value.toString()).trim()
    .isEmail().bail().withMessage('Estructura de email inválida')
    .isLength({ max: 70 }).bail().withMessage('Máximo 70 caracteres'),
  body('nombre', 'Nombre inválido')
    .notEmpty().bail().withMessage('El nombre es obligatorio')
    .customSanitizer(value => value.toString()).trim()
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ ]*$/)
    .isLength({ min: 3, max: 70 }).bail().withMessage('El nombre debe tener entre 3 y 70 letras'),
  body('aclaraciones', 'Texto de aclaración inválido')
    .optional()
    .customSanitizer(value => value.toString()).trim()
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ0-9$,\."' ]*$/)
    .isLength({ max: 500 }).bail().withMessage('Máximo 500 caracteres'),
  body('productos.*.id', 'IDs de productos inválidos')
    .isInt({ min: 1 }).bail()
    .toInt(),
  body('productos.*.cantidad', 'La cantidad seleccionada es inválida')
    .isInt({ min: 1 }).bail()
    .toInt(),
  body('productos', 'Productos inválidos')
    .exists({ checkNull: true }).bail().withMessage('Envíe los productos que desea')
    .isArray({ min: 1 }).bail()
    .if(body('productos.*.id').isInt({ min: 1 }))
    .custom(validateIDsNotRepeatInArray).bail().withMessage('Se enviaron imágenes con IDs repetidos')
    .custom(validateExistsProducts),

  validateRequestFields
], createMessage, endRequest);


router.put('/:id', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim()
    .custom(validateJWT),

  param('id', 'ID inválido')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdMessage).bail()
    .custom((value, { req }) => req.messageDB.estado === 0 ? true : false).bail().withMessage('Ya se abrio está solicitud'),

  validateRequestFields
], updateMessage, endRequest);


router.delete('/:id', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim()
    .custom(validateJWT),

  param('id', 'ID inválido')
    .isInt({ min: 1 }).bail().withMessage('El ID debe ser un número natural')
    .toInt()
    .custom(validateExistsIdMessage),

  validateRequestFields
], deleteMessage, endRequest);

module.exports = router;