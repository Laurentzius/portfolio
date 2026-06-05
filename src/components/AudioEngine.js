export class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    } catch (e) {
      console.warn('Audio Context is not supported in this browser.', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone({ frequency, endFrequency, duration, gainValue, type = 'sine' }) {
    this.init();
    this.resume();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, time);
      if (endFrequency) {
        osc.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
      }
      gain.gain.setValueAtTime(gainValue, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(time + duration);
    } catch (e) {
      // Ignore suspended context edge cases.
    }
  }

  playNavTick() {
    this.playTone({ frequency: 520, endFrequency: 720, duration: 0.035, gainValue: 0.018, type: 'triangle' });
  }

  playAttach() {
    this.playTone({ frequency: 180, endFrequency: 90, duration: 0.08, gainValue: 0.055, type: 'sine' });
    this.playTone({ frequency: 880, endFrequency: 520, duration: 0.018, gainValue: 0.012, type: 'triangle' });
  }

  playUnlock() {
    this.playTone({ frequency: 260, endFrequency: 520, duration: 0.18, gainValue: 0.028, type: 'sine' });
    window.setTimeout(() => this.playTone({ frequency: 390, endFrequency: 780, duration: 0.16, gainValue: 0.022, type: 'sine' }), 85);
  }

  playCubeClack() {
    this.init();
    this.resume();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;

    try {
      // Low bassy wood/plastic resonance resonance
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.06);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(time + 0.06);
      
      // Sharp plastic contact click
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(1000, time);
      click.frequency.exponentialRampToValueAtTime(600, time + 0.015);
      clickGain.gain.setValueAtTime(0.02, time);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.015);
      click.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      click.start();
      click.stop(time + 0.015);
    } catch (e) {
      // Catch suspended context audio issues
    }
  }

}
