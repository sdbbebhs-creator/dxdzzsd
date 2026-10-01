import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SpaceShooter3DViewProps {
  combo: number;
  isShooting: boolean;
  targetIndex?: number | null;
  shields: number;
  playerHealth: number;
  bossHealth: number;
  isGameOver: boolean;
  isVictory: boolean;
}

export const SpaceShooter3DView: React.FC<SpaceShooter3DViewProps> = ({
  combo,
  isShooting,
  shields,
  playerHealth,
  bossHealth,
  isGameOver,
  isVictory,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const shipGroupRef = useRef<THREE.Group | null>(null);
  const shieldMeshRef = useRef<THREE.Mesh | null>(null);
  const bossMeshRef = useRef<THREE.Group | null>(null);
  const asteroidsRef = useRef<THREE.Mesh[]>([]);
  const lasersRef = useRef<Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }>>([]);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sync props to refs to avoid stale closures in Three.js render loop
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const shieldsRef = useRef(shields);
  shieldsRef.current = shields;
  const playerHealthRef = useRef(playerHealth);
  playerHealthRef.current = playerHealth;
  const bossHealthRef = useRef(bossHealth);
  bossHealthRef.current = bossHealth;
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;
  const isVictoryRef = useRef(isVictory);
  isVictoryRef.current = isVictory;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 500;

    // 1. Scene, Camera, Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x030712, 0.016);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 2.5, 9);
    camera.lookAt(0, 0, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0x1e1b4b, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.8);
    keyLight.position.set(5, 12, 10);
    scene.add(keyLight);

    const rimColorLight = new THREE.DirectionalLight(0xd946ef, 2.0);
    rimColorLight.position.set(-8, -6, -10);
    scene.add(rimColorLight);

    const engineLight = new THREE.PointLight(0x06b6d4, 3.5, 18);
    engineLight.position.set(0, 0, 4);
    scene.add(engineLight);

    // 3. Starfield Warp Tunnel & Cosmic Nebula Particles
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = [
      [0.06, 0.71, 0.83], // Cyan
      [0.85, 0.27, 0.94], // Magenta
      [0.55, 0.36, 0.96], // Violet
      [0.96, 0.62, 0.07], // Amber
      [0.9, 0.95, 1.0],   // Ice White
    ];

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 70;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      starPositions[i * 3 + 2] = -Math.random() * 90;

      const col = palette[i % palette.length];
      starColors[i * 3] = col[0];
      starColors[i * 3 + 1] = col[1];
      starColors[i * 3 + 2] = col[2];
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.26,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Cosmic Dust Nebula Cloud
    const nebulaCount = 180;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    const nebulaCol = new Float32Array(nebulaCount * 3);

    for (let i = 0; i < nebulaCount; i++) {
      nebulaPos[i * 3] = (Math.random() - 0.5) * 80;
      nebulaPos[i * 3 + 1] = (Math.random() - 0.5) * 45;
      nebulaPos[i * 3 + 2] = -20 - Math.random() * 50;

      const isPurple = Math.random() > 0.5;
      nebulaCol[i * 3] = isPurple ? 0.65 : 0.1;
      nebulaCol[i * 3 + 1] = isPurple ? 0.2 : 0.7;
      nebulaCol[i * 3 + 2] = isPurple ? 0.95 : 0.95;
    }
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaCol, 3));
    const nebulaMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
    });
    const nebulaField = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebulaField);

    // 4. 3D Starfighter Model
    const shipGroup = new THREE.Group();
    shipGroup.position.set(0, -1.2, 5.5);

    // Fuselage
    const bodyGeo = new THREE.ConeGeometry(0.7, 3.2, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x0f172a,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    shipGroup.add(body);

    // Cockpit Canopy (Glowing Cyan Glass)
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 16);
    cockpitGeo.scale(0.8, 0.6, 1.6);
    const cockpitMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.28, 0.4);
    shipGroup.add(cockpit);

    // Swept Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.4, -0.8);
    wingShape.lineTo(2.6, -1.2);
    wingShape.lineTo(0.5, -0.6);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.3,
    });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotation.x = Math.PI / 2;
    rightWing.position.set(0.2, 0, 0.4);
    shipGroup.add(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.rotation.y = Math.PI;
    leftWing.position.set(-0.2, 0, 0.4);
    shipGroup.add(leftWing);

    // Dual Plasma Cannons & Wing-Tip Nav Lights (Green Right, Red Left)
    const cannonGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8);
    cannonGeo.rotateX(Math.PI / 2);
    const cannonMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });

    const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
    leftCannon.position.set(-1.4, -0.05, 0.2);
    shipGroup.add(leftCannon);

    const rightCannon = new THREE.Mesh(cannonGeo, cannonMat);
    rightCannon.position.set(1.4, -0.05, 0.2);
    shipGroup.add(rightCannon);

    // Left Wingtip Light (Red)
    const redLightGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const redTip = new THREE.Mesh(redLightGeo, redLightMat);
    redTip.position.set(-2.5, -0.05, -0.7);
    shipGroup.add(redTip);

    // Right Wingtip Light (Emerald Green)
    const greenLightGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const greenTip = new THREE.Mesh(greenLightGeo, greenLightMat);
    greenTip.position.set(2.5, -0.05, -0.7);
    shipGroup.add(greenTip);

    // Thruster Flame
    const thrusterGeo = new THREE.ConeGeometry(0.32, 1.4, 12);
    thrusterGeo.rotateX(-Math.PI / 2);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const thrusterFlame = new THREE.Mesh(thrusterGeo, thrusterMat);
    thrusterFlame.position.set(0, 0, 1.9);
    shipGroup.add(thrusterFlame);

    // 3D Force Field Energy Shield Bubble
    const shieldGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 0, 0.2);
    shipGroup.add(shieldMesh);
    shieldMeshRef.current = shieldMesh;

    scene.add(shipGroup);
    shipGroupRef.current = shipGroup;

    // 5. 3D Enemy Invader Fleet Core / Mothership in deep space
    const bossGroup = new THREE.Group();
    bossGroup.position.set(0, 3, -40);

    const bossCoreGeo = new THREE.OctahedronGeometry(4.5, 1);
    const bossCoreMat = new THREE.MeshStandardMaterial({
      color: 0x581c87,
      emissive: 0x3b0764,
      emissiveIntensity: 0.7,
      metalness: 0.85,
      roughness: 0.25,
    });
    const bossCore = new THREE.Mesh(bossCoreGeo, bossCoreMat);
    bossGroup.add(bossCore);

    // Glowing Purple/Pink Energy Halo around Boss
    const haloGeo = new THREE.TorusGeometry(6.5, 0.15, 8, 36);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xd946ef,
      transparent: true,
      opacity: 0.6,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 3;
    bossGroup.add(halo);

    scene.add(bossGroup);
    bossMeshRef.current = bossGroup;

    // 6. 4 Floating Asteroids with vibrant crystalline glowing cores
    const asteroids: THREE.Group[] = [];
    const asteroidPositions = [
      { x: -6, y: 2, z: -16, color: 0x10b981, haloColor: 0x34d399 }, // Emerald
      { x: 6, y: 2, z: -16, color: 0xa855f7, haloColor: 0xc084fc },  // Violet
      { x: -6, y: -2.2, z: -16, color: 0xf59e0b, haloColor: 0xfbbf24 }, // Amber
      { x: 6, y: -2.2, z: -16, color: 0xf43f5e, haloColor: 0xfb7185 },  // Plasma Rose
    ];

    asteroidPositions.forEach((pos) => {
      const astGroup = new THREE.Group();
      astGroup.position.set(pos.x, pos.y, pos.z);

      // Core crystal body
      const geo = new THREE.DodecahedronGeometry(1.1 + Math.random() * 0.2, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: pos.color,
        roughness: 0.2,
        metalness: 0.7,
        emissive: pos.color,
        emissiveIntensity: 0.65,
      });
      const mesh = new THREE.Mesh(geo, mat);
      astGroup.add(mesh);

      // Glowing outer energy wireframe ring
      const ringGeo = new THREE.TorusGeometry(1.6, 0.04, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: pos.haloColor,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 3;
      astGroup.add(ring);

      scene.add(astGroup);
      asteroids.push(astGroup);
    });
    asteroidsRef.current = asteroids as any;

    // Mouse movement listener
    const handleMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePosRef.current = { x: Math.max(-1, Math.min(1, normX)), y: Math.max(-1, Math.min(1, normY)) };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 7. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const currentCombo = comboRef.current;
      const curHp = playerHealthRef.current;
      const curBossHp = bossHealthRef.current;

      // Warp speed increases with combo
      const warpSpeed = 0.35 + Math.min(currentCombo * 0.08, 0.7);

      // Starfield tunnel animation
      if (starGeo.attributes.position) {
        const positions = starGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < starCount; i++) {
          positions[i * 3 + 2] += warpSpeed;
          if (positions[i * 3 + 2] > 10) {
            positions[i * 3 + 2] = -70;
            positions[i * 3] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
          }
        }
        starGeo.attributes.position.needsUpdate = true;
      }

      // 3D Ship banking & tracking
      if (shipGroup) {
        const targetX = mousePosRef.current.x * 2.2;
        const targetY = -1.2 + mousePosRef.current.y * 1.0;
        shipGroup.position.x += (targetX - shipGroup.position.x) * 0.07;
        shipGroup.position.y += (targetY - shipGroup.position.y) * 0.07;

        const targetRoll = -mousePosRef.current.x * 0.45;
        const targetPitch = mousePosRef.current.y * 0.25;
        shipGroup.rotation.z += (targetRoll - shipGroup.rotation.z) * 0.08;
        shipGroup.rotation.x += (targetPitch - shipGroup.rotation.x) * 0.08;

        const flameScale = 1.0 + Math.sin(elapsedTime * 25) * 0.25 + (currentCombo > 0 ? 0.35 : 0);
        thrusterFlame.scale.set(flameScale, 1.0 + Math.random() * 0.3, flameScale);
      }

      // 3D Shield reaction based on real player health
      if (shieldMeshRef.current) {
        shieldMeshRef.current.rotation.y += 0.01;
        const sMat = shieldMeshRef.current.material as THREE.MeshBasicMaterial;
        if (curHp <= 0) {
          sMat.opacity = 0;
        } else if (curHp <= 35) {
          // Critical shield: flashes red
          sMat.color.setHex(0xef4444);
          sMat.opacity = 0.25 + Math.sin(elapsedTime * 12) * 0.2;
        } else if (curHp <= 70) {
          // Warning shield: amber
          sMat.color.setHex(0xf59e0b);
          sMat.opacity = 0.3;
        } else {
          // Full shield: bright cyan
          sMat.color.setHex(0x06b6d4);
          sMat.opacity = 0.35;
        }
      }

      // Rotate Boss Core & Halo
      if (bossMeshRef.current) {
        bossMeshRef.current.rotation.y += 0.005;
        bossMeshRef.current.rotation.z += 0.003;
        bossMeshRef.current.position.y = 3 + Math.sin(elapsedTime * 1.2) * 0.8;
        halo.rotation.z -= 0.015;

        // Boss reaction to damage
        if (curBossHp <= 0) {
          bossMeshRef.current.scale.multiplyScalar(0.98);
        } else {
          const bossScale = 0.7 + (curBossHp / 100) * 0.3;
          bossMeshRef.current.scale.set(bossScale, bossScale, bossScale);
        }
      }

      // Rotate Asteroids
      asteroids.forEach((ast, i) => {
        ast.rotation.x += 0.008 + i * 0.002;
        ast.rotation.y += 0.01 + i * 0.003;
        ast.position.y = asteroidPositions[i].y + Math.sin(elapsedTime * 2 + i) * 0.3;
      });

      // Update Lasers
      for (let i = lasersRef.current.length - 1; i >= 0; i--) {
        const laser = lasersRef.current[i];
        laser.mesh.position.x += laser.vx;
        laser.mesh.position.y += laser.vy;
        laser.mesh.position.z += laser.vz;
        laser.life -= 0.04;
        if (laser.life <= 0 || laser.mesh.position.z < -40) {
          scene.remove(laser.mesh);
          lasersRef.current.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth || window.innerWidth;
      const nh = mount.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);
    const initialTimer = setTimeout(handleResize, 60);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Fire 3D Laser Beam when shooting
  useEffect(() => {
    if (!isShooting || !sceneRef.current || !shipGroupRef.current) return;
    const scene = sceneRef.current;
    const ship = shipGroupRef.current;

    [-1.4, 1.4].forEach((offset) => {
      const laserGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
      laserGeo.rotateX(Math.PI / 2);
      const laserMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
      });
      const laserMesh = new THREE.Mesh(laserGeo, laserMat);

      laserMesh.position.set(
        ship.position.x + offset * Math.cos(ship.rotation.z),
        ship.position.y - 0.05,
        ship.position.z - 1.2
      );

      scene.add(laserMesh);
      lasersRef.current.push({
        mesh: laserMesh,
        vx: (mousePosRef.current.x * 2 - ship.position.x) * 0.04,
        vy: (mousePosRef.current.y * 1 - ship.position.y) * 0.04,
        vz: -1.6,
        life: 1.0,
      });
    });
  }, [isShooting]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 1 }}
    />
  );
};
