// Web Audio API based authentic telephone dial tones, WhatsApp ringers, and call audio effects
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.ringInterval = null;
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // 1. Outgoing Calling Dial Tone ("Tuuuut... Tuuuut...")
  startOutgoingDialTone() {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playBeep = () => {
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // Standard 440Hz + 480Hz telephone dial tone
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.35);
        osc2.stop(ctx.currentTime + 1.35);
      } catch (e) {
        console.warn('Dial tone note:', e);
      }
    };

    playBeep();
    this.ringInterval = setInterval(playBeep, 3500);
  }

  // 2. Incoming WhatsApp Ringtone (Upbeat melodic pattern)
  startIncomingRingtone() {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 659.25, time: 0.0, dur: 0.15 }, // E5
      { freq: 830.61, time: 0.18, dur: 0.15 }, // G#5
      { freq: 987.77, time: 0.36, dur: 0.18 }, // B5
      { freq: 1108.73, time: 0.58, dur: 0.22 }, // C#6
      { freq: 987.77, time: 0.85, dur: 0.25 }, // B5
      { freq: 830.61, time: 1.15, dur: 0.3 }  // G#5
    ];

    const playRingtoneCycle = () => {
      try {
        const now = ctx.currentTime;
        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + time);

          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.12, now + time + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur + 0.05);
        });
      } catch (e) {
        console.warn('Ringtone note:', e);
      }
    };

    playRingtoneCycle();
    this.ringInterval = setInterval(playRingtoneCycle, 2400);
  }

  // 3. Call Connected Pleasant Chime
  playCallConnected() {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.12, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.28);
      });
    } catch (e) {}
  }

  // 4. Call End Tone (Descending 3-beep drop tone)
  playCallEnd() {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 370, 311].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.14, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.12);
      });
    } catch (e) {}
  }

  stopAll() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

export const soundEffects = new SoundEffects();
export default soundEffects;
