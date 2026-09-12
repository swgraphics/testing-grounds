import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { cloudSettings } from "./CloudSettings";
import { createCloudMaterial } from "./CloudMaterial";
import { getAtmospherePalette } from "../atmospherePalette";

export default function CloudField() {

    const palette = getAtmospherePalette();

    const meshRef = useRef();

    const material = useMemo(
        () => createCloudMaterial(),
        []
    );

useFrame((state) => {
    
    const palette = getAtmospherePalette();
    material.uniforms.time.value =
        state.clock.elapsedTime;
    
    material.uniforms.speed.value =
        cloudSettings.speed;
    
    material.uniforms.detail.value =
        cloudSettings.detail;

    material.uniforms.coverage.value =
        cloudSettings.coverage;

    material.uniforms.density.value =
        cloudSettings.density;

    material.uniforms.softness.value =
        cloudSettings.softness;

    material.uniforms.brightness.value =
        cloudSettings.brightness;

    material.uniforms.shadowStrength.value =
        cloudSettings.shadowStrength;

    material.uniforms.cloudScale.value =
        cloudSettings.scale;

    material.uniforms.cloudStretch.value =
        cloudSettings.stretch;

    material.uniforms.cloudRotation.value =
        cloudSettings.rotation;
    
    const upperColor = cloudSettings.usePalette
        ? palette.cloudTopColor
        : new THREE.Color(cloudSettings.upperColor);
    const lowerColor = cloudSettings.usePalette
        ? palette.cloudBottomColor
        : new THREE.Color(cloudSettings.lowerColor);
    const edgeColor = cloudSettings.usePalette
        ? palette.cloudEdgeColor
        : new THREE.Color(cloudSettings.edgeColor);

    material.uniforms.upperColor.value.copy(upperColor);
    material.uniforms.lowerColor.value.copy(lowerColor);
    material.uniforms.edgeColor.value.copy(edgeColor);
    meshRef.current.position.copy(
    state.camera.position
);

// TEST: temporarily disable cloud height offset
// meshRef.current.position.y += cloudSettings.height;

});
    return (
        <mesh ref={meshRef}>
            <sphereGeometry
                args={[
                    415,
                    96,
                    48,
                    0,
                    Math.PI * 2,
                    0,
                    Math.PI * 0.72,
                ]}
            />

            <primitive
                object={material}
                attach="material"
            />
        </mesh>
    );
}
