import { useEffect, useState } from "react";

const TG_VERSION = "1.3.2";

const SPLASH_CARDS = [
  {
    image: "/images/crash-testers/unit-01-river-raft.png",
    quote: "WASD or the stick will get you moving. Unless you are me. I am still stuck in water.",
    attribution: "BOB 001",
  },
  {
    image: "/images/crash-testers/group-hero-shot.png",
    quote: "Look around before you leap. I would say that with confidence if I could see.",
    attribution: "SEYMOUR 004",
  },
  {
    image: "/images/crash-testers/crash-02.png",
    quote: "Big falls are excellent for testing. I have personally completed the flattening portion of the test.",
    attribution: "MATT 003",
  },
  {
    image: "/images/crash-testers/crash-03.png",
    quote: "If you can reach it, you can probably interact with it. If you cannot reach it, try climbing.",
    attribution: "CLIFF 014",
  },
  {
    image: "/images/crash-testers/crash-04.png",
    quote: "Press Q to channel world power. I recommend not channeling it directly into your sleeves.",
    attribution: "FRANK 005",
  },
];

export default function TitleScreen({ onStart }) {
  const [cardIndex, setCardIndex] = useState(0);
  const card = SPLASH_CARDS[cardIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCardIndex((current) => (current + 1) % SPLASH_CARDS.length);
    }, 1500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="tg-title-screen">
      <div className="tg-title-panel tg-splash-panel">
        <div className="tg-title-logo">
          <img className="tg-title-logo-image" src="/images/tg-logo.png" alt="Testing Grounds Logo" />
        </div>

        <div className="tg-splash-card" key={cardIndex}>
          <img src={card.image} alt="Crash Tester field guide" className="tg-splash-image" />
          <div className="tg-splash-copy">
            <div className="tg-splash-quote">“{card.quote}”</div>
            <div className="tg-splash-attribution">— {card.attribution}</div>
          </div>
        </div>

        <div className="tg-splash-dots" aria-label="Crash Tester guide pages">
          {SPLASH_CARDS.map((entry, index) => (
            <button
              key={entry.attribution}
              type="button"
              className={index === cardIndex ? "active" : ""}
              onClick={() => setCardIndex(index)}
              aria-label={`Show Crash Tester ${index + 1} guide`}
            />
          ))}
        </div>

        <div className="tg-title-buttons">
          <button onClick={onStart}>ENTER WORLD</button>
          <button disabled>LOAD WORLD</button>
          <button disabled>SETTINGS</button>
        </div>

        <div className="tg-title-footer">
          <span>TESTING GROUNDS // OVERHAUL {TG_VERSION}</span>
          <span>CREATED BY STEPHEN WILSON</span>
        </div>
      </div>
    </div>
  );
}
