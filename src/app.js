const express = require('express'); 
require('./database'); // Conecta a la base
const cors = require('cors');
const app = express();

app.use(cors())
app.use(express.json());
app.set('port', process.env.PORT || 4000);

app.get('/', (req, res) => {
    res.json({
        msg: "anda"
    })
});


// app.use('/api/products', require('./routes/products.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
//app.use(require('./routes/user.routes'));


module.exports = app;