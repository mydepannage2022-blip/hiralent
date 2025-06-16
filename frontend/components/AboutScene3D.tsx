'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Icosahedron, Points, PointMaterial, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const BrainCore = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core Brain Crystal */}
      <Icosahedron args={[1.5, 1]}>
        <meshStandardMaterial
          color="#7C3AED"
          metalness={0.9}
          roughness={0.2}
          emissive="#A855F7"
          emissiveIntensity={0.6}
          wireframe
        />
      </Icosahedron>

      {/* Rotating Cubes */}
      {[...Array(6)].map((_, i) => (
        <Box
          key={i}
          args={[0.3, 0.3, 0.3]}
          position={[
            Math.sin((i / 6) * Math.PI * 2) * 3,
            Math.cos((i / 6) * Math.PI * 2) * 3,
            (i - 3) * 0.5,
          ]}
        >
          <meshStandardMaterial color="#8B5CF6" metalness={0.8} roughness={0.3} />
        </Box>
      ))}

      {/* Particle Aura */}
      <Points limit={1000}>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            count={500}
            array={new Float32Array(
              Array.from({ length: 1500 }, () => (Math.random() - 0.5) * 10)
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <PointMaterial transparent color="#ffffff" size={0.02} sizeAttenuation depthWrite={false} />
      </Points>
    </group>
  );
};

const AboutScene3D = () => {
  return (
    <div className="absolute h-[70vh] w-full overflow-hidden z-0">
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 3, 3]} intensity={1} />
        <BrainCore />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.6} enablePan={false} />
      </Canvas>
    </div>
  );
};

export default AboutScene3D;
