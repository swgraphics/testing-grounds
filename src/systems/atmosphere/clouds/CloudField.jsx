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
    console.log(
    palette.cloudTopColor.getHexString(),
    palette.cloudBottomColor.getHexString(),
    palette.cloudEdgeColor.getHexString()
);
console.log(
    palette.normalizedSunHeight,
    palette.daylightAmount,
    palette.sunsetAmount
);
    material.uniforms.time.value =
        state.clock.elapsedTime;
    
    material.uniforms.puffiness.value =
        cloudSettings.puffiness;
    
    material.uniforms.speed.value =
        cloudSettings.speed;
    
    material.uniforms.wispy.value =
        cloudSettings.wispy;

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
    
    material.uniforms.upperColor.value.copy(
        palette.cloudTopColor
);
    material.uniforms.lowerColor.value.copy(
        palette.cloudBottomColor
);   
    material.uniforms.edgeColor.value.copy(
        palette.cloudEdgeColor
);
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