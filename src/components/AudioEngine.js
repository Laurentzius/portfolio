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
