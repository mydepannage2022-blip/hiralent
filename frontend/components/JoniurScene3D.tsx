'use client';

import { useRef , useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {  Box ,PerspectiveCamera, OrbitControls, Sphere, Torus, Icosahedron, Points, PointMaterial } from '@react-three/drei';

import * as THREE from 'three';

const AIOrb = ({ isHovered }: { isHovered: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += isHovered ? 0.0004 : 0.0004;
    }
  });

  return (
    <group ref={groupRef} scale={[1, 1, 1]}>
      {/* Core Sphere */}
      <Sphere args={[4, 24, 24]}>
        <meshStandardMaterial
          color="#0EF6CC"
          metalness={1}
          roughness={0.1}
          emissive="#00fff7"
          emissiveIntensity={0.5}
          wireframe
        />
      </Sphere>

      {/* Neural Web Ring */}

      {/* Dotted Aura */}
      <Points limit={10000}>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            count={500}
            array={new Float32Array(
              Array.from({ length: 1500 }, () => (Math.random() - 1) * 8)
            )}
            itemSize={3}
          />

        </bufferGeometry>

        <PointMaterial transparent color="#ffffff" size={0.02} sizeAttenuation depthWrite={false} />
      </Points>
    </group>
  );
};

const JoniurScene3D = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    // <div className="fixed top-0 right-0 h-screen w-[50vw] -z-10">
  <div
  className="fixed top-0 right-0 h-[600px] w-[50vw] -z-10"
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={100} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <AIOrb isHovered={isHovered} />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.1} />
      </Canvas>
    </div>
  );
};

export default JoniurScene3D;
