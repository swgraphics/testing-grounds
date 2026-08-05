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

useEffect(() => {

    material.uniforms.upperColor.value.set(
        cloudSettings.upperColor
    );

    material.uniforms.lowerColor.value.set(
        cloudSettings.lowerColor
    );

}, [material]);

useFrame((state) => {

    material.uniforms.time.value =
        state.clock.elapsedTime;

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
    
        material.uniforms.upperColor.value.set(
        cloudSettings.upperColor
);

material.uniforms.lowerColor.value.set(
    cloudSettings.lowerColor
);    
    
    console.log(
        material.uniforms.upperColor.value,
        material.uniforms.lowerColor.value
);
    meshRef.current.position.copy(
        state.camera.position
    );

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
                    Math.PI / 2,
                ]}
            />

            <primitive
                object={material}
                attach="material"
            />
        </mesh>
    );
}