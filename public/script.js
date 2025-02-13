document.addEventListener("DOMContentLoaded", async function () {
    const questionsContainer = document.getElementById("questions-container");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const submitBtn = document.getElementById("submit-btn");
    const welcomeContainer = document.getElementById("welcome-container");
    const acceptBtn = document.getElementById("accept-btn");
    const surveyForm = document.getElementById("survey-form");

    let preguntas = [];
    let respuestas = {}; // Almacenar respuestas correctamente
    let currentQuestionIndex = 0;

    prevBtn.style.display = "block"; // Asegurar que el botón de "Atrás" siempre se muestre
    prevBtn.disabled = true; // Pero inhabilitado en la primera pregunta
    nextBtn.style.display = "block"; // "Siguiente" siempre visible
    submitBtn.style.display = "none";

    // Obtener el token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
        alert("❌ Token no válido. Acceso denegado.");
        window.location.href = "/gracias.html";
        return;
    }

    try {
        // Validar el token antes de continuar y obtener el nombre del cliente
        const response = await fetch(`/api/validar-token?token=${token}`);
        const data = await response.json();

        if (response.status !== 200) {
            alert(`❌ ${data.error}`);
            window.location.href = "/gracias.html";
            return;
        }
        const id_cliente = data.id_cliente;
        const nombreCliente = data.nombre_cliente || "Estimado Cliente"; // Si no hay nombre, usar un valor genérico

        console.log("✅ Cliente validado:", id_cliente);
        console.log("✅ Nombre del cliente:", nombreCliente);

        // Personalizar la pantalla de bienvenida con el nombre del cliente
        welcomeContainer.innerHTML = `
            <h2 class="fw-bold text-secondary">Encuesta de Satisfacción - OTIS</h2>
            <p class="client-greeting">
                Esperamos que estés teniendo un gran día <strong>${nombreCliente}</strong>, 
                su opinión es muy importante para nosotros.
            </p>
            <p>Agradecemos su cooperación en esta breve encuesta de satisfacción sobre nuestros servicios en OTIS. 
            Sus respuestas nos ayudarán a mejorar continuamente nuestra atención y calidad. 
            Puede revisar nuestro aviso de privacidad en 
            <a href="https://www.otis.com/es/co/politica-de-privacidad/" target="_blank">https://www.otis.com/es/co/politica-de-privacidad/</a>.
            </p>
            <button id="accept-btn" class="btn btn-success mt-3">Aceptar</button>
        `;

        // Asignar evento al botón "Aceptar" después de agregarlo al DOM
        document.getElementById("accept-btn").addEventListener("click", () => {
            welcomeContainer.style.display = "none";
            surveyForm.style.display = "block";
            renderQuestion(0);
        });

        // Cargar preguntas
        const preguntasResponse = await fetch("/api/preguntas");
        preguntas = await preguntasResponse.json();

        if (!Array.isArray(preguntas) || preguntas.length === 0) {
            throw new Error("No se encontraron preguntas.");
        }

        console.log("✅ Preguntas cargadas:", preguntas);

        function renderQuestion(index) {
            questionsContainer.innerHTML = "";
            const pregunta = preguntas[index];
        
            const div = document.createElement("div");
            div.classList.add("mb-3", "text-center");
        
            const label = document.createElement("label");
            label.innerText = pregunta.texto_pregunta;
            label.classList.add("form-label", "fw-bold", "fs-5", "d-block");
        
            let input;
            if (pregunta.escala_respuesta) {
                input = document.createElement("div");
                input.classList.add("options-container", "d-flex", "justify-content-center", "gap-2");
                const opciones = pregunta.escala_respuesta.split(",");
        
                opciones.forEach(opcion => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.classList.add("btn", "btn-outline-primary", "btn-option");
                    btn.innerText = opcion;
                    btn.dataset.value = opcion;
        
                    if (respuestas[pregunta.id_pregunta] === opcion) {
                        btn.classList.add("active");
                    }
        
                    btn.addEventListener("click", () => {
                        document.querySelectorAll(".btn-outline-primary").forEach(b => b.classList.remove("active"));
                        btn.classList.add("active");
        
                        respuestas[pregunta.id_pregunta] = opcion;
                    });
        
                    input.appendChild(btn);
                });
            } else {
                input = document.createElement("textarea");
                input.classList.add("form-control", "text-center");
                input.name = `pregunta_${pregunta.id_pregunta}`;
                input.rows = 2;
        
                input.value = respuestas[pregunta.id_pregunta] || "";
                input.addEventListener("input", () => {
                    respuestas[pregunta.id_pregunta] = input.value;
                });
            }
        
            div.appendChild(label);
            div.appendChild(input);
            questionsContainer.appendChild(div);
        
            // Contenedor de navegación
            const buttonsContainer = document.createElement("div");
            buttonsContainer.classList.add("navigation-container", "mt-4");
        
            prevBtn.disabled = index === 0;
            submitBtn.style.display = index === preguntas.length - 1 ? "block" : "none";
            nextBtn.style.display = index === preguntas.length - 1 ? "none" : "block";
        
            buttonsContainer.appendChild(prevBtn);
            buttonsContainer.appendChild(nextBtn);
            questionsContainer.appendChild(buttonsContainer);
        }
        
        nextBtn.onclick = () => {
            if (currentQuestionIndex < preguntas.length - 1) {
                currentQuestionIndex++;
                renderQuestion(currentQuestionIndex);
            }
        };

        prevBtn.onclick = () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion(currentQuestionIndex);
            }
        };

        submitBtn.addEventListener("click", async function (event) {
            event.preventDefault();

            const respuestasArray = Object.entries(respuestas).map(([id_pregunta, respuesta]) => ({
                id_pregunta: parseInt(id_pregunta, 10),
                respuesta
            }));

            if (respuestasArray.length === 0) {
                alert("❌ Debe responder al menos una pregunta.");
                return;
            }

            try {
                const resultado = await fetch("/api/guardar-respuesta", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, respuestas: respuestasArray })
                });

                const respuestaData = await resultado.json();
                if (resultado.ok) {
                    alert(respuestaData.message || "✅ Respuestas guardadas correctamente.");
                    window.location.href = "/gracias.html";
                } else {
                    alert(`❌ Error: ${respuestaData.error}`);
                }
            } catch (error) {
                console.error("❌ Error al enviar respuestas:", error);
                alert("❌ Hubo un problema guardando las respuestas.");
            }
        });

    } catch (error) {
        console.error("❌ Error general en la encuesta:", error);
        alert("❌ Ocurrió un error al cargar la encuesta.");
    }
});
