let audio: HTMLAudioElement | null = null

/** Little cha-ching for manual expense adds. Fails silently (autoplay policy, missing file). */
export function playChaching() {
  try {
    if (!audio) {
      audio = new Audio('./cha-ching.mp3')
      audio.preload = 'auto'
    }
    audio.currentTime = 0
    void audio.play().catch(() => { /* browser blocked it — fine */ })
  } catch { /* no audio support */ }
}
