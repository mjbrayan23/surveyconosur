const express = require("express");
const router = express.Router();
const path = require("path");
const { sql, poolPromise } = require("./server");

// 📌 1️⃣ Generar enlaces de encuesta para los clientes
router.post("/generar-links", async (req, res) => {
    try {
        const pool = await poolPromise;

        // Obtener clientes que no tienen encuesta generada
        const clientes = await pool.request().query(
            "SELECT id_cliente FROM Clientes WHERE id_cliente NOT IN (SELECT id_cliente FROM Encuestas_Clientes)"
        );

        if (clientes.recordset.length === 0) {
            return res.status(400).json({ error: "No hay clientes nuevos para generar encuestas." });
        }

        let enlaces = [];
        for (const cliente of clientes.recordset) {
            const token = require("crypto").randomBytes(16).toString("hex");

            await pool
                .request()
                .input("id_cliente", sql.Int, cliente.id_cliente)
                .input("token", sql.VarChar, token)
                .query("INSERT INTO Encuestas_Clientes (id_cliente, token, respondida) VALUES (@id_cliente, @token, 0)");

            enlaces.push({
                id_cliente: cliente.id_cliente,
                enlace: `http://localhost:3000/encuesta?token=${token}`
            });
        }

        res.json({ message: "Enlaces generados correctamente", enlaces });
    } catch (error) {
        console.error("❌ Error generando enlaces:", error);
        res.status(500).json({ error: "Error generando enlaces" });
    }
});

// 📌 2️⃣ Obtener todos los enlaces de encuesta generados

router.get("/obtener-links", async (req, res) => {
    try {
        console.log("📡 Endpoint /api/obtener-links llamado");
        
        const pool = await poolPromise;
        console.log("✅ Conexión a la BD establecida");

        const result = await pool.request().query("SELECT * FROM Encuestas_Clientes");
        
        console.log("📄 Datos obtenidos:", result.recordset);
        
        res.json(result.recordset);
    } catch (error) {
        console.error("🔥 Error en /obtener-links:", error);
        res.status(500).json({ error: "Error interno del servidor", detalles: error.message });
    }
});

// router.get("/obtener-links", async (req, res) => {
//     try {
//         const pool = await poolPromise;
//         const result = await pool.request().query("SELECT id_cliente, token, respondida FROM Encuestas_Clientes");

//         if (result.recordset.length === 0) {
//             return res.status(404).json({ error: "No hay enlaces generados." });
//         }

//         const enlaces = result.recordset.map(row => ({
//             id_cliente: row.id_cliente,
//             respondida: row.respondida,
//             enlace: `http://localhost:3000/encuesta?token=${row.token}`
//         }));

//         res.json({ total: enlaces.length, enlaces });
//     } catch (error) {
//         console.error("❌ Error obteniendo enlaces:", error);
//         res.status(500).json({ error: "Error obteniendo los enlaces" });
//     }
// });

// 📌 3️⃣ Validar token antes de cargar la encuesta
router.get("/validar-token", async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: "Token no proporcionado" });
        }

        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("token", sql.VarChar, token)
            .query("SELECT c.nombre_cliente, ec.id_cliente FROM Encuestas_Clientes ec JOIN Clientes c ON ec.id_cliente = c.id_cliente WHERE token = @token AND respondida = 0");

        if (result.recordset.length === 0) {
            return res.status(400).json({ error: "Token inválido o encuesta ya respondida" });
        }

        const { nombre_cliente, id_cliente } = result.recordset[0];

        res.json({ id_cliente, nombre_cliente });

    } catch (error) {
        console.error("❌ Error validando token:", error);
        res.status(500).json({ error: "Error al validar el token" });
    }
});


// 📌 4️⃣ Obtener todas las preguntas
router.get("/preguntas", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT id_pregunta, texto_pregunta, escala_respuesta FROM Preguntas");

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "No hay preguntas registradas" });
        }

        res.json(result.recordset);
    } catch (error) {
        console.error("❌ Error obteniendo preguntas:", error);
        res.status(500).json({ error: "Error al obtener las preguntas" });
    }
});

// 📌 5️⃣ Guardar respuestas de la encuesta
router.post("/guardar-respuesta", async (req, res) => {
    try {
        console.log("➡️ Datos recibidos:", req.body);
        const { token, respuestas } = req.body;

        if (!token || !respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("token", sql.VarChar, token)
            .query("SELECT id_cliente FROM Encuestas_Clientes WHERE token = @token AND respondida = 0");

        if (result.recordset.length === 0) {
            return res.status(400).json({ error: "Token inválido o encuesta ya respondida" });
        }

        const id_cliente = result.recordset[0].id_cliente;

        for (const respuesta of respuestas) {
            await pool
                .request()
                .input("id_cliente", sql.Int, id_cliente)
                .input("id_pregunta", sql.Int, respuesta.id_pregunta)
                .input("respuesta", sql.VarChar, respuesta.respuesta)
                .query("INSERT INTO Respuestas (id_cliente, id_pregunta, respuesta) VALUES (@id_cliente, @id_pregunta, @respuesta)");
        }

        await pool
            .request()
            .input("token", sql.VarChar, token)
            .query("UPDATE Encuestas_Clientes SET respondida = 1 WHERE token = @token");

        res.json({ message: "Respuestas guardadas correctamente" });

    } catch (error) {
        console.error("❌ Error en la API:", error);
        res.status(500).json({ error: "Error guardando respuestas" });
    }
});

// 📌 6️⃣ Servir la encuesta en HTML cuando se acceda con un token válido
router.get("/encuesta", async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).send("❌ Error: Token requerido.");
        }

        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("token", sql.VarChar, token)
            .query("SELECT id_cliente, respondida FROM Encuestas_Clientes WHERE token = @token");

        if (result.recordset.length === 0) {
            return res.status(404).send("❌ Error: Token inválido.");
        }

        const { respondida } = result.recordset[0];

        if (respondida) {
            return res.status(400).send("❌ Error: Encuesta ya respondida.");
        }

        res.sendFile("index.html", { root: path.join(__dirname, "../public") });

    } catch (error) {
        console.error("❌ Error obteniendo encuesta:", error);
        res.status(500).send("❌ Error interno en el servidor.");
    }
});

// 📌 Exportar router correctamente
module.exports = router;
