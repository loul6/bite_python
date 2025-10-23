
// Espera a que todo el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONSTANTES Y VARIABLES GLOBALES ---

    const SCREENS = {
        WELCOME: 'welcome-screen',
        SELECTION: 'selection-screen',
        UPLOAD: 'upload-screen',
        LOADING: 'loading-screen',
        SUCCESS: 'success-screen',
        DOWNLOAD: 'download-screen',
    };

    const CONVERSION_TYPES = [
        { label: 'PDF a DOCX', from: 'pdf', to: 'docx' },
        { label: 'JPG a PNG', from: 'jpg', to: 'png' },
        { label: 'MP4 a MP3', from: 'mp4', to: 'mp3' },
    ];

    const VOICE_MESSAGES = {
        welcome: 'Bienvenido a Bite, tu convertidor de archivos. Presiona Enter para comenzar.',
        selection: 'Usa las flechas para elegir una conversión y Enter para confirmar.',
        selectionConfirm: (type) => `Has seleccionado ${type}. Presiona Enter para continuar.`,
        upload: (type, ext) => `Carga de archivos para ${type}. Se espera un archivo con extensión ${ext}. Presiona Enter para seleccionar.`,
        fileSelected: (name) => `Archivo seleccionado: ${name}. Presiona Enter para convertir.`,
        loading: 'Tu archivo se está procesando. Por favor, espera.',
        success: 'Conversión completada. Presiona Enter para descargar el archivo.',
        download: 'Descarga finalizada. Presiona el número 1 para volver al menú principal.',
        goBack: 'O presiona 1 para volver al menú de selección.',
    };

    let currentScreen = SCREENS.WELCOME;
    let selectedConversionIndex = 0;
    let selectedFile = null;
    let lastSpokenText = '';

    // --- 2. LÓGICA DE VOZ (Web Speech API) ---

    const synth = window.speechSynthesis;

    function speak(text, force = false) {
        if (!synth) return; // Si el navegador no lo soporta, no hacer nada
        if (text === lastSpokenText && !force) return; // Evitar repetir el mismo mensaje

        lastSpokenText = text;
        synth.cancel(); // Detener cualquier voz anterior
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        synth.speak(utterance);
    }

    // --- 3. FUNCIONES AUXILIARES ---

    // Función para cambiar de pantalla
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        currentScreen = screenId;
        handleVoiceGuidance(); // Llama a la guía de voz cada vez que cambia la pantalla
    }

    // Renderiza las opciones de conversión en la pantalla de selección
    function renderConversionOptions() {
        const container = document.getElementById('conversion-options');
        container.innerHTML = '';
        CONVERSION_TYPES.forEach((type, index) => {
            const div = document.createElement('div');
            div.textContent = type.label;
            div.className = 'conversion-option';
            if (index === selectedConversionIndex) {
                div.classList.add('selected');
            }
            container.appendChild(div);
        });
    }

    // --- 4. GUÍA DE VOZ POR PANTALLA ---

    function handleVoiceGuidance() {
        switch (currentScreen) {
            case SCREENS.WELCOME:
                speak(VOICE_MESSAGES.welcome, true); // Forzar bienvenida siempre
                break;
            case SCREENS.SELECTION:
                speak(VOICE_MESSAGES.selection);
                // Hablar la opción seleccionada después de un momento
                setTimeout(() => speak(CONVERSION_TYPES[selectedConversionIndex].label), 1000);
                break;
            case SCREENS.UPLOAD:
                const type = CONVERSION_TYPES[selectedConversionIndex];
                if (selectedFile) {
                    speak(VOICE_MESSAGES.fileSelected(selectedFile.name));
                } else {
                    speak(VOICE_MESSAGES.upload(type.label, type.from) + ' ' + VOICE_MESSAGES.goBack);
                }
                break;
            case SCREENS.LOADING:
                speak(VOICE_MESSAGES.loading);
                break;
            case SCREENS.SUCCESS:
                speak(VOICE_MESSAGES.success);
                break;
            case SCREENS.DOWNLOAD:
                speak(VOICE_MESSAGES.download);
                break;
        }
    }

    // --- 5. MANEJO DE EVENTOS DE TECLADO ---

    document.addEventListener('keydown', (e) => {
        switch (currentScreen) {
            case SCREENS.WELCOME:
                if (e.key === 'Enter') showScreen(SCREENS.SELECTION);
                break;

            case SCREENS.SELECTION:
                if (e.key === 'ArrowDown') {
                    selectedConversionIndex = (selectedConversionIndex + 1) % CONVERSION_TYPES.length;
                    renderConversionOptions();
                    speak(CONVERSION_TYPES[selectedConversionIndex].label, true);
                } else if (e.key === 'ArrowUp') {
                    selectedConversionIndex = (selectedConversionIndex - 1 + CONVERSION_TYPES.length) % CONVERSION_TYPES.length;
                    renderConversionOptions();
                    speak(CONVERSION_TYPES[selectedConversionIndex].label, true);
                } else if (e.key === 'Enter') {
                    const type = CONVERSION_TYPES[selectedConversionIndex];
                    document.getElementById('upload-title').textContent = `Cargar para ${type.label}`;
                    document.getElementById('expected-extension').textContent = `.${type.from}`;
                    document.getElementById('file-input').accept = `.${type.from}`;
                    showScreen(SCREENS.UPLOAD);
                }
                break;

            case SCREENS.UPLOAD:
                if (e.key === 'Enter') {
                    if (selectedFile) {
                        // Si ya hay un archivo, iniciar la conversión
                        document.getElementById('upload-form').requestSubmit();
                    } else {
                        // Si no, abrir el selector de archivos
                        document.getElementById('file-input').click();
                    }
                } else if (e.key === '1') {
                    selectedFile = null; // Limpiar archivo al volver
                    document.getElementById('file-name').textContent = 'Ninguno';
                    showScreen(SCREENS.SELECTION);
                }
                break;

            case SCREENS.SUCCESS:
                if (e.key === 'Enter') {
                    // Simular clic en un enlace de descarga que se crearía tras la conversión
                    // En una app real, este enlace lo proporcionaría el servidor.
                    const form = document.getElementById('upload-form');
                    form.submit(); // Re-enviamos el form para obtener el archivo
                }
                break;

            case SCREENS.DOWNLOAD:
                if (e.key === '1') {
                    selectedConversionIndex = 0;
                    selectedFile = null;
                    document.getElementById('file-name').textContent = 'Ninguno';
                    renderConversionOptions();
                    showScreen(SCREENS.SELECTION);
                }
                break;
        }
    });

    // --- 6. MANEJO DE FORMULARIO Y ARCHIVOS ---

    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');

    // Al hacer clic en el botón "Seleccionar Archivo"
    document.getElementById('select-file-btn').addEventListener('click', () => {
        fileInput.click();
    });

    // Cuando el usuario elige un archivo
    fileInput.addEventListener('change', (e) => {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            document.getElementById('file-name').textContent = selectedFile.name;
            handleVoiceGuidance();
        }
    });

    // Antes de enviar el formulario al servidor
    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevenir el envío normal
        if (!selectedFile) {
            speak('Por favor, selecciona un archivo primero.', true);
            return;
        }

        // Llenar los datos del formulario antes de enviar
        const type = CONVERSION_TYPES[selectedConversionIndex];
        document.getElementById('conversion-type-input').value = type.label;
        document.getElementById('to-extension-input').value = type.to;
        
        showScreen(SCREENS.LOADING);

        // Enviar los datos con Fetch API para manejar la respuesta
        const formData = new FormData(form);
        fetch('/convert', { method: 'POST', body: formData })
            .then(response => {
                if (!response.ok) throw new Error('Error en la conversión.');
                return response.blob(); // Obtener el archivo como un Blob
            })
            .then(blob => {
                showScreen(SCREENS.SUCCESS);
                // Crear un enlace de descarga para el archivo recibido
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = selectedFile.name.replace(/\.[^/.]+$/, '.') + type.to; // Nombre del archivo
                document.body.appendChild(a);
                
                // Guardar el enlace para descargarlo con la tecla Enter
                a.id = 'download-link';
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Hubo un error al convertir el archivo.');
                showScreen(SCREENS.UPLOAD); // Volver a la pantalla de carga
            });
    });

    // Manejo especial para la descarga en la pantalla de éxito
    document.addEventListener('keydown', (e) => {
        if (currentScreen === SCREENS.SUCCESS && e.key === 'Enter') {
            const downloadLink = document.getElementById('download-link');
            if (downloadLink) {
                downloadLink.click();
                window.URL.revokeObjectURL(downloadLink.href);
                document.body.removeChild(downloadLink);
                showScreen(SCREENS.DOWNLOAD);
            }
        }
    });

    // --- 7. INICIALIZACIÓN ---

    renderConversionOptions(); // Renderizar las opciones de conversión al inicio
    showScreen(SCREENS.WELCOME); // Mostrar la pantalla de bienvenida
});
