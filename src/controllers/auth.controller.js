const conexion = require('../database');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
// const config = require('../config');

const authController = {
    signin: (req, res) => {
        const { password } = req.body;

        conexion.query(`
            SELECT * FROM user 
            `, async(err, rows, fields) => {
            if (err) throw err;

            if (comparePassword(password, rows[0].password)) {

                const token = jwt.sign({ id: rows[0].mail }, "secretWord", {
                    expiresIn: 86400 //24 hs
                });

                res.status(200).json({
                    msg:{
                        text: "Inicio correcto",
                        type: "green"
                    },
                    user: {
                    
                        nombre: rows[0].nombre,
                        mail: rows[0].mail,
                        apellido: rows[0].apellido
                    
                    },
                    token
                })
            } else {
                res.status(401).json({ msg:{
                    text: "Contraseña incorrecta",
                    type: "red"
                } });
            }
            
        });
    }

};

// async function encryptPassword(password) {
//     const salt = await bcrypt.genSalt(10)
//     return await bcrypt.hash(password, salt);
// }

async function comparePassword(password, receivedPassword) {
    return await bcrypt.compare(password, receivedPassword);
   
}


module.exports = authController;