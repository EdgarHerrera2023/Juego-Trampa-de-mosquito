document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    let mosquito;
    let buzzBuffer;
    let swatBuffer;
    const traps = [];
    const NUM_TRAPS = 3;

    // Web Audio API para un mejor control del sonido
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let buzzingSource = null;

    // Función para cargar los archivos de sonido
    async function loadSound(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Error cargando el sonido: ${url}`, error);
        }
    }

    // Función para reproducir un sonido
    function playSound(buffer, loop = false) {
        if (!buffer || audioContext.state === 'suspended') return null;
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.connect(audioContext.destination);
        source.start(0);
        return source;
    }
    
    // Iniciar AudioContext en un gesto del usuario para cumplir con las políticas de autoplay
    function initAudio() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        document.body.removeEventListener('click', initAudio);
    }
    document.body.addEventListener('click', initAudio);


    // Cargar sonidos y luego iniciar el juego
    Promise.all([
        loadSound('buzz.mp3'),
        loadSound('swat.mp3')
    ]).then(([b, s]) => {
        buzzBuffer = b;
        swatBuffer = s;
        createTraps();
        createMosquito();
    });

    let animationFrameId;

    function createTraps() {
        const containerRect = gameContainer.getBoundingClientRect();
        for (let i = 0; i < NUM_TRAPS; i++) {
            const trap = document.createElement('div');
            trap.className = 'trap';
            // Distribute traps evenly with some randomness
            const sectionWidth = containerRect.width / NUM_TRAPS;
            const randomOffset = (Math.random() - 0.5) * (sectionWidth * 0.5);
            trap.style.left = `${i * sectionWidth + (sectionWidth / 2) - 50 + randomOffset}px`;
            gameContainer.appendChild(trap);
            traps.push(trap);
        }
    }

    function createMosquito() {
        // Limpiar mosquito anterior si existe
        if (mosquito) {
            mosquito.remove();
        }
        if (buzzingSource) {
            buzzingSource.stop();
        }

        mosquito = document.createElement('div');
        mosquito.className = 'mosquito';
        gameContainer.appendChild(mosquito);

        const containerRect = gameContainer.getBoundingClientRect();

        // Posición inicial aleatoria en la mitad superior
        let x = Math.random() * (containerRect.width - 70);
        let y = Math.random() * (containerRect.height / 2 - 70);
        let angle = Math.random() * 2 * Math.PI;
        let speed = 2 + Math.random() * 2; // Velocidad aleatoria

        mosquito.style.left = `${x}px`;
        mosquito.style.top = `${y}px`;

        // Seleccionar una trampa como objetivo
        const targetTrap = traps[Math.floor(Math.random() * traps.length)];
        const targetX = targetTrap.offsetLeft + targetTrap.offsetWidth / 2 - 35; // centro del mosquito
        const targetY = targetTrap.offsetTop + targetTrap.offsetHeight / 2 - 35;

        // Iniciar zumbido
        buzzingSource = playSound(buzzBuffer, true);

        function moveMosquito() {
            // Calcular dirección hacia la trampa
            const dx = targetX - x;
            const dy = targetY - y;
            const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

            // Si el mosquito llega a la trampa
            if (distanceToTarget < 35) {
                mosquitoTrapped();
                return;
            }

            // Moverse hacia la trampa con un poco de aleatoriedad
            const directAngle = Math.atan2(dy, dx);
            angle += (directAngle - angle) * 0.1 + (Math.random() - 0.5) * 0.4;

            // Calcular nueva posición
            x += Math.cos(angle) * speed;
            y += Math.sin(angle) * speed;
            
            // Lógica de rebote (opcional, pero evita que se atasque)
             if (x <= 0 || x >= containerRect.width - 70) {
                angle = Math.PI - angle;
                x = Math.max(0, Math.min(x, containerRect.width - 70));
            }
            if (y <= 0 || y >= containerRect.height - 70) {
                angle = -angle;
                y = Math.max(0, Math.min(y, containerRect.height - 70));
            }


            mosquito.style.left = `${x}px`;
            mosquito.style.top = `${y}px`;

            // Rotar la imagen del mosquito para que mire en la dirección del movimiento
            const rotation = angle * (180 / Math.PI) + 90; // +90 para ajustar la orientación inicial de la imagen
            mosquito.style.transform = `rotate(${rotation}deg)`;

            animationFrameId = requestAnimationFrame(moveMosquito);
        }

        animationFrameId = requestAnimationFrame(moveMosquito);
        mosquito.addEventListener('click', swatMosquito, { once: true });
    }

    function mosquitoTrapped() {
        cancelAnimationFrame(animationFrameId);

        if (buzzingSource) {
            buzzingSource.stop();
        }

        mosquito.remove();

        // Crear un nuevo mosquito después de 1 segundo
        setTimeout(createMosquito, 1000);
    }

    function swatMosquito() {
        cancelAnimationFrame(animationFrameId);

        if (buzzingSource) {
            buzzingSource.stop();
        }
        playSound(swatBuffer);

        this.classList.add('splat');
        this.style.transform = 'none'; // Reset rotation for splat image

        // Crear un nuevo mosquito después de 2 segundos
        setTimeout(createMosquito, 2000);
    }
});