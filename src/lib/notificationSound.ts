// Synthesized with the Web Audio API instead of an mp3 asset — no file to
// source/license, and it still works if the admin panel is opened offline.
export function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const beepAt = (startOffset: number, frequency: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const startTime = ctx.currentTime + startOffset;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    };
    beepAt(0, 880);
    beepAt(0.18, 1175);
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // Browser blocked audio before any user gesture on the page, or
    // AudioContext isn't available — the toast notification still fires.
  }
}
