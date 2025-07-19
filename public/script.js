/* SCENE & CAM */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, .05);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 1000);
camera.position.set(0, 1.5, 7);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('canvas-container').appendChild(renderer.domElement);

/* POST-PROCESSING */
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));
console.log('ShaderPass status: ', typeof THREE.ShaderPass === 'function' ? 'Constructor loaded successfully' : 'Using fallback implementation');
console.log('EffectComposer initialized with ShaderPass: ', THREE.ShaderPass);
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.2, .4, .85);
composer.addPass(bloomPass);

/* LENS FLARE SHADER */
const lensFlarePass = new THREE.ShaderPass({
    uniforms: {
        "tDiffuse": { value: null },
        "u_lightPosition": { value: new THREE.Vector2(0.5, 0.5) },
        "u_intensity": { value: 0.15 }
    },
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
});
composer.addPass(lensFlarePass);

/* CONTROLS */
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .04;
controls.minDistance = 20;
controls.maxDistance = 200;
controls.enablePan = false;
controls.autoRotate = false;

/* NEW: GSAP CAMERA ANIMATION */
gsap.to(camera.position, {
    duration: 40,
    x: 5, y: 3, z: 8,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
    onUpdate: () => camera.lookAt(0, 1, 0)
});
gsap.to(camera.position, {
    duration: 35,
    x: -6, z: -7,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
    onUpdate: () => camera.lookAt(0, 1, 0)
});

/* LIGHTS */
const keyLight = new THREE.SpotLight(0x00ffaa, 8, 25, Math.PI / 4, .2, 2);
keyLight.position.set(4, 6, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);
const rimLight = new THREE.SpotLight(0x7c3aed, 5, 20, Math.PI / 5, .3, 2);
rimLight.position.set(-4, 5, -4);
scene.add(rimLight);
const fillLight = new THREE.RectAreaLight(0x00d4ff, 2, 5, 5);
fillLight.position.set(0, 3, 0);
scene.add(fillLight);
const groundLight = new THREE.PointLight(0x00ffaa, 1.5, 10);
groundLight.position.set(0, -.8, 0);
scene.add(groundLight);

/* GROUND & NEW: LASER GRID */
const groundGeo = new THREE.PlaneGeometry(50, 50, 50, 50);
const groundMat = new THREE.MeshStandardMaterial({
    color: 0x000000, metalness: .9, roughness: .2,
    wireframe: true, transparent: true, opacity: 0.15,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
scene.add(ground);

/* GLTF MASCOT */
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
            if (obj.material.emissive) {
                obj.material.emissive.set(0x003322);
                obj.material.emissiveIntensity = .3;
            }
        }
    });
    scene.add(mascot);
    gsap.to(mascot.position, { y: "-=.08", duration: 2.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to(mascot.rotation, { y: Math.PI * 2, duration: 25, ease: "none", repeat: -1 });
    gsap.to('#loading', { opacity: 0, duration: 1, delay: .5, onComplete: () => document.getElementById('loading').style.display = 'none' });
});

/* NEW: COMEDIC 3D TEXT */
const textGroup = new THREE.Group();
scene.add(textGroup);
const labels = [
    "Unblinking AI Overlords",
    "Your Fridge Now Has A Job",
    "Acquire. Consume. Repeat.",
    "Assimilation In 30 Mins"
];
labels.forEach((txt, i) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024; canvas.height = 128;
    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 52px Inter';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt.toUpperCase(), 512, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, opacity: 0.8 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, .5), mat);
    const ang = (i / labels.length) * Math.PI * 2;
    mesh.position.set(Math.cos(ang) * 4.5, 1.5 + Math.sin(i * 3) * .6, Math.sin(ang) * 4.5);
    mesh.lookAt(0, 1.5, 0);
    textGroup.add(mesh);
});
gsap.to(textGroup.rotation, { y: Math.PI * 2, duration: 20, ease: "none", repeat: -1 });

/* NEW: TRON-STYLE 3D LIGHT PATHS */
const lightPathsGroup = new THREE.Group();
scene.add(lightPathsGroup);

// Create orbital light paths around the mascot
function createTronLightPath() {
    const radius = 3 + Math.random() * 2;
    const height = Math.random() * 4 - 2;
    const segments = 64;
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = height + Math.sin(angle * 3) * 0.3;
        points.push(new THREE.Vector3(x, y, z));
    }
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.02, 8, true);
    const tubeMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00ffaa : 0x00d4ff,
        transparent: true,
        opacity: 0.8,
        emissive: Math.random() > 0.5 ? 0x00ffaa : 0x00d4ff,
        emissiveIntensity: 0.3
    });
    
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    lightPathsGroup.add(tube);
    
    // Animate the light path
    gsap.to(tube.rotation, {
        y: Math.PI * 2,
        duration: 10 + Math.random() * 10,
        ease: "none",
        repeat: -1
    });
    
    gsap.to(tubeMaterial, {
        opacity: 0,
        duration: 8 + Math.random() * 4,
        delay: 2,
        onComplete: () => {
            lightPathsGroup.remove(tube);
            tubeGeometry.dispose();
            tubeMaterial.dispose();
        }
    });
}

// Create vertical light beams
function createVerticalBeam() {
    const beamHeight = 8;
    const beamGeometry = new THREE.CylinderGeometry(0.01, 0.05, beamHeight, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.6,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.5
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(
        (Math.random() - 0.5) * 10,
        beamHeight / 2 - 1,
        (Math.random() - 0.5) * 10
    );
    
    lightPathsGroup.add(beam);
    
    gsap.fromTo(beam.scale, 
        { y: 0 },
        { y: 1, duration: 0.5, ease: "power2.out" }
    );
    
    gsap.to(beamMaterial, {
        opacity: 0,
        duration: 3,
        delay: 1,
        onComplete: () => {
            lightPathsGroup.remove(beam);
            beamGeometry.dispose();
            beamMaterial.dispose();
        }
    });
}

// Create electric arcs between nodes
function createElectricArc() {
    if (textGroup.children.length < 2) return;
    
    const startNode = textGroup.children[Math.floor(Math.random() * textGroup.children.length)];
    const endNode = mascot ? mascot : textGroup.children[Math.floor(Math.random() * textGroup.children.length)];
    const startPos = startNode.getWorldPosition(new THREE.Vector3());
    const endPos = endNode.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0));
    
    const curve = new THREE.CatmullRomCurve3([
        startPos,
        startPos.clone().lerp(endPos, 0.3).add(new THREE.Vector3(Math.random()-0.5, Math.random()*2, Math.random()-0.5)),
        startPos.clone().lerp(endPos, 0.7).add(new THREE.Vector3(Math.random()-0.5, Math.random()*2, Math.random()-0.5)),
        endPos
    ]);

    const points = curve.getPoints(50);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ 
        color: 0x00d4ff, 
        transparent: true, 
        opacity: 0.9, 
        blending: THREE.AdditiveBlending
    });
    
    const arc = new THREE.Line(geo, mat);
    lightPathsGroup.add(arc);
    
    // Animate the arc with flickering effect
    gsap.to(mat, {
        opacity: 0,
        duration: 0.3,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
            lightPathsGroup.remove(arc);
            geo.dispose();
            mat.dispose();
        }
    });
}

// Schedule different light effects
setInterval(createTronLightPath, 3000 + Math.random() * 2000);
setInterval(createVerticalBeam, 2000 + Math.random() * 3000);
setInterval(createElectricArc, 1500 + Math.random() * 2000);

/* PARTICLES */
const particleGeo = new THREE.BufferGeometry();
const particleCnt = 400;
const positions = new Float32Array(particleCnt * 3);
for (let i = 0; i < particleCnt * 3; i += 3) {
    positions[i] = (Math.random() - .5) * 20;
    positions[i+1] = Math.random() * 10 - 2;
    positions[i+2] = (Math.random() - .5) * 20;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMat = new THREE.PointsMaterial({ color: 0x00ffaa, size: .05, transparent: true, opacity: .6, blending: THREE.AdditiveBlending });
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

/* ANIMATE */
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const pos = particles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
        pos[i+1] -= .8 * delta;
        if (pos[i+1] < -2) pos[i+1] = 10;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    
    // Update lens flare position
    const lightPos = new THREE.Vector3().copy(keyLight.position);
    const screenPos = lightPos.project(camera);
    if (lensFlarePass && lensFlarePass.uniforms) {
        lensFlarePass.uniforms.u_lightPosition.value.set((screenPos.x + 1) / 2, (screenPos.y + 1) / 2);
    }
    
    controls.update();
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