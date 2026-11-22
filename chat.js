// ============================================
// NEXOBOT - INTEGRACIÓN CON N8N
// ============================================

import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

// Webhook de conexión con n8n.
const webhookUrl = 'https://nexobot.duckdns.org/webhook/cefd5951-8af6-4191-b3fb-0eaede7522cc/chat';

// ============================================
// 1. CONFIGURACIÓN DEL CHAT
// ============================================

createChat({
    webhookUrl,
    mode: 'window',
    showWelcomeScreen: false,

    // No recuperar la conversación anterior.
    loadPreviousSession: false,

    defaultLanguage: 'en',
    allowFileUploads: true,
    allowedFilesMimeTypes: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt',

    initialMessages: [
        '¡Hola! 👋 Soy NexoBot, el asistente virtual de NexoVolt. ⚡',
        'Te ayudo con componentes, repuestos y consultas sobre nuestra tienda. ¿En qué puedo orientarte?'
    ],

    i18n: {
        en: {
            title: 'NexoBot ⚡',
            subtitle: 'Asistente virtual de NexoVolt',
            footer: '',
            getStarted: 'Iniciar conversación',
            inputPlaceholder: 'Escribe tu consulta aquí...',
            closeButtonTooltip: 'Cerrar chat'
        }
    }
});

// ============================================
// 2. CONTROL DE APERTURA DEL CHAT
// ============================================

function obtenerToggleChat() {
    return document.querySelector('.chat-window-toggle');
}

function obtenerVentanaChat() {
    return document.querySelector('.chat-window');
}

function estaAbiertoChat() {
    const chat = obtenerVentanaChat();

    if (!chat) return false;

    const estilos = window.getComputedStyle(chat);

    return estilos.display !== 'none' &&
           estilos.visibility !== 'hidden' &&
           chat.offsetParent !== null;
}

// ============================================
// 2.1 LIMPIAR LA CONVERSACIÓN AL CERRAR
// ============================================

// Identificador de sesión utilizado por el widget.
const CLAVE_SESION_N8N = 'n8n-chat/sessionId';

let reinicioChatProgramado = false;

document.addEventListener('click', (event) => {

    // Detecta el botón rosa de abrir/cerrar.
    const toggle = event.target instanceof Element
        ? event.target.closest('.chat-window-toggle')
        : null;

    // Solo actúa cuando el panel está abierto y se va a cerrar.
    if (!toggle || !estaAbiertoChat() || reinicioChatProgramado) return;

    reinicioChatProgramado = true;

    // Espera a que el widget cierre.
    setTimeout(() => {

        try {
            // Elimina el identificador de la conversación anterior.
            localStorage.removeItem(CLAVE_SESION_N8N);

        } catch (error) {
            console.warn(
                'NexoBot: no se pudo limpiar la sesión guardada.',
                error
            );
        }

        // Recarga para iniciar una conversación nueva.
        window.location.reload();

    }, 350);

}, true);

// ============================================
// APERTURA DESDE LOS BOTONES DE LA PÁGINA
// ============================================

function abrirNexoBot() {

    const launcher = obtenerToggleChat();

    if (!launcher) return;

    if (!estaAbiertoChat()) {
        launcher.click();
    }

    // Enfoca el campo después de abrir el chatbot.
    setTimeout(() => {

        const input = document.querySelector(
            '.chat-inputs textarea, .chat-inputs input, .chat-textarea'
        );

        input?.focus();

    }, 250);

}

document.getElementById('open-nexobot')
    ?.addEventListener('click', abrirNexoBot);

document.getElementById('open-nexobot-2')
    ?.addEventListener('click', abrirNexoBot);

// ============================================
// 3. CONVERTIR URL EN ENLACES CLICABLES
// ============================================

function convertirEnlaces(root = document) {

    const selectores =
        '.chat-message, .chat-message-markdown, [class*="chat-message"]';

    const mensajes = [];

    if (
        root.nodeType === Node.ELEMENT_NODE &&
        root.matches?.(selectores)
    ) {
        mensajes.push(root);
    }

    root.querySelectorAll?.(selectores).forEach(elemento => {
        mensajes.push(elemento);
    });

    [...new Set(mensajes)].forEach(mensaje => {

        const walker = document.createTreeWalker(
            mensaje,
            NodeFilter.SHOW_TEXT
        );

        const nodos = [];
        let nodo;

        while ((nodo = walker.nextNode())) {

            // Evita modificar enlaces y bloques de código existentes.
            if (
                nodo.parentElement?.closest(
                    'a, code, pre, script, style, textarea, button'
                )
            ) continue;

            if (!/(https?:\/\/|www\.)/i.test(nodo.nodeValue)) {
                continue;
            }

            nodos.push(nodo);
        }

        nodos.forEach(textoNodo => {

            const texto = textoNodo.nodeValue;

            // Reconoce enlaces Markdown y direcciones web normales.
            const patron =
                /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>'"]+|www\.[^\s<>'"]+)/gi;

            const fragmento = document.createDocumentFragment();

            let posicion = 0;
            let coincidencia;
            let huboEnlace = false;

            while ((coincidencia = patron.exec(texto)) !== null) {

                let url = coincidencia[2] || coincidencia[3];

                const etiqueta = coincidencia[1] || url;

                // Separa los signos de puntuación del enlace.
                const cierre = /[.,;:!?]+$/.exec(url);

                const puntuacion = cierre ? cierre[0] : '';

                if (puntuacion) {
                    url = url.slice(0, -puntuacion.length);
                }

                if (!url) continue;

                fragmento.append(
                    document.createTextNode(
                        texto.slice(posicion, coincidencia.index)
                    )
                );

                const enlace = document.createElement('a');

                enlace.href = url.startsWith('www.')
                    ? `https://${url}`
                    : url;

                enlace.textContent = etiqueta;
                enlace.target = '_blank';
                enlace.rel = 'noopener noreferrer';
                enlace.className = 'nexobot-link';

                fragmento.append(enlace);

                if (puntuacion) {
                    fragmento.append(
                        document.createTextNode(puntuacion)
                    );
                }

                posicion = patron.lastIndex;
                huboEnlace = true;

            }

            if (huboEnlace) {

                fragmento.append(
                    document.createTextNode(texto.slice(posicion))
                );

                textoNodo.replaceWith(fragmento);

            }

        });

    });

}

// Observa las respuestas nuevas de NexoBot.
const observadorEnlaces = new MutationObserver(cambios => {

    cambios.forEach(cambio => {

        cambio.addedNodes.forEach(nodo => {

            if (nodo.nodeType === Node.ELEMENT_NODE) {
                convertirEnlaces(nodo);
            }

        });

    });

});

// ============================================
// 4. AUTOAJUSTE DEL CAMPO DE ESCRITURA
// ============================================

const ALTURA_INICIAL = 46;

function ajustarAltura(textarea) {

    if (!textarea) return;

    // Si está vacío, vuelve exactamente al tamaño inicial.
    if (textarea.value.trim() === '') {

        textarea.style.height = ALTURA_INICIAL + 'px';
        textarea.style.overflowY = 'hidden';
        textarea.scrollTop = 0;

        return;
    }

    // Límite máximo de crecimiento.
    const alturaMaxima = Math.floor(
        window.innerHeight * 0.32
    );

    // Reinicia la altura para medir el contenido real.
    textarea.style.height = 'auto';

    const alturaNecesaria = textarea.scrollHeight;

    // Crece hasta el límite sin empujar los botones.
    const nuevaAltura = Math.min(
        alturaNecesaria,
        alturaMaxima
    );

    textarea.style.height = nuevaAltura + 'px';

    // Solo permite desplazamiento si supera el límite.
    textarea.style.overflowY =
        alturaNecesaria > alturaMaxima ? 'auto' : 'hidden';

}

// Busca el textarea aunque n8n lo cree después de cargar la página.
function inicializarCampoChat() {

    const textarea = document.querySelector(
        '.chat-window .chat-inputs textarea, .chat-window .chat-footer textarea'
    );

    if (!textarea) return;

    // Evita registrar varias veces los mismos eventos.
    if (textarea.dataset.nexobotInicializado === 'true') return;

    textarea.dataset.nexobotInicializado = 'true';

    textarea.rows = 1;

    // Ajusta mientras se escribe o se pega contenido.
    textarea.addEventListener('input', () => {
        ajustarAltura(textarea);
    });

    // Recupera la altura natural cuando pierde contenido.
    ajustarAltura(textarea);

}

// ============================================
// 5. RESTABLECER DESPUÉS DE ENVIAR
// ============================================

function restaurarCampoChat() {

    const textarea = document.querySelector(
        '.chat-window .chat-inputs textarea, .chat-window .chat-footer textarea'
    );

    if (!textarea) return;

    // Solo restablece si n8n ya limpió el mensaje.
    if (textarea.value.trim() === '') {

        textarea.style.removeProperty('max-height');
        textarea.style.height = ALTURA_INICIAL + 'px';
        textarea.style.overflowY = 'hidden';
        textarea.scrollTop = 0;

    } else {

        // Si todavía contiene texto, conserva su ajuste.
        ajustarAltura(textarea);

    }

}

// Comprueba el estado después del envío.
function programarRestauracion() {

    [100, 300, 600, 1000].forEach(tiempo => {

        setTimeout(() => {
            restaurarCampoChat();
        }, tiempo);

    });

}

// Detecta el envío del formulario.
document.addEventListener('submit', event => {

    if (!event.target.closest('.chat-window')) return;

    programarRestauracion();

}, true);

// Detecta el clic en el botón de enviar.
document.addEventListener('click', event => {

    const boton = event.target.closest(
        '.chat-input-send-button, .chat-inputs-controls button[type="submit"]'
    );

    if (!boton) return;

    if (!boton.closest('.chat-window')) return;

    programarRestauracion();

}, true);

// Si el campo se vacía manualmente, recupera su altura.
document.addEventListener('input', event => {

    const textarea = event.target;

    if (!textarea.matches(
        '.chat-window .chat-inputs textarea, .chat-window .chat-footer textarea'
    )) return;

    if (textarea.value.trim() === '') {
        ajustarAltura(textarea);
    }

});

// ============================================
// 6. INICIALIZACIÓN AUTOMÁTICA
// ============================================

function iniciarNexoBot() {

    convertirEnlaces();

    inicializarCampoChat();

    // Detecta el chat y los mensajes que n8n agrega dinámicamente.
    observadorEnlaces.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Detecta cuando aparece el campo de escritura.
    const observadorChat = new MutationObserver(() => {
        inicializarCampoChat();
    });

    observadorChat.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Recalcula al cambiar el tamaño de pantalla.
    window.addEventListener('resize', () => {

        const textarea = document.querySelector(
            '.chat-window .chat-inputs textarea, .chat-window .chat-footer textarea'
        );

        if (textarea) {
            ajustarAltura(textarea);
        }

    });

}

// Espera a que el documento esté disponible.
if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        iniciarNexoBot,
        { once: true }
    );

} else {

    iniciarNexoBot();

}