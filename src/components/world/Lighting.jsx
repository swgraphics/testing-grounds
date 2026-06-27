export default function Lighting() {
  return (
    <>
      {/* Overall ambient light */}
      <ambientLight intensity={0.35} />

      {/* Main directional "sun" */}
      <directionalLight
        castShadow
        position={[40, 80, 30]}
        intensity={2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Soft fill light */}
      <hemisphereLight
        intensity={0.5}
        groundColor="#111111"
      />
    </>
  );
}