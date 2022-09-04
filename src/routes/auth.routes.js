'use strict';
const { Router } = require('express');
const { body, header } = require('express-validator');

const { validateRequestFields, validateJWT } = require('../helpers');
const { login, logout } = require('../controllers/auth.controller');
const { endRequest } = require('../middlewares');

const router = Router();

router.post('/login', [
  body('password', 'Contraseña inválida')
    .notEmpty().bail().withMessage('Ingrese su contraseña')
    .customSanitizer(value => value.toString()),
  validateRequestFields
], login, endRequest);

router.post('/logout', [
  header('token', 'Token inválido')
    .notEmpty().bail()
    .isJWT().bail().withMessage('JWT inválido')
    .customSanitizer(value => value.toString()).trim(),

  validateRequestFields
], logout, endRequest);

module.exports = router;
