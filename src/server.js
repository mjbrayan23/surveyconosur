const fs = require("fs");
const logFilePath = path.join(__dirname, "../logs/error.log");

function logErrorToFile(error) {
    const errorMessage = `${new Date().toISOString()} - ${error.stack || error}\n`;
    fs.appendFileSync(logFilePath, errorMessage);
}

app.use((err, req, res, next) => {
    console.error("🔥 Error detectado:", err);
    logErrorToFile(err);
    res.status(500).json({ error: "Error interno en el servidor", detalles: err.message });
});


const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const sql = require("mssql");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📌 Servir archivos estáticos correctamente desde la carpeta "public"
app.use(express.static(path.join(__dirname, "../public")));

// 📌 Configuración de la base de datos
const config = {
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASSWORD || "tu_contraseña",
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "CanceladasConoSur",
    options: { encrypt: false, enableArithAbort: true },
};

// 📌 Conexión a SQL Server
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log("✅ Conectado a SQL Server");
        return pool;
    })
    .catch(err => {
        console.error("❌ Error conectando a SQL Server:", err);
    });

module.exports = { sql, poolPromise };

    // 📌 Middleware para registrar todas las solicitudes entrantes
app.use((req, res, next) => {
    console.log(`🔍 Nueva solicitud: ${req.method} ${req.url}`);
    next();
});


// 📌 Importar y usar rutas
const routes = require("./routes");
app.use("/api", routes);

// 📌 Ruta para cargar la encuesta correctamente
app.get("/encuesta", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// 📌 Middleware para capturar errores globales en la API
app.use((err, req, res, next) => {
    console.error("🔥 Error detectado:", err);
    res.status(500).json({ error: "Error interno en el servidor", details: err.message });
});

//Problemas globales
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});


// 📌 Iniciar el servidor
// Definir el puerto (Usa el puerto que Plesk asigna)
const PORT = process.env.PORT || 0; // Permitir que Plesk asigne el puerto dinámicamente
poolPromise
    .then(() => {
        
        console.log(`🌍 Modo: ${process.env.NODE_ENV || "development"}`);
        console.log(`🔍 Puerto asignado: ${PORT}`);
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
        });
    })
    .catch(err => {
        console.error("❌ No se pudo conectar a SQL Server, deteniendo el servidor:", err);
    });

