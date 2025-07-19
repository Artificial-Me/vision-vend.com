/* SCENE & CAM */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a1a, .035); // Deeper blue fog
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 1000);
camera.position.set(0, 1.5, 7);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('canvas-container').appendChild(renderer.domElement);

/* POST-PROCESSING */
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.8, .6, .92); // More intense bloom
composer.addPass(bloomPass);

/* LENS FLARE SHADER */
const lensFlarePass = new THREE.ShaderPass({
    uniforms: {
        "tDiffuse": { value: null },
        "u_lightPosition": { value: new THREE.Vector2(0.5, 0.5) },
        "u_intensity": { value: 0.25 } // Stronger lens flare
    },
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
});
composer.addPass(lensFlarePass);

/* CINEMATIC CAMERA MOVEMENT */
const cameraPaths = [
    {position: new THREE.Vector3(6, 4, 6), lookAt: new THREE.Vector3(0, 1.5, 0), duration: 12},
    {position: new THREE.Vector3(-5, 3, -5), lookAt: new THREE.Vector3(0, 1.5, 0), duration: 15},
    {position: new THREE.Vector3(0, 5, 8), lookAt: new THREE.Vector3(0, 1.5, 0), duration: 10},
    {position: new THREE.Vector3(4, 2, -7), lookAt: new THREE.Vector3(0, 1.5, 0), duration: 14}
];

let currentCameraPath = 0;

function animateCamera() {
    const path = cameraPaths[currentCameraPath];
    const nextPath = cameraPaths[(currentCameraPath + 1) % cameraPaths.length];
    
    gsap.to(camera.position, {
        x: path.position.x,
        y: path.position.y,
        z: path.position.z,
        duration: path.duration,
        ease: "sine.inOut",
        onUpdate: () => {
            camera.lookAt(path.lookAt.x, path.lookAt.y, path.lookAt.z);
        },
        onComplete: () => {
            currentCameraPath = (currentCameraPath + 1) % cameraPaths.length;
            animateCamera();
        }
    });
}
animateCamera();

/* ATMOSPHERIC LIGHTING */
const ambientLight = new THREE.AmbientLight(0x222244, 0.8);
scene.add(ambientLight);

const keyLight = new THREE.SpotLight(0x44aaff, 12, 30, Math.PI/5, .3, 2);
keyLight.position.set(5, 8, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(4096, 4096);
scene.add(keyLight);

const rimLight = new THREE.SpotLight(0x7c3aed, 8, 25, Math.PI/5, .3, 2);
rimLight.position.set(-5, 6, -5);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0x00d4ff, 3, 15);
fillLight.position.set(0, 4, 0);
scene.add(fillLight);

gsap.to(keyLight, { intensity: 15, duration: 4, yoyo: true, repeat: -1, ease: "sine.inOut" });
gsap.to(rimLight, { intensity: 10, duration: 5, yoyo: true, repeat: -1, ease: "sine.inOut" });

/* ENHANCED GROUND & ENVIRONMENT */
const groundGeo = new THREE.PlaneGeometry(50, 50, 100, 100);
const groundMat = new THREE.MeshStandardMaterial({
    color: 0x050510,
    metalness: .95,
    roughness: .1,
    wireframe: true,
    transparent: true,
    opacity: 0.2,
    emissive: 0x004466,
    emissiveIntensity: 0.1
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

/* ENHANCED MODEL MATERIALS */
let mascot;
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load('https://raw.githubusercontent.com/Artificial-Me/vision-vend.com/main/public/vending_machine_mascot.glb', gltf => {
    mascot = gltf.scene;
    mascot.scale.set(2.2, 2.2, 2.2);
    mascot.position.y = -1;
    mascot.traverse(obj => {
        if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.material.metalness = 0.9;
            obj.material.roughness = 0.1;
            
            if (obj.material.emissive) {
                obj.material.emissive.set(0x0066ff);
                obj.material.emissiveIntensity = 0.6;
                // Pulsing emissive effect
                gsap.to(obj.material, {
                    emissiveIntensity: 1.2,
                    duration: 2.5,
                    yoyo: true,
                    repeat: -1,
                    ease: "sine.inOut"
                });
            }
        }
    });
    scene.add(mascot);
    
    // Subtle floating animation
    gsap.to(mascot.position, { y: "-=.1", duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
    
    // Slow rotation
    gsap.to(mascot.rotation, { y: Math.PI * 2, duration: 40, ease: "none", repeat: -1 });
});

/* ATMOSPHERIC PARTICLES */
const particleGeo = new THREE.BufferGeometry();
const particleCnt = 800;
const positions = new Float32Array(particleCnt * 3);
const sizes = new Float32Array(particleCnt);

for (let i = 0; i < particleCnt * 3; i += 3) {
    positions[i] = (Math.random() - .5) * 40;
    positions[i+1] = Math.random() * 15 - 2;
    positions[i+2] = (Math.random() - .5) * 40;
    sizes[i/3] = Math.random() * 0.3 + 0.05;
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particleMat = new THREE.PointsMaterial({
    color: 0x44aaff,
    size: .1,
    transparent: true,
    opacity: .8,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
});

const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

/* ANIMATION LOOP */
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    // Animate particles
    const pos = particles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
        pos[i+1] -= 0.4 * delta;
        if (pos[i+1] < -2) pos[i+1] = 15;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    
    // Update lens flare position
    const lightPos = new THREE.Vector3().copy(keyLight.position);
    const screenPos = lightPos.project(camera);
    if (lensFlarePass && lensFlarePass.uniforms) {
        lensFlarePass.uniforms.u_lightPosition.value.set((screenPos.x + 1) / 2, (screenPos.y + 1) / 2);
    }
    
    composer.render(delta);
}
animate();

/* HANDLE RESIZE */
addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
});