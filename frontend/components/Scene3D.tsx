'use client';

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Sphere, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const AIOrb = ({ scrollOffset }: { scrollOffset: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentRotation = useRef(0);
  const [scale, setScale] = useState<[number, number, number]>([1, 1, 1]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScale([0.6, 0.6, 0.6]); // sm
      } else if (width < 1024) {
        setScale([0.6,0.6,0.6]); // md
      } else if (width < 1440){
        setScale([0.6,0.6,0.6 ]); // lg
      }else {
        setScale([1, 1, 1]); // xl
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useFrame(() => {
    const targetRotation = scrollOffset * 0.001;
    currentRotation.current = THREE.MathUtils.lerp(currentRotation.current, targetRotation, 0.05);

    if (groupRef.current) {
      groupRef.current.rotation.y = currentRotation.current;
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Core Sphere */}
      <Sphere args={[3, 32, 32]}>
        <meshStandardMaterial
          color="#00F5DA"
          metalness={1}
          roughness={0.1}
          emissive="#00F5DA"
          emissiveIntensity={0.5}
          wireframe
        />
      </Sphere>

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

const Scene3D = () => {
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollOffset(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed hidden lg:block top-0 right-0 h-screen sm:w-[100vw] lg:w-[50vw] xl:w-[65vw] -z-10">
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <AIOrb scrollOffset={scrollOffset} />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate={false} />
      </Canvas>
    </div>
  );
};

export default Scene3D;
