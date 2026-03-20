import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { musicEngine } from '../audio/musicEngine';
import { notifyCustomChange } from '../hooks/useMusic';
import type { Note } from '../audio/musicEngine';

// Two octaves: C4 to B5
interface PianoKey {
  note: string;
  freq: number;
  isBlack: boolean;
  keyboardKey: string; // keyboard shortcut
}

const PIANO_KEYS: PianoKey[] = [
  // Lower octave (C4 - B4)
  { note: 'C4',  freq: 261.63, isBlack: false, keyboardKey: 'z' },
  { note: 'C#4', freq: 277.18, isBlack: true,  keyboardKey: 's' },
  { note: 'D4',  freq: 293.66, isBlack: false, keyboardKey: 'x' },
  { note: 'D#4', freq: 311.13, isBlack: true,  keyboardKey: 'd' },
  { note: 'E4',  freq: 329.63, isBlack: false, keyboardKey: 'c' },
  { note: 'F4',  freq: 349.23, isBlack: false, keyboardKey: 'v' },
  { note: 'F#4', freq: 369.99, isBlack: true,  keyboardKey: 'g' },
  { note: 'G4',  freq: 392.00, isBlack: false, keyboardKey: 'b' },
  { note: 'G#4', freq: 415.30, isBlack: true,  keyboardKey: 'h' },
  { note: 'A4',  freq: 440.00, isBlack: false, keyboardKey: 'n' },
  { note: 'A#4', freq: 466.16, isBlack: true,  keyboardKey: 'j' },
  { note: 'B4',  freq: 493.88, isBlack: false, keyboardKey: 'm' },
  // Upper octave (C5 - B5)
  { note: 'C5',  freq: 523.25, isBlack: false, keyboardKey: 'q' },
  { note: 'C#5', freq: 554.37, isBlack: true,  keyboardKey: '2' },
  { note: 'D5',  freq: 587.33, isBlack: false, keyboardKey: 'w' },
  { note: 'D#5', freq: 622.25, isBlack: true,  keyboardKey: '3' },
  { note: 'E5',  freq: 659.25, isBlack: false, keyboardKey: 'e' },
  { note: 'F5',  freq: 698.46, isBlack: false, keyboardKey: 'r' },
  { note: 'F#5', freq: 739.99, isBlack: true,  keyboardKey: '5' },
  { note: 'G5',  freq: 783.99, isBlack: false, keyboardKey: 't' },
  { note: 'G#5', freq: 830.61, isBlack: true,  keyboardKey: '6' },
  { note: 'A5',  freq: 880.00, isBlack: false, keyboardKey: 'y' },
  { note: 'A#5', freq: 932.33, isBlack: true,  keyboardKey: '7' },
  { note: 'B5',  freq: 987.77, isBlack: false, keyboardKey: 'u' },
];

// Build keyboard key -> PianoKey lookup
const KEY_TO_PIANO = new Map<string, PianoKey>();
for (const pk of PIANO_KEYS) {
  KEY_TO_PIANO.set(pk.keyboardKey, pk);
}

const RECORD_BPM = 140;
const MAX_NOTES = 64;

export function Piano() {
  const resumeGame = useGameStore(s => s.resumeGame);
  const [isRecording, setIsRecording] = useState(false);
  const [recorded, setRecorded] = useState<Note[]>([]);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const lastNoteTimeRef = useRef<number>(0);
  const recordedRef = useRef<Note[]>([]);
  const isRecordingRef = useRef(false);

  // Preview playback state
  const previewTimeoutsRef = useRef<number[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const playNote = useCallback((pianoKey: PianoKey) => {
    musicEngine.playPreviewNote(pianoKey.freq);

    if (isRecordingRef.current && recordedRef.current.length < MAX_NOTES) {
      const now = performance.now();
      const beatDur = 60000 / RECORD_BPM;

      // Add rest if there's a gap since the last note
      if (recordedRef.current.length > 0) {
        const gap = now - lastNoteTimeRef.current;
        if (gap > beatDur * 0.6) {
          const restBeats = Math.min(Math.round((gap / beatDur) * 4) / 4, 2);
          if (restBeats >= 0.25) {
            recordedRef.current.push([0, restBeats]);
          }
        }
      }

      recordedRef.current.push([pianoKey.freq, 0.5]);
      lastNoteTimeRef.current = now;
      setRecorded([...recordedRef.current]);
    }
  }, []);

  const startRecording = useCallback(() => {
    recordedRef.current = [];
    setRecorded([]);
    setIsRecording(true);
    isRecordingRef.current = true;
    lastNoteTimeRef.current = 0;
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    isRecordingRef.current = false;
  }, []);

  const previewRecording = useCallback(() => {
    if (recordedRef.current.length === 0) return;
    // Stop any current preview
    for (const id of previewTimeoutsRef.current) clearTimeout(id);
    previewTimeoutsRef.current = [];
    setIsPreviewing(true);

    const beatDur = 60000 / RECORD_BPM;
    let time = 0;
    for (const [freq, beats] of recordedRef.current) {
      const dur = beats * beatDur;
      if (freq > 0) {
        const id = window.setTimeout(() => {
          musicEngine.playPreviewNote(freq);
        }, time);
        previewTimeoutsRef.current.push(id);
      }
      time += dur;
    }
    const endId = window.setTimeout(() => {
      setIsPreviewing(false);
      previewTimeoutsRef.current = [];
    }, time);
    previewTimeoutsRef.current.push(endId);
  }, []);

  const saveAndClose = useCallback(() => {
    if (recordedRef.current.length > 0) {
      // Filter out trailing rests
      const melody = [...recordedRef.current];
      while (melody.length > 0 && melody[melody.length - 1][0] === 0) {
        melody.pop();
      }
      if (melody.length > 0) {
        musicEngine.setCustomMelody(melody);
        notifyCustomChange();
      }
    }
    resumeGame();
  }, [resumeGame]);

  const cancel = useCallback(() => {
    // Stop any preview
    for (const id of previewTimeoutsRef.current) clearTimeout(id);
    previewTimeoutsRef.current = [];
    resumeGame();
  }, [resumeGame]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();

      if (key === 'escape') {
        cancel();
        return;
      }

      const pianoKey = KEY_TO_PIANO.get(key);
      if (pianoKey) {
        e.preventDefault();
        e.stopPropagation();
        playNote(pianoKey);
        setActiveKeys(prev => new Set(prev).add(key));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [playNote, cancel]);

  // Clean up preview timeouts on unmount
  useEffect(() => {
    return () => {
      for (const id of previewTimeoutsRef.current) clearTimeout(id);
    };
  }, []);

  const whiteKeys = PIANO_KEYS.filter(k => !k.isBlack);
  const blackKeys = PIANO_KEYS.filter(k => k.isBlack);

  // Compute black key positions based on their index among all keys
  const whiteKeyWidth = 100 / whiteKeys.length;

  function getBlackKeyLeft(bk: PianoKey): number {
    // Find the index of this black key in the full PIANO_KEYS array
    const fullIdx = PIANO_KEYS.indexOf(bk);
    // Count how many white keys are before this black key
    let whitesBefore = 0;
    for (let i = 0; i < fullIdx; i++) {
      if (!PIANO_KEYS[i].isBlack) whitesBefore++;
    }
    // Position the black key between the white key before and after it
    return whitesBefore * whiteKeyWidth - whiteKeyWidth * 0.3;
  }

  const btnBase: React.CSSProperties = {
    pointerEvents: 'auto',
    background: 'rgba(255,255,255,0.15)',
    border: '2px solid rgba(255,255,255,0.4)',
    borderRadius: '6px',
    color: '#FFFFFF',
    fontSize: '12px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      color: '#FFFFFF',
    }}>
      <div style={{ fontSize: '18px', marginBottom: '12px', textShadow: '0 0 10px #FFD700' }}>
        COMPOSE YOUR MELODY
      </div>
      <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '20px' }}>
        Play notes with keyboard or click the keys
      </div>

      {/* Piano container */}
      <div style={{
        position: 'relative',
        width: '700px',
        height: '180px',
        marginBottom: '20px',
        userSelect: 'none',
      }}>
        {/* White keys */}
        {whiteKeys.map((pk) => {
          const idx = whiteKeys.indexOf(pk);
          const isActive = activeKeys.has(pk.keyboardKey);
          return (
            <div
              key={pk.note}
              onPointerDown={() => {
                playNote(pk);
                setActiveKeys(prev => new Set(prev).add(pk.keyboardKey));
              }}
              onPointerUp={() => {
                setActiveKeys(prev => {
                  const next = new Set(prev);
                  next.delete(pk.keyboardKey);
                  return next;
                });
              }}
              onPointerLeave={() => {
                setActiveKeys(prev => {
                  const next = new Set(prev);
                  next.delete(pk.keyboardKey);
                  return next;
                });
              }}
              style={{
                position: 'absolute',
                left: `${idx * whiteKeyWidth}%`,
                width: `${whiteKeyWidth}%`,
                height: '100%',
                background: isActive
                  ? 'linear-gradient(to bottom, #FFD700, #FFA500)'
                  : 'linear-gradient(to bottom, #FFFFFF, #E8E8E8)',
                border: '1px solid #999',
                borderRadius: '0 0 4px 4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: '6px',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ fontSize: '8px', color: '#666', lineHeight: 1 }}>
                {pk.keyboardKey.toUpperCase()}
              </div>
              <div style={{ fontSize: '7px', color: '#999', lineHeight: 1, marginTop: '2px' }}>
                {pk.note}
              </div>
            </div>
          );
        })}

        {/* Black keys */}
        {blackKeys.map((pk) => {
          const left = getBlackKeyLeft(pk);
          const isActive = activeKeys.has(pk.keyboardKey);
          return (
            <div
              key={pk.note}
              onPointerDown={() => {
                playNote(pk);
                setActiveKeys(prev => new Set(prev).add(pk.keyboardKey));
              }}
              onPointerUp={() => {
                setActiveKeys(prev => {
                  const next = new Set(prev);
                  next.delete(pk.keyboardKey);
                  return next;
                });
              }}
              onPointerLeave={() => {
                setActiveKeys(prev => {
                  const next = new Set(prev);
                  next.delete(pk.keyboardKey);
                  return next;
                });
              }}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${whiteKeyWidth * 0.6}%`,
                height: '60%',
                background: isActive
                  ? 'linear-gradient(to bottom, #FFD700, #CC8800)'
                  : 'linear-gradient(to bottom, #333, #111)',
                border: '1px solid #000',
                borderRadius: '0 0 3px 3px',
                cursor: 'pointer',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: '4px',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ fontSize: '7px', color: '#aaa', lineHeight: 1 }}>
                {pk.keyboardKey.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Note count */}
      <div style={{ fontSize: '10px', color: '#888', marginBottom: '12px' }}>
        {recorded.filter(n => n[0] > 0).length} / {MAX_NOTES} notes
        {isRecording && <span style={{ color: '#FF4444', marginLeft: '12px' }}>REC</span>}
        {isPreviewing && <span style={{ color: '#44FF44', marginLeft: '12px' }}>PLAYING...</span>}
      </div>

      {/* Control buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {!isRecording ? (
          <button onClick={startRecording} style={{
            ...btnBase,
            background: 'rgba(255,60,60,0.3)',
            borderColor: '#FF4444',
          }}>
            REC
          </button>
        ) : (
          <button onClick={stopRecording} style={{
            ...btnBase,
            background: 'rgba(255,60,60,0.5)',
            borderColor: '#FF4444',
          }}>
            STOP
          </button>
        )}

        <button
          onClick={previewRecording}
          disabled={recorded.filter(n => n[0] > 0).length === 0 || isRecording}
          style={{
            ...btnBase,
            opacity: recorded.filter(n => n[0] > 0).length === 0 || isRecording ? 0.4 : 1,
          }}
        >
          PREVIEW
        </button>

        <button
          onClick={saveAndClose}
          disabled={recorded.filter(n => n[0] > 0).length === 0}
          style={{
            ...btnBase,
            background: 'rgba(60,255,60,0.2)',
            borderColor: '#44FF44',
            opacity: recorded.filter(n => n[0] > 0).length === 0 ? 0.4 : 1,
          }}
        >
          SAVE
        </button>

        <button onClick={cancel} style={{
          ...btnBase,
          background: 'rgba(255,255,255,0.05)',
        }}>
          CANCEL
        </button>
      </div>

      <div style={{ fontSize: '9px', color: '#666', marginTop: '16px' }}>
        ESC to cancel
      </div>
    </div>
  );
}
