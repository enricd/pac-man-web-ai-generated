import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { useGameStore } from '../stores/gameStore';
import { musicEngine } from '../audio/musicEngine';

// Subscribe to mute state changes via useSyncExternalStore
let muteListeners: Array<() => void> = [];
function subscribeMute(cb: () => void) {
  muteListeners.push(cb);
  return () => { muteListeners = muteListeners.filter(l => l !== cb); };
}
function notifyMuteChange() {
  for (const l of muteListeners) l();
}
function getMuted() {
  return musicEngine.muted;
}

// Subscribe to custom melody changes
let customListeners: Array<() => void> = [];
function subscribeCustom(cb: () => void) {
  customListeners.push(cb);
  return () => { customListeners = customListeners.filter(l => l !== cb); };
}
export function notifyCustomChange() {
  for (const l of customListeners) l();
}
function getHasCustom() {
  return musicEngine.hasCustomMelody;
}

export function useMusic() {
  const phase = useGameStore(s => s.phase);
  const powerPelletActive = useGameStore(s => s.powerPelletActive);
  const isMuted = useSyncExternalStore(subscribeMute, getMuted);
  const hasCustomMelody = useSyncExternalStore(subscribeCustom, getHasCustom);

  // Manage music based on game state
  useEffect(() => {
    if (phase === 'playing') {
      musicEngine.play(powerPelletActive ? 'power' : 'normal');
    } else if (phase === 'paused') {
      musicEngine.stop();
    } else {
      musicEngine.stop();
      if (phase === 'dying') {
        musicEngine.playSfx('death');
      } else if (phase === 'levelTransition') {
        musicEngine.playSfx('levelUp');
      }
    }
  }, [phase, powerPelletActive]);

  const toggleMute = useCallback(() => {
    musicEngine.toggleMute();
    notifyMuteChange();
  }, []);

  return { isMuted, toggleMute, hasCustomMelody, notifyCustomChange };
}
