const app = require('./src/app');

const server = app.listen(app.get('port'), () => console.log(`App listening on port ${app.get('port')}`));

module.exports = { server, app };