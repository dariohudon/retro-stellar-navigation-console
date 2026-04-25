"use client";

import { useMemo } from 'react';
import * as THREE from 'three';

interface OrbitPath3DProps {
  radius: number;
  isSelected: boolean;
  segments?: number;
}

export default function OrbitPath3D({
  radius,
  isSelected,
  segments = 128,
}: OrbitPath3DProps) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(radius * Math.cos(t), 0, radius * Math.sin(t)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius, segments]);

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial
        color={isSelected ? '#00FF88' : '#484848'}
        transparent
        opacity={isSelected ? 0.95 : 0.5}
      />
    </lineLoop>
  );
}
