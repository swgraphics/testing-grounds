import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

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
        material.uniforms.upperColor.value.copy(
            palette.cloudTopColor
        );

        material.uniforms.lowerColor.value.copy(
            palette.cloudBottomColor
        );
    }, [material, palette]);

    useEffect(() => {
        return () => {
            material.dispose();
        };
    }, [material]);

    useFrame(({ camera }) => {
        if (!meshRef.current) return;

        meshRef.current.position.copy(camera.position);
    });
useFrame((state) => {
    material.uniforms.time.value =
        state.clock.elapsedTime;

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