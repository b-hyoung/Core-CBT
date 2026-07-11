import * as THREE from "three";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("bg-canvas");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06070a, 0.022);

const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 0, 22);

// === Lighting — cool, restrained ===
const hemi = new THREE.HemisphereLight(0x6b7280, 0x06070a, 0.7);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xd9dce2, 0.55);
key.position.set(6, 10, 8);
scene.add(key);
const rim = new THREE.PointLight(0x8fa4ff, 0.45, 32);
rim.position.set(-8, -4, 6);
scene.add(rim);

// === Cards — dark slate paper ===
const cardGeo = new THREE.PlaneGeometry(1.7, 2.3, 1, 1);

const texCanvas = document.createElement("canvas");
texCanvas.width = texCanvas.height = 256;
const tctx = texCanvas.getContext("2d");
const grad = tctx.createLinearGradient(0, 0, 0, 256);
grad.addColorStop(0, "#2A2D36");
grad.addColorStop(1, "#181A21");
tctx.fillStyle = grad;
tctx.fillRect(0, 0, 256, 256);
// hairlines
tctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
tctx.lineWidth = 1;
for (let y = 32; y < 256; y += 22) {
  tctx.beginPath();
  tctx.moveTo(22, y);
  tctx.lineTo(234, y);
  tctx.stroke();
}
// header bar — cool blue tint
tctx.fillStyle = "rgba(143, 164, 255, 0.12)";
tctx.fillRect(22, 14, 220, 5);
// muted dot — silver
tctx.fillStyle = "rgba(217, 220, 226, 0.18)";
tctx.beginPath();
tctx.arc(232, 240, 4, 0, Math.PI * 2);
tctx.fill();
const paperTex = new THREE.CanvasTexture(texCanvas);
paperTex.colorSpace = THREE.SRGBColorSpace;

const cards = [];
const CARD_COUNT = 38;
for (let i = 0; i < CARD_COUNT; i++) {
  const mat = new THREE.MeshStandardMaterial({
    map: paperTex,
    side: THREE.DoubleSide,
    roughness: 0.92,
    metalness: 0.0,
    transparent: true,
    opacity: 0.32 + Math.random() * 0.32,
  });
  const mesh = new THREE.Mesh(cardGeo, mat);
  mesh.position.set(
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 32,
    (Math.random() - 0.5) * 70 - 14
  );
  mesh.rotation.set(
    (Math.random() - 0.5) * 0.7,
    (Math.random() - 0.5) * 1.3,
    (Math.random() - 0.5) * 0.5
  );
  mesh.userData = {
    floatSpeed: 0.08 + Math.random() * 0.14,
    floatPhase: Math.random() * Math.PI * 2,
    floatAmp: 0.04 + Math.random() * 0.07,
    spinX: (Math.random() - 0.5) * 0.0012,
    spinY: (Math.random() - 0.5) * 0.0018,
    baseY: mesh.position.y,
  };
  scene.add(mesh);
  cards.push(mesh);
}

// === Dust — silver-blue, sparse ===
const DUST_COUNT = 180;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST_COUNT * 3);
const dustSeed = new Float32Array(DUST_COUNT);
for (let i = 0; i < DUST_COUNT; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 70;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 45;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
  dustSeed[i] = Math.random() * Math.PI * 2;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({
  color: 0xd9dce2,
  size: 0.055,
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});
const dust = new THREE.Points(dustGeo, dustMat);
scene.add(dust);

// === Mouse parallax ===
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("mousemove", (e) => {
  mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
});

// === Animate ===
const clock = new THREE.Clock();
const targetCam = { x: 0, y: 0, z: 22 };

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (!REDUCED) {
    mouse.x += (mouse.tx - mouse.x) * 0.035;
    mouse.y += (mouse.ty - mouse.y) * 0.035;

    cards.forEach((c) => {
      c.position.y =
        c.userData.baseY +
        Math.sin(t * c.userData.floatSpeed + c.userData.floatPhase) *
          c.userData.floatAmp;
      c.rotation.x += c.userData.spinX;
      c.rotation.y += c.userData.spinY;
    });

    const dp = dust.geometry.attributes.position.array;
    for (let i = 0; i < DUST_COUNT; i++) {
      dp[i * 3 + 1] += Math.sin(t * 0.35 + dustSeed[i]) * 0.0025;
      dp[i * 3] += Math.cos(t * 0.25 + dustSeed[i]) * 0.0018;
    }
    dust.geometry.attributes.position.needsUpdate = true;
    dust.rotation.y = t * 0.008;
  }

  camera.position.x += (mouse.x * 1.6 + targetCam.x - camera.position.x) * 0.035;
  camera.position.y +=
    (-mouse.y * 1.2 + targetCam.y - camera.position.y) * 0.035;
  camera.position.z += (targetCam.z - camera.position.z) * 0.035;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

window.__bg = {
  camera,
  scene,
  targetCam,
  cards,
};
