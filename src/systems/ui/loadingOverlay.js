export function showLoadingOverlay(message = "LOADING WORLD") {
  window.dispatchEvent(
    new CustomEvent("tg-loading-start", {
      detail: {
        message,
      },
    })
  );
}

export function hideLoadingOverlay() {
  window.dispatchEvent(
    new CustomEvent("tg-loading-end")
  );
}

/*
 * Useful for quick synchronous operations such as
 * saving settings to localStorage.
 *
 * It guarantees the overlay remains visible long
 * enough for the user to perceive the feedback.
 */
export async function runWithLoadingOverlay(
  callback,
  {
    message = "WORKING",
    minimumDuration = 650,
  } = {}
) {
  const startTime = performance.now();

  showLoadingOverlay(message);

  try {
    await callback();
  } finally {
    const elapsed = performance.now() - startTime;

    const remainingTime = Math.max(
      0,
      minimumDuration - elapsed
    );

    if (remainingTime > 0) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, remainingTime);
      });
    }

    hideLoadingOverlay();
  }
}