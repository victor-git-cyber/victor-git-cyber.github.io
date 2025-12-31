import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ===== VARIABLES GLOBALES =====
let scene, camera, renderer, composer;
let playerShip, enemies = [], bullets = [], explosions = [], pickups = [];
let stars = [];
let clock = new THREE.Clock();
let keys = {};
let mouse = { x: 0, y: 0 };

// Estado del juego - NIVEL ÚNICO (EASY/ESTÁNDAR)
let gameState = {
    running: false,
    paused: false,
    gameOver: false,
    victory: false,
    missionTime: 180, // 3 MINUTOS (antes 120 = 2min)
    score: 0,
    health: 100,
    shield: 100,
    shieldActive: false,
    shieldCooldown: 0,
    ammo: Infinity,
    enemiesDestroyed: 0,
    pilotName: 'PILOTO X-WING'
};

// CONFIGURACIÓN PARA DIVERSIÓN (nivel estándar/divertido)
const GAME_SETTINGS = {
    enemyHealth: 40,           // Salud moderada (fácil pero no demasiado)
    enemyDamage: 8,            // Daño suficiente para ser un reto
    enemyFireRate: 2.0,        // Disparan cada 2 segundos
    enemySpeed: 0.15,           // Velocidad media
    spawnRate: 0.8,           // Generación constante de enemigos
    playerDamage: 25,          // Daño del jugador (poderoso)
    playerFireRate: 0.3,       // Puede disparar rápido
    maxEnemies: 7,             // Máximo de enemigos en pantalla
    pickupChance: 0.3          // 30% de chance de dropear pickup
};

// VARIABLE PARA AJUSTAR ILUMINACIÓN DE ENEMIGOS (punto 4)
const ENEMY_LIGHT_INTENSITY = 2; // Se puede aumentar o disminuir

// VARIABLE PARA ILUMINACIÓN GENERAL (punto 6)
const GENERAL_AMBIENT_LIGHT = 0.6; // Aumentado de 0.3 (punto 6)
const GENERAL_DIRECTIONAL_LIGHT = 1.2; // Aumentado de 1.0 (punto 6)
// COLOR DE EXPLOSIÓN (NARANJA/AMARILLO para diferenciar)
const EXPLOSION_COLOR = 0xff8800; // Naranja brillante

const MAX_ENEMIES_ON_SCREEN = GAME_SETTINGS.maxEnemies;

// ===== SISTEMA DE AUDIO =====
class AudioSystem {
    constructor() {
        this.sounds = {};
        this.music = {
            battle: document.getElementById('battle-music')
        };
        this.init();
    }

    // SOLO MÚSICA, SIN EFECTOS DE SONIDO (punto 1)
    async init() {
        // Eliminamos todos los efectos de sonido, solo mantenemos la música
        console.log('🎵 Inicializando solo música de fondo');
        
        if (this.music.battle) {
            this.music.battle.volume = 0.3;
            this.music.battle.loop = true;
        }
    }

    // Método vacío para efectos de sonido (punto 1)
    playSound(name, volume = 0.5) {
        // No reproducir efectos de sonido, solo mantener compatibilidad
        return;
    }

    playMusic() {
        if (this.music.battle) {
            this.music.battle.currentTime = 0;
            this.music.battle.play().catch(e => console.log('Music autoplay prevented:', e));
        }
    }

    stopMusic() {
        if (this.music.battle) {
            this.music.battle.pause();
            this.music.battle.currentTime = 0;
        }
    }

    setMusicVolume(volume) {
        if (this.music.battle) {
            this.music.battle.volume = volume;
        }
    }
}

const audioSystem = new AudioSystem();

// ===== PRECARGADOR DE MODELOS =====
class ModelPreloader {
    constructor() {
        this.models = {};
        this.loader = new GLTFLoader();
    }

    async preloadAll() {
        console.log('📦 Precargando modelos...');
        
        // SOLO UNA EXPLOSIÓN - explosion-purple (punto 2)
        const modelList = [
            { key: 'xwing', path: 'assets/models/x-wing.glb' },
            { key: 'tieInterceptor', path: 'assets/models/tie-interceptor.glb' },
            { key: 'tieDefender', path: 'assets/models/tie-defender.glb' },
            { key: 'groundTargeting', path: 'assets/models/ground-targeting.glb' }
        ];

        const promises = modelList.map(model => this.loadModel(model.key, model.path));
        
        try {
            await Promise.all(promises);
            console.log('✅ Todos los modelos precargados');
        } catch (error) {
            console.warn('⚠️ Algunos modelos no se cargaron:', error);
        }
    }

    async loadModel(key, path) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (gltf) => {
                    this.models[key] = gltf;
                    console.log(`✅ ${key} cargado`);
                  
                    
                    resolve(gltf);
                },
                undefined,
                (error) => {
                    console.warn(`⚠️ Error cargando ${key}:`, error);
                    this.models[key] = null;
                    resolve(null);
                }
            );
        });
    }

    
    getModel(key) {
        return this.models[key] ? this.models[key].scene.clone() : this.createPlaceholder(key);
    }

    createPlaceholder(type) {
        const geometry = new THREE.SphereGeometry(1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: type.includes('explosion') ? 0xff00ff : 0x888888, // Púrpura para explosiones
            wireframe: true 
        });
        return new THREE.Mesh(geometry, material);
    }
}

const modelPreloader = new ModelPreloader();

// ===== INICIALIZACIÓN DEL JUEGO =====
async function init() {
    console.log('🎮 Inicializando Star Wars Dogfight...');
    // Al inicio de setupControls() o init()
    document.addEventListener('touchstart', function(e) {
    if (e.target.classList.contains('mobile-btn')) {
        e.preventDefault();
    }
}, { passive: false });

    document.addEventListener('touchmove', function(e) {
    if (e.target.classList.contains('mobile-controls')) {
        e.preventDefault();
    }
}, { passive: false });
    
    loadPilotData();
    await modelPreloader.preloadAll();
    
    // Crear escena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 100);
    
    // Crear cámara (tercera persona)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 10);
    
    // Crear renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('game-canvas'),
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Post-processing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    );
    composer.addPass(bloomPass);
    
    // ILUMINACIÓN GENERAL AUMENTADA (punto 6)
    const ambientLight = new THREE.AmbientLight(0xffffff, GENERAL_AMBIENT_LIGHT);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, GENERAL_DIRECTIONAL_LIGHT);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    
    // LUZ ADICIONAL PARA MEJOR VISIBILIDAD (punto 6)
    const additionalLight = new THREE.PointLight(0xffffff, 0.4, 50);
    additionalLight.position.set(0, 0, 5);
    scene.add(additionalLight);
    
    // Crear X-Wing del jugador
    createPlayerShip();
    
    // Crear fondo estelar
    createStarfield();
    
    // Configurar controles
    setupControls();
    
    // Configurar UI
    setupUI();
    
    // Iniciar música
    audioSystem.playMusic();
    
    // Iniciar juego
    startGame();
    
    // Iniciar bucle de animación
    animate();
    
    console.log('✅ Juego inicializado - ¡A DIVERTIRSE!');
}

// ===== CREAR X-WING DEL JUGADOR =====
function createPlayerShip() {
    const xwingModel = modelPreloader.getModel('xwing');
    
    if (xwingModel) {
        playerShip = xwingModel;
        playerShip.scale.set(0.5, 0.5, 0.5);
        playerShip.position.set(0, -2, 0); // Posición ajustada
        playerShip.rotation.y = Math.PI;
        
        // Añadir luces
        const engineLight = new THREE.PointLight(0xff5500, 2, 20);
        engineLight.position.set(0, 0, -2);
        playerShip.add(engineLight);
        
        // Marcar como jugador
        playerShip.userData = {
            type: 'player',
            health: 100,
            shield: 100
        };
        
        scene.add(playerShip);
        console.log('✅ X-Wing del jugador creado');
    } else {
        console.warn('⚠️ X-Wing no disponible, usando placeholder');
        createXWingPlaceholder();
    }
}

function createXWingPlaceholder() {
    const group = new THREE.Group();
    
    const bodyGeometry = new THREE.ConeGeometry(0.5, 3, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888,
        emissive: 0x222222
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    
    const wingGeometry = new THREE.BoxGeometry(4, 0.1, 1.5);
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    
    const wing1 = new THREE.Mesh(wingGeometry, wingMaterial);
    wing1.rotation.z = Math.PI / 4;
    group.add(wing1);
    
    const wing2 = new THREE.Mesh(wingGeometry, wingMaterial);
    wing2.rotation.z = -Math.PI / 4;
    group.add(wing2);
    
    const engineGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8);
    const engineMaterial = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.set(0, 0, -1.5);
    group.add(engine);
    
    playerShip = group;
    playerShip.userData = { type: 'player', health: 100, shield: 100 };
    scene.add(playerShip);
}

// ===== FONDO ESTELAR =====
function createStarfield() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                    window.innerWidth < 768;
    
    // AJUSTAR SEGÚN DISPOSITIVO
    const starCount = isMobile ? 150 : 300; // Menos estrellas en móvil
    const starFieldDistance = isMobile ? 150 : 200; // Campo más cerca en móvil
    const starSize = isMobile ? 0.08 : 0.11; // Estrellas más pequeñas en móvil
    
    console.log(`🌟 Creando campo estelar: ${starCount} estrellas`);
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    
    // DISTRIBUCIÓN MÁS INTELIGENTE
    for (let i = 0; i < starCount * 3; i += 3) {
        // X: Más ancho en los bordes (para dar sensación de velocidad)
        positions[i] = (Math.random() - 0.5) * starFieldDistance * 1.5;
        
        // Y: Más estrellas en el centro
        positions[i + 1] = (Math.random() - 0.5) * starFieldDistance * 0.8;
        
        // Z: Distribución estratificada (más cerca = más rápido)
        const layer = Math.floor(Math.random() * 3); // 0, 1, 2
        positions[i + 2] = -starFieldDistance * 0.3 - (layer * starFieldDistance * 0.35);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // MATERIAL MÁS EFICIENTE
    const material = new THREE.PointsMaterial({
        size: starSize,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true, // IMPORTANTE: tamaño según distancia
        fog: false // Desactivar fog para estrellas
    });
    
    const starField = new THREE.Points(geometry, material);
    scene.add(starField);
    stars.push(starField);
    
    return starField;
}
// ===== SISTEMA DE ENEMIGOS =====
function spawnEnemy(type = 'tieInterceptor') {
    const enemyModel = modelPreloader.getModel(type);
    
    if (!enemyModel) {
        console.warn(`⚠️ Modelo ${type} no disponible`);
        return;
    }
    
    // PUNTO 7: NO CREAR NAVE ENEMIGA MUY LEJOS DEL ALCANCE
    // Generar enemigos más cerca del jugador
    const x = (Math.random() - 0.5) * 25; // Reducido de 30 a 25
    const y = (Math.random() - 0.5) * 15; // Reducido de 20 a 15
    const z = -40 - Math.random() * 20; // Más cerca: -40 a -60 (antes -50 a -80)
    
    enemyModel.position.set(x, y, z);
    
    // IMPORTANTE: Resetear rotación inicial
    enemyModel.rotation.set(0, 0, 0);
    
    // Ajustar escala según tipo
    if (type === 'groundTargeting') {
        enemyModel.scale.set(0.4, 0.4, 0.4);
    } else {
        enemyModel.scale.set(0.3, 0.3, 0.3);
    }
    
    // Configurar propiedades según tipo
    enemyModel.userData = {
        type: type,
        health: type === 'groundTargeting' ? GAME_SETTINGS.enemyHealth * 1.3 : 
               type === 'tieDefender' ? GAME_SETTINGS.enemyHealth * 1.1 : 
               GAME_SETTINGS.enemyHealth,
        damage: GAME_SETTINGS.enemyDamage,
        fireRate: type === 'groundTargeting' ? GAME_SETTINGS.enemyFireRate * 1.5 : 
                 GAME_SETTINGS.enemyFireRate,
        speed: type === 'groundTargeting' ? GAME_SETTINGS.enemySpeed * 0.7 : 
               GAME_SETTINGS.enemySpeed,
        lastShot: Math.random() * 2,
        color: 0xff0000, // TODOS ROJOS ahora (punto 3)
        points: type === 'groundTargeting' ? 150 : 
                type === 'tieDefender' ? 125 : 100
    };
    
    // PUNTO 4: MISMA ILUMINACIÓN PARA TODOS LOS ENEMIGOS (ajustable)
    const light = new THREE.PointLight(enemyModel.userData.color, ENEMY_LIGHT_INTENSITY, 10);//20
    enemyModel.add(light);
    
    scene.add(enemyModel);
    enemies.push(enemyModel);
    
    console.log(`👾 ${type} apareció en (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
    return enemyModel;
}

// VARIEDAD DE ENEMIGOS - DISTRIBUCIÓN DIVERTIDA
function getRandomEnemyType() {
    const rand = Math.random();
    
    // 60% TIE Interceptor (común)
    if (rand < 0.6) return 'tieInterceptor';
    
    // 25% TIE Defender (menos común)
    if (rand < 0.85) return 'tieDefender';
    
    // 15% Ground Targeting (raro pero interesante)
    return 'groundTargeting';
}

function updateEnemies(deltaTime) {
    // Actualizar enemigos existentes
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        if (!enemy || !enemy.userData) continue;
        
        // Movimiento según tipo
        const speed = enemy.userData.speed * deltaTime * 60;
        enemy.position.z += speed;
        if (enemy.userData.type === 'tieInterceptor') {
            // Movimiento ágil, pequeño zig-zag
            enemy.position.x += Math.sin(Date.now() * 0.002 + i) * 0.02;
            
            // Solo un poco de rotación en Y para que gire suavemente
            if (enemy.rotation) {
                enemy.rotation.y += 0.001;
            }
            
        } else if (enemy.userData.type === 'tieDefender') {
            // Movimiento más estable, menos zig-zag
            enemy.position.x += Math.sin(Date.now() * 0.0015 + i) * 0.015;
            
            // Rotación mínima
            if (enemy.rotation) {
                enemy.rotation.y += 0.0005;
            }
            
        } else if (enemy.userData.type === 'groundTargeting') {
            // Movimiento lento y pesado, casi recto
            enemy.position.y += Math.cos(Date.now() * 0.001 + i) * 0.008;
            
            // Rotación muy lenta
            if (enemy.rotation) {
                enemy.rotation.y += 0.0002;
            }
        }
        
        // Disparar
        enemy.userData.lastShot += deltaTime;
        if (enemy.userData.lastShot >= enemy.userData.fireRate) {
            shootEnemyLaser(enemy);
            enemy.userData.lastShot = 0;
        }
        
        // Eliminar si pasa al jugador
        if (enemy.position.z > 30) {
            scene.remove(enemy);
            enemies.splice(i, 1);
        }
        
        // Verificar colisiones
        checkEnemyCollisions(enemy, i);
    }
    
    // Generar nuevos enemigos - FRECUENTEMENTE PARA DIVERSIÓN
    if (!updateEnemies.lastSpawnTime) updateEnemies.lastSpawnTime = 0;
    updateEnemies.lastSpawnTime += deltaTime;
    
    // Generar cada 2-4 segundos (ajustado para diversión)
    const spawnInterval = 2.5 / GAME_SETTINGS.spawnRate;
    
    if (enemies.length < MAX_ENEMIES_ON_SCREEN && updateEnemies.lastSpawnTime >= spawnInterval) {
        const type = getRandomEnemyType();
        spawnEnemy(type);
        updateEnemies.lastSpawnTime = 0;
        
        // Feedback opcional
        if (Math.random() < 0.3) {
            console.log(`🎮 Nuevo enemigo: ${type} | Total: ${enemies.length}`);
        }
    }
}

// ===== SISTEMA DE DISPAROS =====
let lastPlayerShot = 0;

function shootPlayerLaser() {
    if (!gameState.running || gameState.paused || !playerShip) return;
    
    // Control de tasa de disparo (para no disparar demasiado rápido)
    const now = Date.now();
    if (now - lastPlayerShot < GAME_SETTINGS.playerFireRate * 1000) return;
    lastPlayerShot = now;
    
    // PUNTO 5: SOLO 2 DISPAROS (uno en cada lado) NO 4
    const gunOffsets = [
        { x: -0.8, y: 0, z: -1.5 }, // Izquierda
        { x: 0.8, y: 0, z: -1.5 }   // Derecha
    ];
    
    gunOffsets.forEach(offset => {
        const laserGeometry = new THREE.CylinderGeometry(0.07, 0.07, 2.5, 8); // Un poco más grueso
        const laserMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            emissive: 0x004400
        });
        
        const laser = new THREE.Mesh(laserGeometry, laserMaterial);
        
        // CALCULAR POSICIÓN MUNDIAL CORRECTAMENTE
        const worldPosition = new THREE.Vector3(
            offset.x,
            offset.y,
            offset.z
        );
        
        // Aplicar la rotación del X-Wing a la posición local
        worldPosition.applyMatrix4(playerShip.matrixWorld);
        
        laser.position.copy(worldPosition);
        
        // IMPORTANTE: Los láseres VAN RECTOS, sin rotación del X-Wing
        laser.rotation.x = Math.PI / 2;
        laser.rotation.y = 0;
        laser.rotation.z = 0;  
        
        laser.userData = {
            type: 'player',
            damage: GAME_SETTINGS.playerDamage,
            speed: 2.2,
            direction: new THREE.Vector3(0, 0, -1) // Siempre hacia adelante
        };
        
        scene.add(laser);
        bullets.push(laser);
    });
    
    // No reproducir sonido (punto 1)
    // audioSystem.playSound('laser', 0.3);
}

function shootEnemyLaser(enemy) {
    const laserGeometry = new THREE.CylinderGeometry(0.08, 0.08, 3, 8);
    const laserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, // PUNTO 3: TODOS ROJOS
        emissive: 0xff0000
    });
    
    const laser = new THREE.Mesh(laserGeometry, laserMaterial);
    laser.position.copy(enemy.position);
    laser.position.z += 2;
    laser.rotation.x = Math.PI / 2;
    
    laser.userData = {
        type: 'enemy',
        damage: enemy.userData.damage,
        speed: 0.9,
        from: enemy.userData.type
    };
    
    scene.add(laser);
    bullets.push(laser);
    
    // No reproducir sonido (punto 1)
    // audioSystem.playSound('enemyLaser', 0.2);
}

function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const speed = bullet.userData.speed * deltaTime * 60;
        
        if (bullet.userData.type === 'player') {
            bullet.position.z -= speed;
        } else {
            bullet.position.z += speed;
        }
        
        // Eliminar si está fuera de pantalla
        if (Math.abs(bullet.position.z) > 100) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

// ===== SISTEMA DE COLISIONES MEJORADO =====
function checkEnemyCollisions(enemy, enemyIndex) {
    for (let j = bullets.length - 1; j >= 0; j--) {
        const bullet = bullets[j];
        
        if (bullet.userData.type === 'player') {
            // Radio de colisión aumentado para que sea más fácil
            const distance = enemy.position.distanceTo(bullet.position);
            const collisionRadius = enemy.userData.type === 'groundTargeting' ? 3.5 : 2.5;
            
            if (distance < collisionRadius) {
                // IMPACTO - mostrar feedback
                enemy.userData.health -= bullet.userData.damage;
                
                // Efecto visual
                createHitEffect(bullet.position, enemy.userData.color);
                
                // No reproducir sonido (punto 1)
                // audioSystem.playSound('hit', hitVolume);
                
                // Eliminar láser
                scene.remove(bullet);
                bullets.splice(j, 1);
                
                // Mostrar daño en consola (debug)
                if (enemy.userData.health > 0) {
                    console.log(`🎯 ${enemy.userData.type}: ${enemy.userData.health} HP restantes`);
                } else {
                    console.log(`💥 ${enemy.userData.type} DESTRUIDO!`);
                }
                
                // Verificar destrucción
                if (enemy.userData.health <= 0) {
                    destroyEnemy(enemy, enemyIndex);
                    break;
                }
            }
        }
    }
}

function checkPlayerCollisions() {
    if (!playerShip) return;
    
    // Colisión con láseres enemigos
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        if (bullet.userData.type === 'enemy') {
            const distance = playerShip.position.distanceTo(bullet.position);
            
            if (distance < 3.5) {
                takeDamage(bullet.userData.damage);
                
                createHitEffect(bullet.position, 0xff0000);
                
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                // No reproducir sonido (punto 1)
                // audioSystem.playSound('hit', 0.5);
                
                // Mensaje según tipo de enemigo
                const enemyType = bullet.userData.from;
                const messages = {
                    'tieInterceptor': '¡TIE Interceptor!',
                    'tieDefender': '¡TIE Defender!',
                    'groundTargeting': '¡Blanco terrestre!'
                };
                showAlert(`IMPACTO: ${messages[enemyType] || 'Enemigo!'}`, 1000);
            }
        }
    }
    
    // Colisión física con enemigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const distance = playerShip.position.distanceTo(enemy.position);
        
        if (distance < 5) {
            takeDamage(35); // Daño mayor por colisión
            destroyEnemy(enemy, i);
            showAlert('¡COLISIÓN DIRECTA!', 2000);
            console.log('💥 Colisión con enemigo!');
        }
    }
}

// ===== SISTEMA DE EXPLOSIONES (¡SOLO 1 TIPO!) =====
function destroyEnemy(enemy, index) {
    // Puntuación según tipo
    gameState.score += enemy.userData.points;
    gameState.enemiesDestroyed++;
    updateUI();
    
    // PUNTO 2: USAR EXPLOSIÓN SIMPLE THREE.JS
    const explosion = createSimpleExplosion(enemy.position);
    explosions.push({ mesh: explosion, life: 1.5 });
    console.log(`💥 Explosión NARANJA creada para ${enemy.userData.type}`);
    
    // Eliminar sonido (ya está comentado)
    // audioSystem.playSound('explosion', 0.6);
    
    // Pickups frecuentes para mantener la acción
    if (Math.random() < GAME_SETTINGS.pickupChance) {
        spawnPickup(enemy.position);
    }
    
    scene.remove(enemy);
    enemies.splice(index, 1);
    
    // CORREGIR ERROR: Verificar que game-container existe
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        // Feedback visual en UI
        const scorePopup = document.createElement('div');
        scorePopup.className = 'score-popup';
        scorePopup.textContent = `+${enemy.userData.points}`;
        scorePopup.style.position = 'absolute';
        scorePopup.style.color = '#00ff00';
        scorePopup.style.fontSize = '24px';
        scorePopup.style.fontWeight = 'bold';
        scorePopup.style.textShadow = '0 0 10px #00ff00';
        scorePopup.style.animation = 'scoreFloat 1s forwards';
        
        // Posicionar cerca del centro
        scorePopup.style.left = '50%';
        scorePopup.style.top = '40%';
        scorePopup.style.transform = 'translate(-50%, -50%)';
        
        gameContainer.appendChild(scorePopup);
        setTimeout(() => {
            if (scorePopup.parentNode) scorePopup.remove();
        }, 1000);
    }
}

function createHitEffect(position, color) {
    const geometry = new THREE.SphereGeometry(0.4, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9
    });
    
    const hitEffect = new THREE.Mesh(geometry, material);
    hitEffect.position.copy(position);
    scene.add(hitEffect);
    
    let opacity = 0.9;
    const animateHit = () => {
        opacity -= 0.15;
        hitEffect.scale.multiplyScalar(1.15);
        material.opacity = opacity;
        
        if (opacity <= 0) {
            scene.remove(hitEffect);
        } else {
            requestAnimationFrame(animateHit);
        }
    };
    
    animateHit();
}
// ===== SISTEMA DE EXPLOSIONES SIMPLE CON THREE.JS =====
function createSimpleExplosion(position) {
    console.log('💥 Creando explosión simple THREE.js');
    
    // COLOR NARANJA/AMARILLO INTENSO (diferente a todo lo demás)
    const explosionColor = 0xff8800; // Naranja brillante
    const glowColor = 0xffff00;      // Amarillo para el núcleo
    
    // GRUPO PRINCIPAL
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);
    
    // 1. NÚCLEO BRILLANTE (esfera interior)
    const coreGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    explosionGroup.add(core);
    
    // 2. CAPA EXTERIOR (escala más grande)
    const outerGeometry = new THREE.SphereGeometry(1.5, 12, 12);
    const outerMaterial = new THREE.MeshBasicMaterial({
        color: explosionColor,
        transparent: true,
        opacity: 0.7,
        wireframe: true,
        blending: THREE.AdditiveBlending
    });
    const outer = new THREE.Mesh(outerGeometry, outerMaterial);
    explosionGroup.add(outer);
    
    // 3. ANILLOS DE ONDA EXPANSIVA (3 anillos a diferentes escalas)
    for (let i = 0; i < 3; i++) {
        const ringGeometry = new THREE.RingGeometry(0.5 + i * 0.3, 1.0 + i * 0.3, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: explosionColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6 - i * 0.15,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // Horizontal
        explosionGroup.add(ring);
    }
    
    // 4. LUZ PUNTUAL INTENSA (efecto de destello)
    const explosionLight = new THREE.PointLight(explosionColor, 5, 20);
    explosionGroup.add(explosionLight);
    
    // Configurar datos para animación
    explosionGroup.userData = {
        type: 'explosion',
        life: 1.5, // 1.5 segundos de duración
        scaleSpeed: 3.5,
        fadeSpeed: 2.0,
        light: explosionLight
    };
    
    scene.add(explosionGroup);
    
    // Iniciar animación inmediatamente
    animateExplosion(explosionGroup);
    
    return explosionGroup;
}

// ANIMACIÓN DE LA EXPLOSIÓN
function animateExplosion(explosion) {
    const startTime = Date.now();
    const duration = 1500; // 1.5 segundos
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1 || !explosion.parent) {
            // Eliminar explosión cuando termina
            scene.remove(explosion);
            // También eliminar de la array explosions si está allí
            const index = explosions.findIndex(exp => exp.mesh === explosion);
            if (index > -1) explosions.splice(index, 1);
            return;
        }
        
        // ESCALA: Crece rápidamente y luego se estabiliza
        const scale = 1 + progress * 2.5;
        explosion.scale.set(scale, scale, scale);
        
        // OPACIDAD: Se desvanece hacia el final
        const opacity = 1 - Math.pow(progress, 2);
        
        // Aplicar opacidad a todos los elementos
        explosion.children.forEach(child => {
            if (child.material && child.material.opacity !== undefined) {
                child.material.opacity = opacity * 0.8;
            }
            if (child.isLight) {
                child.intensity = 5 * (1 - progress);
            }
        });
        
        // Continuar animación
        requestAnimationFrame(update);
    }
    
    update();
}

function updateExplosions(deltaTime) {
    // Este sistema ahora es automático (animateExplosion)
    // Solo mantenemos limpieza de array por compatibilidad
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.life -= deltaTime;
        
        if (explosion.life <= 0) {
            explosions.splice(i, 1);
        }
    }
}
// ===== SISTEMA DE PICKUPS =====
function spawnPickup(position) {
    const types = ['health', 'shield', 'ammo'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const geometry = new THREE.SphereGeometry(0.6, 16, 16);
    let color, glowColor;
    switch(type) {
        case 'health': 
            color = 0x00ff00;
            glowColor = '#00ff00';
            break;
        case 'shield': 
            color = 0x00a8ff;
            glowColor = '#00a8ff';
            break;
        case 'ammo': 
            color = 0xffff00;
            glowColor = '#ffff00';
            break;
    }
    
    const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.7,
        shininess: 100
    });
    
    const pickup = new THREE.Mesh(geometry, material);
    pickup.position.copy(position);
    pickup.userData = { type: type, glow: glowColor };
    
    scene.add(pickup);
    pickups.push(pickup);
    
    console.log(`✨ Pickup ${type} apareció`);
}

function updatePickups(deltaTime) {
    for (let i = pickups.length - 1; i >= 0; i--) {
        const pickup = pickups[i];
        
        // Rotación atractiva
        pickup.rotation.x += 0.03;
        pickup.rotation.y += 0.04;
        
        // Flotación suave
        pickup.position.y += Math.sin(Date.now() * 0.001 + i) * 0.008;
        
        // Movimiento hacia el jugador
        pickup.position.z += 0.3 * deltaTime * 60;
        
        // Verificar recolección
        if (playerShip) {
            const distance = playerShip.position.distanceTo(pickup.position);
            if (distance < 3.5) {
                collectPickup(pickup, i);
            }
        }
        
        // Eliminar si se pasa
        if (pickup.position.z > 20) {
            scene.remove(pickup);
            pickups.splice(i, 1);
        }
    }
}

function collectPickup(pickup, index) {
    let message = '';
    let color = '#ffffff';
    
    switch(pickup.userData.type) {
        case 'health':
            gameState.health = Math.min(100, gameState.health + 35);
            message = '+35 SALUD';
            color = '#00ff00';
            break;
        case 'shield':
            gameState.shield = Math.min(100, gameState.shield + 60);
            message = '+60 ESCUDOS';
            color = '#00a8ff';
            break;
        case 'ammo':
            // Aunque la munición es infinita, damos bonus de puntuación
            gameState.score += 250;
            message = '+250 PUNTOS';
            color = '#ffff00';
            break;
    }
    
    // No reproducir sonido (punto 1)
    // audioSystem.playSound('pickup', 0.5);
    
    // Efecto visual de recolección
    const pickupEffect = document.createElement('div');
    pickupEffect.className = 'pickup-effect';
    pickupEffect.textContent = message;
    pickupEffect.style.color = color;
    pickupEffect.style.textShadow = `0 0 10px ${color}`;
    pickupEffect.style.animation = 'pickupFloat 1s forwards';
    
    pickupEffect.style.position = 'absolute';
    pickupEffect.style.left = '50%';
    pickupEffect.style.top = '45%';
    pickupEffect.style.transform = 'translate(-50%, -50%)';
    pickupEffect.style.fontSize = '20px';
    pickupEffect.style.fontWeight = 'bold';
    
    document.getElementById('game-container').appendChild(pickupEffect);
    setTimeout(() => pickupEffect.remove(), 1000);
    
    scene.remove(pickup);
    pickups.splice(index, 1);
    updateUI();
    
    console.log(`🎁 Pickup recolectado: ${pickup.userData.type}`);
}

// ===== MOVIMIENTO DEL JUGADOR =====
function updatePlayerMovement(deltaTime) {
    if (!gameState.running || gameState.paused || !playerShip) return;
    
    // PUNTO 7: AUMENTAR LIMITES DE MOVIMIENTO
    const moveSpeed = 0.35; // Aumentado de 0.30
    const maxTilt = 0.50; // Aumentado de 0.40
    
    // MOVIMIENTO CON LÍMITES AUMENTADOS (punto 7)
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        playerShip.position.y += moveSpeed;
        playerShip.rotation.x = THREE.MathUtils.lerp(playerShip.rotation.x, -maxTilt, 0.15);
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        playerShip.position.y -= moveSpeed;
        playerShip.rotation.x = THREE.MathUtils.lerp(playerShip.rotation.x, maxTilt, 0.15);
    } else {
        playerShip.rotation.x = THREE.MathUtils.lerp(playerShip.rotation.x, 0, 0.15);
    }
    
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        playerShip.position.x -= moveSpeed;
        playerShip.rotation.z = THREE.MathUtils.lerp(playerShip.rotation.z, maxTilt, 0.15);
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        playerShip.position.x += moveSpeed;
        playerShip.rotation.z = THREE.MathUtils.lerp(playerShip.rotation.z, -maxTilt, 0.15);
    } else {
        playerShip.rotation.z = THREE.MathUtils.lerp(playerShip.rotation.z, 0, 0.1);
    }
    
    // PUNTO 7: AUMENTAR LÍMITES DE MOVIMIENTO (ÁREA MÁS AMPLIA)
    playerShip.position.x = THREE.MathUtils.clamp(playerShip.position.x, -18, 18); // Antes -15, 15
    playerShip.position.y = THREE.MathUtils.clamp(playerShip.position.y, -10, 8);   // Antes -8, 6
    
    // La cámara sigue al X-Wing
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerShip.position.x, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, playerShip.position.y + 3, 0.1);
    camera.position.z = playerShip.position.z + 12;
    camera.lookAt(playerShip.position.x, playerShip.position.y + 1, playerShip.position.z - 5);
}

// ===== DAÑO Y ESCUDOS =====
function takeDamage(amount) {
    if (gameState.shieldActive) {
        showAlert('ESCUDOS BLOQUEAN DAÑO', 1000);
        return;
    }
    
    if (gameState.shield > 0) {
        gameState.shield = Math.max(0, gameState.shield - amount);
        showAlert(`ESCUDOS: ${Math.round(gameState.shield)}%`, 1000);
        
        // Efecto de escudo impactado
        if (playerShip) {
            const shieldFlash = new THREE.PointLight(0x00a8ff, 2, 5);
            shieldFlash.position.copy(playerShip.position);
            scene.add(shieldFlash);
            setTimeout(() => scene.remove(shieldFlash), 200);
        }
    } else {
        gameState.health = Math.max(0, gameState.health - amount);
        showAlert(`¡DAÑO! SALUD: ${Math.round(gameState.health)}%`, 1500);
        
        // Sacudida de cámara por daño
        camera.position.x += (Math.random() - 0.5) * 0.3;
        camera.position.y += (Math.random() - 0.5) * 0.3;
        
        if (gameState.health <= 0) {
            gameOver();
        }
    }
    
    updateUI();
}

function activateShield() {
    if (gameState.shieldCooldown > 0) {
        showAlert(`ESCUDOS EN ENFRIAMIENTO: ${Math.round(gameState.shieldCooldown)}s`, 1500);
        return;
    }
    
    if (gameState.shield < 25) {
        showAlert('ESCUDOS INSUFICIENTES', 1500);
        return;
    }
    
    gameState.shieldActive = true;
    gameState.shieldCooldown = 25; // 25 segundos de cooldown
    
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.classList.add('shield-ready');
    
    // No reproducir sonido (punto 1)
    // audioSystem.playSound('shield', 0.7);
    
    showAlert('ESCUDOS ACTIVADOS', 2000);
    
    // Efecto visual de escudo
    if (playerShip) {
        const shieldSphere = new THREE.Mesh(
            new THREE.SphereGeometry(3, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0x00a8ff,
                transparent: true,
                opacity: 0.3,
                wireframe: true
            })
        );
        shieldSphere.position.copy(playerShip.position);
        shieldSphere.name = 'playerShield';
        scene.add(shieldSphere);
    }
    
    setTimeout(() => {
        if (gameState.shieldActive) {
            gameState.shieldActive = false;
            if (crosshair) crosshair.classList.remove('shield-ready');
            
            // Remover efecto visual
            const shield = scene.getObjectByName('playerShield');
            if (shield) scene.remove(shield);
            
            showAlert('ESCUDOS AGOTADOS', 1500);
        }
    }, 4000); // Escudos duran 4 segundos
}

// ===== INTERFAZ DE USUARIO =====
function setupUI() {
    const pilotDisplay = document.getElementById('pilot-name-display');
    if (pilotDisplay) {
        pilotDisplay.textContent = gameState.pilotName;
    }
    
    // Botones
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-btn');
    const quitBtn = document.getElementById('quit-btn');
    const fireBtn = document.getElementById('fire-btn');
    const shieldBtn = document.getElementById('shield-btn');
    const menuBtn = document.getElementById('game-menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', goToPortfolio);
    }
    
    // Botón en pantalla de victoria
    const victoryPortfolioBtn = document.getElementById('victory-portfolio');
    if (victoryPortfolioBtn) {
        victoryPortfolioBtn.addEventListener('click', goToPortfolio);
    }
    
    // Botón en pantalla de game over
    const gameOverPortfolioBtn = document.getElementById('game-over-portfolio');
    if (gameOverPortfolioBtn) {
        gameOverPortfolioBtn.addEventListener('click', goToPortfolio);
    }
    
    console.log('✅ Botones de "Volver al portafolio" configurados');

    
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (menuBtn) menuBtn.addEventListener('click', goToPortfolio);
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (quitBtn) quitBtn.addEventListener('click', goToPortfolio);
    
    // Controles móviles
    if (fireBtn) {
        fireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            shootPlayerLaser();
        });
        fireBtn.addEventListener('mousedown', shootPlayerLaser);
    }
    
    if (shieldBtn) {
        shieldBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            activateShield();
        });
        shieldBtn.addEventListener('mousedown', activateShield);
    }
    
    // Controles de movimiento táctil
    const moveButtons = ['move-up', 'move-left', 'move-right', 'move-down'];
    moveButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const direction = id.split('-')[1];
                keys['Arrow' + direction.charAt(0).toUpperCase() + direction.slice(1)] = true;
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                const direction = id.split('-')[1];
                keys['Arrow' + direction.charAt(0).toUpperCase() + direction.slice(1)] = false;
            });
        }
    });
    
    // Mostrar tiempo extendido
    updateUI();
}

function updateUI() {
    // Salud
    const healthBar = document.getElementById('health-bar');
    const healthValue = document.getElementById('health-value');
    if (healthBar) {
        healthBar.style.width = gameState.health + '%';
        healthBar.style.backgroundColor = gameState.health > 50 ? '#00ff00' : 
                                         gameState.health > 25 ? '#ffff00' : '#ff0000';
    }
    if (healthValue) healthValue.textContent = Math.round(gameState.health) + '%';
    
    // Escudos
    const shieldBar = document.getElementById('shield-bar');
    const shieldValue = document.getElementById('shield-value');
    if (shieldBar) {
        shieldBar.style.width = gameState.shield + '%';
        shieldBar.style.backgroundColor = gameState.shield > 50 ? '#00a8ff' : 
                                         gameState.shield > 25 ? '#0088ff' : '#0055ff';
    }
    if (shieldValue) shieldValue.textContent = Math.round(gameState.shield) + '%';
    
    // Tiempo (3 minutos)
    const timer = document.getElementById('mission-timer');
    if (timer) {
        const minutes = Math.floor(gameState.missionTime / 60);
        const seconds = Math.floor(gameState.missionTime % 60);
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Cambiar color cuando quede poco tiempo
        if (gameState.missionTime < 30) {
            timer.style.color = '#ff0000';
            timer.style.animation = 'pulse 0.5s infinite';
        } else if (gameState.missionTime < 60) {
            timer.style.color = '#ffff00';
        }
    }
    
    // Enemigos destruidos
    const killsDisplay = document.getElementById('enemies-destroyed');
    if (killsDisplay) killsDisplay.textContent = gameState.enemiesDestroyed;
    
    // Puntuación
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) scoreDisplay.textContent = gameState.score;
}

function showAlert(message, duration = 2000) {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    
    const alert = document.createElement('div');
    alert.className = 'alert';
    alert.textContent = message;
    alert.style.animation = 'alertPulse 0.5s infinite alternate';
    
    alertsContainer.appendChild(alert);
    
    // No reproducir sonido (punto 1)
    // audioSystem.playSound('alert', 0.3);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, duration);
}

// ===== CONTROLES =====
function setupControls() {
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            shootPlayerLaser();
        }
        
        if (e.key === 'Shift') {
            activateShield();
        }
        
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            togglePause();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    window.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            shootPlayerLaser();
        }
    });
    
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    window.addEventListener('resize', onWindowResize);
}

// ===== LÓGICA DEL JUEGO =====
function loadPilotData() {
    try {
        const savedData = localStorage.getItem('starfighter_pilot');
        if (savedData) {
            const data = JSON.parse(savedData);
            gameState.pilotName = data.name || 'PILOTO X-WING';
            
            // ¡AÑADIR ESTAS 2 LÍNEAS!
            const pilotDisplay = document.getElementById('pilot-name-display');
            if (pilotDisplay) {
                pilotDisplay.textContent = gameState.pilotName;
                console.log(`✅ Nombre cargado: ${gameState.pilotName}`);
            }
        }
    } catch (e) {
        console.warn('No se pudo cargar datos del piloto:', e);
    }
}
function startGame() {
    gameState.running = true;
    gameState.paused = false;
    gameState.gameOver = false;
    gameState.victory = false;
    gameState.missionTime = 180; // 3 minutos
    gameState.score = 0;
    gameState.health = 100;
    gameState.shield = 100;
    gameState.shieldActive = false;
    gameState.shieldCooldown = 0;
    gameState.enemiesDestroyed = 0;
    
    // Limpiar enemigos y balas anteriores
    enemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    explosions.forEach(exp => scene.remove(exp.mesh));
    pickups.forEach(pickup => scene.remove(pickup));
    
    enemies = [];
    bullets = [];
    explosions = [];
    pickups = [];
    
    // Ocultar pantallas
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';
    
    // Actualizar UI
    updateUI();
    
    console.log('🚀 MISIÓN INICIADA - 3 MINUTOS DE ACCIÓN!');
    showAlert('¡DESTRUYE TODAS LAS NAVES ENEMIGAS!', 3000);
}

function updateGame(deltaTime) {
    if (!gameState.running || gameState.paused || gameState.gameOver) return;
    
    // Actualizar tiempo
    gameState.missionTime -= deltaTime;
    if (gameState.missionTime <= 0) {
        victory();
        return;
    }
    
    // Actualizar cooldown de escudos
    if (gameState.shieldCooldown > 0) {
        gameState.shieldCooldown -= deltaTime;
    }
    
    // Actualizar movimiento y elementos
    updatePlayerMovement(deltaTime);
    updateEnemies(deltaTime);
    updateBullets(deltaTime);
    updateExplosions(deltaTime);
    updatePickups(deltaTime);
    updateStars(deltaTime);
    
    // Verificar colisiones
    checkPlayerCollisions();
    
    // Actualizar UI
    updateUI();
}

function updateStars(deltaTime) {
    stars.forEach(starField => {
        const positions = starField.geometry.attributes.position.array;
        const starCount = positions.length / 3;
        
        for (let i = 0; i < starCount; i++) {
            const index = i * 3;
            
            // Velocidad según capa (estrellas cercanas = más rápido)
            const zDepth = Math.abs(positions[index + 2]);
            const speedMultiplier = 1.0 - (zDepth / 200) * 0.7; // 0.3 a 1.0
            
            positions[index + 2] += 1.8 * speedMultiplier * deltaTime * 60;
            
            // RECICLAR estrellas que pasen la cámara
             if (positions[index + 2] >30) {
                // Ponerlas DELANTE de la cámara
                positions[index] = (Math.random() - 0.5) * 200;
                positions[index + 1] = (Math.random() - 0.5) * 200;
                positions[index + 2] = -150 + Math.random() * 50; 
                // Opcional: tamaño aleatorio para variedad
                if (starField.geometry.attributes.size) {
                    starField.geometry.attributes.size.array[i] = Math.random() * 0.15 + 0.05;
                }
            }
        }
        
        starField.geometry.attributes.position.needsUpdate = true;
    });
}
function togglePause() {
    if (gameState.gameOver || gameState.victory) return;
    
    gameState.paused = !gameState.paused;
    const pauseScreen = document.getElementById('pause-screen');
    
    if (gameState.paused) {
        pauseScreen.style.display = 'flex';
        
        // Actualizar estadísticas en pausa
        document.getElementById('pause-timer').textContent = 
            document.getElementById('mission-timer').textContent;
        document.getElementById('pause-kills').textContent = gameState.enemiesDestroyed;
        document.getElementById('pause-score').textContent = gameState.score;
        document.getElementById('pause-health').textContent = Math.round(gameState.health) + '%';
        
        audioSystem.setMusicVolume(0.1);
    } else {
        pauseScreen.style.display = 'none';
        audioSystem.setMusicVolume(0.3);
    }
}

function gameOver() {
    if (gameState.gameOver) return;

    gameState.running = false;
    gameState.gameOver = true;
    
    // Actualizar pantalla de game over
    document.getElementById('final-time').textContent = 
        document.getElementById('mission-timer').textContent;
    document.getElementById('final-kills').textContent = gameState.enemiesDestroyed;
    document.getElementById('final-score').textContent = gameState.score;
    
    document.getElementById('game-over-screen').style.display = 'flex';
    
    // Configurar botones
    document.getElementById('game-over-restart').onclick = restartGame;
    document.getElementById('game-over-menu').onclick = goToMenu;
    
    console.log('💀 Misión fallida - ¡INTÉNTALO DE NUEVO!');
}

function victory() {
    if (gameState.victory) return;
    
    console.log('🏆 EJECUTANDO VICTORY - Mostrando panel...');
    
    gameState.running = false;
    gameState.victory = true;
    
    // 1. DETENER ENEMIGOS Y BALAS INMEDIATAMENTE
    enemies.forEach(enemy => scene.remove(enemy));
    enemies = [];
    bullets.forEach(bullet => scene.remove(bullet));
    bullets = [];
    
    // 2. OBTENER EL PANEL DE VICTORIA
    const victoryScreen = document.getElementById('victory-screen');
    console.log('🔍 Panel de victoria encontrado:', victoryScreen);
    
    // 3. MOSTRAR EL PANEL (igual que en gameOver)
    if (victoryScreen) {
        victoryScreen.style.display = 'flex'; // <-- ESTA ES LA LÍNEA CLAVE
        
        // 4. ACTUALIZAR ESTADÍSTICAS (igual que en gameOver)

        const victoryScore = document.getElementById('victory-score');
        const victoryKills = document.getElementById('victory-kills');
        const victoryEfficiency = document.getElementById('victory-efficiency');
        const victoryRank = document.getElementById('victory-rank');
        
        // Calcular eficiencia
        const efficiency = Math.min(100, Math.round((gameState.enemiesDestroyed / 25) * 100));
        
        // Determinar rango
        let rank = 'ROOKIE';
        if (gameState.score >= 3000) rank = 'PILOTO';
        if (gameState.score >= 6000) rank = 'VETERANO';
        if (gameState.score >= 10000) rank = 'NINJA-JEDI';
        if (gameState.score >= 15000) rank = 'LEYENDA-NINJA-JEDI';
        
        if (victoryScore) victoryScore.textContent = gameState.score;
        if (victoryKills) victoryKills.textContent = gameState.enemiesDestroyed;
        if (victoryEfficiency) victoryEfficiency.textContent = efficiency + '%';
        if (victoryRank) victoryRank.textContent = rank;
        
        console.log('✅ Panel de victoria mostrado y datos actualizados');
        
        // 5. ASEGURAR QUE LOS BOTONES FUNCIONAN
        const restartBtn = document.getElementById('victory-restart');
        const menuBtn = document.getElementById('victory-menu');
        
        if (restartBtn) {
            restartBtn.onclick = restartGame;
            console.log('✅ Botón restart configurado');
        }
        
        if (menuBtn) {
            menuBtn.onclick = goToMenu;
            console.log('✅ Botón menú configurado');
        }
        
    } else {
        console.error('❌ ERROR: No se encontró #victory-screen');
    }
    
    // 6. REDUCIR VOLUMEN DE MÚSICA
    audioSystem.setMusicVolume(0.1);
    
    console.log('🎮 Estado final - running:', gameState.running, 'victory:', gameState.victory);
}

function restartGame() {
    startGame();
}

function goToPortfolio() {
    console.log('← Volviendo al portafolio...');
    
    // Detener música del juego
    if (audioSystem && audioSystem.stopMusic) {
        audioSystem.stopMusic();
    }
    
    // Tu ruta ya configurada
    if (window.location.hostname === 'victor-git-cyber.github.io') {
        window.location.href = 'https://victor-git-cyber.github.io';
    } else {
        window.location.href = '/';
    }
}

// ===== UTILIDADES =====
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// ===== BUCLE DE ANIMACIÓN =====
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    updateGame(deltaTime);
    updateCrosshair();
    
    composer.render();
}

function updateCrosshair() {
    const crosshair = document.getElementById('crosshair');
    if (!crosshair) return;
    
    // Verificar si hay enemigos en la mira
    let targeting = false;
    if (playerShip) {
        const forward = new THREE.Vector3(0, 0, -1);
        playerShip.localToWorld(forward);
        forward.sub(playerShip.position).normalize();
        
        for (const enemy of enemies) {
            const direction = new THREE.Vector3().subVectors(enemy.position, playerShip.position);
            const distance = direction.length();
            direction.normalize();
            
            const dot = forward.dot(direction);
            if (dot > 0.97 && distance < 60) {
                targeting = true;
                break;
            }
        }
    }
    
    crosshair.classList.toggle('targeting', targeting);
    crosshair.classList.toggle('shield-ready', gameState.shieldActive);
}

// ===== INICIALIZAR =====
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(init, 100);
});

// ===== DEBUG =====
window.game = {
    state: gameState,
    spawnEnemy,
    shootPlayerLaser,
    activateShield,
    togglePause
};