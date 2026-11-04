import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@services/api";

export function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setError("");
    try {
      const value = (await api.get<T>(path)).data;
      if (request !== generation.current) return;
      setData(
        (value && typeof value === "object" && "logs" in value
          ? (value as { logs: T }).logs
          : value) as T,
      );
    } catch {
      if (request === generation.current)
        setError("Could not load this information. Please try again.");
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return { data, error, reload };
}
