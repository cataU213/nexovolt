
// ============================================
// NEXOBOT - INTEGRACIÓN CON N8N
// ============================================

import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

// Webhook de producción de NexoBot.
const webhookUrl = 'https://nexobot.duckdns.org/webhook/cefd5951-8af6-4191-b3fb-0eaede7522cc/chat';
const CLAVE_SESION_N8N = 'n8n-chat/sessionId';
const ALTURA_INICIAL = 46;

// Se activa el botón X nativo del encabezado de n8n.
createChat({
  webhookUrl,
  mode: 'window',
  showWindowCloseButton: true,
  showWelcomeScreen: false,
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

// Obtiene el botón flotante que abre y oculta la ventana.
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

// Abre NexoBot desde los botones de la página y enfoca el campo.
function abrirNexoBot() {
  const launcher = obtenerToggleChat();
  if (!launcher) return;

  if (!estaAbiertoChat()) launcher.click();

  setTimeout(() => {
    const input = document.querySelector(
      '.chat-inputs textarea, .chat-inputs input, .chat-textarea'
    );
    input?.focus();
  }, 250);
}

document.getElementById('open-nexobot')?.addEventListener('click', abrirNexoBot);
document.getElementById('open-nexobot-2')?.addEventListener('click', abrirNexoBot);

// ============================================
// MINIMIZAR Y CERRAR: SON ACCIONES DIFERENTES
// ============================================

function instalarControlesEncabezado() {
  const header = document.querySelector('.chat-header');
  const heading = header?.querySelector('.chat-heading');
  const botonCerrar = heading?.querySelector('.chat-close-button');

  if (!header || !heading || !botonCerrar) return;
  if (heading.querySelector('.nexobot-minimize')) return;

  // Minimizar oculta el panel sin borrar la conversación.
  const botonMinimizar = document.createElement('button');
  botonMinimizar.type = 'button';
  botonMinimizar.className = 'nexobot-minimize';
  botonMinimizar.textContent = '−';
  botonMinimizar.title = 'Minimizar chat';
  botonMinimizar.setAttribute('aria-label', 'Minimizar chat');

  botonMinimizar.addEventListener('click', () => {
    obtenerToggleChat()?.click();
  });

  // Coloca minimizar junto al botón de cerrar.
  heading.insertBefore(botonMinimizar, botonCerrar);
}

// Al cerrar con la X se elimina la sesión anterior.
document.addEventListener('click', (event) => {
  const botonCerrar = event.target instanceof Element
    ? event.target.closest('.chat-close-button')
    : null;

  if (!botonCerrar) return;

  setTimeout(() => {
    try {
      localStorage.removeItem(CLAVE_SESION_N8N);
      sessionStorage.removeItem(CLAVE_SESION_N8N);
    } catch (error) {
      console.warn(
        'NexoBot: no se pudo limpiar la sesión anterior.',
        error
      );
    }

    // Recarga para preparar una conversación nueva.
    window.location.reload();
  }, 350);
}, true);

// ============================================
// CONVERTIR URL DE LAS RESPUESTAS EN ENLACES
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

  root.querySelectorAll?.(selectores).forEach((elemento) => {
    mensajes.push(elemento);
  });

  [...new Set(mensajes)].forEach((mensaje) => {
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

      if (!/(https?:\/\/|www\.)/i.test(nodo.nodeValue)) continue;

      nodos.push(nodo);
    }

    nodos.forEach((textoNodo) => {
      const texto = textoNodo.nodeValue;

      // Reconoce enlaces Markdown y direcciones web normales.
      const patron =
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

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

// ============================================
// AUTOAJUSTE DEL CAMPO DE ESCRITURA
// ============================================

function ajustarAltura(textarea) {
  if (!textarea) return;

  // Si está vacío, recupera su altura inicial.
  if (textarea.value.trim() === '') {
    textarea.style.height = `${ALTURA_INICIAL}px`;
    textarea.style.overflowY = 'hidden';
    textarea.scrollTop = 0;
    return;
  }

  // Establece el límite máximo de crecimiento.
  const alturaMaxima = Math.floor(window.innerHeight * 0.32);

  textarea.style.height = 'auto';

  const alturaNecesaria = textarea.scrollHeight;
  const nuevaAltura = Math.min(alturaNecesaria, alturaMaxima);

  textarea.style.height = `${nuevaAltura}px`;

  // Activa el desplazamiento si supera el límite.
  textarea.style.overflowY =
    alturaNecesaria > alturaMaxima ? 'auto' : 'hidden';
}

function inicializarCampoChat() {
  const textarea = document.querySelector(
    '.chat-window .chat-inputs textarea, .chat-window .chat-footer textarea'
  );

  if (!textarea || textarea.dataset.nexobotInicializado === 'true') {
    return;
  }

  textarea.dataset.nexobotInicializado = 'true';
  textarea.rows = 1;

  textarea.addEventListener('input', () => {
    ajustarAltura(textarea);
  });

  ajustarAltura(textarea);
}

function restaurarCampoChat() {
  const textarea = document.querySelector(
    '.chat-window .chat-inputs textarea, .chat-window .chat-footer textarea'
  );

  if (!textarea) return;

  if (textarea.value.trim() === '') {
    textarea.style.removeProperty('max-height');
    textarea.style.height = `${ALTURA_INICIAL}px`;
    textarea.style.overflowY = 'hidden';
    textarea.scrollTop = 0;
  } else {
    ajustarAltura(textarea);
  }
}

function programarRestauracion() {
  [100, 300, 600, 1000].forEach((tiempo) => {
    setTimeout(restaurarCampoChat, tiempo);
  });
}

// Detecta el envío del formulario.
document.addEventListener('submit', (event) => {
  if (!event.target.closest('.chat-window')) return;
  programarRestauracion();
}, true);

// Detecta el clic en el botón de enviar.
document.addEventListener('click', (event) => {
  const boton = event.target.closest(
    '.chat-input-send-button, .chat-inputs-controls button[type="submit"]'
  );

  if (!boton || !boton.closest('.chat-window')) return;

  programarRestauracion();
}, true);

// Si el campo se vacía, recupera su altura.
document.addEventListener('input', (event) => {
  const textarea = event.target;

  if (!textarea.matches(
    '.chat-window .chat-inputs textarea, .chat-window .chat-footer textarea'
  )) return;

  if (textarea.value.trim() === '') {
    ajustarAltura(textarea);
  }
}, true);

// ============================================
// INICIALIZACIÓN Y OBSERVADORES
// ============================================

function iniciarNexoBot() {
  convertirEnlaces();
  inicializarCampoChat();
  instalarControlesEncabezado();

  // Detecta los mensajes y controles creados por n8n.
  const observador = new MutationObserver(() => {
    convertirEnlaces();
    inicializarCampoChat();
    instalarControlesEncabezado();
  });

  observador.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Recalcula el campo cuando cambia el tamaño de pantalla.
  window.addEventListener('resize', () => {
    const textarea = document.querySelector(
      '.chat-window .chat-inputs textarea, .chat-window .chat-footer textarea'
    );

    if (textarea) ajustarAltura(textarea);
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
