import { useEffect, useMemo, useState } from "react";

import { AREA_CONFIG } from "../../config/areaConfig";

const PIXELS_PER_DEGREE = 4;
const MARKER_VISIBILITY_ANGLE = 105;

const DIRECTION_MARKERS = [
  { label: "N", degrees: 0 },
  { label: "NE", degrees: 45 },
  { label: "E", degrees: 90 },
  { label: "SE", degrees: 135 },
  { label: "S", degrees: 180 },
  { label: "SW", degrees: 225 },
  { label: "W", degrees: 270 },
  { label: "NW", degrees: 315 },
];

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function shortestAngleDifference(target, current) {
  return (
    ((target - current + 540) % 360) -
    180
  );
}

function getBearingToArea(playerPosition, areaPosition) {
  const deltaX =
    areaPosition[0] - playerPosition.x;

  const deltaZ =
    areaPosition[2] - playerPosition.z;

  const bearingRadians = Math.atan2(
    deltaX,
    -deltaZ
  );

  return normalizeDegrees(
    bearingRadians * (180 / Math.PI)
  );
}

function getDistanceToArea(playerPosition, areaPosition) {
  const deltaX =
    areaPosition[0] - playerPosition.x;

  const deltaZ =
    areaPosition[2] - playerPosition.z;

  return Math.sqrt(
    deltaX * deltaX +
    deltaZ * deltaZ
  );
}

function CompassDirectionMarker({
  label,
  degrees,
  heading,
}) {
  const difference = shortestAngleDifference(
    degrees,
    heading
  );

  if (
    Math.abs(difference) >
    MARKER_VISIBILITY_ANGLE
  ) {
    return null;
  }

  return (
    <div
      className={`tg-compass-direction ${
        label.length === 1
          ? "cardinal"
          : "diagonal"
      }`}
      style={{
        transform: `translateX(${
          difference * PIXELS_PER_DEGREE
        }px)`,
      }}
    >
      <span>{label}</span>
      <i />
    </div>
  );
}

function CompassAreaMarker({
  area,
  heading,
  playerPosition,
}) {
  const bearing = getBearingToArea(
    playerPosition,
    area.position
  );

  const difference = shortestAngleDifference(
    bearing,
    heading
  );

  if (
    Math.abs(difference) >
    MARKER_VISIBILITY_ANGLE
  ) {
    return null;
  }

  const distance = getDistanceToArea(
    playerPosition,
    area.position
  );

  return (
    <div
      className="tg-compass-area-marker"
      style={{
        transform: `translateX(${
          difference * PIXELS_PER_DEGREE
        }px)`,
      }}
    >
      <span className="tg-compass-area-grid">
        {area.grid}
      </span>

      <span className="tg-compass-area-distance">
        {Math.round(distance)}m
      </span>

      <i />
    </div>
  );
}

export default function CompassRibbon() {
  const [heading, setHeading] = useState(0);

  const [playerPosition, setPlayerPosition] =
    useState({
      x: 0,
      y: 0,
      z: 0,
    });

  useEffect(() => {
    function handleCameraHeading(event) {
      setHeading(
        Number(event.detail?.degrees) || 0
      );
    }

    function handlePlayerPosition(event) {
      if (!event.detail) {
        return;
      }

      setPlayerPosition({
        x: event.detail.x ?? 0,
        y: event.detail.y ?? 0,
        z: event.detail.z ?? 0,
      });
    }

    window.addEventListener(
      "camera-heading-changed",
      handleCameraHeading
    );

    window.addEventListener(
      "player-position-changed",
      handlePlayerPosition
    );

    return () => {
      window.removeEventListener(
        "camera-heading-changed",
        handleCameraHeading
      );

      window.removeEventListener(
        "player-position-changed",
        handlePlayerPosition
      );
    };
  }, []);

  const roundedHeading = useMemo(() => {
    return Math.round(heading)
      .toString()
      .padStart(3, "0");
  }, [heading]);

  return (
    <div
      className="tg-compass-ribbon"
      aria-label={`Heading ${roundedHeading} degrees`}
    >
      <div className="tg-compass-ribbon-viewport">
        <div className="tg-compass-ribbon-track">
          {DIRECTION_MARKERS.map((marker) => (
            <CompassDirectionMarker
              key={marker.label}
              label={marker.label}
              degrees={marker.degrees}
              heading={heading}
            />
          ))}

          {AREA_CONFIG.map((area) => (
            <CompassAreaMarker
              key={area.id}
              area={area}
              heading={heading}
              playerPosition={playerPosition}
            />
          ))}
        </div>
      </div>

      <div className="tg-compass-center-indicator">
        <img
          src="/images/TG_ICON.svg"
          alt=""
        />

        <span>{roundedHeading}°</span>
      </div>
    </div>
  );
}