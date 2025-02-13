// db.js - Configuración de la conexión a SQL Server
require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    options: {
        encrypt: false, // Cambiar a true si se usa Azure
        enableArithAbort: true
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Conectado a SQL Server');
        return pool;
    })
    .catch(err => console.log('Error de conexión con SQL Server:', err));

module.exports = { sql, poolPromise };
