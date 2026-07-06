import { useEffect, useState } from "react";

export default function WorldHUD() {
  const [showArea, setShowArea] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowArea(false);
    }, 3600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="tg-compass-bar">
        <span>A2</span>
        <span className="tg-compass-mark">✦</span>
        <span>N</span>
      </div>

      <div className={`tg-area-overlay ${showArea ? "visible" : ""}`}>
        A1
      </div>

      <div className={`tg-location-label ${showArea ? "visible" : ""}`}>
        A1.VALLEY
      </div>
    </>
  );
}