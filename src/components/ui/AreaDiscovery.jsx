import { useEffect, useRef, useState } from "react";

import { AREA_CONFIG } from "../../config/areaConfig";

const EXIT_BUFFER = 18;
const DISPLAY_DURATION = 2600;
const FADE_DURATION = 900;

function horizontalDistance(position, areaPosition) {
  const deltaX = position.x - areaPosition[0];
  const deltaZ = position.z - areaPosition[2];

  return Math.sqrt(
    deltaX * deltaX +
    deltaZ * deltaZ
  );
}

export default function AreaDiscovery() {
  const [activeArea, setActiveArea] = useState(null);
  const [visible, setVisible] = useState(false);

  const enteredAreasRef = useRef(new Set());
  const fadeTimerRef = useRef(null);
  const clearTimerRef = useRef(null);

  useEffect(() => {
    function clearTimers() {
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
      }

      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
    }

    function showArea(area) {
      clearTimers();

      setActiveArea(area);
      setVisible(true);

      fadeTimerRef.current = window.setTimeout(() => {
        setVisible(false);
      }, DISPLAY_DURATION);

      clearTimerRef.current = window.setTimeout(() => {
        setActiveArea(null);
      }, DISPLAY_DURATION + FADE_DURATION);
    }

    function handlePlayerPosition(event) {
      const position = event.detail;

      if (!position) {
        return;
      }

      const nearbyAreas = [];

      AREA_CONFIG.forEach((area) => {
        const distance = horizontalDistance(
          position,
          area.position
        );

        const entered =
          enteredAreasRef.current.has(area.id);

        if (
          distance <= area.discoveryRadius &&
          !entered
        ) {
          nearbyAreas.push({
            area,
            distance,
          });
        }

        if (
          distance >
          area.discoveryRadius + EXIT_BUFFER
        ) {
          enteredAreasRef.current.delete(area.id);
        }
      });

      if (nearbyAreas.length === 0) {
        return;
      }

      nearbyAreas.sort(
        (first, second) =>
          first.distance - second.distance
      );

      const nearestArea = nearbyAreas[0].area;

      enteredAreasRef.current.add(nearestArea.id);
      showArea(nearestArea);
    }

    window.addEventListener(
      "player-position-changed",
      handlePlayerPosition
    );

    return () => {
      window.removeEventListener(
        "player-position-changed",
        handlePlayerPosition
      );

      clearTimers();
    };
  }, []);

  if (!activeArea) {
    return null;
  }

  return (
    <div
      className={`tg-area-discovery ${
        visible ? "visible" : ""
      }`}
      aria-live="polite"
    >
      <div className="tg-area-discovery-grid">
        {activeArea.grid}
      </div>

      <div className="tg-area-discovery-banner">
        <span className="tg-area-discovery-banner-grid">
          {activeArea.grid}
        </span>

        <span>{activeArea.name}</span>
      </div>
    </div>
  );
}