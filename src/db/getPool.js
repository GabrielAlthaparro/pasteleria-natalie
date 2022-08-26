const mysql = require('mysql2/promise');

const config = {
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
  port: process.env.SQL_PORT,
  charset: 'utf8',
  waitForConnections: true,
  connectionLimit: 10,
};

if (process.env.NODE_ENV === 'production') {
  config.ssl = {
    ca: process.env.SQL_SSL_SERVER_CA,
    key: process.env.SQL_SSL_CLIENT_KEY,
    cert: process.env.SQL_SSL_CLIENT_CERTIFICATION
  }
}

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(config);

    pool.on('connection', connection => {
      console.log('Connection %d connected', connection.threadId);
    });
    pool.on('acquire', connection => {
      console.log('Connection %d acquired', connection.threadId);
    });
    pool.on('enqueue', () => {
      console.log('Waiting for available connection slot');
    });
    pool.on('release', connection => {
      console.log('Connection %d released', connection.threadId);
    });
  }
  return pool;
};
module.exports = getPool;