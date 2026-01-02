import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Variables globales
let scene, camera, renderer;
let xWing, mixer;
let clock = new THREE.Clock();
let pilotName = '';
let difficulty = 'medium';

// Mensajes de bienvenida aleatorios
const welcomeMessages = [
    "EL DESTINO DE LA REBELIÓN ESTÁ EN TUS MANOS.MISION 3:00",
    "UN NUEVO HÉROE SURGE ENTRE LAS ESTRELLAS.MISION 3:00",
    "LA GALAXIA NECESITA TU VALOR, PILOTO.MISION 3:00"
];

// DOM Elements
const welcomeMessageElement = document.getElementById('welcome-message');
const pilotNameInput = document.getElementById('pilot-name');
const startButton = document.getElementById('start-btn');
const backButton = document.getElementById('back-btn');
const diffButtons = document.querySelectorAll('.diff-btn');

// Inicializar
async function init() {
    // 1. Crear escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // 2. Crear cámara
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 10);
    
    // 3. Crear renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('bg-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    
    // 4. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    
    // 5. Crear estrellas de fondo
    createStarfield();
    
    // 6. Cargar X-Wing
    await loadXWing();
    
    // 7. Event listeners
    setupEventListeners();
    
    // 8. Mostrar mensaje aleatorio
    showRandomWelcomeMessage();
    
    // 9. Iniciar animación
    animate();
    
    // 10. Iniciar música de fondo
    playBackgroundMusic();
}

// Crear campo de estrellas
function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 100;
        positions[i + 1] = (Math.random() - 0.5) * 100;
        positions[i + 2] = (Math.random() - 0.5) * 100;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        size: 0.1,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
}

// Cargar modelo X-Wing
async function loadXWing() {
    try {
        const loader = new GLTFLoader();
        
        // Intentar cargar desde assets/models/
        const xWingModel = await loader.loadAsync('assets/models/x-wing.glb')
            .catch(() => {
                console.log('X-Wing no encontrado en assets/, usando placeholder');
                // Crear placeholder si no hay modelo
                return createXWingPlaceholder();
            });
        
        xWing = xWingModel.scene || xWingModel;
        
        // Escalar y posicionar
        xWing.scale.set(0.5, 0.5, 0.5);
        xWing.position.y = 10;
        
        // Rotación inicial
        xWing.rotation.y = Math.PI;
        
        // Animaciones si las tiene
        if (xWingModel.animations && xWingModel.animations.length > 0) {
            mixer = new THREE.AnimationMixer(xWing);
            const action = mixer.clipAction(xWingModel.animations[0]);
            action.play();
        }
        
        scene.add(xWing);
        
        console.log('✅ X-Wing cargado correctamente');
        
    } catch (error) {
        console.error('Error cargando X-Wing:', error);
        // Crear placeholder en caso de error
        xWing = createXWingPlaceholder();
        scene.add(xWing);
    }
}

// Crear placeholder para X-Wing (si no hay modelo)
function createXWingPlaceholder() {
    const group = new THREE.Group();
    
    // Cuerpo principal (cilindro)
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        emissive: 0x222222,
        shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    
    // Alas (cuatro planos)
    const wingGeometry = new THREE.BoxGeometry(3, 0.1, 0.8);
    const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x999999,
        emissive: 0x111111
    });
    
    for (let i = 0; i < 4; i++) {
        const wing = new THREE.Mesh(wingGeometry, wingMaterial);
        const angle = (Math.PI / 2) * i;
        wing.position.x = Math.cos(angle) * 1.2;
        wing.position.z = Math.sin(angle) * 1.2;
        wing.rotation.y = -angle;
        group.add(wing);
    }
    
    // Motor (esfera con glow)
    const engineGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const engineMaterial = new THREE.MeshBasicMaterial({
        color: 0x00a8ff,
        transparent: true,
        opacity: 0.8
    });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.y = -1.5;
    group.add(engine);
    
    return group;
}

// Mostrar mensaje aleatorio
function showRandomWelcomeMessage() {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    welcomeMessageElement.textContent = welcomeMessages[randomIndex];
    
    // Efecto typewriter opcional
    typewriterEffect(welcomeMessageElement, welcomeMessages[randomIndex]);
}

// Efecto typewriter
function typewriterEffect(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Setup event listeners
function setupEventListeners() {
    // Input nombre piloto
    pilotNameInput.addEventListener('input', function() {
        pilotName = this.value.trim().toUpperCase();
        
        // Validar (solo letras, números y espacios)
        if (pilotName.length > 0) {
            this.style.borderColor = '#00ff00';
            startButton.disabled = false;
        } else {
            this.style.borderColor = '#00ffea';
            startButton.disabled = true;
        }
    });
    
    // Enter para confirmar nombre
    pilotNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && pilotName.length >= 3) {
            startGame();
        }
    });
    
    // Botón iniciar
    startButton.addEventListener('click', startGame);
    
    // Botón volver
    backButton.addEventListener('click', goBackToPortfolio);
    
    // Botones dificultad
    diffButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            diffButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            difficulty = this.dataset.diff;
            console.log(`Dificultad seleccionada: ${difficulty}`);
        });
    });
    
    // Resize window
    window.addEventListener('resize', onWindowResize);
}

// Iniciar juego
function startGame() {
    if (pilotName.length < 3) {
        alert('Por favor, introduce un nombre de piloto válido (mínimo 3 caracteres)');
        pilotNameInput.focus();
        return;
    }
    
    console.log(`🚀 Iniciando misión...`);
    console.log(`👨‍✈️ Piloto: ${pilotName}`);
    console.log(`🎯 Dificultad: ${difficulty}`);
    
    // Guardar en localStorage
    localStorage.setItem('starfighter_pilot', JSON.stringify({
        name: pilotName,
        difficulty: difficulty,
        timestamp: new Date().toISOString()
    }));
    
    // Redirigir al juego (crearemos game.html después)
    window.location.href = 'game.html';
}

// Volver al portfolio
function goBackToPortfolio() {
    window.location.href = '/';
}

// Resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Música de fondo
function playBackgroundMusic() {
    const music = document.getElementById('menu-music');
    
    // Esperar interacción del usuario (política de autoplay)
    document.addEventListener('click', function startMusic() {
        music.volume = 0.3;
        music.play().catch(e => console.log('Autoplay prevenido:', e));
        document.removeEventListener('click', startMusic);
    }, { once: true });
}

// Animación
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Rotar X-Wing
    if (xWing) {
        xWing.rotation.y += 0.005;
        
        // Leva oscilación suave
        xWing.position.y = -1 + Math.sin(Date.now() * 0.001) * 0.2;
    }
    
    // Actualizar animaciones
    if (mixer) {
        mixer.update(delta);
    }
    
    // Rotar cámara lentamente alrededor del X-Wing
    const time = Date.now() * 0.0005;
    camera.position.x = Math.sin(time) * 8;
    camera.position.z = Math.cos(time) * 8;
    camera.lookAt(0, -3, 0);
    
    renderer.render(scene, camera);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);