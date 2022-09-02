'use strict';
const { Router } = require('express');
const { body } = require('express-validator');

const { validateRequestFields } = require('../helpers');
const { login } = require('../controllers/auth.controller');

const router = Router();

router.post('/login', [
  body('password', 'Contraseña inválida')
    .notEmpty().bail().withMessage('Ingrese su contraseña')
    .customSanitizer(value => value.toString()),
  validateRequestFields
], login);

module.exports = router;
