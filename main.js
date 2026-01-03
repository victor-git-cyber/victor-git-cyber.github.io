import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Variables globales
let scene, camera, renderer, composer;
let particles, time = 0;

// Datos de proyectos de ejemplo
const projectsData = {
    games: [
        {
            id: 1,
            title: "Star wars 3D",
            description: "Juego de naves espaciales con física realista y combate en el espacio",
            tags: ["acción", "espacio", "shooter"],
            folder: "games/star-wars-dogfight"
        },
        {
            id: 2,
            title: "TETHROUGH",
            description: "Juego de carreras de obstáculos con controles simples pero desafiantes",
            tags: ["carreras", "arcade", "3D"],
            folder: "games/basic-game"
        }
    ],
    scenes: [
        {
            id: 3,
            title: "Galaxia Interactiva",
            description: "Sistema solar completo con planetas orbitando y información educativa",
            tags: ["espacio", "educativo", "simulación"],
            folder: "scenes/galaxy"
        },
        {
            id: 4,
            title: "Sala de Exposiciones 3D",
            description: "Galería virtual para mostrar modelos 3D con controles de cámara",
            tags: ["exhibición", "modelos", "VR"],
            folder: "scenes/showroom"
        }
    ],
    experiments: [
        {
            id: 5,
            title: "Sistema de Partículas Avanzado",
            description: "Simulación de efectos de partículas: fuego, agua, humo y explosiones",
            tags: ["partículas", "simulación", "shaders"],
            folder: "experiments/particles"
        },
        {
            id: 6,
            title: "Simulación Física con Cannon.js",
            description: "Demostración interactiva de físicas realistas: gravedad, colisiones, joints",
            tags: ["física", "simulación", "cannon.js"],
            folder: "experiments/physics"
        }
    ]
};

// Inicialización
function init() {
    // 1. Crear escena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 30);
    
    // 2. Crear cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 10);
    
    // 3. Crear renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('three-canvas'),
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 4. Post-processing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.2, 0.4, 0.85
    );
    composer.addPass(bloomPass);
    
    // 5. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x00ffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // 6. Crear fondo de partículas
    createParticleField();
    
    // 7. Crear elementos decorativos
    createFloatingElements();
    
    // 8. Event Listeners
    window.addEventListener('resize', onWindowResize);
    
    // 9. Cargar proyectos
    displayProjects();
    
    // 10. Iniciar animación
    animate();
}

// Crear campo de partículas 3D
function createParticleField() {
    const particleCount = 5000;
    const particlesGeometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const color = new THREE.Color();
    
    for (let i = 0; i < particleCount; i++) {
        // Posiciones en una esfera grande
        const radius = 25;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta) * 0.3;
        const z = radius * Math.cos(phi);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Colores cian/azul
        color.setHSL(0.5 + Math.random() * 0.1, 0.8, 0.5 + Math.random() * 0.3);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        // Tamaños aleatorios
        sizes[i] = Math.random() * 0.1 + 0.02;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
}

// Crear elementos flotantes decorativos
function createFloatingElements() {
    const geometry = new THREE.IcosahedronGeometry(0.5, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x004444,
        roughness: 0.1,
        metalness: 0.8
    });
    
    for (let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(geometry, material);
        
        // Posición aleatoria en un volumen
        mesh.position.set(
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 25 - 10
        );
        
        mesh.scale.setScalar(Math.random() * 0.5 + 0.3);
        mesh.userData = {
            speed: Math.random() * 0.5 + 0.2,
            rotationSpeed: Math.random() * 0.02 + 0.01,
            amplitude: Math.random() * 0.5 + 0.3
        };
        
        scene.add(mesh);
    }
}

// Animación
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;
    
    // Rotar partículas
    if (particles) {
        particles.rotation.y = time * 0.05;
        particles.rotation.x = time * 0.02;
        
        // Animación de posiciones
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += Math.sin(time + i * 0.01) * 0.001;
        }
        particles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Animar elementos flotantes
    scene.children.forEach(child => {
        if (child.userData.speed) {
            child.rotation.x += child.userData.rotationSpeed;
            child.rotation.y += child.userData.rotationSpeed * 0.7;
            child.position.y += Math.sin(time * child.userData.speed) * 0.003;
        }
    });
    
    // Suave movimiento de cámara
    camera.position.x = Math.sin(time * 0.1) * 0.5;
    camera.position.y = Math.sin(time * 0.05) * 0.3 + 2;
    
    // LookAt movimiento suave
    const lookAtX = Math.sin(time * 0.08) * 0.3;
    camera.lookAt(lookAtX, 1, 0);
    
    composer.render();
}

// Event Handlers
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Mostrar proyectos en la página
function displayProjects() {
    // Mostrar juegos
    const gamesGrid = document.getElementById('games-grid');
    gamesGrid.innerHTML = projectsData.games.map(project => createProjectCard(project)).join('');
    
    // Mostrar escenas
    const scenesGrid = document.getElementById('scenes-grid');
    scenesGrid.innerHTML = projectsData.scenes.map(project => createProjectCard(project)).join('');
    
    // Mostrar experimentos
    const experimentsGrid = document.getElementById('experiments-grid');
    experimentsGrid.innerHTML = projectsData.experiments.map(project => createProjectCard(project)).join('');
    
    // Añadir event listeners a las tarjetas
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', function() {
            const projectId = this.dataset.id;
            const allProjects = [...projectsData.games, ...projectsData.scenes, ...projectsData.experiments];
            const project = allProjects.find(p => p.id == projectId);
            
            if (project) {
                loadProject(project);
            }
        });
    });
}

// Crear tarjeta de proyecto
function createProjectCard(project) {
    return `
        <div class="project-card" data-id="${project.id}">
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <div class="project-tags">
                ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <button class="project-button" data-id="${project.id}">
                <i class="fas fa-external-link-alt"></i> Abrir Proyecto
            </button>
        </div>
    `;
}

// Cargar un proyecto específico
function loadProject(project) {
    console.log(`🚀 Cargando proyecto: ${project.title}`);
    console.log(`📁 Ruta: ${project.folder}/index.html`);
    
    // Redirigir al proyecto
    window.location.href = `${project.folder}/index.html`;
    
    // Opcional: mostrar mensaje de carga
    // const gamesGrid = document.getElementById('games-grid');
    // gamesGrid.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i><p>Cargando ${project.title}...</p></div>`;

}

// Smooth scroll para navegación
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Three.js cuando el DOM esté listo
    init();
    
    // Navegación suave
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Actualizar navegación activa
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
                
                // Scroll suave
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Event listeners para botones de proyectos
    document.addEventListener('click', function(e) {
        if (e.target.closest('.project-button')) {
            e.preventDefault();
            const button = e.target.closest('.project-button');
            const projectId = button.dataset.id;
            const allProjects = [...projectsData.games, ...projectsData.scenes, ...projectsData.experiments];
            const project = allProjects.find(p => p.id == parseInt(projectId));
            
            if (project) {
                loadProject(project);
            }
        }
    });
    
    // Navegación activa basada en scroll
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 150;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
});