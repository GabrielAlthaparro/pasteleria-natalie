'use strict';
const { Router} = require('express');

const { body } = require('express-validator');

const validateRequestFields = require('../helpers/validate-request-fields');

const { signIn } = require('../controllers/auth.controller');

const router = Router();

router.post('/signin', [
  body('password', 'Contraseña inválida')
    .notEmpty().bail().withMessage('Ingrese su contraseña')
    .customSanitizer(value => value.toString()),
  validateRequestFields
], signIn);

module.exports = router;
