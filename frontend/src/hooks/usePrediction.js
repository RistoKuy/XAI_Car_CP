import { useCallback, useRef, useState } from "react";
import { createPrediction } from "../services/api.js";

export function usePrediction() {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const predict = useCallback(async (payload) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading");
    setError(null);
    try {
      const result = await createPrediction(payload, { signal: ctrl.signal });
      setData(result);
      setStatus("success");
      return result;
    } catch (e) {
      if (ctrl.signal.aborted) return null;
      setError(e.message);
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setData(null);
    setError(null);
  }, []);

  return { status, data, error, predict, reset };
}
