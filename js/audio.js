/**
 * DungeonAudio — Lightweight procedural Web Audio sound effects.
 * Produces tactile stone clicks, iron clanks, failed-seal rumbles, and unlock chimes
 * with zero external audio assets.
 */
(function (global) {
  'use strict';

  class DungeonAudio {
    constructor() {
      this.enabled = true;
      this.ctx = null;
      this._activeStops = new Set();
    }

    setEnabled(val) {
      this.enabled = Boolean(val);
      if (!this.enabled) {
        this.stopAll();
      }
    }

    stopAll() {
      this._activeStops.forEach((fn) => {
        try {
          fn();
        } catch (_e) {
          // Ignore cleanup errors
        }
      });
      this._activeStops.clear();
    }

    ensureContext() {
      if (!this.enabled) return null;
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    playStoneClick(pitch = 160) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    }

    playIronClank() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Crisp mechanical latch click
      const latch = ctx.createOscillator();
      const latchGain = ctx.createGain();
      latch.type = 'triangle';
      latch.frequency.setValueAtTime(320, now);
      latch.frequency.exponentialRampToValueAtTime(90, now + 0.025);
      latchGain.gain.setValueAtTime(0.14, now);
      latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
      latch.connect(latchGain);
      latchGain.connect(ctx.destination);
      latch.start(now);
      latch.stop(now + 0.035);

      // 2. Heavy cast-iron thud at the end of the throw ("ka-CLUNK")
      const hit = now + 0.045;
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(98, hit);
      thud.frequency.exponentialRampToValueAtTime(36, hit + 0.11);
      thudGain.gain.setValueAtTime(0.001, hit);
      thudGain.gain.linearRampToValueAtTime(0.42, hit + 0.004);
      thudGain.gain.exponentialRampToValueAtTime(0.001, hit + 0.13);
      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(hit);
      thud.stop(hit + 0.14);

      // 3. Short low-passed mechanical impact transient (no hiss)
      const noiseLen = Math.floor(ctx.sampleRate * 0.032);
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.28));
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(950, hit);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.24, hit);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, hit + 0.032);
      noiseSrc.connect(lp);
      lp.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSrc.start(hit);
      noiseSrc.stop(hit + 0.036);

      // 4. Tight, damped iron-on-iron sine partials (no sawtooth buzz)
      [
        { freq: 312, amp: 0.11, dur: 0.1 },
        { freq: 587, amp: 0.075, dur: 0.075 },
        { freq: 1090, amp: 0.04, dur: 0.05 },
      ].forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, hit);
        osc.frequency.exponentialRampToValueAtTime(p.freq * 0.96, hit + p.dur);
        gain.gain.setValueAtTime(p.amp, hit);
        gain.gain.exponentialRampToValueAtTime(0.001, hit + p.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(hit);
        osc.stop(hit + p.dur + 0.01);
      });
    }

    playLockedRumble() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Classic 4-note muted sad trombone ("wah-wah-wah-waaaah")
      const notes = [
        { offset: 0.0, dur: 0.29, fStart: 224, fMain: 233.08, fEnd: 228, droop: false },
        { offset: 0.32, dur: 0.29, fStart: 214, fMain: 220.0, fEnd: 215, droop: false },
        { offset: 0.64, dur: 0.29, fStart: 202, fMain: 207.65, fEnd: 202, droop: false },
        { offset: 0.96, dur: 0.88, fStart: 191, fMain: 196.0, fEnd: 164.0, droop: true },
      ];

      notes.forEach((n) => {
        const start = now + n.offset;
        const end = start + n.dur;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.fStart, start);
        osc.frequency.linearRampToValueAtTime(n.fMain, start + 0.055);
        if (n.droop) {
          osc.frequency.setValueAtTime(n.fMain, start + 0.22);
          osc.frequency.exponentialRampToValueAtTime(n.fEnd, end);
        } else {
          osc.frequency.linearRampToValueAtTime(n.fEnd, end);
        }

        // Expressive pitch vibrato on the final droopy note
        let vib = null;
        if (n.droop) {
          vib = ctx.createOscillator();
          const vibGain = ctx.createGain();
          vib.type = 'sine';
          vib.frequency.setValueAtTime(5.6, start);
          vibGain.gain.setValueAtTime(0, start);
          vibGain.gain.linearRampToValueAtTime(4.2, start + 0.18);
          vib.connect(vibGain);
          vibGain.connect(osc.frequency);
          vib.start(start);
          vib.stop(end + 0.03);
        }

        // Brass mute "wah" filter envelope
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(3.4, start);
        filter.frequency.setValueAtTime(380, start);
        filter.frequency.exponentialRampToValueAtTime(1450, start + 0.07);
        filter.frequency.exponentialRampToValueAtTime(n.droop ? 420 : 680, end);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
        gain.gain.setValueAtTime(0.18, end - (n.droop ? 0.25 : 0.06));
        gain.gain.exponentialRampToValueAtTime(0.001, end);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(end + 0.03);
      });
    }

    playUnlockChord() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Multiple high-pitched voices cheering "YAY!" via /j/ -> /eɪ/ formant synthesis
      const voices = [
        { offset: 0.0, pitch: 495, dur: 0.48, pan: -0.55 },
        { offset: 0.016, pitch: 555, dur: 0.52, pan: 0.45 },
        { offset: 0.031, pitch: 620, dur: 0.46, pan: -0.25 },
        { offset: 0.047, pitch: 675, dur: 0.54, pan: 0.25 },
        { offset: 0.064, pitch: 745, dur: 0.49, pan: -0.6 },
        { offset: 0.079, pitch: 815, dur: 0.45, pan: 0.6 },
      ];

      voices.forEach((v, idx) => {
        const start = now + v.offset;
        const end = start + v.dur;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(v.pitch * 0.92, start);
        osc.frequency.exponentialRampToValueAtTime(v.pitch * 1.18, start + 0.11);
        osc.frequency.exponentialRampToValueAtTime(v.pitch * 1.02, end);

        const f1 = ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.Q.setValueAtTime(5.2, start);
        f1.frequency.setValueAtTime(360 + idx * 14, start);
        f1.frequency.exponentialRampToValueAtTime(600 + idx * 18, start + 0.09);
        f1.frequency.linearRampToValueAtTime(650 + idx * 18, end);

        const f2 = ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.Q.setValueAtTime(7.0, start);
        f2.frequency.setValueAtTime(2650 + idx * 45, start);
        f2.frequency.exponentialRampToValueAtTime(2150 + idx * 35, start + 0.09);
        f2.frequency.linearRampToValueAtTime(1950 + idx * 35, end);

        const f3 = ctx.createBiquadFilter();
        f3.type = 'bandpass';
        f3.Q.setValueAtTime(8.0, start);
        f3.frequency.setValueAtTime(3450, start);
        f3.frequency.linearRampToValueAtTime(3150, end);

        const f1Gain = ctx.createGain();
        f1Gain.gain.value = 0.72;
        const f2Gain = ctx.createGain();
        f2Gain.gain.value = 0.55;
        const f3Gain = ctx.createGain();
        f3Gain.gain.value = 0.2;

        const master = ctx.createGain();
        master.gain.setValueAtTime(0.001, start);
        master.gain.linearRampToValueAtTime(0.085, start + 0.032);
        master.gain.setValueAtTime(0.075, start + v.dur * 0.52);
        master.gain.exponentialRampToValueAtTime(0.001, end);

        osc.connect(f1);
        osc.connect(f2);
        osc.connect(f3);
        f1.connect(f1Gain);
        f2.connect(f2Gain);
        f3.connect(f3Gain);
        f1Gain.connect(master);
        f2Gain.connect(master);
        f3Gain.connect(master);

        if (typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(v.pan, start);
          master.connect(panner);
          panner.connect(ctx.destination);
        } else {
          master.connect(ctx.destination);
        }

        osc.start(start);
        osc.stop(end + 0.03);
      });
    }

    playVictoryFanfare() {
      this.playUnlockChord();
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + 0.14 + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.11, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 1.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 1.2);
      });
    }

    /**
     * Plays a clear resonant stone-chime pitch for musical rune puzzles.
     */
    playRuneChime(freq, duration = 1.1) {
      const ctx = this.ensureContext();
      if (!ctx || !freq) return;
      const now = ctx.currentTime;

      const mainOsc = ctx.createOscillator();
      const mainGain = ctx.createGain();
      mainOsc.type = 'sine';
      mainOsc.frequency.setValueAtTime(freq, now);
      mainGain.gain.setValueAtTime(0.001, now);
      mainGain.gain.linearRampToValueAtTime(0.22, now + 0.015);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      mainOsc.connect(mainGain);
      mainGain.connect(ctx.destination);
      mainOsc.start(now);
      mainOsc.stop(now + duration + 0.04);

      const overOsc = ctx.createOscillator();
      const overGain = ctx.createGain();
      overOsc.type = 'triangle';
      overOsc.frequency.setValueAtTime(freq * 2, now);
      overGain.gain.setValueAtTime(0.001, now);
      overGain.gain.linearRampToValueAtTime(0.035, now + 0.01);
      overGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.45);
      overOsc.connect(overGain);
      overGain.connect(ctx.destination);
      overOsc.start(now);
      overOsc.stop(now + duration * 0.5);
    }

    /**
     * Plays a pure brass tuning-fork reference tone.
     */
    playTuningFork(freq = 440, duration = 1.45) {
      const ctx = this.ensureContext();
      if (!ctx || !freq) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.04);
    }

    /**
     * Synthesizes a single hollow stone wall knock at a specific AudioContext time.
     */
    _scheduleSingleKnock(ctx, when, pitchJitter = 1, activeNodes = null) {
      const osc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(168 * pitchJitter, when);
      osc.frequency.exponentialRampToValueAtTime(64 * pitchJitter, when + 0.075);

      bodyGain.gain.setValueAtTime(0.001, when);
      bodyGain.gain.linearRampToValueAtTime(0.38, when + 0.004);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, when + 0.085);

      osc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.095);

      // Short filtered noise transient for physical knuckle-on-masonry attack
      const bufLen = Math.floor(ctx.sampleRate * 0.045);
      const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.32));
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420 * pitchJitter, when);
      filter.Q.setValueAtTime(1.6, when);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.24, when);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.045);

      noiseSrc.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSrc.start(when);
      noiseSrc.stop(when + 0.05);

      if (activeNodes) {
        activeNodes.push(osc, noiseSrc);
      }
    }

    /**
     * Computes knock timestamps (in seconds) for a Polybius sequence [[row, col], ...].
     */
    computeKnockTimeline(sequence, speed = 1) {
      const rate = Math.max(0.5, Math.min(2, Number(speed) || 1));
      const intraGap = 0.24 / rate;
      const pairGap = 0.72 / rate;
      const letterGap = 1.55 / rate;
      const leadIn = 0.18 / rate;
      const tailPad = 0.55 / rate;

      const offsets = [];
      let t = leadIn;
      (sequence || []).forEach((pair, pIdx) => {
        const row = Number(pair[0]) || 0;
        const col = Number(pair[1]) || 0;
        for (let r = 0; r < row; r++) {
          offsets.push(t);
          if (r < row - 1) t += intraGap;
        }
        t += pairGap;
        for (let c = 0; c < col; c++) {
          offsets.push(t);
          if (c < col - 1) t += intraGap;
        }
        if (pIdx < sequence.length - 1) {
          t += letterGap;
        }
      });
      return { offsets, totalDuration: t + tailPad };
    }

    /**
     * Plays a Polybius knock sequence and returns a handle { stop(), totalDuration }.
     */
    playKnockSequence(sequence, options = {}) {
      const ctx = this.ensureContext();
      if (!ctx) return null;

      this.stopAll();
      const speed = options.speed || 1;
      const { offsets, totalDuration } = this.computeKnockTimeline(sequence, speed);
      const startTime = ctx.currentTime + 0.04;
      const activeNodes = [];

      offsets.forEach((off, idx) => {
        const jitter = 0.96 + ((idx * 37) % 9) * 0.01;
        this._scheduleSingleKnock(ctx, startTime + off, jitter, activeNodes);
      });

      let stopped = false;
      let rafId = null;

      const stop = () => {
        if (stopped) return;
        stopped = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
        activeNodes.forEach((node) => {
          try {
            node.stop(0);
          } catch (_e) {
            // Already stopped
          }
        });
        this._activeStops.delete(stop);
        if (typeof options.onStop === 'function') options.onStop();
      };

      this._activeStops.add(stop);

      const tick = () => {
        if (stopped) return;
        const elapsed = Math.max(0, ctx.currentTime - startTime);
        if (typeof options.onProgress === 'function') {
          options.onProgress(Math.min(elapsed, totalDuration), totalDuration);
        }
        if (elapsed >= totalDuration) {
          stopped = true;
          this._activeStops.delete(stop);
          if (typeof options.onComplete === 'function') options.onComplete();
          return;
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);

      return { stop, totalDuration };
    }
  }

  global.DungeonAudio = new DungeonAudio();
})(window);
