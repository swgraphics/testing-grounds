export default function LoadingOverlay({
  visible,
  message = "LOADING WORLD",
}) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="tg-loading-overlay"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="tg-loading-overlay-content">
        <div className="tg-loading-compass-glow" />

        <img
          className="tg-loading-compass-icon"
          src="/images/TG_ICON.svg"
          alt=""
        />

        <div className="tg-loading-overlay-message">
          {message}
        </div>
      </div>
    </div>
  );
}