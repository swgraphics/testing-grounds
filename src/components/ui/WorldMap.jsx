import { useEffect, useRef, useState } from "react";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";
import { useWorldStore } from "../../systems/world/worldStore";

const SIZE = 84;
const WORLD_HALF = 300;

export default function WorldMap() {
  const canvasRef = useRef(null);
  const [player, setPlayer] = useState({ x: 80, z: -160 });
  const currentChunkId = useWorldStore((state) => state.world.currentChunkId);
  const chunk = useWorldStore((state) => state.world.chunks[state.world.currentChunkId]);

  useEffect(() => {
    function onPlayer(event) {
      setPlayer({ x: Number(event.detail?.x) || 0, z: Number(event.detail?.z) || 0 });
    }
    window.addEventListener("player-position-changed", onPlayer);
    return () => window.removeEventListener("player-position-changed", onPlayer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(SIZE, SIZE);
    for (let py = 0; py < SIZE; py += 1) {
      for (let px = 0; px < SIZE; px += 1) {
        const x = ((px / (SIZE - 1)) * 2 - 1) * WORLD_HALF;
        const z = ((py / (SIZE - 1)) * 2 - 1) * WORLD_HALF;
        const h = getTerrainHeightAt(x, z);
        const shade = Math.max(8, Math.min(160, Math.round(38 + h * 1.15)));
        const index = (py * SIZE + px) * 4;
        if (h <= -4) {
          image.data[index] = 70;
          image.data[index + 1] = 122;
          image.data[index + 2] = 154;
        } else {
          image.data[index] = shade;
          image.data[index + 1] = shade + 5;
          image.data[index + 2] = shade + 9;
        }
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    const px = ((player.x + WORLD_HALF) / (WORLD_HALF * 2)) * SIZE;
    const py = ((player.z + WORLD_HALF) / (WORLD_HALF * 2)) * SIZE;
    ctx.fillStyle = "#cd2626";
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [player.x, player.z, currentChunkId, chunk?.terrain?.terrainEditVersion]);

  return (
    <div className="tg-world-map-canvas-wrap">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} className="tg-world-map-canvas" />
      <div className="tg-world-map-overlay-label">LIVE WORLD MAP</div>
    </div>
  );
}
