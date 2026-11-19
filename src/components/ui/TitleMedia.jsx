import { useState } from "react";
import { TITLE_MEDIA } from "../../config/titleMedia";
export default function TitleMedia() {
  const [failed, setFailed] = useState(false);
  const hasMedia = Boolean(TITLE_MEDIA.src && !failed);
  return <div className={`tg-title-media ${hasMedia ? "" : "tg-title-media-window"}`} role="img" aria-label={hasMedia ? TITLE_MEDIA.alt : "Window onto the rotating world"}>
    {hasMedia && (TITLE_MEDIA.type === "video"
      ? <video src={TITLE_MEDIA.src} muted autoPlay loop playsInline onError={() => setFailed(true)} />
      : <img src={TITLE_MEDIA.src} alt={TITLE_MEDIA.alt} onError={() => setFailed(true)} />)}
  </div>;
}
