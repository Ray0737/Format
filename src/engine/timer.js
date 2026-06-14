// Format — study mode countdown timer engine

window.Format = window.Format || {};

(function () {
  // Creates an independent countdown timer instance.
  function create() {
    let total = 0;
    let remaining = 0;
    let intervalId = null;
    const tickListeners = [];
    const completeListeners = [];

    function snapshot() {
      return {
        total,
        remaining,
        elapsed: total - remaining,
        progress: total > 0 ? Math.min(1, (total - remaining) / total) : 0,
      };
    }

    function emitTick() {
      const state = snapshot();
      tickListeners.forEach((cb) => cb(state));
    }

    function clearTimer() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function tick() {
      remaining = Math.max(0, remaining - 1);
      emitTick();
      if (remaining <= 0) {
        clearTimer();
        completeListeners.forEach((cb) => cb(snapshot()));
      }
    }

    function start(totalSeconds) {
      total = Math.max(1, Math.round(totalSeconds));
      remaining = total;
      clearTimer();
      intervalId = setInterval(tick, 1000);
      emitTick();
    }

    function pause() {
      clearTimer();
    }

    function resume() {
      if (intervalId !== null || remaining <= 0) return;
      intervalId = setInterval(tick, 1000);
    }

    function reset() {
      clearTimer();
      remaining = total;
      emitTick();
    }

    function stop() {
      clearTimer();
      total = 0;
      remaining = 0;
    }

    function isRunning() {
      return intervalId !== null;
    }

    function onTick(cb) {
      tickListeners.push(cb);
    }

    function onComplete(cb) {
      completeListeners.push(cb);
    }

    return {
      start,
      pause,
      resume,
      reset,
      stop,
      isRunning,
      onTick,
      onComplete,
      snapshot,
    };
  }

  Format.Timer = { create };
})();
