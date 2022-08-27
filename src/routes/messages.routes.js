'use strict';
const { Router } = require('express');
const { header, param, body } = require('express-validator');

const {
  validateJWT,
} = require('../middlewares')

const validateRequestFields = require('../helpers/validate-request-fields');

const {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage
} = require('../controllers/messages.controller');
const { validateIDsNotRepeatInArray } = require('../helpers/validators');

const router = Router();


router.get('/', [
  header('token', 'Token no enviado')
    .notEmpty().bail()
    .customSanitizer(value => value.toString())
    .trim(),
  validateJWT,
  validateRequestFields
], getMessages);


router.post('/', [

  body('email', 'Email inválido')
    .exists().bail().withMessage('El email es obligatorio')
    .customSanitizer(value => value.toString())
    .trim()
    .isEmail().bail().withMessage('Estructura de email inválida')
    .isLength({ max: 70 }).bail().withMessage('Máximo 70 caracteres'),
  body('nombre', 'Nombre inválido')
    .exists().bail().withMessage('El nombre es obligatorio')
    .customSanitizer(value => value.toString())
    .trim()
    .matches(/^[a-zñÑáéíóúÁÉÍÓÚüÜ ]*$/i)
    .isLength({ min: 3, max: 70 }).bail().withMessage('El nombre debe tener entre 3 y 70 letras'),
  body('aclaraciones', 'Texto de aclaración inválido')
    .optional()
    .customSanitizer(value => value.toString())
    .trim()
    .toLowerCase()
    .isLength({ max: 255 }).bail().withMessage('Máximo 255 caracteres'),
  body('productos', 'Envíe los productos que desea')
    .exists().bail()
    .isArray({ min: 1 }),

  body('productos.*.id', 'IDs de productos inválidos')
    .isInt({ min: 1 }).bail()
    .toInt(),
  body('productos.*.cantidad', 'Cantidad de productos inválidos')
    .isInt({ min: 1 }).bail()
    .toInt(),
  body('productos', 'IDs de productos están repetidos')
    .if(body('productos.*.id').isInt({ min: 1 }))
    .custom(validateIDsNotRepeatInArray),

  validateRequestFields
], createMessage);

module.exports = router;