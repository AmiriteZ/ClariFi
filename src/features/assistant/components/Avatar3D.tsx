import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

interface Avatar3DProps {
  isTalking?: boolean;
  modelPath?: string; // Path to GLTF model (optional for now)
}

// Separate component for loading GLTF model
function ModelLoader({
  modelPath,
  isTalking,
}: {
  modelPath: string;
  isTalking: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelPath);

  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      // Only rotate when talking
      if (isTalking) {
        meshRef.current.rotation.y =
          Math.PI / 2 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      } else {
        meshRef.current.rotation.y = Math.PI / 2; // Face the camera (90 degrees)
      }
    }
  });

  return (
    <primitive
      ref={meshRef}
      object={scene.clone()}
      scale={10}
      position={[0, -1, 0]}
      rotation={[0, Math.PI / 2, 0]}
    />
  );
}

// Fallback sphere component
function FallbackSphere({ isTalking }: { isTalking: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;

      // Subtle rotation when talking
      if (isTalking) {
        meshRef.current.rotation.y =
          Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color={hovered ? "#10b981" : "#6366f1"}
        metalness={0.6}
        roughness={0.2}
        emissive={isTalking ? "#10b981" : "#000000"}
        emissiveIntensity={isTalking ? 0.3 : 0}
      />
    </mesh>
  );
}

export default function Avatar3D({
  isTalking = false,
  modelPath,
}: Avatar3DProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, 5, 5]} intensity={0.5} />

        {modelPath ? (
          <ModelLoader modelPath={modelPath} isTalking={isTalking} />
        ) : (
          <FallbackSphere isTalking={isTalking} />
        )}

        <Environment preset="sunset" />
      </Canvas>
    </div>
  );
}
