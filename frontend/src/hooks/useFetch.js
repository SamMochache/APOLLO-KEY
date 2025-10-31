// frontend/src/hooks/useFetch.js
import { useState, useEffect, useRef } from "react";

export default function useFetch(asyncFn, deps = [], options = {}) {
  const { immediate = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const execute = async (...args) => {
    setLoading(true);
    setError(null);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await asyncFn({ signal: controller.signal }, ...args);
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (immediate) execute();
    return () => abortControllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: execute };
}
