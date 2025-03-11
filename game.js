// Import Three.js and required loaders
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Game state management
const gameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    TUTORIAL: 'tutorial',
    WIN_SCREEN: 'win_screen'
};

let currentGameState = gameState.MENU;

// Add ammo overlay early
const ammoOverlay = document.createElement('div');
ammoOverlay.style.position = 'fixed';
ammoOverlay.style.top = '20px';
ammoOverlay.style.right = '20px';
ammoOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
ammoOverlay.style.color = 'white';
ammoOverlay.style.padding = '20px';
ammoOverlay.style.fontFamily = 'monospace';
ammoOverlay.style.fontSize = '36px';
ammoOverlay.style.borderRadius = '10px';
ammoOverlay.style.zIndex = '1000';
ammoOverlay.style.minWidth = '200px';
ammoOverlay.style.display = 'none'; // Initially hidden

// Create the ammo display structure
const ammoContent = document.createElement('div');
ammoContent.style.display = 'flex';
ammoContent.style.alignItems = 'center';
ammoContent.style.justifyContent = 'center';
ammoContent.style.flexDirection = 'column';

// Ammo count display
const ammoCount = document.createElement('div');
ammoCount.style.fontSize = '48px';
ammoCount.style.fontWeight = 'bold';
ammoCount.style.marginBottom = '10px';

// Reload status display
const reloadStatus = document.createElement('div');
reloadStatus.style.fontSize = '24px';
reloadStatus.style.color = '#4CAF50';

// Reload progress bar container
const progressBarContainer = document.createElement('div');
progressBarContainer.style.width = '100%';
progressBarContainer.style.height = '10px';
progressBarContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
progressBarContainer.style.borderRadius = '5px';
progressBarContainer.style.overflow = 'hidden';
progressBarContainer.style.display = 'none';

// Reload progress bar
const progressBar = document.createElement('div');
progressBar.style.width = '0%';
progressBar.style.height = '100%';
progressBar.style.backgroundColor = '#4CAF50';
progressBar.style.transition = 'width 0.1s linear';

// Assemble the overlay
progressBarContainer.appendChild(progressBar);
ammoContent.appendChild(ammoCount);
ammoContent.appendChild(reloadStatus);
ammoContent.appendChild(progressBarContainer);
ammoOverlay.appendChild(ammoContent);
document.body.appendChild(ammoOverlay);

// Function to update ammo overlay
function updateAmmoOverlay() {
    if (!ammoCount || !reloadStatus || !progressBar || !progressBarContainer) return;
    
    ammoCount.textContent = `${rifleState.ammoInMag}/${rifleState.maxAmmo}`;
    
    if (rifleState.isReloading) {
        reloadStatus.textContent = 'RELOADING';
        progressBarContainer.style.display = 'block';
        // Calculate reload progress
        const elapsedTime = performance.now() - rifleState.reloadStartTime;
        const progress = (elapsedTime / rifleState.reloadTime) * 100;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
    } else if (rifleState.isBoltAction) {
        reloadStatus.textContent = 'BOLT ACTION';
        progressBarContainer.style.display = 'block';
        // Calculate bolt action progress
        const elapsedTime = performance.now() - rifleState.lastShotTime;
        const progress = (elapsedTime / rifleState.boltActionTime) * 100;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
    } else {
        reloadStatus.textContent = 'READY';
        progressBarContainer.style.display = 'none';
        progressBar.style.width = '0%';
    }
}

// Mouse control variables
let mouseX = 0;
let mouseY = 0;
const sensitivity = 0.002; // Adjust this value to change mouse sensitivity

// Add required loaders
const loadingManager = new THREE.LoadingManager();
const objLoader = new OBJLoader(loadingManager);
const mtlLoader = new MTLLoader(loadingManager);

// Loading state
let rifle = null;
let isModelLoading = false;

// Configure loading manager
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        const progress = (itemsLoaded / itemsTotal) * 100;
        progressBar.style.width = `${progress}%`;
        console.log(`Loading progress: ${progress.toFixed(1)}%`);
    }
};

loadingManager.onLoad = function() {
    console.log('All assets loaded successfully');
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
};

loadingManager.onError = function(url) {
    console.error('Error loading:', url);
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <h2 style="color: red;">Error loading game assets</h2>
            <p>Failed to load: ${url}</p>
            <button onclick="location.reload()" style="
                padding: 15px 32px;
                font-size: 24px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 20px;
            ">Retry</button>
        `;
    }
};

// Add at the top with other state variables
let audioInitialized = false;

// Add to the audio variables at the top with other sound buffers
let victoryFanfareBuffer = null;

// Function to load the new rifle model
function loadRifleModel() {
    isModelLoading = true;
    
    // Load the MTL (material) file first
    mtlLoader.load(
        'Assets/a_natural_clean_3d_mo_0311085224_texture_obj/a_natural_clean_3d_mo_0311085224_texture.mtl',
        (materials) => {
            materials.preload();
            
            // Then load the OBJ file with the materials
            objLoader.setMaterials(materials);
            objLoader.load(
                'Assets/a_natural_clean_3d_mo_0311085224_texture_obj/a_natural_clean_3d_mo_0311085224_texture.obj',
                (object) => {
                    // Remove old rifle if it exists
                    if (rifle) {
                        camera.remove(rifle);
                    }
                    
                    rifle = object;
                    
                    // Adjust model position, rotation, and scale
                    rifle.position.set(0.2, -0.3, -0.5);
                    rifle.rotation.set(0, Math.PI / 2, 0);
                    rifle.scale.set(0.5, 0.5, 0.5);
                    
                    // Add to camera for first-person view
                    camera.add(rifle);
                    
                    isModelLoading = false;
                    debug.log('Rifle model loaded successfully');
                },
                (xhr) => {
                    // Loading progress
                    const progress = (xhr.loaded / xhr.total * 100);
                    debug.log(`Loading rifle model: ${progress.toFixed(2)}%`);
                },
                (error) => {
                    console.error('Error loading rifle model:', error);
                    debug.log('Error loading rifle model');
                    isModelLoading = false;
                }
            );
        },
        undefined,
        (error) => {
            console.error('Error loading rifle materials:', error);
            debug.log('Error loading rifle materials');
            isModelLoading = false;
        }
    );
}

// Add camera to scene first
scene.add(camera);

// Optimize renderer settings
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance",
    precision: "mediump", // Use medium precision for better performance
    depth: true,
    stencil: false // Disable stencil buffer if not needed
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // Only update shadows when necessary
renderer.physicallyCorrectLights = false;
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';  // Set to 0 to ensure it's behind all UI
document.body.appendChild(renderer.domElement);

// Add window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// Set a simple background color instead of skybox
scene.background = new THREE.Color(0x87CEEB); // Sky blue

// Add fog for atmospheric depth
scene.fog = new THREE.Fog(0x87CEEB, 50, 700); // Update fog distance to match 700m visibility

// Enhanced lighting for better outdoor feel
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffeb, 1.2);
sunLight.position.set(-50, 100, -50);
sunLight.castShadow = true;

// Optimize shadow map settings for performance
sunLight.shadow.mapSize.width = 1024; // Reduced from 2048
sunLight.shadow.mapSize.height = 1024; // Reduced from 2048
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 400; // Reduced from 500
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
sunLight.shadow.bias = -0.001;

// Optimize shadow camera frustum
const shadowHelper = new THREE.CameraHelper(sunLight.shadow.camera);
shadowHelper.visible = false; // Set to true for debugging shadow camera
scene.add(shadowHelper);

scene.add(sunLight);

// Enable shadow rendering with optimized settings
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // Only update shadows when necessary
renderer.shadowMap.needsUpdate = true;

// Optimize renderer settings
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
renderer.physicallyCorrectLights = false; // Disable for better performance
renderer.powerPreference = "high-performance";

// Add a secondary fill light
// Enable shadow rendering
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add debug overlay early
const debugOverlay = document.createElement('div');
debugOverlay.style.position = 'fixed';
debugOverlay.style.top = '10px';
debugOverlay.style.left = '10px';
debugOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
debugOverlay.style.color = 'white';
debugOverlay.style.padding = '30px';
debugOverlay.style.fontFamily = 'monospace';
debugOverlay.style.fontSize = '36px';
debugOverlay.style.zIndex = '1000';
document.body.appendChild(debugOverlay);

// Debug state (moved to top)
const debug = {
    enabled: true,
    log: function(msg) {
        if (this.enabled) {
            console.log(`[DEBUG] ${msg}`);
        }
    },
    updateOverlay: function() {
        if (!this.enabled) {
            debugOverlay.style.display = 'none';
            return;
        }
        debugOverlay.style.display = 'block';
        debugOverlay.innerHTML = `
            FPS: ${performanceStats.fps} ${performanceStats.memoryUsage ? `(Memory: ${performanceStats.memoryUsage}MB)` : ''}<br>
            Zoom: ${isZoomedIn ? 'ON' : 'OFF'}<br>
            FOV: ${camera.fov.toFixed(1)}°<br>
            Position: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}<br>
            Rotation: ${(camera.rotation.x * 180/Math.PI).toFixed(1)}°, ${(camera.rotation.y * 180/Math.PI).toFixed(1)}°<br>
            Pointer Lock: ${document.pointerLockElement === renderer.domElement ? 'ON' : 'OFF'}<br>
            Movement: ${Object.entries(keys).filter(([,v]) => v).map(([k]) => k).join(' ') || 'none'}<br>
            Rifle Visible: ${rifle?.visible ? 'YES' : 'NO'}<br>
            Ammo: ${rifleState.ammoInMag}/${rifleState.maxAmmo}<br>
            Status: ${rifleState.isReloading ? 'RELOADING' : rifleState.isBoltAction ? 'BOLT CYCLING' : 'READY'}<br>
            Controls: WASD=Move, E/RightClick=Scope, Click=Shoot, R=Reload<br>
        `;
    }
};

// Track frame timing (moved up with debug)
let lastTime = performance.now();
let deltaTime = 0;

// Simple shooting sound function
function playShootSound() {
    if (!audioInitialized || !audioContext || audioContext.state !== 'running') {
        debug.log('Audio not ready');
        return;
    }

    if (!rifleShootBuffer) {
        debug.log('Rifle shot sound not loaded');
        return;
    }

    try {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = rifleShootBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        source.start(0);
        debug.log('Playing rifle shot sound');
    } catch (error) {
        console.error('Error playing rifle shot:', error);
    }
}

// Walking sound system
let lastStepTime = 0;
const stepInterval = 500; // Time between steps in milliseconds
let audioContext = null;
let walkingBuffer = null;
let rifleShootBuffer = null;
let boltActionBuffer = null;
let reloadBuffer = null;
let ambienceBuffer = null;
let mooseCallBuffer = null; // Add buffer for moose call sound
let ambienceSource = null;
let isWalking = false;
let currentWalkingSound = null;
let lastShotTime = 0; // Track when the last shot was fired

function initAudio() {
    if (audioInitialized) return;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.resume();
        audioInitialized = true;
        debug.log('Audio context created and resumed');
        
        // Create a mapping of sound files to their buffer variables
        const soundMapping = [
            { path: 'Assets/walking.wav', setBuffer: buffer => walkingBuffer = buffer },
            { path: 'Assets/ambience.wav', setBuffer: buffer => ambienceBuffer = buffer },
            { path: 'Assets/rifle-gun-shot.wav', setBuffer: buffer => rifleShootBuffer = buffer },
            { path: 'Assets/bolt-reload.wav', setBuffer: buffer => boltActionBuffer = buffer },
            { path: 'Assets/firearm-reloading.wav', setBuffer: buffer => reloadBuffer = buffer },
            { path: 'Assets/moose-call.mp3', setBuffer: buffer => mooseCallBuffer = buffer },
            { path: 'Assets/victory-fanfare.wav', setBuffer: buffer => victoryFanfareBuffer = buffer }
        ];

        // Load each sound file
        soundMapping.forEach(sound => {
            fetch(sound.path)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    sound.setBuffer(audioBuffer);
                    debug.log(`Successfully loaded and assigned sound: ${sound.path}`);
                })
                .catch(error => {
                    console.error('Error loading sound:', sound.path, error);
                    debug.log(`Error loading sound ${sound.path}: ${error.message}`);
                });
        });
    } catch (error) {
        console.error('Error initializing audio:', error);
        debug.log('Error initializing audio: ' + error.message);
        audioInitialized = false;
    }
}

function playWalkingSound() {
    if (!audioInitialized || !audioContext || audioContext.state !== 'running') {
        debug.log('Audio not ready');
        return;
    }

    const now = performance.now();
    if (now - lastStepTime < stepInterval) return;

    if (!walkingBuffer) {
        debug.log('Walking sound not loaded');
        return;
    }

    try {
        if (currentWalkingSound) {
            currentWalkingSound.stop();
            currentWalkingSound = null;
        }

        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = walkingBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        source.start(0);
        currentWalkingSound = source;
        lastStepTime = now;
        isWalking = true;
        debug.log('Playing walking sound');
    } catch (error) {
        console.error('Error playing walking:', error);
    }
}

function stopWalkingSound() {
    if (!isWalking) return;
    
    try {
        if (currentWalkingSound) {
            currentWalkingSound.stop();
            currentWalkingSound = null;
        }
        isWalking = false;
        debug.log('Stopped walking sound');
        
        // Play stop sound
        playStopSound();
    } catch (error) {
        console.error('Error stopping walking sound:', error);
        debug.log('Error stopping walking sound: ' + error.message);
    }
}

function playStopSound() {
    if (!isWalking) return; // Only play stop sound if we were walking
    
    try {
        if (!audioContext || audioContext.state !== 'running') return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a soft "step stop" sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        debug.log('Playing stop sound');
    } catch (error) {
        console.error('Error playing stop sound:', error);
        debug.log('Error playing stop sound: ' + error.message);
    }
}

// Add click handler to initialize audio
document.addEventListener('click', () => {
    if (!audioInitialized) {
        debug.log('Initializing audio system...');
        initAudio();
        // Check sound system status after a short delay
        setTimeout(checkSoundSystem, 1000);
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            debug.log('Audio context resumed');
            checkSoundSystem();
        });
    }
}, { once: false });

// Add key handler to resume audio
document.addEventListener('keydown', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

// Replace the simple bolt action sound function with one that uses the loaded sound file
function playBoltSound() {
    if (!audioInitialized || !audioContext || audioContext.state !== 'running') {
        debug.log('Audio not ready');
        return;
    }

    if (!boltActionBuffer) {
        debug.log('Bolt action sound not loaded');
        return;
    }

    try {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = boltActionBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        source.start(0);
        debug.log('Playing bolt action sound');
    } catch (error) {
        console.error('Error playing bolt action:', error);
    }
}

// Replace the simple reload sound function with one that uses the loaded sound file
function playReloadSound() {
    if (!audioInitialized || !audioContext || audioContext.state !== 'running') {
        debug.log('Audio not ready');
        return;
    }

    if (!reloadBuffer) {
        debug.log('Reload sound not loaded');
        return;
    }

    try {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = reloadBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        source.start(0);
        debug.log('Playing reload sound');
    } catch (error) {
        console.error('Error playing reload:', error);
    }
}

// Rifle state
const rifleState = {
    ammoInMag: 3,
    maxAmmo: 3,
    isReloading: false,
    isBoltAction: false,
    lastShotTime: 0,
    boltActionTime: 2000, // 2 seconds
    reloadTime: 5000, // 5 seconds
};

// Add scope overlay
const scopeOverlay = document.createElement('div');
scopeOverlay.style.position = 'absolute';
scopeOverlay.style.top = '0';
scopeOverlay.style.left = '0';
scopeOverlay.style.width = '100%';
scopeOverlay.style.height = '100%';
scopeOverlay.style.backgroundColor = 'transparent';
scopeOverlay.style.display = 'none';
scopeOverlay.style.pointerEvents = 'none';
scopeOverlay.innerHTML = `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 50%; height: 50%; border: 8px solid black; border-radius: 50%; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);">
        <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: black;"></div>
        <div style="position: absolute; top: 0; left: 50%; width: 1px; height: 100%; background: black;"></div>
        <div style="position: absolute; top: 45%; left: 45%; width: 10%; height: 10%; border: 1px solid black; border-radius: 50%;"></div>
    </div>
`;
document.body.appendChild(scopeOverlay);

// Add crosshair (only visible when not scoped)
const crosshairContainer = document.createElement('div');
crosshairContainer.style.position = 'absolute';
crosshairContainer.style.top = '50%';
crosshairContainer.style.left = '50%';
crosshairContainer.style.transform = 'translate(-50%, -50%)';
crosshairContainer.style.color = 'white';
crosshairContainer.style.fontSize = '24px';
crosshairContainer.style.fontFamily = 'monospace';
crosshairContainer.innerHTML = '+';
document.body.appendChild(crosshairContainer);

// Game state
let isZoomedIn = false;
const normalFOV = 75;
const zoomedFOV = 18.75; // Changed from 20 to 18.75 for exact 4x zoom

// Moose management
const mooseManager = {
    mooseList: [],
    bloodTrails: [],
    colors: {
        body: 0x4A3728,
        antlers: 0x8B4513,
        hitZone: 0xff0000,
        blood: 0x8B0000,
        freshBlood: 0xff0000
    },

    // Add detection properties
    detectionRange: {
        min: 150,
        max: 250
    },
    fleeTime: {
        min: 10000,  // 10 seconds
        max: 30000   // 30 seconds
    },

    states: {
        IDLE: 'idle',
        WALKING: 'walking',
        RUNNING: 'running',
        DYING: 'dying',
        DEAD: 'dead',
        EATING_GRASS: 'eating_grass',
        EATING_LEAVES: 'eating_leaves',
        LOOKING_AROUND: 'looking_around'
    },

    // Add map boundary constants at the top of mooseManager
    mapBoundaries: {
        minX: -400,
        maxX: 400,
        minZ: -400,
        maxZ: 400
    },

    // Helper function to keep position within boundaries
    clampToBoundaries(position) {
        position.x = Math.max(this.mapBoundaries.minX, Math.min(this.mapBoundaries.maxX, position.x));
        position.z = Math.max(this.mapBoundaries.minZ, Math.min(this.mapBoundaries.maxZ, position.z));
        return position;
    },

    createMooseModel(isAdult) {
        const mooseGroup = new THREE.Group();
        const bodyScale = isAdult ? 1 : 0.6;

        // Body
        const bodyGeometry = new THREE.BoxGeometry(2 * bodyScale, 2.5 * bodyScale, 4 * bodyScale);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.colors.body,
            roughness: 0.8,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2.5 * bodyScale;
        mooseGroup.add(body);

        // Head
        const headGeometry = new THREE.BoxGeometry(1 * bodyScale, 1.2 * bodyScale, 1.8 * bodyScale);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 3.5 * bodyScale, -2 * bodyScale);
        head.name = 'head';
        mooseGroup.add(head);

        // Neck (to connect head and body)
        const neckGeometry = new THREE.BoxGeometry(0.8 * bodyScale, 1.2 * bodyScale, 1 * bodyScale);
        const neck = new THREE.Mesh(neckGeometry, bodyMaterial);
        neck.position.set(0, 3 * bodyScale, -1.2 * bodyScale);
        neck.rotation.x = -Math.PI / 6;
        mooseGroup.add(neck);

        // Create legs with joints
        const legs = [];
        const legPositions = [
            [-0.7, 0, -1.4], // Front Left
            [0.7, 0, -1.4],  // Front Right
            [-0.7, 0, 1.4],  // Back Left
            [0.7, 0, 1.4]    // Back Right
        ];

        legPositions.forEach((pos, index) => {
            const legGroup = new THREE.Group();
            legGroup.position.set(pos[0] * bodyScale, 2.5 * bodyScale, pos[2] * bodyScale);

            // Upper leg
            const upperLegGeometry = new THREE.BoxGeometry(0.4 * bodyScale, 1.2 * bodyScale, 0.4 * bodyScale);
            const upperLeg = new THREE.Mesh(upperLegGeometry, bodyMaterial);
            upperLeg.position.y = -0.6 * bodyScale;
            legGroup.add(upperLeg);

            // Knee joint
            const kneeJoint = new THREE.Group();
            kneeJoint.position.y = -1.2 * bodyScale;
            legGroup.add(kneeJoint);

            // Lower leg
            const lowerLegGeometry = new THREE.BoxGeometry(0.3 * bodyScale, 1.2 * bodyScale, 0.3 * bodyScale);
            const lowerLeg = new THREE.Mesh(lowerLegGeometry, bodyMaterial);
            lowerLeg.position.y = -0.6 * bodyScale;
            kneeJoint.add(lowerLeg);

            // Hoof
            const hoofGeometry = new THREE.BoxGeometry(0.4 * bodyScale, 0.2 * bodyScale, 0.5 * bodyScale);
            const hoofMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
            const hoof = new THREE.Mesh(hoofGeometry, hoofMaterial);
            hoof.position.y = -1.2 * bodyScale;
            kneeJoint.add(hoof);

            legs.push({
                group: legGroup,
                upper: upperLeg,
                knee: kneeJoint,
                lower: lowerLeg,
                hoof: hoof,
                phase: index * Math.PI / 2, // Offset for walking animation
                lastGroundY: 0,
                strideLength: 1.2 * bodyScale,
                stepHeight: 0.4 * bodyScale
            });

            mooseGroup.add(legGroup);
        });

        // Add antlers for adult moose
        if (isAdult) {
            const antlerMaterial = new THREE.MeshStandardMaterial({
                color: this.colors.antlers,
                roughness: 0.7,
                metalness: 0.3
            });

            [-0.5, 0.5].forEach(xPos => {
                const antlerGroup = new THREE.Group();
                antlerGroup.position.set(xPos * bodyScale, 3.8 * bodyScale, -1.8 * bodyScale);
                
                // Main antler stem
                const stemGeometry = new THREE.CylinderGeometry(0.1 * bodyScale, 0.15 * bodyScale, 1.2 * bodyScale, 8);
                const stem = new THREE.Mesh(stemGeometry, antlerMaterial);
                stem.rotation.x = -Math.PI / 6;
                antlerGroup.add(stem);

                // Add antler points
                for (let i = 0; i < 3; i++) {
                    const pointGeometry = new THREE.CylinderGeometry(0.05 * bodyScale, 0.08 * bodyScale, 0.6 * bodyScale, 8);
                    const point = new THREE.Mesh(pointGeometry, antlerMaterial);
                    point.position.y = 0.3 + i * 0.3;
                    point.position.x = (i + 1) * 0.2 * (xPos > 0 ? 1 : -1);
                    point.rotation.z = xPos > 0 ? Math.PI / 4 : -Math.PI / 4;
                    antlerGroup.add(point);
                }

                mooseGroup.add(antlerGroup);
            });
        }

        // Add moose properties with new behavior variables
        mooseGroup.userData = {
            isAdult: isAdult,
            health: 100,
            state: this.states.IDLE,
            moveSpeed: isAdult ? 0.015 : 0.02, // Reduced from 0.05/0.07
            runSpeed: isAdult ? 0.01875 : 0.0225,
            legs: legs,
            wasShot: false,
            shotFrom: null,
            lastHitLocation: null,
            deathTime: 0,
            velocity: new THREE.Vector3(),
            targetPosition: null,
            groundHeight: 0,
            timeOffset: Math.random() * Math.PI * 2,
            headBobAmount: 0.1 * bodyScale,
            runStartTime: 0,
            maxRunTime: 10000 + Math.random() * 40000,
            // New behavior properties
            timeInCurrentState: 0,
            nextStateChange: Math.random() * 5000 + 5000,
            headOriginalPosition: new THREE.Vector3(0, 3.5 * bodyScale, -2 * bodyScale),
            neckOriginalRotation: -Math.PI / 6,
            eatingProgress: 0,
            lookingDirection: new THREE.Vector3(),
            nearestTree: null,
            behaviorTimeoutId: null,
            isAwareOfPlayer: false,
            fleeStartTime: 0,
            fleeTime: 0,
        };

        return mooseGroup;
    },

    updateMoose(moose, deltaTime) {
        const userData = moose.userData;
        
        if (userData.state === this.states.DEAD) {
            return;
        }

        // Add player detection check
        if (!userData.wasShot && !userData.isAwareOfPlayer) {
            const distanceToPlayer = moose.position.distanceTo(camera.position);
            if (distanceToPlayer >= this.detectionRange.min && 
                distanceToPlayer <= this.detectionRange.max && 
                Math.random() < 0.005) { // 0.5% chance per frame when in range
                
                this.startFleeingFromPlayer(moose);
                debug.log(`Moose detected player at ${distanceToPlayer.toFixed(1)}m`);
            }
        }

        // Check if fleeing time is over
        if (userData.isAwareOfPlayer && performance.now() - userData.fleeStartTime > userData.fleeTime) {
            userData.isAwareOfPlayer = false;
            this.decideNextState(moose);
            debug.log('Moose stopped fleeing from player');
        }

        if (userData.state === this.states.DYING) {
            const timeSinceDeath = (performance.now() - userData.deathTime) / 1000;
            if (timeSinceDeath < 1) {
                moose.rotation.z = Math.min(Math.PI / 2, timeSinceDeath * Math.PI / 2);
                moose.position.y = Math.max(0, userData.groundHeight * (1 - timeSinceDeath));
            } else {
                userData.state = this.states.DEAD;
                moose.position.y = 0;
            }
            return;
        }

        // Update time in current state and check for state change
        userData.timeInCurrentState += deltaTime;
        if (!userData.wasShot && userData.timeInCurrentState > userData.nextStateChange) {
            this.decideNextState(moose);
        }

        // Handle different states
        switch (userData.state) {
            case this.states.IDLE:
                // Subtle idle animation
                const head = moose.children.find(child => child.name === 'head');
                if (head) {
                    const idleMovement = Math.sin(userData.timeInCurrentState * 0.001) * 0.05;
                    head.position.y = userData.headOriginalPosition.y + idleMovement;
                }
                break;

            case this.states.WALKING:
            case this.states.RUNNING:
                // Update movement and physics
                if (userData.targetPosition) {
                    const direction = new THREE.Vector3()
                        .subVectors(userData.targetPosition, moose.position)
                        .normalize();
                    
                    const speed = userData.state === this.states.RUNNING ? userData.runSpeed : userData.moveSpeed;
                    const movement = direction.multiplyScalar(speed * deltaTime);
                    
                    // Smooth out the movement
                    if (!userData.velocity) userData.velocity = new THREE.Vector3();
                    const smoothness = userData.state === this.states.RUNNING ? 0.05 : 0.1;
                    userData.velocity.lerp(movement, smoothness);
                    
                    // Apply smoothed movement and clamp to boundaries
                    const newPosition = moose.position.clone().add(userData.velocity);
                    const clampedPosition = this.clampToBoundaries(newPosition);
                    moose.position.copy(clampedPosition);
                    
                    // Smooth rotation - only rotate towards movement direction
                    const targetAngle = Math.atan2(direction.x, direction.z);
                    const currentAngle = moose.rotation.y;
                    const angleDiff = ((targetAngle - currentAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
                    
                    // Only allow rotation within ±45 degrees of current facing
                    const maxRotation = Math.PI / 4;
                    const clampedAngleDiff = Math.max(-maxRotation, Math.min(maxRotation, angleDiff));
                    moose.rotation.y += clampedAngleDiff * 0.1;

                    // Check if reached target or at boundary
                    if (moose.position.distanceTo(userData.targetPosition) < (userData.state === this.states.RUNNING ? 2 : 1)) {
                        if (userData.state === this.states.RUNNING && userData.wasShot) {
                            this.startRunning(moose);
                        } else {
                            this.decideNextState(moose);
                        }
                    }
                }
                break;

            case this.states.EATING_GRASS:
                // Add eating grass animation
                const eatingHead = moose.children.find(child => child.name === 'head');
                if (eatingHead) {
                    const wobble = Math.sin(userData.timeInCurrentState * 0.005) * 0.1;
                    eatingHead.position.x = wobble;
                    eatingHead.position.y = userData.headOriginalPosition.y - 1.5;
                    eatingHead.position.z = userData.headOriginalPosition.z + 0.5;
                }
                break;

            case this.states.EATING_LEAVES:
                // Add eating leaves animation
                const leavesHead = moose.children.find(child => child.name === 'head');
                if (leavesHead) {
                    const wobble = Math.sin(userData.timeInCurrentState * 0.005) * 0.1;
                    leavesHead.position.x = wobble;
                    leavesHead.position.y = userData.headOriginalPosition.y + 1;
                }
                break;

            case this.states.LOOKING_AROUND:
                // Add looking around animation
                const lookingHead = moose.children.find(child => child.name === 'head');
                if (lookingHead) {
                    const lookAngle = Math.sin(userData.timeInCurrentState * 0.001) * Math.PI / 4;
                    lookingHead.rotation.y = lookAngle;
                }
                break;
        }

        // Update leg animations for walking/running states
        if (userData.state === this.states.WALKING || userData.state === this.states.RUNNING) {
            this.updateLegAnimations(moose, deltaTime);
        }

        // Create blood trail if wounded
        if (userData.wasShot && Math.random() < 0.05) {
            this.createBloodTrail(moose.position.clone());
        }
    },

    decideNextState(moose) {
        const userData = moose.userData;
        
        // Clear any existing behavior timeout
        if (userData.behaviorTimeoutId) {
            clearTimeout(userData.behaviorTimeoutId);
        }

        // Reset state timing
        userData.timeInCurrentState = 0;
        userData.nextStateChange = Math.random() * 5000 + 5000; // 5-10 seconds

        // Reset head position and rotation
        const head = moose.children.find(child => child.name === 'head');
        if (head) {
            head.position.copy(userData.headOriginalPosition);
            head.rotation.set(0, 0, 0);
        }

        // Random state selection with weighted probabilities
        const rand = Math.random();
        if (rand < 0.7) { // 70% chance to walk (increased from 30%)
            this.startWalking(moose);
        } else if (rand < 0.8) { // 10% chance to eat grass
            userData.state = this.states.EATING_GRASS;
        } else if (rand < 0.9) { // 10% chance to eat leaves
            // Find nearest tree
            let nearestDist = Infinity;
            scene.traverse((object) => {
                if (object.type === 'LOD' && object.position.y === 0) {
                    const dist = moose.position.distanceTo(object.position);
                    if (dist < nearestDist && dist < 20) {
                        nearestDist = dist;
                        userData.targetPosition = object.position.clone();
                    }
                }
            });
            
            if (userData.targetPosition) {
                userData.state = this.states.EATING_LEAVES;
            } else {
                this.startWalking(moose); // If no trees nearby, walk instead
            }
        } else if (rand < 0.95) { // 5% chance to look around
            userData.state = this.states.LOOKING_AROUND;
        } else { // 5% chance to stand idle
            userData.state = this.states.IDLE;
        }
    },

    startRunning(moose, fromPosition) {
        const userData = moose.userData;
        userData.state = this.states.RUNNING;
        userData.runStartTime = performance.now();
        
        // Get direction based on whether fleeing from player or shot
        let forwardDirection;
        if (fromPosition) {
            // Run away from the threat (player or shooter)
            forwardDirection = new THREE.Vector3()
                .subVectors(moose.position, fromPosition)
                .normalize();
        } else {
            // Use current facing direction if no threat
            forwardDirection = new THREE.Vector3(0, 0, -1)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), moose.rotation.y);
        }
        
        // Add some randomness to the direction (within ±15 degrees)
        const randomAngle = (Math.random() - 0.5) * Math.PI / 6;
        forwardDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
        
        // Calculate target position
        const distance = 100 + Math.random() * 50;
        let targetPosition = moose.position.clone().add(
            forwardDirection.multiplyScalar(distance)
        );

        // Check and adjust for boundaries
        if (targetPosition.x < this.mapBoundaries.minX || targetPosition.x > this.mapBoundaries.maxX ||
            targetPosition.z < this.mapBoundaries.minZ || targetPosition.z > this.mapBoundaries.maxZ) {
            
            const centerDirection = new THREE.Vector3(0, 0, 0)
                .sub(moose.position)
                .normalize();
            
            const centerRandomAngle = (Math.random() - 0.5) * Math.PI / 3;
            centerDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), centerRandomAngle);
            
            targetPosition = moose.position.clone().add(
                centerDirection.multiplyScalar(distance)
            );
        }
        
        userData.targetPosition = this.clampToBoundaries(targetPosition);
    },

    startWalking(moose) {
        const userData = moose.userData;
        userData.state = this.states.WALKING;
        
        // Calculate forward direction based on current rotation
        const forwardAngle = moose.rotation.y;
        // Add some randomness to the angle (within ±30 degrees)
        const randomAngle = forwardAngle + (Math.random() - 0.5) * Math.PI / 3;
        
        const distance = 10 + Math.random() * 20;
        let targetPosition = new THREE.Vector3(
            moose.position.x + Math.cos(randomAngle) * distance,
            0,
            moose.position.z + Math.sin(randomAngle) * distance
        );

        // Check if target position is outside boundaries
        if (targetPosition.x < this.mapBoundaries.minX || targetPosition.x > this.mapBoundaries.maxX ||
            targetPosition.z < this.mapBoundaries.minZ || targetPosition.z > this.mapBoundaries.maxZ) {
            
            // If outside, redirect towards center of map
            const centerAngle = Math.atan2(-moose.position.z, -moose.position.x);
            const adjustedAngle = centerAngle + (Math.random() - 0.5) * Math.PI / 3;
            
            targetPosition = new THREE.Vector3(
                moose.position.x + Math.cos(adjustedAngle) * distance,
                0,
                moose.position.z + Math.sin(adjustedAngle) * distance
            );
        }
        
        // Final safety clamp to boundaries
        userData.targetPosition = this.clampToBoundaries(targetPosition);
    },

    handleShot(moose, intersection, shooterPosition) {
        const userData = moose.userData;
        userData.wasShot = true;
        userData.shotFrom = shooterPosition.clone();
        userData.shotsReceived = (userData.shotsReceived || 0) + 1;
        
        // Record first shot time if this is the first hit
        if (!userData.firstShotTime) {
            userData.firstShotTime = performance.now();
            scoreSystem.hasWoundedMoose = true;
        }

        // Determine hit location
        const hitMesh = intersection.object;
        userData.lastHitLocation = hitMesh.name || 'body';

        // Create blood effect at hit location
        this.createBloodTrail(intersection.point, true);

        // Handle fatal shots
        if (userData.lastHitLocation === 'head' || userData.lastHitLocation === 'vitalZone' || userData.shotsReceived >= 3) {
            userData.state = this.states.DYING;
            userData.deathTime = performance.now();
            const distance = moose.position.distanceTo(shooterPosition);
            userData.killDistance = distance;
            scoreSystem.killDistance = distance;
            scoreSystem.timeElapsed = (performance.now() - scoreSystem.startTime) / 1000;
            scoreSystem.hasWoundedMoose = false; // Reset wounded state on kill
            return true;
        } else {
            this.startRunning(moose, shooterPosition);
            return false;
        }
    },

    createBloodTrail(position, isImpact = false) {
        const bloodGeometry = new THREE.CircleGeometry(isImpact ? 0.5 : 0.3, 12);
        bloodGeometry.rotateX(-Math.PI / 2);
        
        const bloodMaterial = new THREE.MeshStandardMaterial({
            color: isImpact ? this.colors.freshBlood : this.colors.blood,
            transparent: true,
            opacity: isImpact ? 1.0 : 0.8,
            roughness: 0.5,
            metalness: 0.2
        });
        
        const bloodSpot = new THREE.Mesh(bloodGeometry, bloodMaterial);
        bloodSpot.position.copy(position);
        bloodSpot.position.y = 0.01;
        
        scene.add(bloodSpot);
        this.bloodTrails.push(bloodSpot);
    },

    cleanupBloodTrails() {
        this.bloodTrails.forEach(blood => scene.remove(blood));
        this.bloodTrails = [];
    },

    spawnMoose() {
        // Clear existing moose
        this.mooseList.forEach(moose => scene.remove(moose));
        this.mooseList = [];

        // Spawn 2-4 moose
        const numMoose = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < numMoose; i++) {
            const isAdult = Math.random() < 0.6;
            const moose = this.createMooseModel(isAdult);
            
            // Find valid spawn position
            let validPosition = false;
            let attempts = 0;
            let spawnPosition = new THREE.Vector3();
            
            while (!validPosition && attempts < 20) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 500 + Math.random() * 200; // Minimum 500 units, up to 700
                
                spawnPosition.set(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );

                validPosition = true;
                
                // Check distance from other moose
                for (const otherMoose of this.mooseList) {
                    if (spawnPosition.distanceTo(otherMoose.position) < 50) { // Increased separation between moose
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                moose.position.copy(spawnPosition);
                moose.rotation.y = Math.random() * Math.PI * 2;
                
                scene.add(moose);
                this.mooseList.push(moose);
            }
        }
    },

    checkWinCondition(cameraPosition) {
        for (const moose of this.mooseList) {
            if (moose.userData.state === this.states.DEAD) {
                const timeSinceDeath = performance.now() - moose.userData.deathTime;
                if (timeSinceDeath > 5000) { // 5 seconds after death
                    const distance = moose.position.distanceTo(cameraPosition);
                    debug.log(`Distance to dead moose: ${distance.toFixed(1)} units`);
                    if (distance < 5) {
                        debug.log('Win condition met!');
                        return true;
                    }
                }
            }
        }
        return false;
    },

    playMooseCall(moose) {
        if (!audioInitialized || !audioContext || !mooseCallBuffer) {
            debug.log('Audio not ready for moose call');
            return;
        }

        const now = performance.now();
        // Don't play if it's too soon after a shot
        if (now - lastShotTime < 60000) { // 1 minute cooldown after shots
            return;
        }
        
        // Don't play if it's too soon after last call
        if (now - this.lastMooseCallTime < this.mooseCallMinInterval) {
            return;
        }

        try {
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            const pannerNode = audioContext.createPanner();

            // Configure panner node for 3D audio
            pannerNode.panningModel = 'HRTF';
            pannerNode.distanceModel = 'exponential';
            pannerNode.refDistance = 20;
            pannerNode.maxDistance = 200;
            pannerNode.rolloffFactor = 1.5;

            // Set the position of the sound based on the moose's location
            pannerNode.setPosition(moose.position.x, moose.position.y, moose.position.z);

            // Set up the audio chain
            source.buffer = mooseCallBuffer;
            source.connect(gainNode);
            gainNode.connect(pannerNode);
            pannerNode.connect(audioContext.destination);

            // Calculate base volume based on distance to player
            const distanceToPlayer = moose.position.distanceTo(camera.position);
            const volume = Math.max(0.1, 1 - (distanceToPlayer / 200));
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);

            source.start(0);
            this.lastMooseCallTime = now;
            debug.log(`Playing moose call at distance ${distanceToPlayer.toFixed(1)} units`);
        } catch (error) {
            console.error('Error playing moose call:', error);
        }
    },

    updateLegAnimations(moose, deltaTime) {
        const userData = moose.userData;
        const isRunning = userData.state === this.states.RUNNING;
        const animationSpeed = isRunning ? userData.runSpeed * 20 : userData.moveSpeed * 15;

        userData.legs.forEach((leg, index) => {
            // Calculate leg phase
            const time = performance.now() * 0.001;
            const phase = leg.phase + time * animationSpeed;

            // Diagonal legs move together (0 and 3, 1 and 2)
            const isForwardStep = Math.sin(phase) > 0;
            
            // Upper leg rotation
            const upperLegAngle = Math.sin(phase) * (isRunning ? 0.6 : 0.4);
            leg.group.rotation.x = upperLegAngle;

            // Knee bend
            const kneeAngle = Math.abs(Math.sin(phase)) * (isRunning ? 0.7 : 0.5);
            leg.knee.rotation.x = -kneeAngle;

            // Calculate foot position for ground contact
            if (isForwardStep) {
                leg.lastGroundY = 0;
            } else {
                // Apply inverse kinematics for ground contact
                const footHeight = Math.sin(phase) * leg.stepHeight;
                leg.lastGroundY = Math.max(0, footHeight);
            }
        });

        // Head bobbing
        const head = moose.children.find(child => child.name === 'head');
        if (head) {
            const headBobPhase = performance.now() * 0.001 * animationSpeed;
            const headBobAmount = isRunning ? 0.15 : 0.1;
            const headBobY = Math.sin(headBobPhase) * headBobAmount;
            head.position.y = userData.headOriginalPosition.y + headBobY;
        }
    },

    startFleeingFromPlayer(moose) {
        const userData = moose.userData;
        userData.isAwareOfPlayer = true;
        userData.fleeStartTime = performance.now();
        userData.fleeTime = this.fleeTime.min + Math.random() * (this.fleeTime.max - this.fleeTime.min);
        
        // Start running away from player
        this.startRunning(moose, camera.position);
        
        // Play moose call when detecting player
        this.playMooseCall(moose);
    },
};

// Add scoring system variables
const scoreSystem = {
    startTime: 0,
    shotsTotal: 0,
    shotsHit: 0,
    killDistance: 0,
    timeElapsed: 0,
    woundedTime: 0,
    hasWoundedMoose: false,
    maxWoundedTime: 300000, // 5 minutes in milliseconds
    
    calculateGrade() {
        // Check for wounded moose timeout
        if (this.hasWoundedMoose && this.woundedTime >= this.maxWoundedTime) {
            return 'F';
        }
        
        // Calculate accuracy percentage
        const accuracy = (this.shotsHit / this.shotsTotal) * 100 || 0;
        
        // Calculate time bonus (lower time is better)
        const timeBonus = Math.max(0, 300 - this.timeElapsed) * 2;
        
        // Distance bonus (longer distance is better)
        const distanceBonus = this.killDistance * 2;
        
        // Calculate total score
        const totalScore = accuracy + timeBonus + distanceBonus;
        
        // Determine grade based on total score
        if (totalScore >= 400) return 'S+';
        if (totalScore >= 350) return 'S';
        if (totalScore >= 300) return 'A';
        if (totalScore >= 250) return 'B';
        if (totalScore >= 200) return 'C';
        return 'D';
    },
    
    reset() {
        this.startTime = performance.now();
        this.shotsTotal = 0;
        this.shotsHit = 0;
        this.killDistance = 0;
        this.timeElapsed = 0;
        this.woundedTime = 0;
        this.hasWoundedMoose = false;
    }
};

// Shooting mechanics
function shoot() {
    // Check if can shoot
    if (rifleState.isReloading) {
        debug.log('Cannot shoot while reloading');
        return;
    }
    if (rifleState.isBoltAction) {
        debug.log('Cannot shoot while bolt is cycling');
        return;
    }
    if (rifleState.ammoInMag <= 0) {
        debug.log('Magazine empty - Press R to reload');
        return;
    }
    if (isSprinting) {
        debug.log('Cannot shoot while sprinting');
        return;
    }

    // Update shot count before checking hit
    scoreSystem.shotsTotal++;
    console.log('Shot fired - Total shots:', scoreSystem.shotsTotal);

    playShootSound();
    rifleState.ammoInMag--;
    rifleState.isBoltAction = true;
    rifleState.lastShotTime = performance.now();
    updateAmmoOverlay();

    setTimeout(() => {
        playBoltSound();
        rifleState.isBoltAction = false;
        debug.log('Bolt action complete');
        updateAmmoOverlay();
    }, rifleState.boltActionTime);

    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, direction);

    let hit = false;
    for (let i = 0; i < mooseManager.mooseList.length; i++) {
        const moose = mooseManager.mooseList[i];
        // Skip already dead moose
        if (moose.userData.state === mooseManager.states.DEAD) {
            continue;
        }
        
        const meshes = [];
        moose.traverse(child => {
            if (child instanceof THREE.Mesh) {
                meshes.push(child);
            }
        });
        
        const intersects = raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            hit = true;
            scoreSystem.shotsHit++;
            console.log('Shot hit - Total hits:', scoreSystem.shotsHit);
            
            const killed = mooseManager.handleShot(moose, intersects[0], camera.position);
            
            if (killed) {
                debug.log('Moose fatally wounded!');
                
                // Check if all moose are dead
                const allMooseDead = mooseManager.mooseList.every(m => 
                    m.userData.state === mooseManager.states.DEAD || 
                    m.userData.state === mooseManager.states.DYING
                );
                
                if (allMooseDead) {
                    debug.log('All moose eliminated, spawning new group in 5 seconds');
                    setTimeout(() => {
                        // Remove dead moose
                        mooseManager.mooseList.forEach(m => scene.remove(m));
                        mooseManager.mooseList = [];
                        // Spawn new group
                        mooseManager.spawnMoose();
                    }, 5000);
                }
            } else {
                debug.log('Moose wounded and running!');
            }
            break;
        }
    }
    
    if (!hit) {
        debug.log('Shot missed');
    }

    debug.log(`Ammo remaining: ${rifleState.ammoInMag}`);
    lastShotTime = performance.now(); // Update last shot time
}

// Reload function
function reload() {
    if (rifleState.isReloading || rifleState.ammoInMag === rifleState.maxAmmo) {
        return;
    }

    // Force scope to normal view when reloading
    if (isZoomedIn) {
        toggleScope();
    }

    rifleState.isReloading = true;
    rifleState.reloadStartTime = performance.now(); // Add reload start time
    playReloadSound();
    debug.log('Reloading...');

    setTimeout(() => {
        rifleState.ammoInMag = rifleState.maxAmmo;
        rifleState.isReloading = false;
        debug.log('Reload complete');
        debug.log(`Magazine loaded with ${rifleState.ammoInMag} rounds`);
        updateAmmoOverlay();
    }, rifleState.reloadTime);
}

// Movement controls
const moveSpeed = 0.0065625; // Reduced from 0.013125 by 50%
const scopedSpeedMultiplier = 0.175; // Keeps the same scoped multiplier
const sprintMultiplier = 2.0; // Sprint makes movement 100% faster
const jumpForce = 0.05; // Reduced from 0.083 for a more natural jump
const gravity = 0.0008; // Reduced from 0.00133 for a longer jump arc
let verticalVelocity = 0;
let isGrounded = true;
let isSprinting = false;
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };

document.addEventListener('keydown', (event) => {
    if (currentGameState !== gameState.PLAYING) return;
    
    switch (event.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case 'shift': 
            keys.shift = true;
            if (keys.w && !isZoomedIn) isSprinting = true;
                break;
        case ' ':
            keys.space = true;
            if (isGrounded) {
                verticalVelocity = jumpForce;
                isGrounded = false;
            }
                break;
        case 'e': toggleScope(); break;
        case 'r': reload(); break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keys.w = false; isSprinting = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
        case 'shift': keys.shift = false; isSprinting = false; break;
        case ' ': keys.space = false; break;
    }
});

// Update the click handler for shooting and pointer lock
renderer.domElement.addEventListener('click', () => {
    if (!currentGameState) return; // Add safety check
    if (currentGameState !== gameState.PLAYING) return;
    
    if (!document.pointerLockElement) {
        renderer.domElement.requestPointerLock();
        debug.log('Requesting pointer lock');
    } else if (isZoomedIn) {
        shoot();
    }
});

// Update pointer lock change handler
document.addEventListener('pointerlockchange', () => {
    if (!currentGameState) return; // Add safety check
    if (document.pointerLockElement === renderer.domElement) {
        debug.log('Pointer lock acquired');
    } else if (currentGameState === gameState.PLAYING) {
        debug.log('Pointer lock lost - pausing game');
        setGameState(gameState.PAUSED);
    }
});

// Add toggle scope function to handle both right-click and E key
function toggleScope() {
    if (isSprinting) {
        isSprinting = false;
    }
    
    isZoomedIn = !isZoomedIn;
    debug.log(`Zoom toggled: ${isZoomedIn}`);
    
    // Update camera FOV and projection matrix
    camera.fov = isZoomedIn ? zoomedFOV : normalFOV;
    camera.updateProjectionMatrix();
    debug.log(`FOV changed to: ${camera.fov}°`);
    
    scopeOverlay.style.display = isZoomedIn ? 'block' : 'none';
    crosshairContainer.style.display = isZoomedIn ? 'none' : 'block';
    debug.log(`Scope overlay: ${isZoomedIn ? 'visible' : 'hidden'}`);
    
    if (rifle) {
        rifle.visible = !isZoomedIn;
        debug.log(`Rifle visibility: ${!isZoomedIn}`);
    }
}

// Update right-click handler to use toggle function
renderer.domElement.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    debug.log('Right click detected');
    toggleScope();
});

// Mouse movement handler
renderer.domElement.addEventListener('mousemove', (event) => {
    if (!currentGameState) return; // Add safety check
    if (currentGameState === gameState.PLAYING && document.pointerLockElement === renderer.domElement) {
        mouseX -= event.movementX * sensitivity;
        mouseY -= event.movementY * sensitivity;
        
        // Limit vertical look to prevent over-rotation
        mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseY));
        
        // Apply rotations in the correct order
        camera.rotation.order = 'YXZ';
        camera.rotation.x = mouseY;
        camera.rotation.y = mouseX;
        camera.rotation.z = 0;
    }
});

// Camera position (first-person view)
camera.position.set(0, 2, 0);  // Lower height for better perspective
camera.lookAt(0, 2, -1);  // Look slightly forward

// Optimize forest creation
function createForest() {
    const treeCount = Math.min(100, Math.floor(50 + (window.innerWidth * window.innerHeight) / 100000));
    const forestRadius = 400;
    
    // Create template geometries and materials
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 12, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x4d2926,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const foliageGeometry = new THREE.ConeGeometry(3, 7, 6);
    const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d5a27,
        roughness: 1,
        metalness: 0
    });

    // Use InstancedMesh for better performance
    const trunkInstancedMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
    const foliageInstancedMesh = new THREE.InstancedMesh(foliageGeometry, foliageMaterial, treeCount);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    // Place trees with optimized distribution
    for (let i = 0; i < treeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * forestRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        const treeScale = 0.8 + Math.random() * 0.4;
        position.set(x, 6 * treeScale, z);
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
        scale.set(treeScale, treeScale, treeScale);
        
        matrix.compose(position, quaternion, scale);
        trunkInstancedMesh.setMatrixAt(i, matrix);
        
        position.y += 7 * treeScale;
        matrix.compose(position, quaternion, scale);
        foliageInstancedMesh.setMatrixAt(i, matrix);
    }

    trunkInstancedMesh.castShadow = true;
    trunkInstancedMesh.receiveShadow = true;
    foliageInstancedMesh.castShadow = true;
    foliageInstancedMesh.receiveShadow = true;

    scene.add(trunkInstancedMesh);
    scene.add(foliageInstancedMesh);
}

// Create terrain variable
let terrain;

// Initialize the game
function initGame() {
    // Create and add terrain first
    terrain = createDetailedTerrain();
    scene.add(terrain);

    // Create the forest
    createForest();
    
    // Load initial rifle model
    loadRifleModel();
    
    // Spawn initial moose
    mooseManager.spawnMoose();
    
    // Start the animation loop
    animate();
    
    // Ensure we start in menu state with proper visibility
    currentGameState = gameState.MENU;
    setGameState(gameState.MENU);
    
    // Make sure menu is visible
    menuOverlay.style.display = 'flex';
    playButton.style.display = 'block';
    restartButton.style.display = 'block';
    tutorialButton.style.display = 'block';
    resumeButton.style.display = 'none';
    thanksButton.style.display = 'none';
}

// Start loading assets and initialize game
document.addEventListener('DOMContentLoaded', function() {
    // Show loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }

    // Start loading assets and initialize game
    initGame();
});

// Update grass clump creation for better appearance
function createGrassClump() {
    const grassGroup = new THREE.Group();
    
    // Create multiple grass blades
    const bladeCount = 8 + Math.floor(Math.random() * 8);
    
    for (let i = 0; i < bladeCount; i++) {
        const height = 0.2 + Math.random() * 0.3;
        const width = 0.03 + Math.random() * 0.02;
        
        const blade = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x355e3b).offsetHSL(0, 0, (Math.random() - 0.5) * 0.2),
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5
        });
        
        const mesh = new THREE.Mesh(blade, material);
        mesh.position.set(
            (Math.random() - 0.5) * 0.2,
            height / 2,
            (Math.random() - 0.5) * 0.2
        );
        mesh.rotation.set(
            (Math.random() - 0.5) * 0.2,
            Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * 0.2
        );
        grassGroup.add(mesh);
    }
    
    return grassGroup;
}

// Update player movement to account for terrain height
function getHeightAtPosition(x, z) {
    // Raycast from high above to find ground height
    const raycaster = new THREE.Raycaster();
    raycaster.ray.direction.set(0, -1, 0);
    raycaster.ray.origin.set(x, 100, z);
    
    const intersects = raycaster.intersectObject(terrain, true);
    if (intersects.length > 0) {
        return intersects[0].point.y;
    }
    return 0;
}

// Toggle debug with ~ key
document.addEventListener('keydown', (event) => {
    if (event.key === '0') {
        debug.enabled = !debug.enabled;
        debug.log(`Debug overlay ${debug.enabled ? 'enabled' : 'disabled'}`);
    }
});

// Performance monitoring
const performanceStats = {
    fps: 0,
    frameCount: 0,
    lastFpsUpdate: performance.now(),
    memoryUsage: 0,
    updateStats: function() {
        const now = performance.now();
        this.frameCount++;
        
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            if (window.performance && performance.memory) {
                this.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576);
            }
        }
    }
};

// Error handling wrapper
function safeExecute(func, errorMessage) {
    try {
        return func();
    } catch (error) {
        console.error(`[ERROR] ${errorMessage}:`, error);
        debug.log(`Error: ${errorMessage}`);
        return null;
    }
}

// Create menu overlay
const menuOverlay = document.createElement('div');
menuOverlay.style.position = 'fixed';
menuOverlay.style.top = '0';
menuOverlay.style.left = '0';
menuOverlay.style.width = '100%';
menuOverlay.style.height = '100%';
menuOverlay.style.background = 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.95))';
menuOverlay.style.display = 'flex';
menuOverlay.style.flexDirection = 'column';
menuOverlay.style.alignItems = 'center';
menuOverlay.style.justifyContent = 'center';
menuOverlay.style.zIndex = '2000';
menuOverlay.style.pointerEvents = 'auto';
menuOverlay.style.backdropFilter = 'blur(5px)';
document.body.appendChild(menuOverlay);

// Add logo image
const gameLogo = document.createElement('img');
gameLogo.src = 'Assets/logo.jpg';
gameLogo.style.width = '400px';
gameLogo.style.marginBottom = '40px';
gameLogo.style.borderRadius = '10px';
gameLogo.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
gameLogo.onerror = () => {
    console.error('Error loading logo image');
    debug.log('Error loading logo image');
    gameLogo.style.display = 'none';
};
menuOverlay.appendChild(gameLogo);

// Create title with enhanced styling
const gameTitle = document.createElement('h1');
gameTitle.textContent = 'By Wildpoki';
gameTitle.style.color = 'white';
gameTitle.style.fontSize = '72px';
gameTitle.style.marginBottom = '40px';
gameTitle.style.fontFamily = 'Arial, sans-serif';
gameTitle.style.userSelect = 'none';
gameTitle.style.zIndex = '2001';
gameTitle.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
gameTitle.style.letterSpacing = '2px';
gameTitle.style.fontWeight = 'bold';
menuOverlay.appendChild(gameTitle);

// Function to create menu buttons with enhanced styling
function createMenuButton(text) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.padding = '15px 32px';
    button.style.textAlign = 'center';
    button.style.textDecoration = 'none';
    button.style.display = 'block';
    button.style.fontSize = '24px';
    button.style.margin = '10px';
    button.style.cursor = 'pointer';
    button.style.borderRadius = '8px';
    button.style.width = '300px';
    button.style.transition = 'all 0.3s ease';
    button.style.pointerEvents = 'auto';
    button.style.position = 'relative';
    button.style.zIndex = '2001';
    button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    button.style.fontWeight = '600';
    button.style.letterSpacing = '1px';
    
    button.onmouseover = () => {
        button.style.backgroundColor = '#45a049';
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.2)';
    };
    button.onmouseout = () => {
        button.style.backgroundColor = '#4CAF50';
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    };
    
    return button;
}

// Create menu buttons
const playButton = createMenuButton('Play Game');
const restartButton = createMenuButton('Restart Game');
const tutorialButton = createMenuButton('How to Play');
const resumeButton = createMenuButton('Resume Game');
const backToGameButton = createMenuButton('Back to Game');
const thanksButton = createMenuButton('Credits');

menuOverlay.appendChild(playButton);
menuOverlay.appendChild(restartButton);
menuOverlay.appendChild(tutorialButton);
menuOverlay.appendChild(resumeButton);
menuOverlay.appendChild(backToGameButton);
menuOverlay.appendChild(thanksButton);

// Function to handle game state changes
function setGameState(state) {
    currentGameState = state;
    
    // Hide all overlays first
    menuOverlay.style.display = 'none';
    tutorialOverlay.style.display = 'none';
    ammoOverlay.style.display = 'none';
    keybindingsOverlay.style.display = 'none';
    winScreenOverlay.style.display = 'none';
    creditsOverlay.style.display = 'none';
    
    // Make sure renderer is visible
    renderer.domElement.style.display = 'block';
    
    switch(state) {
        case gameState.MENU:
            menuOverlay.style.display = 'flex';
            playButton.style.display = 'block';
            restartButton.style.display = 'block';
            tutorialButton.style.display = 'block';
            resumeButton.style.display = 'none';
            backToGameButton.style.display = 'none';
            thanksButton.style.display = 'none';
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            stopAmbientSound();
                break;
            
        case gameState.PLAYING:
            ammoOverlay.style.display = 'block';
            keybindingsOverlay.style.display = 'block';
            if (!audioInitialized) {
                initAudio();
            }
            playAmbientSound();
            // Reset camera position and rotation when starting game
            camera.position.set(0, 2, 0);
            camera.rotation.set(0, 0, 0);
            scoreSystem.reset(); // Reset scoring when starting new game
                break;
            
        case gameState.PAUSED:
            menuOverlay.style.display = 'flex';
            playButton.style.display = 'none';
            restartButton.style.display = 'block';
            tutorialButton.style.display = 'block';
            resumeButton.style.display = 'block';
            backToGameButton.style.display = 'none';
            thanksButton.style.display = 'none';
            break;
            
        case gameState.TUTORIAL:
            tutorialOverlay.style.display = 'flex';
            break;
            
        case gameState.WIN_SCREEN:
            winScreenOverlay.style.display = 'flex';
            const grade = scoreSystem.calculateGrade();
            const accuracy = scoreSystem.shotsTotal > 0 ? (scoreSystem.shotsHit / scoreSystem.shotsTotal * 100).toFixed(1) : '0.0';
            
            // Update the win screen with metrics
            document.getElementById('gradeDisplay').textContent = grade;
            document.getElementById('metricsDisplay').innerHTML = `
                <div>Accuracy: ${accuracy}%</div>
                <div>Shots Fired: ${scoreSystem.shotsTotal}</div>
                <div>Shots Hit: ${scoreSystem.shotsHit}</div>
                <div>Kill Distance: ${scoreSystem.killDistance.toFixed(1)}m</div>
                <div>Time: ${scoreSystem.timeElapsed.toFixed(1)}s</div>
            `;
            
            console.log('Win screen stats:', {
                grade,
                accuracy,
                shotsTotal: scoreSystem.shotsTotal,
                shotsHit: scoreSystem.shotsHit,
                killDistance: scoreSystem.killDistance,
                timeElapsed: scoreSystem.timeElapsed
            });
            
            playVictorySound();
            break;
            
        case gameState.MENU:
            menuOverlay.style.display = 'flex';
            playButton.style.display = 'block';
            restartButton.style.display = 'block';
            tutorialButton.style.display = 'block';
            resumeButton.style.display = 'none';
            thanksButton.style.display = 'none';
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            stopAmbientSound();
            break;
    }
}

// Add button event listeners
playButton.addEventListener('click', () => {
    setGameState(gameState.PLAYING);
    renderer.domElement.requestPointerLock();
});

restartButton.addEventListener('click', () => {
    restartGame();
    setGameState(gameState.PLAYING);
    renderer.domElement.requestPointerLock();
});

tutorialButton.addEventListener('click', () => {
    setGameState(gameState.TUTORIAL);
});

resumeButton.addEventListener('click', () => {
    setGameState(gameState.PLAYING);
    renderer.domElement.requestPointerLock();
});

backToGameButton.addEventListener('click', () => {
    setGameState(gameState.PLAYING);
    renderer.domElement.requestPointerLock();
});

thanksButton.addEventListener('click', () => {
    menuOverlay.style.display = 'none';
    creditsOverlay.style.display = 'flex';
});

// Add ESC key handler for pausing
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (currentGameState === gameState.PLAYING) {
            setGameState(gameState.PAUSED);
        }
    }
});

// Update the animate function to ensure it runs continuously
function animate() {
    requestAnimationFrame(animate);
    
    performanceStats.updateStats();
    
    // Always render the scene, regardless of game state
    renderer.render(scene, camera);
    
    if (currentGameState === gameState.PLAYING) {
        updateAmmoOverlay();
        updateFrustum();
        
        safeExecute(() => {
            const currentTime = performance.now();
            deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            // Check for wounded moose timeout
            let hasWoundedMoose = false;
            mooseManager.mooseList.forEach(moose => {
                if (moose.userData.wasShot && !moose.userData.state.includes('DEAD') && !moose.userData.state.includes('DYING')) {
                    hasWoundedMoose = true;
                    const timeSinceShot = currentTime - moose.userData.firstShotTime;
                    scoreSystem.woundedTime = timeSinceShot;
                    
                    // Check for timeout
                    if (timeSinceShot >= scoreSystem.maxWoundedTime) {
                        setGameState(gameState.WIN_SCREEN);
                    }
                }
            });
            scoreSystem.hasWoundedMoose = hasWoundedMoose;
            
            // Update only visible moose
            mooseManager.mooseList.forEach(moose => {
                if (frustum.containsPoint(moose.position)) {
                    mooseManager.updateMoose(moose, deltaTime);
                }
            });

            // Handle vertical movement (jumping and gravity)
            if (!isGrounded) {
                verticalVelocity -= gravity * deltaTime;
                camera.position.y += verticalVelocity * deltaTime;
                
                if (camera.position.y <= 2) { // Ground level
                    camera.position.y = 2;
                    verticalVelocity = 0;
                    isGrounded = true;
                }
            }

            // Calculate movement speed based on state
            let currentMoveSpeed = moveSpeed;
            if (isZoomedIn) {
                currentMoveSpeed *= scopedSpeedMultiplier;
            } else if (isSprinting && keys.w && !keys.s) {
                currentMoveSpeed *= sprintMultiplier;
            }

            // Apply movement based on key states
            const moveVector = new THREE.Vector3();
            
            if (keys.w) moveVector.z -= 1;
            if (keys.s) moveVector.z += 1;
            if (keys.a) moveVector.x -= 1;
            if (keys.d) moveVector.x += 1;

            // Handle movement if there is any input
            if (moveVector.length() > 0) {
                moveVector.normalize();
                
                // Convert movement to world space based on camera rotation
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeRotationY(mouseX);
                moveVector.applyMatrix4(rotationMatrix);
                
                // Calculate new position
                const newX = camera.position.x + moveVector.x * currentMoveSpeed * deltaTime;
                const newZ = camera.position.z + moveVector.z * currentMoveSpeed * deltaTime;
                
                // Get height at new position
                const groundHeight = getHeightAtPosition(newX, newZ);
                
                // Only move if the slope isn't too steep
                const currentHeight = camera.position.y - 2; // Subtract player height
                const slope = Math.abs(groundHeight - currentHeight);
                if (slope < 1.5) { // Max slope threshold
                    camera.position.x = newX;
                    camera.position.z = newZ;
                    camera.position.y = groundHeight + 2; // Add player height
                }
                
                // Play walking sound if moving
                playWalkingSound();
            } else {
                stopWalkingSound();
            }
            
            // Check win condition
            if (mooseManager.checkWinCondition(camera.position)) {
                setGameState(gameState.WIN_SCREEN);
            }
        }, "Error in animation loop");
    }
}

// Create tutorial overlay
const tutorialOverlay = document.createElement('div');
tutorialOverlay.style.position = 'fixed';
tutorialOverlay.style.top = '0';
tutorialOverlay.style.left = '0';
tutorialOverlay.style.width = '100%';
tutorialOverlay.style.height = '100%';
tutorialOverlay.style.background = 'linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.95))';
tutorialOverlay.style.display = 'none';
tutorialOverlay.style.flexDirection = 'column';
tutorialOverlay.style.alignItems = 'center';
tutorialOverlay.style.justifyContent = 'center';
tutorialOverlay.style.zIndex = '2000';
tutorialOverlay.style.color = 'white';
tutorialOverlay.style.fontFamily = 'Arial, sans-serif';
tutorialOverlay.style.padding = '20px';
tutorialOverlay.style.backdropFilter = 'blur(5px)';
tutorialOverlay.innerHTML = `
    <div style="
        background: rgba(255, 255, 255, 0.1);
        padding: 40px;
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(4px);
        max-width: 800px;
        width: 90%;
    ">
        <h2 style="
            font-size: 48px;
            margin-bottom: 30px;
            text-align: center;
            color: white;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            letter-spacing: 2px;
        ">How to Play</h2>
        <div style="
            font-size: 24px;
            line-height: 1.8;
            color: white;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        ">
            <p style="margin: 15px 0;">🎯 Left Click to shoot (when scoped)</p>
            <p style="margin: 15px 0;">🔍 Right Click or E to toggle scope</p>
            <p style="margin: 15px 0;">🏃 Hold Shift + W to sprint (cannot shoot while sprinting)</p>
            <p style="margin: 15px 0;">🔄 R to reload weapon</p>
            <p style="margin: 15px 0;">💨 WASD to move</p>
            <p style="margin: 15px 0;">⬆️ Space to jump</p>
            <p style="margin: 15px 0;">⏸️ ESC to pause game</p>
            <p style="margin: 15px 0;">🩸 Follow blood trails from wounded moose</p>
        </div>
    </div>
    <button id="backToGameBtn" style="
        margin-top: 30px;
        padding: 15px 32px;
        font-size: 24px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-weight: 600;
        letter-spacing: 1px;
    ">Back to Game</button>
`;
document.body.appendChild(tutorialOverlay);

// Create keybindings overlay
const keybindingsOverlay = document.createElement('div');
keybindingsOverlay.style.position = 'fixed';
keybindingsOverlay.style.bottom = '20px';
keybindingsOverlay.style.left = '50%';
keybindingsOverlay.style.transform = 'translateX(-50%)';
keybindingsOverlay.style.background = 'linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9))';
keybindingsOverlay.style.color = 'white';
keybindingsOverlay.style.padding = '15px 30px';
keybindingsOverlay.style.borderRadius = '10px';
keybindingsOverlay.style.fontFamily = 'monospace';
keybindingsOverlay.style.fontSize = '20px';
keybindingsOverlay.style.zIndex = '1000';
keybindingsOverlay.style.display = 'none';
keybindingsOverlay.style.backdropFilter = 'blur(4px)';
keybindingsOverlay.style.letterSpacing = '1px';
keybindingsOverlay.innerHTML = `WASD=Move | Shift+W=Sprint | E/Right Click=Scope | R=Reload | Space=Jump | ESC=Pause`;
document.body.appendChild(keybindingsOverlay);

// Add back to game button listener
document.getElementById('backToGameBtn').addEventListener('click', () => {
    setGameState(gameState.MENU);
});

// Function to play ambient sound
function playAmbientSound() {
    if (!audioInitialized || !audioContext || !ambienceBuffer) return;
    
    try {
        if (ambienceSource) {
            ambienceSource.stop();
        }
        ambienceSource = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        ambienceSource.buffer = ambienceBuffer;
        ambienceSource.loop = true;
        ambienceSource.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        ambienceSource.start(0);
    } catch (error) {
        console.error('Error playing ambient sound:', error);
    }
}

// Function to stop ambient sound
function stopAmbientSound() {
    if (ambienceSource) {
        try {
            ambienceSource.stop();
            ambienceSource = null;
        } catch (error) {
            console.error('Error stopping ambient sound:', error);
        }
    }
}

// Function to restart game
function restartGame() {
    // Reset player position and rotation
    camera.position.set(0, 2, 0);
    camera.rotation.set(0, 0, 0);
    mouseX = 0;
    mouseY = 0;
    
    // Reset rifle state
    rifleState.ammoInMag = rifleState.maxAmmo;
    rifleState.isReloading = false;
    rifleState.isBoltAction = false;
    
    // Reset movement state
    verticalVelocity = 0;
    isGrounded = true;
    isSprinting = false;
    Object.keys(keys).forEach(key => keys[key] = false);
    
    // Reset view state
    if (isZoomedIn) {
        toggleScope();
    }
    
    // Clean up existing moose and blood trails
    mooseManager.mooseList.forEach(moose => scene.remove(moose));
    mooseManager.cleanupBloodTrails();
    
    // Spawn new moose
    mooseManager.spawnMoose();
}

// Function to check sound system
function checkSoundSystem() {
    if (!audioInitialized) {
        debug.log('Audio system not initialized');
        return;
    }
    
    if (!audioContext) {
        debug.log('Audio context not created');
        return;
    }
    
    debug.log(`Audio context state: ${audioContext.state}`);
    debug.log(`Walking sound loaded: ${walkingBuffer ? 'YES' : 'NO'}`);
    debug.log(`Rifle shot sound loaded: ${rifleShootBuffer ? 'YES' : 'NO'}`);
    debug.log(`Bolt action sound loaded: ${boltActionBuffer ? 'YES' : 'NO'}`);
    debug.log(`Reload sound loaded: ${reloadBuffer ? 'YES' : 'NO'}`);
    debug.log(`Ambience sound loaded: ${ambienceBuffer ? 'YES' : 'NO'}`);
}

// Create frustum for culling
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();

// Function to update frustum
function updateFrustum() {
    camera.updateMatrixWorld();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);
}

// Create win screen overlay
const winScreenOverlay = document.createElement('div');
winScreenOverlay.style.position = 'fixed';
winScreenOverlay.style.top = '0';
winScreenOverlay.style.left = '0';
winScreenOverlay.style.width = '100%';
winScreenOverlay.style.height = '100%';
winScreenOverlay.style.background = 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.95))';
winScreenOverlay.style.display = 'none';
winScreenOverlay.style.flexDirection = 'column';
winScreenOverlay.style.alignItems = 'center';
winScreenOverlay.style.justifyContent = 'center';
winScreenOverlay.style.zIndex = '2000';
winScreenOverlay.style.color = 'white';
winScreenOverlay.style.fontFamily = 'Arial, sans-serif';
winScreenOverlay.style.padding = '20px';
winScreenOverlay.style.backdropFilter = 'blur(5px)';

// Create the win screen content
const winScreenContent = document.createElement('div');
winScreenContent.style.background = 'rgba(255, 255, 255, 0.1)';
winScreenContent.style.padding = '40px';
winScreenContent.style.borderRadius = '15px';
winScreenContent.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
winScreenContent.style.backdropFilter = 'blur(4px)';
winScreenContent.style.maxWidth = '800px';
winScreenContent.style.width = '90%';
winScreenContent.style.textAlign = 'center';

// Add title
const winTitle = document.createElement('h2');
winTitle.textContent = 'Hunt Complete!';
winTitle.style.fontSize = '48px';
winTitle.style.marginBottom = '30px';
winTitle.style.color = 'white';
winTitle.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
winTitle.style.letterSpacing = '2px';
winScreenContent.appendChild(winTitle);

// Add grade display
const gradeDisplay = document.createElement('div');
gradeDisplay.id = 'gradeDisplay';
gradeDisplay.style.fontSize = '120px';
gradeDisplay.style.fontWeight = 'bold';
gradeDisplay.style.margin = '20px 0';
gradeDisplay.style.color = '#4CAF50';
gradeDisplay.style.textShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
winScreenContent.appendChild(gradeDisplay);

// Add metrics display
const metricsContainer = document.createElement('div');
metricsContainer.style.background = 'rgba(255, 255, 255, 0.05)';
metricsContainer.style.padding = '20px';
metricsContainer.style.borderRadius = '10px';
metricsContainer.style.margin = '20px 0';
metricsContainer.style.fontSize = '24px';
metricsContainer.style.lineHeight = '1.6';

const metricsDisplay = document.createElement('div');
metricsDisplay.id = 'metricsDisplay';
metricsContainer.appendChild(metricsDisplay);
winScreenContent.appendChild(metricsContainer);

// Add buttons container
const buttonsContainer = document.createElement('div');
buttonsContainer.style.marginTop = '30px';

// Create Hunt Again button
const huntAgainButton = document.createElement('button');
huntAgainButton.id = 'huntAgainButton';
huntAgainButton.textContent = 'Hunt Again';
huntAgainButton.style.padding = '15px 32px';
huntAgainButton.style.fontSize = '24px';
huntAgainButton.style.backgroundColor = '#4CAF50';
huntAgainButton.style.color = 'white';
huntAgainButton.style.border = 'none';
huntAgainButton.style.borderRadius = '8px';
huntAgainButton.style.cursor = 'pointer';
huntAgainButton.style.transition = 'all 0.3s ease';
huntAgainButton.style.margin = '10px';
huntAgainButton.style.minWidth = '200px';

// Create Back to Menu button
const backToMenuButton = document.createElement('button');
backToMenuButton.id = 'backToMenuButton';
backToMenuButton.textContent = 'Back to Menu';
backToMenuButton.style.padding = '15px 32px';
backToMenuButton.style.fontSize = '24px';
backToMenuButton.style.backgroundColor = '#4CAF50';
backToMenuButton.style.color = 'white';
backToMenuButton.style.border = 'none';
backToMenuButton.style.borderRadius = '8px';
backToMenuButton.style.cursor = 'pointer';
backToMenuButton.style.transition = 'all 0.3s ease';
backToMenuButton.style.margin = '10px';
backToMenuButton.style.minWidth = '200px';

// Add hover effects
[huntAgainButton, backToMenuButton].forEach(button => {
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#45a049';
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.2)';
    });
    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#4CAF50';
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    });
});

// Add click handlers
huntAgainButton.addEventListener('click', () => {
    restartGame();
    setGameState(gameState.PLAYING);
    renderer.domElement.requestPointerLock();
});

backToMenuButton.addEventListener('click', () => {
    setGameState(gameState.MENU);
});

// Assemble the buttons
buttonsContainer.appendChild(huntAgainButton);
buttonsContainer.appendChild(backToMenuButton);
winScreenContent.appendChild(buttonsContainer);

// Add the content to the overlay
winScreenOverlay.appendChild(winScreenContent);
document.body.appendChild(winScreenOverlay);

// Add function to play victory sound
function playVictorySound() {
    if (!audioInitialized || !audioContext || !victoryFanfareBuffer) {
        debug.log('Audio not ready for victory fanfare');
        return;
    }

    try {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = victoryFanfareBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        source.start(0);
        debug.log('Playing victory fanfare');
    } catch (error) {
        console.error('Error playing victory fanfare:', error);
    }
}

// Create credits overlay
const creditsOverlay = document.createElement('div');
creditsOverlay.style.position = 'fixed';
creditsOverlay.style.top = '0';
creditsOverlay.style.left = '0';
creditsOverlay.style.width = '100%';
creditsOverlay.style.height = '100%';
creditsOverlay.style.background = 'linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.95))';
creditsOverlay.style.display = 'none';
creditsOverlay.style.flexDirection = 'column';
creditsOverlay.style.alignItems = 'center';
creditsOverlay.style.justifyContent = 'center';
creditsOverlay.style.zIndex = '2000';
creditsOverlay.style.color = 'white';
creditsOverlay.style.fontFamily = 'Arial, sans-serif';
creditsOverlay.style.padding = '20px';
creditsOverlay.style.backdropFilter = 'blur(5px)';
creditsOverlay.innerHTML = `
    <div style="
        background: rgba(255, 255, 255, 0.1);
        padding: 40px;
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(4px);
        max-width: 800px;
        width: 90%;
    ">
        <h2 style="
            font-size: 48px;
            margin-bottom: 30px;
            text-align: center;
            color: white;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            letter-spacing: 2px;
        ">Special Thanks</h2>
        <div style="
            font-size: 24px;
            line-height: 1.8;
            color: white;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
            text-align: center;
        ">
            <p style="margin: 15px 0;">🎮 Cursor - The World's Best IDE</p>
            <p style="margin: 15px 0;">🤖 DeepAI - AI Technology</p>
            <p style="margin: 15px 0;">🎵 Freesound - Sound Effects</p>
            <p style="margin: 15px 0;">🎨 Free3D - 3D Models</p>
            <p style="margin: 15px 0;">🔧 Grok - Development Support</p>
        </div>
    </div>
    <button id="backFromCreditsBtn" style="
        margin-top: 30px;
        padding: 15px 32px;
        font-size: 24px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-weight: 600;
        letter-spacing: 1px;
    ">Back to Menu</button>
`;
document.body.appendChild(creditsOverlay);

// Add credits button event listener
thanksButton.addEventListener('click', () => {
    menuOverlay.style.display = 'none';
    creditsOverlay.style.display = 'flex';
});

// Add back from credits button listener
document.getElementById('backFromCreditsBtn').addEventListener('click', () => {
    creditsOverlay.style.display = 'none';
    menuOverlay.style.display = 'flex';
});

// Optimize terrain creation
function createDetailedTerrain() {
    const terrainGroup = new THREE.Group();
    const terrainSize = 1000;
    const resolution = Math.min(100, Math.floor(50 + (window.innerWidth * window.innerHeight) / 100000));
    
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, resolution, resolution);
    
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        let height = (Math.cos(x * 0.005) + Math.sin(z * 0.005)) * 0.5;
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        const smoothing = Math.max(0, 1 - Math.pow(50 / distanceFromCenter, 2));
        vertices[i + 1] = Math.max(0, height * smoothing);
    }

    geometry.computeVertexNormals();

    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: 0x355e3b,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true
    });

    const terrain = new THREE.Mesh(geometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrainGroup.add(terrain);

    const groundPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(terrainSize * 1.5, terrainSize * 1.5),
        new THREE.MeshStandardMaterial({
            color: 0x355e3b,
            roughness: 1,
            metalness: 0
        })
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.1;
    groundPlane.receiveShadow = true;
    terrainGroup.add(groundPlane);

    return terrainGroup;
}