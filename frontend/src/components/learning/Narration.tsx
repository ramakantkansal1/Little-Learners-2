import { useEffect, useRef, useState } from "react";

export default function Narration({
  text,
  url,
  enabled = true,
}: {
  text: string;
  url?: string | null;
  enabled?: boolean;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [message, setMessage] = useState("");
  useEffect(
    () => () => {
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    },
    [enabled],
  );
  const play = async () => {
    setMessage("");
    if (url) {
      audio.current?.pause();
      audio.current = new Audio(url);
      try {
        await audio.current.play();
      } catch {
        setMessage("Audio is unavailable. Ask a grown-up to read the prompt.");
      }
    } else if ("speechSynthesis" in window) {
      const lang = /[\u0900-\u097F]/.test(text) ? "hi" : "en";
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith(lang));
      if (!voice) {
        setMessage(
          "No matching voice is available. Ask a grown-up to read the prompt.",
        );
        return;
      }
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(text);
      speech.voice = voice;
      speech.lang = voice.lang;
      speech.rate = 0.8;
      speech.onerror = () =>
        setMessage(
          "Narration is unavailable. Ask a grown-up to read the prompt.",
        );
      window.speechSynthesis.speak(speech);
    } else
      setMessage(
        "Narration is unavailable. Ask a grown-up to read the prompt.",
      );
  };
  return (
    <div className="my-3">
      <button
        disabled={!enabled}
        className="btn btn-secondary"
        onClick={play}
        aria-label="Read instructions aloud"
      >
        🔊 Listen
      </button>
      <button
        className="btn btn-ghost"
        onClick={() => {
          audio.current?.pause();
          window.speechSynthesis?.cancel();
        }}
      >
        Stop
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
