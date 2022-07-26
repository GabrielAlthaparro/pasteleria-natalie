const mysql = require('mysql');
const host = 'sql10.freemysqlhosting.net';
const user = 'sql10508968';
const password = 'CX8HkVZ1f5.';
const database = 'sql10508968';

const conexion = mysql.createConnection({
    host,
    user,
    password,
    database
});

conexion.connect((err) => {
    if (err) throw err;
    console.log('Base conectada correctamente');
});

module.exports = conexion;