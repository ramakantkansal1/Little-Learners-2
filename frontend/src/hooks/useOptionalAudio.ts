import { useEffect, useRef, useState } from "react";

/** Optional answer clips share the same mute and cleanup behavior as narration. */
export function useOptionalAudio(enabled: boolean) {
  const clip = useRef<HTMLAudioElement | null>(null);
  const [message, setMessage] = useState("");
  useEffect(
    () => () => {
      clip.current?.pause();
    },
    [enabled],
  );
  const play = async (url: string | null) => {
    if (!enabled || !url) return;
    clip.current?.pause();
    clip.current = new Audio(url);
    try {
      await clip.current.play();
      setMessage("");
    } catch {
      setMessage(
        "This audio is unavailable. Ask a grown-up to read the option.",
      );
    }
  };
  return { play, message };
}
