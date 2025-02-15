const fs = require("fs");
const path = require("path"); 

function logErrorToFile(error) {
    const logFilePath = path.join(__dirname, "../logs/error.log");
    const errorMessage = `${new Date().toISOString()} - ${error}\n`;
    fs.appendFileSync(logFilePath, errorMessage);
}

process.on("uncaughtException", (error) => {
    console.error("❌ Error no capturado:", error);
    logErrorToFile(error);
});

const express = require("express");
const cors = require("cors");
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

// 📌 Agregar logs para depuración en Plesk
console.log("🟢 Iniciando servidor...");

// 📄 Verifica si .env se carga correctamente
console.log("📄 Variables de entorno cargadas:");
console.log(`🔹 DB_USER: ${process.env.DB_USER}`);
console.log(`🔹 DB_SERVER: ${process.env.DB_SERVER}`);
console.log(`🔹 PORT: ${process.env.PORT || "No definido"}`);

// 📌 Iniciar el servidor en un puerto dinámico
const PORT = process.env.PORT || 0;

const server = app.listen(PORT, () => {
    const assignedPort = server.address().port;
    console.log(`🚀 Servidor corriendo en el puerto ${assignedPort}`);
});

// 📌 Manejo de errores en la conexión al servidor
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`❌ Error: El puerto ya está en uso.`);
        process.exit(1);
    } else {
        console.error("❌ Error al iniciar el servidor:", err);
    }
});

// 📌 Asegurar que el pool de la BD esté disponible antes de levantar el server
poolPromise.catch(err => {
    console.error("❌ No se pudo conectar a SQL Server, deteniendo el servidor:", err);
    process.exit(1);
});
