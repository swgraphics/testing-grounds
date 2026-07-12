const TG_VERSION = "0.1.0";

export default function TitleScreen({ onStart }) {
  return (
    <div className="tg-title-screen">
      <div className="tg-title-panel">
        <div className="tg-title-logo">
          <img
            className="tg-title-logo-image"
            src="/images/tg-logo.png"
            alt="Testing Grounds Logo"
          />
        </div>

        <div className="tg-title-buttons">
          <button onClick={onStart}>ENTER WORLD</button>
          <button>LOAD WORLD</button>
          <button>SETTINGS</button>
        </div>

        <div className="tg-title-footer">
  <span>TESTING GROUNDS</span>
  <span>V{TG_VERSION}</span>
</div>
      </div>
    </div>
  );
}