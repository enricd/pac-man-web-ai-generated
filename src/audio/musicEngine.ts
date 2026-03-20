// Chiptune music engine using Web Audio API
// Generates Mii Channel-style and Mario Kart Star-style melodies

export type Note = [number, number]; // [frequency Hz, duration in beats]

const REST = 0;

// Note frequencies (Hz)
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, Bb4 = 466.16;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00, B5 = 987.77;
const C6 = 1046.50;
const Ab4 = 415.30, Eb5 = 622.25;

// Mii Channel theme (simplified, looping melody)
const MII_MELODY: Note[] = [
  [F4, 1], [REST, 0.5], [Ab4, 0.5], [REST, 0.5], [F4, 0.5], [REST, 0.25], [F4, 0.25],
  [Ab4, 0.5], [REST, 0.25], [Bb4, 0.75], [REST, 0.5],
  [Eb5, 0.75], [REST, 0.25], [D5, 0.5], [REST, 0.5], [D5, 0.75], [REST, 0.5],
  [C5, 1.5], [REST, 0.5],
  // Second phrase
  [F4, 1], [REST, 0.5], [Ab4, 0.5], [REST, 0.5], [F4, 0.5], [REST, 0.25], [F4, 0.25],
  [Bb4, 0.5], [REST, 0.25], [C5, 0.75], [REST, 0.25],
  [Ab4, 0.75], [REST, 0.25], [F4, 0.5], [REST, 0.5], [F4, 0.75], [REST, 0.5],
  [E4, 1.5], [REST, 0.5],
  // Third phrase (going up)
  [G4, 0.5], [A4, 0.5], [Bb4, 0.5], [C5, 0.5],
  [D5, 1], [REST, 0.5], [E5, 1], [REST, 0.5],
  [F5, 1.5], [REST, 0.25], [E5, 0.5], [D5, 0.5], [C5, 0.5],
  [Bb4, 1], [REST, 0.5], [A4, 0.5], [G4, 0.5],
  [F4, 2], [REST, 1],
];

// Mario Kart Star power theme (fast, upbeat, ascending)
const STAR_MELODY: Note[] = [
  [C5, 0.25], [E5, 0.25], [G5, 0.25], [C6, 0.25],
  [B5, 0.25], [G5, 0.25], [E5, 0.25], [G5, 0.25],
  [A5, 0.25], [F5, 0.25], [D5, 0.25], [F5, 0.25],
  [G5, 0.25], [E5, 0.25], [C5, 0.25], [E5, 0.25],
  // Second run
  [D5, 0.25], [F5, 0.25], [A5, 0.25], [D5, 0.25],
  [C5, 0.25], [E5, 0.25], [G5, 0.25], [C6, 0.25],
  [B5, 0.25], [A5, 0.25], [G5, 0.25], [F5, 0.25],
  [E5, 0.5], [G5, 0.5],
  // Repeat with variation
  [C5, 0.25], [D5, 0.25], [E5, 0.25], [F5, 0.25],
  [G5, 0.25], [A5, 0.25], [B5, 0.25], [C6, 0.25],
  [B5, 0.25], [A5, 0.25], [G5, 0.25], [A5, 0.25],
  [G5, 0.25], [F5, 0.25], [E5, 0.25], [D5, 0.25],
  [C5, 0.5], [E5, 0.5], [G5, 0.5], [C6, 0.5],
];

// Bass lines
const MII_BASS: Note[] = [
  [F4 / 2, 2], [Bb4 / 2, 2], [C4, 2], [F4 / 2, 2],
  [F4 / 2, 2], [Ab4 / 2, 2], [C4, 2], [C4, 2],
  [Bb4 / 2, 2], [C4, 2], [F4 / 2, 2], [C4, 2],
  [Bb4 / 2, 2], [C4, 1], [D4, 1], [F4 / 2, 4],
];

const STAR_BASS: Note[] = [
  [C4, 0.5], [G4 / 2, 0.5], [C4, 0.5], [G4 / 2, 0.5],
  [F4 / 2, 0.5], [C4, 0.5], [F4 / 2, 0.5], [C4, 0.5],
  [G4 / 2, 0.5], [D4, 0.5], [G4 / 2, 0.5], [D4, 0.5],
  [C4, 0.5], [G4 / 2, 0.5], [C4, 0.5], [G4 / 2, 0.5],
  [D4, 0.5], [A4 / 2, 0.5], [D4, 0.5], [A4 / 2, 0.5],
  [C4, 0.5], [G4 / 2, 0.5], [C4, 1],
];

// Death jingle — descending chromatic, sad feel
const DEATH_SFX: Note[] = [
  [E5, 0.3], [Eb5, 0.3], [D5, 0.3], [C5, 0.4],
  [Bb4, 0.4], [A4, 0.5], [Ab4, 0.5], [G4, 1],
];

// Level complete fanfare — triumphant ascending
const LEVEL_UP_SFX: Note[] = [
  [C5, 0.2], [E5, 0.2], [G5, 0.2], [C6, 0.4],
  [REST, 0.1], [G5, 0.15], [C6, 0.6],
];

export type TrackType = 'normal' | 'power';
export type SfxType = 'death' | 'levelUp';

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private melodyGain: GainNode | null = null;
  private bassGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: TrackType | null = null;
  private melodyTimeoutIds: number[] = [];
  private bassTimeoutIds: number[] = [];
  private melodyLoopTimeout: number | null = null;
  private bassLoopTimeout: number | null = null;
  private _muted = false;
  private _customMelody: Note[] | null = null;

  get muted() { return this._muted; }
  get hasCustomMelody() { return this._customMelody !== null; }

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.melodyGain = this.ctx.createGain();
      this.melodyGain.gain.value = 0.15;
      this.melodyGain.connect(this.masterGain);

      this.bassGain = this.ctx.createGain();
      this.bassGain.gain.value = 0.08;
      this.bassGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.2;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playNote(freq: number, duration: number, gainNode: GainNode, waveType: OscillatorType) {
    if (freq === REST || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    osc.type = waveType;
    osc.frequency.value = freq;
    noteGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration * 0.9);
    osc.connect(noteGain);
    noteGain.connect(gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private scheduleTrack(
    notes: Note[],
    gainNode: GainNode,
    waveType: OscillatorType,
    bpm: number,
    timeoutIds: number[],
  ): number {
    const beatDuration = 60 / bpm;
    let time = 0;
    for (const [freq, beats] of notes) {
      const dur = beats * beatDuration;
      const id = window.setTimeout(() => {
        this.playNote(freq, dur * 0.9, gainNode, waveType);
      }, time * 1000);
      timeoutIds.push(id);
      time += dur;
    }
    return time; // total duration in seconds
  }

  private loopTrack(
    notes: Note[],
    gainNode: GainNode,
    waveType: OscillatorType,
    bpm: number,
    timeoutIds: number[],
    setLoopTimeout: (id: number | null) => void,
  ) {
    const totalTime = this.scheduleTrack(notes, gainNode, waveType, bpm, timeoutIds);
    const loopId = window.setTimeout(() => {
      // Clear old timeouts before restarting
      timeoutIds.length = 0;
      this.loopTrack(notes, gainNode, waveType, bpm, timeoutIds, setLoopTimeout);
    }, totalTime * 1000);
    setLoopTimeout(loopId);
  }

  private stopAll() {
    for (const id of this.melodyTimeoutIds) clearTimeout(id);
    for (const id of this.bassTimeoutIds) clearTimeout(id);
    if (this.melodyLoopTimeout !== null) clearTimeout(this.melodyLoopTimeout);
    if (this.bassLoopTimeout !== null) clearTimeout(this.bassLoopTimeout);
    this.melodyTimeoutIds = [];
    this.bassTimeoutIds = [];
    this.melodyLoopTimeout = null;
    this.bassLoopTimeout = null;
  }

  play(track: TrackType) {
    this.ensureContext();
    if (track === this.currentTrack) return;
    this.stopAll();
    this.currentTrack = track;

    if (!this.melodyGain || !this.bassGain) return;

    if (track === 'normal') {
      const melody = this._customMelody ?? MII_MELODY;
      this.loopTrack(melody, this.melodyGain, 'square', 140, this.melodyTimeoutIds,
        id => { this.melodyLoopTimeout = id; });
      if (!this._customMelody) {
        this.loopTrack(MII_BASS, this.bassGain, 'triangle', 140, this.bassTimeoutIds,
          id => { this.bassLoopTimeout = id; });
      }
    } else {
      this.loopTrack(STAR_MELODY, this.melodyGain, 'square', 200, this.melodyTimeoutIds,
        id => { this.melodyLoopTimeout = id; });
      this.loopTrack(STAR_BASS, this.bassGain, 'triangle', 200, this.bassTimeoutIds,
        id => { this.bassLoopTimeout = id; });
    }
  }

  playSfx(type: SfxType) {
    this.ensureContext();
    if (!this.sfxGain) return;
    const notes = type === 'death' ? DEATH_SFX : LEVEL_UP_SFX;
    const bpm = type === 'death' ? 160 : 200;
    const wave: OscillatorType = type === 'death' ? 'sawtooth' : 'square';
    const beatDur = 60 / bpm;
    let time = 0;
    for (const [freq, beats] of notes) {
      const dur = beats * beatDur;
      if (freq !== REST) {
        window.setTimeout(() => {
          this.playNote(freq, dur * 0.9, this.sfxGain!, wave);
        }, time * 1000);
      }
      time += dur;
    }
  }

  playPreviewNote(freq: number) {
    this.ensureContext();
    if (!this.sfxGain) return;
    this.playNote(freq, 0.3, this.sfxGain, 'square');
  }

  setCustomMelody(notes: Note[]) {
    this._customMelody = notes;
    // Force restart if currently playing normal track
    if (this.currentTrack === 'normal') {
      this.currentTrack = null;
      this.stopAll();
    }
  }

  clearCustomMelody() {
    this._customMelody = null;
    if (this.currentTrack === 'normal') {
      this.currentTrack = null;
      this.stopAll();
    }
  }

  stop() {
    this.stopAll();
    this.currentTrack = null;
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  forceSwitch(track: TrackType) {
    this.currentTrack = null; // force re-schedule
    this.play(track);
  }
}

// Singleton
export const musicEngine = new MusicEngine();
