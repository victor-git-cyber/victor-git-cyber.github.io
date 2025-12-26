import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Game Variables
let scene, camera, renderer, composer;
let player, bullets = [], enemies = [], stars = [];
let keys = {};
let score = 0;
let health = 100;
let gameRunning = false;
let gameTime = 0;
let enemiesDestroyed = 0;
let difficulty = 'medium';

// DOM Elements
const scoreElement = document.getElementById('score');
const healthElement = document.getElementById('health');
const healthBar = document.getElementById('health-bar');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const startButton = document.getElementById('start-btn');
const restartButton = document.getElementById('restart-btn');
const menuButton = document.getElementById('menu-btn');
const resumeButton = document.getElementById('resume-btn');
const pauseRestartButton = document.getElementById('pause-restart-btn');
const pauseMenuButton = document.getElementById('pause-menu-btn');
const backButton = document.getElementById('back-btn');
const finalScoreElement = document.getElementById('final-score');
const enemiesDestroyedElement = document.getElementById('enemies-destroyed');
const survivalTimeElement = document.getElementById('survival-time');

// Audio
const shootSound = document.getElementById('shoot-sound');
const explosionSound = document.getElementById('explosion-sound');
const hitSound = document.getElementById('hit-sound');

// Initialize Game
function init() {
    // Create Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 100);
    
    // Create Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);
    
    // Create Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('game-canvas'),
        antialias: true,
        alpha: true
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
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x00ffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create starfield background
    createStarfield();
    
    // Create player
    createPlayer();
    
    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    // UI Event Listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    menuButton.addEventListener('click', goToMenu);
    resumeButton.addEventListener('click', resumeGame);
    pauseRestartButton.addEventListener('click', restartGame);
    pauseMenuButton.addEventListener('click', goToMenu);
    backButton.addEventListener('click', goToPortfolio);
    
    // Difficulty buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            difficulty = this.dataset.difficulty;
        });
    });
    
    // Pause with P or ESC
    window.addEventListener('keydown', (e) => {
        if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && gameRunning) {
            togglePause();
        }
    });
    
    // Start animation loop
    animate();
}

// Create starfield background
function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 200;
        positions[i + 1] = (Math.random() - 0.5) * 200;
        positions[i + 2] = (Math.random() - 0.5) * 200;
        
        colors[i] = 0.5 + Math.random() * 0.5;
        colors[i + 1] = 0.5 + Math.random() * 0.5;
        colors[i + 2] = 1.0;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    stars.push(starField);
}

// Create player ship
function createPlayer() {
    const geometry = new THREE.ConeGeometry(1, 3, 8);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x004444,
        shininess: 100
    });
    
    player = new THREE.Mesh(geometry, material);
    player.position.set(0, 0, 0);
    player.rotation.x = Math.PI / 2;
    scene.add(player);
    
    // Add engine glow
    const engineGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const engineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.7
    });
    
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.z = -1.5;
    engine.rotation.x = Math.PI / 2;
    player.add(engine);
}

// Create enemy
function createEnemy() {
    const geometry = new THREE.OctahedronGeometry(1.2);
    const material = new THREE.MeshPhongMaterial({
        color: 0xff4444,
        emissive: 0x440000,
        shininess: 50
    });
    
    const enemy = new THREE.Mesh(geometry, material);
    
    // Random position off-screen
    const side = Math.floor(Math.random() * 4);
    let x, y, z;
    
    switch(side) {
        case 0: // Top
            x = (Math.random() - 0.5) * 30;
            y = 20;
            z = (Math.random() - 0.5) * 30;
            break;
        case 1: // Right
            x = 30;
            y = (Math.random() - 0.5) * 20;
            z = (Math.random() - 0.5) * 30;
            break;
        case 2: // Bottom
            x = (Math.random() - 0.5) * 30;
            y = -20;
            z = (Math.random() - 0.5) * 30;
            break;
        case 3: // Left
            x = -30;
            y = (Math.random() - 0.5) * 20;
            z = (Math.random() - 0.5) * 30;
            break;
    }
    
    enemy.position.set(x, y, z);
    enemy.userData = {
        speed: getEnemySpeed(),
        health: getEnemyHealth(),
        type: 'enemy'
    };
    
    scene.add(enemy);
    enemies.push(enemy);
}

// Get enemy speed based on difficulty
function getEnemySpeed() {
    switch(difficulty) {
        case 'easy': return 0.03 + Math.random() * 0.02;
        case 'medium': return 0.05 + Math.random() * 0.03;
        case 'hard': return 0.08 + Math.random() * 0.04;
        default: return 0.05;
    }
}

// Get enemy health based on difficulty
function getEnemyHealth() {
    switch(difficulty) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: return 2;
    }
}

// Create bullet
function createBullet() {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0x444400
    });
    
    const bullet = new THREE.Mesh(geometry, material);
    bullet.position.copy(player.position);
    bullet.position.z += 2;
    
    bullet.userData = {
        speed: 0.5,
        damage: 1,
        type: 'bullet'
    };
    
    scene.add(bullet);
    bullets.push(bullet);
    
    // Play shoot sound
    shootSound.currentTime = 0;
    shootSound.play().catch(e => console.log("Audio error:", e));
}

// Update game state
function update() {
    if (!gameRunning) return;
    
    gameTime += 0.016; // Assuming 60fps
    
    // Update player based on keys
    const speed = 0.2;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) player.position.z -= speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) player.position.z += speed;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.position.x -= speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) player.position.x += speed;
    
    // Keep player in bounds
    player.position.x = Math.max(-15, Math.min(15, player.position.x));
    player.position.z = Math.max(-10, Math.min(10, player.position.z));
    
    // Rotate player based on movement
    player.rotation.z = (keys['ArrowLeft'] || keys['a'] || keys['A']) ? 0.3 : 
                       (keys['ArrowRight'] || keys['d'] || keys['D']) ? -0.3 : 0;
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.z += bullet.userData.speed;
        
        // Remove bullet if far away
        if (bullet.position.z > 50) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
    
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move toward player
        const dx = player.position.x - enemy.position.x;
        const dy = player.position.y - enemy.position.y;
        const dz = player.position.z - enemy.position.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        enemy.position.x += (dx / distance) * enemy.userData.speed;
        enemy.position.y += (dy / distance) * enemy.userData.speed;
        enemy.position.z += (dz / distance) * enemy.userData.speed;
        
        // Rotate enemy
        enemy.rotation.x += 0.02;
        enemy.rotation.y += 0.03;
        
        // Check collision with player
        if (distance < 2) {
            takeDamage(10);
            createExplosion(enemy.position);
            scene.remove(enemy);
            enemies.splice(i, 1);
            explosionSound.currentTime = 0;
            explosionSound.play().catch(e => console.log("Audio error:", e));
        }
        
        // Check collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            const bulletDistance = enemy.position.distanceTo(bullet.position);
            
            if (bulletDistance < 1.5) {
                enemy.userData.health -= bullet.userData.damage;
                
                // Remove bullet
                scene.remove(bullet);
                bullets.splice(j, 1);
                
                // Create hit effect
                createHitEffect(bullet.position);
                hitSound.currentTime = 0;
                hitSound.play().catch(e => console.log("Audio error:", e));
                
                // Check if enemy is destroyed
                if (enemy.userData.health <= 0) {
                    addScore(100);
                    enemiesDestroyed++;
                    createExplosion(enemy.position);
                    scene.remove(enemy);
                    enemies.splice(i, 1);
                    explosionSound.currentTime = 0;
                    explosionSound.play().catch(e => console.log("Audio error:", e));
                    break;
                }
            }
        }
    }
    
    // Spawn new enemies
    const spawnRate = getSpawnRate();
    if (Math.random() < spawnRate) {
        createEnemy();
    }
    
    // Update camera to follow player
    camera.position.x = player.position.x;
    camera.position.y = player.position.y + 5;
    camera.position.z = player.position.z + 15;
    camera.lookAt(player.position);
}

// Get spawn rate based on difficulty
function getSpawnRate() {
    switch(difficulty) {
        case 'easy': return 0.01;
        case 'medium': return 0.02;
        case 'hard': return 0.03;
        default: return 0.02;
    }
}

// Create explosion effect
function createExplosion(position) {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = position.x;
        positions[i + 1] = position.y;
        positions[i + 2] = position.z;
        
        velocities.push({
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2,
            z: (Math.random() - 0.5) * 0.2
        });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.5,
        color: 0xffaa00,
        transparent: true,
        opacity: 1
    });
    
    const explosion = new THREE.Points(geometry, material);
    explosion.userData = {
        velocities: velocities,
        life: 1.0
    };
    
    scene.add(explosion);
    
    // Animate explosion
    function animateExplosion() {
        if (explosion.userData.life <= 0) {
            scene.remove(explosion);
            return;
        }
        
        explosion.userData.life -= 0.03;
        material.opacity = explosion.userData.life;
        material.size = 0.5 * explosion.userData.life;
        
        const positions = explosion.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += explosion.userData.velocities[i/3].x;
            positions[i + 1] += explosion.userData.velocities[i/3].y;
            positions[i + 2] += explosion.userData.velocities[i/3].z;
        }
        
        explosion.geometry.attributes.position.needsUpdate = true;
        
        requestAnimationFrame(animateExplosion);
    }
    
    animateExplosion();
}

// Create hit effect
function createHitEffect(position) {
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    
    const hitEffect = new THREE.Mesh(geometry, material);
    hitEffect.position.copy(position);
    
    scene.add(hitEffect);
    
    // Animate hit effect
    function animateHit() {
        material.opacity -= 0.1;
        hitEffect.scale.multiplyScalar(1.1);
        
        if (material.opacity <= 0) {
            scene.remove(hitEffect);
            return;
        }
        
        requestAnimationFrame(animateHit);
    }
    
    animateHit();
}

// Add score
function addScore(points) {
    score += points;
    scoreElement.textContent = score;
}

// Take damage
function takeDamage(amount) {
    health = Math.max(0, health - amount);
    healthElement.textContent = `${Math.round(health)}%`;
    healthBar.style.width = `${health}%`;
    
    // Change health bar color based on health
    if (health > 60) {
        healthBar.style.background = 'linear-gradient(90deg, #00ff00, #00ffaa)';
    } else if (health > 30) {
        healthBar.style.background = 'linear-gradient(90deg, #ffff00, #ffaa00)';
    } else {
        healthBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
    }
    
    // Check game over
    if (health <= 0) {
        gameOver();
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    gameOverScreen.style.display = 'flex';
    
    finalScoreElement.textContent = score;
    enemiesDestroyedElement.textContent = enemiesDestroyed;
    survivalTimeElement.textContent = `${Math.round(gameTime)}s`;
}

// Start game
function startGame() {
    // Reset game state
    score = 0;
    health = 100;
    gameTime = 0;
    enemiesDestroyed = 0;
    gameRunning = true;
    
    // Clear existing enemies and bullets
    enemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    enemies = [];
    bullets = [];
    
    // Reset UI
    scoreElement.textContent = '0';
    healthElement.textContent = '100%';
    healthBar.style.width = '100%';
    healthBar.style.background = 'linear-gradient(90deg, #00ff00, #00ffaa)';
    
    // Hide start screen
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    
    // Reset player position
    player.position.set(0, 0, 0);
}

// Restart game
function restartGame() {
    startGame();
}

// Go to menu
function goToMenu() {
    gameRunning = false;
    gameOverScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    startScreen.style.display = 'flex';
}
// Go back to portfolio
function goToPortfolio() {
    console.log('🔙 Volviendo al portafolio principal...');
    
    // Redirigir a la página principal
    // '/' siempre apunta a la raíz del dominio
    window.location.href = '/';
}

// Toggle pause
function togglePause() {
    if (!gameRunning) return;
    
    if (pauseScreen.style.display === 'flex') {
        resumeGame();
    } else {
        pauseGame();
    }
}

// Pause game
function pauseGame() {
    gameRunning = false;
    pauseScreen.style.display = 'flex';
}

// Resume game
function resumeGame() {
    gameRunning = true;
    pauseScreen.style.display = 'none';
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (gameRunning) {
        update();
    }
    
    // Rotate starfield slowly
    stars.forEach(starField => {
        starField.rotation.y += 0.0005;
    });
    
    composer.render();
}

// Event handlers
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    keys[event.key] = true;
    
    // Space to shoot
    if (event.key === ' ' && gameRunning) {
        createBullet();
        event.preventDefault(); // Prevent space from scrolling page
    }
}

function onKeyUp(event) {
    keys[event.key] = false;
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', init);