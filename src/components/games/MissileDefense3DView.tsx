import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MissileDefense3DViewProps {
  altitude: number; // 0 to 100
  cityHealth: number; // 0 to 100
  status: 'aiming' | 'intercepted' | 'detonated';
  combo: number;
}

export const MissileDefense3DView: React.FC<MissileDefense3DViewProps> = ({
  altitude,
  cityHealth,
  status,
  combo,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const missileMeshRef = useRef<THREE.Group | null>(null);
  const turretBaseRef = useRef<THREE.Group | null>(null);
  const turretBarrelsRef = useRef<THREE.Group | null>(null);
  const shieldDomeRef = useRef<THREE.Mesh | null>(null);
  const interceptorRocketsRef = useRef<Array<{ mesh: THREE.Group; progress: number; startY: number; targetY: number }>>([]);
  const explosionParticlesRef = useRef<Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }>>([]);
  const radarSweepRef = useRef<THREE.Mesh | null>(null);

  // Sync props to refs to avoid stale closure in Three.js render loop
  const altitudeRef = useRef(altitude);
  altitudeRef.current = altitude;
  const cityHealthRef = useRef(cityHealth);
  cityHealthRef.current = cityHealth;
  const statusRef = useRef(status);
  statusRef.current = status;
  const comboRef = useRef(combo);
  comboRef.current = combo;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 500;

    // 1. Scene, Camera, Cyber Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x020617, 0.02);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 5, 22);
    camera.lookAt(0, 7, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    // 2. Tactical Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x06b6d4, 2.5);
    keyLight.position.set(10, 25, 15);
    scene.add(keyLight);

    const alertLight = new THREE.PointLight(0xef4444, 2, 20);
    alertLight.position.set(0, 15, 0);
    scene.add(alertLight);

    // 3. 3D Cyber City Skyline
    const cityGroup = new THREE.Group();
    cityGroup.position.set(0, -1, 0);

    for (let i = -14; i <= 14; i += 2) {
      const bHeight = 2.5 + Math.sin(i * 1.5) * 1.8 + Math.random() * 1.5;
      const bGeo = new THREE.BoxGeometry(1.6, bHeight, 2.5);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        roughness: 0.3,
      });
      const building = new THREE.Mesh(bGeo, bMat);
      building.position.set(i * 1.4, bHeight / 2, -2 - Math.random() * 2);
      cityGroup.add(building);

      const roofBeaconGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const beacon = new THREE.Mesh(roofBeaconGeo, beaconMat);
      beacon.position.set(i * 1.4, bHeight + 0.05, -2);
      cityGroup.add(beacon);
    }
    scene.add(cityGroup);

    // 4. 3D Defensive Force-Field Shield Dome
    const domeGeo = new THREE.SphereGeometry(12, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      roughness: 0.2,
      metalness: 0.5,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, -1, 0);
    scene.add(dome);
    shieldDomeRef.current = dome;

    // 5. 3D Ground Holographic Radar Grid
    const radarGeo = new THREE.RingGeometry(0.5, 14, 32);
    radarGeo.rotateX(-Math.PI / 2);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const radarRing = new THREE.Mesh(radarGeo, radarMat);
    radarRing.position.y = -0.9;
    scene.add(radarRing);

    const sweepGeo = new THREE.RingGeometry(0.5, 14, 32, 1, 0, Math.PI / 4);
    sweepGeo.rotateX(-Math.PI / 2);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const radarSweep = new THREE.Mesh(sweepGeo, sweepMat);
    radarSweep.position.y = -0.88;
    scene.add(radarSweep);
    radarSweepRef.current = radarSweep;

    // 6. 3D Anti-Air SAM Turret in Center
    const turretGroup = new THREE.Group();
    turretGroup.position.set(0, 0, 4);

    const baseGeo = new THREE.CylinderGeometry(1.2, 1.6, 0.8, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    turretGroup.add(base);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.5;

    const headGeo = new THREE.BoxGeometry(1.2, 0.9, 1.4);
    const headMesh = new THREE.Mesh(headGeo, baseMat);
    headGroup.add(headMesh);

    const barrelGroup = new THREE.Group();
    barrelGroup.position.set(0, 0.3, 0);

    [-0.5, 0.5].forEach((xOff) => {
      const podGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.8, 12);
      podGeo.rotateX(Math.PI / 2);
      const podMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 });
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(xOff, 0, -0.6);
      barrelGroup.add(pod);
    });

    headGroup.add(barrelGroup);
    turretGroup.add(headGroup);
    scene.add(turretGroup);

    turretBaseRef.current = headGroup;
    turretBarrelsRef.current = barrelGroup;

    // 7. 3D Incoming Hypersonic ICBM Missile
    const missileGroup = new THREE.Group();
    missileGroup.position.set(0, 20, 0);
    missileGroup.rotation.x = Math.PI / 1.15;

    const mBodyGeo = new THREE.CylinderGeometry(0.32, 0.38, 3.4, 16);
    const mBodyMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x450a0a,
    });
    const mBody = new THREE.Mesh(mBodyGeo, mBodyMat);
    missileGroup.add(mBody);

    const mNoseGeo = new THREE.ConeGeometry(0.38, 1.2, 16);
    const mNoseMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const mNose = new THREE.Mesh(mNoseGeo, mNoseMat);
    mNose.position.y = 2.2;
    missileGroup.add(mNose);

    for (let f = 0; f < 4; f++) {
      const finGeo = new THREE.BoxGeometry(0.08, 0.8, 0.6);
      const fin = new THREE.Mesh(finGeo, mBodyMat);
      fin.position.y = -1.4;
      fin.rotation.y = (f * Math.PI) / 2;
      fin.position.x = Math.sin((f * Math.PI) / 2) * 0.45;
      fin.position.z = Math.cos((f * Math.PI) / 2) * 0.45;
      missileGroup.add(fin);
    }

    const exhaustGeo = new THREE.ConeGeometry(0.3, 1.8, 12);
    exhaustGeo.rotateX(Math.PI);
    const exhaustMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaust.position.y = -2.5;
    missileGroup.add(exhaust);

    scene.add(missileGroup);
    missileMeshRef.current = missileGroup;

    // Helper: 3D particle explosion with dual-color plasma burst
    const create3DExplosion = (x: number, y: number, z: number, primaryColor: number, secondaryColor: number) => {
      const particleCount = 42;
      for (let i = 0; i < particleCount; i++) {
        const isSec = Math.random() > 0.5;
        const color = isSec ? secondaryColor : primaryColor;
        const pGeo = new THREE.SphereGeometry(0.22 + Math.random() * 0.2, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0 });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.set(x, y, z);
        scene.add(p);

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 0.3 + Math.random() * 0.7;

        explosionParticlesRef.current.push({
          mesh: p,
          vx: Math.sin(phi) * Math.cos(theta) * speed,
          vy: Math.cos(phi) * speed,
          vz: Math.sin(phi) * Math.sin(theta) * speed,
          life: 1.0,
        });
      }
    };

    let prevStatus = statusRef.current;

    // 8. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const curAlt = altitudeRef.current;
      const curHp = cityHealthRef.current;
      const curStatus = statusRef.current;

      // Detect status transitions to spawn 3D explosion effects
      if (curStatus !== prevStatus) {
        if (curStatus === 'intercepted' && missileMeshRef.current) {
          create3DExplosion(
            missileMeshRef.current.position.x,
            missileMeshRef.current.position.y,
            missileMeshRef.current.position.z,
            0x10b981, // Emerald plasma
            0x06b6d4  // Cyan spark
          );
        } else if (curStatus === 'detonated') {
          create3DExplosion(
            0,
            1,
            0,
            0xef4444, // Red detonation shockwave
            0xf59e0b  // Fiery amber
          );
        }
        prevStatus = curStatus;
      }

      // Radar scan rotation
      if (radarSweepRef.current) {
        radarSweepRef.current.rotation.y += 0.035;
      }

      // Dynamic Shield Dome color tied to real city health
      if (shieldDomeRef.current) {
        shieldDomeRef.current.rotation.y += 0.003;
        const mat = shieldDomeRef.current.material as THREE.MeshPhysicalMaterial;
        if (curHp <= 0) {
          mat.opacity = 0;
        } else if (curHp <= 35) {
          mat.color.setHex(0xef4444);
          mat.opacity = 0.2 + Math.sin(elapsed * 10) * 0.15;
        } else if (curHp <= 70) {
          mat.color.setHex(0xf59e0b);
          mat.opacity = 0.25;
        } else {
          mat.color.setHex(0x10b981);
          mat.opacity = 0.28;
        }
      }

      // Dynamic 3D Hypersonic Missile Descent tied to Altitude
      if (missileMeshRef.current) {
        if (curStatus === 'intercepted') {
          missileMeshRef.current.visible = false;
        } else {
          missileMeshRef.current.visible = true;
          // As altitude goes from 100 to 0, Y goes from 22 to 1
          const targetY = 1 + (curAlt / 100) * 20;
          missileMeshRef.current.position.y += (targetY - missileMeshRef.current.position.y) * 0.15;
          missileMeshRef.current.rotation.z = Math.sin(elapsed * 6) * 0.05;
        }
      }

      // Turret aims smoothly toward missile in 3D
      if (turretBaseRef.current && missileMeshRef.current) {
        const dx = missileMeshRef.current.position.x - turretGroup.position.x;
        const dz = missileMeshRef.current.position.z - turretGroup.position.z;
        const targetAngleY = Math.atan2(dx, dz);
        turretBaseRef.current.rotation.y += (targetAngleY - turretBaseRef.current.rotation.y) * 0.1;

        if (turretBarrelsRef.current) {
          const dy = missileMeshRef.current.position.y - turretGroup.position.y;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const targetElevation = -Math.atan2(dy, dist) * 0.7;
          turretBarrelsRef.current.rotation.x += (targetElevation - turretBarrelsRef.current.rotation.x) * 0.1;
        }
      }

      // Update Explosions
      for (let i = explosionParticlesRef.current.length - 1; i >= 0; i--) {
        const p = explosionParticlesRef.current[i];
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;
        p.life -= 0.04;
        p.mesh.scale.multiplyScalar(0.96);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life);
        if (p.life <= 0) {
          scene.remove(p.mesh);
          explosionParticlesRef.current.splice(i, 1);
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
