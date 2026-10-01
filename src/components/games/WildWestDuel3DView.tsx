import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface WildWestDuel3DViewProps {
  phase: 'STANDOFF' | 'DRAW' | 'RESOLVED';
  hasMuzzleFlash: boolean;
  roundResult: 'hit' | 'miss' | 'timeout' | null;
  round: number;
  playerHealth: number;
  outlawHealth: number;
}

export const WildWestDuel3DView: React.FC<WildWestDuel3DViewProps> = ({
  phase,
  hasMuzzleFlash,
  roundResult,
  round,
  playerHealth,
  outlawHealth,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const gunGroupRef = useRef<THREE.Group | null>(null);
  const banditGroupRef = useRef<THREE.Group | null>(null);
  const flashLightRef = useRef<THREE.PointLight | null>(null);
  const tumbleweedsRef = useRef<Array<{ mesh: THREE.Mesh; speed: number; rotSpeed: number }>>([]);

  // Sync props to refs to avoid stale closures in Three.js render loop
  const hasMuzzleFlashRef = useRef(hasMuzzleFlash);
  hasMuzzleFlashRef.current = hasMuzzleFlash;
  const playerHealthRef = useRef(playerHealth);
  playerHealthRef.current = playerHealth;
  const outlawHealthRef = useRef(outlawHealth);
  outlawHealthRef.current = outlawHealth;
  const roundResultRef = useRef(roundResult);
  roundResultRef.current = roundResult;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 500;

    // 1. Scene, Camera, Sunset Atmospheric Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x92400e, 0.018);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    // 2. Sunset Golden Hour Lighting
    const ambientLight = new THREE.AmbientLight(0xffedd5, 1.3);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xf59e0b, 3.2);
    sunLight.position.set(-15, 6, -20);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xfbbf24, 1.5);
    rimLight.position.set(10, 10, 10);
    scene.add(rimLight);

    // Dynamic Muzzle Flash Point Light
    const flashLight = new THREE.PointLight(0xffedd5, 0, 15);
    flashLight.position.set(0.6, 0.8, 3.6);
    scene.add(flashLight);
    flashLightRef.current = flashLight;

    // 3. Sandy Desert Canyon Ground & Drifting Sunset Embers
    const groundGeo = new THREE.PlaneGeometry(80, 80, 20, 20);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.5;
    scene.add(ground);

    // Drifting Desert Dust Motes
    const dustCount = 180;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 36;
      dustPos[i * 3 + 1] = Math.random() * 6;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xfde68a,
      size: 0.14,
      transparent: true,
      opacity: 0.7,
    });
    const dustField = new THREE.Points(dustGeo, dustMat);
    scene.add(dustField);

    // Canyon Mesas / Sandstone Cliffs in Background
    [-18, 18].forEach((xOffset, idx) => {
      const cliffGeo = new THREE.BoxGeometry(16, 12, 40);
      const cliffMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x9a3412 : 0xb45309,
        roughness: 0.95,
      });
      const cliff = new THREE.Mesh(cliffGeo, cliffMat);
      cliff.position.set(xOffset, 5, -15);
      cliff.rotation.y = idx === 0 ? 0.2 : -0.2;
      scene.add(cliff);
    });

    // 4. Distant Western Silhouette Bandit Outlaw Boss
    const banditGroup = new THREE.Group();
    banditGroup.position.set(0, 0, -12);

    const ponchoGeo = new THREE.ConeGeometry(0.8, 2.0, 8);
    const ponchoMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.9,
    });
    const poncho = new THREE.Mesh(ponchoGeo, ponchoMat);
    poncho.position.y = 1.0;
    banditGroup.add(poncho);

    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.1;
    banditGroup.add(head);

    const hatCrownGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.35, 12);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
    const hatCrown = new THREE.Mesh(hatCrownGeo, hatMat);
    hatCrown.position.y = 2.45;
    banditGroup.add(hatCrown);

    const hatBrimGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 16);
    const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    hatBrim.position.y = 2.3;
    banditGroup.add(hatBrim);

    // Bandit Revolver Arm
    const banditGunArm = new THREE.Group();
    banditGunArm.position.set(0.6, 1.4, 0);

    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x27272a });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.y = -0.3;
    banditGunArm.add(arm);

    const banditGunGeo = new THREE.BoxGeometry(0.1, 0.15, 0.45);
    const banditGunMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8 });
    const banditGun = new THREE.Mesh(banditGunGeo, banditGunMat);
    banditGun.position.set(0, -0.6, 0.2);
    banditGunArm.add(banditGun);

    banditGroup.add(banditGunArm);
    scene.add(banditGroup);
    banditGroupRef.current = banditGroup;

    // 5. 3D First-Person Cowboy Revolver in Foreground
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0.85, 0.6, 3.8);
    gunGroup.rotation.set(-0.08, -0.15, 0.04);

    const barrelGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.4, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.25,
    });
    const barrel = new THREE.Mesh(barrelGeo, metalMat);
    barrel.position.set(0, 0, -0.7);
    gunGroup.add(barrel);

    const cylGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 12);
    cylGeo.rotateX(Math.PI / 2);
    const cyl = new THREE.Mesh(cylGeo, metalMat);
    cyl.position.set(0, -0.05, 0.05);
    gunGroup.add(cyl);

    const gripGeo = new THREE.BoxGeometry(0.18, 0.8, 0.28);
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7,
      metalness: 0.1,
    });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.5, 0.35);
    grip.rotation.x = -0.3;
    gunGroup.add(grip);

    scene.add(gunGroup);
    gunGroupRef.current = gunGroup;

    // 6. Rolling Tumbleweeds
    const tumbleweeds: Array<{ mesh: THREE.Mesh; speed: number; rotSpeed: number }> = [];
    for (let i = 0; i < 3; i++) {
      const twGeo = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.3, 1);
      const twMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        wireframe: true,
        roughness: 0.9,
      });
      const tw = new THREE.Mesh(twGeo, twMat);
      tw.position.set(-15 + i * 12, 0, -5 - i * 4);
      scene.add(tw);
      tumbleweeds.push({
        mesh: tw,
        speed: 0.08 + Math.random() * 0.06,
        rotSpeed: 0.05 + Math.random() * 0.04,
      });
    }
    tumbleweedsRef.current = tumbleweeds;

    // 7. Animation Loop with Gun Recoil and Bandit Hit Reaction
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let recoilTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const isFiring = hasMuzzleFlashRef.current;
      const curOutlawHp = outlawHealthRef.current;

      // Handle Gun Muzzle Flash & Recoil Kickback
      if (isFiring) {
        recoilTime = 1.0;
        if (flashLightRef.current) flashLightRef.current.intensity = 5.0;
      } else {
        recoilTime = Math.max(0, recoilTime - 0.12);
        if (flashLightRef.current) {
          flashLightRef.current.intensity *= 0.5;
        }
      }

      // Smooth gun positioning & recoil
      if (gunGroupRef.current) {
        const baseZ = 3.8;
        const baseY = 0.6;
        gunGroupRef.current.position.z = baseZ + recoilTime * 0.35;
        gunGroupRef.current.position.y = baseY + recoilTime * 0.15;
        gunGroupRef.current.rotation.x = -0.08 + recoilTime * 0.25;

        // Subtle idle breathing
        gunGroupRef.current.position.y += Math.sin(elapsed * 2) * 0.005;
      }

      // Bandit reaction to health loss
      if (banditGroupRef.current) {
        if (curOutlawHp <= 0) {
          // Bandit falls down
          banditGroupRef.current.rotation.z = Math.min(Math.PI / 2, banditGroupRef.current.rotation.z + 0.05);
          banditGroupRef.current.position.y = Math.max(-0.5, banditGroupRef.current.position.y - 0.05);
        } else {
          // Bandit idle sway
          banditGroupRef.current.position.x = Math.sin(elapsed * 1.5) * 0.15;
        }
      }

      // Roll tumbleweeds across the desert
      tumbleweedsRef.current.forEach((tw) => {
        tw.mesh.position.x += tw.speed;
        tw.mesh.rotation.z -= tw.rotSpeed;
        tw.mesh.rotation.y += tw.rotSpeed * 0.5;
        if (tw.mesh.position.x > 18) {
          tw.mesh.position.x = -18;
          tw.mesh.position.z = -5 - Math.random() * 8;
        }
      });

      // Drift desert dust embers with warm wind
      if (dustGeo.attributes.position) {
        const dPos = dustGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < dustCount; i++) {
          dPos[i * 3] += 0.035;
          dPos[i * 3 + 1] += Math.sin(elapsed * 1.5 + i) * 0.004;
          if (dPos[i * 3] > 18) {
            dPos[i * 3] = -18;
          }
        }
        dustGeo.attributes.position.needsUpdate = true;
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
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 1 }}
    />
  );
};
