/**
 * audio.js
 * Procedural Web Audio API Synthesizer & Adaptive Dark-Fantasy BGM Engine.
 * Zero external MP3 dependencies (zero 404s) with full Jest/jsdom safety.
 */

const AUDIO_STORAGE_KEY = 'a_ordem_dos_vigias_audio';

const DEFAULT_AUDIO_SETTINGS = Object.freeze({
    muted: false,
    masterVolume: 0.75,
    sfxVolume: 0.85,
    musicVolume: 0.50
});

const SFX_CATEGORIES = Object.freeze({
    exploration: ['step', 'blocked', 'reveal', 'portal', 'chest', 'shrine', 'camp', 'city', 'npc', 'rest'],
    combat: [
        'combat', 'sword', 'bow', 'magic', 'fire', 'ice', 'lightning', 'holy',
        'dark', 'poison', 'hit', 'crit', 'block', 'heal', 'buff', 'debuff',
        'combo', 'ultimate', 'death', 'bossPhase', 'victory', 'defeat', 'flee'
    ],
    ui: ['click', 'equip', 'potion', 'coin', 'forge', 'refine', 'levelup', 'quest', 'relic', 'error']
});

const ALL_SFX_KEYS = Object.freeze([
    ...SFX_CATEGORIES.exploration,
    ...SFX_CATEGORIES.combat,
    ...SFX_CATEGORIES.ui
]);

const SFX_ALIASES = Object.freeze({
    boss_phase: 'bossPhase',
    bossphase: 'bossPhase',
    level_up: 'levelup',
    levelUp: 'levelup',
    attack: 'sword',
    move: 'step',
    spell: 'magic',
    open: 'chest'
});

const TRACK_ALIASES = Object.freeze({
    forest: 'floresta',
    cave: 'caverna',
    ruins: 'ruinas',
    volcano: 'vulcao',
    abyss: 'abismo'
});

const NOTE_SEMITONES = Object.freeze({
    C: 0, 'C#': 1, Db: 1,
    D: 2, 'D#': 3, Eb: 3,
    E: 4,
    F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8,
    A: 9, 'A#': 10, Bb: 10,
    B: 11
});

function noteToFreq(note) {
    if (typeof note === 'number') return note;
    if (typeof note !== 'string') return 440;
    const match = /^([A-G][#b]?)(-?\d)$/.exec(note.trim());
    if (!match) return 440;
    const semitone = NOTE_SEMITONES[match[1]];
    if (semitone === undefined) return 440;
    const octave = parseInt(match[2], 10);
    const midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function clamp01(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(1, num));
}

// ---------------------------------------------------------------------------
// Adaptive Procedural Dark-Fantasy BGM Tracks (32 eighth-note steps = 4 bars)
// ---------------------------------------------------------------------------
const BGM_TRACKS = Object.freeze({
    title: {
        bpm: 76,
        padType: 'sine',
        padFilter: 720,
        padGain: 0.055,
        arpType: 'triangle',
        arpFilter: 1600,
        arpGain: 0.048,
        leadType: 'sine',
        leadGain: 0.05,
        bassType: 'triangle',
        bassGain: 0.06,
        chords: {
            0: ['D3', 'A3', 'F4'],
            8: ['Bb2', 'F3', 'D4'],
            16: ['G2', 'D3', 'Bb3'],
            24: ['A2', 'E3', 'C#4']
        },
        bass: [
            'D2', null, null, null, 'A2', null, null, null,
            'Bb1', null, null, null, 'F2', null, null, null,
            'G1', null, null, null, 'D2', null, null, null,
            'A1', null, null, null, 'E2', null, null, null
        ],
        arp: [
            'D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'E4', 'F4',
            'Bb3', 'D4', 'F4', 'Bb4', 'F4', 'D4', 'C4', 'D4',
            'G3', 'Bb3', 'D4', 'G4', 'D4', 'Bb3', 'A3', 'Bb3',
            'A3', 'C#4', 'E4', 'A4', 'G4', 'E4', 'C#4', 'E4'
        ],
        lead: [
            'A5', null, null, null, 'F5', null, 'E5', null,
            'D5', null, null, null, null, null, 'F5', null,
            'G5', null, null, null, 'D5', null, 'Bb4', null,
            'C#5', null, null, null, 'E5', null, null, null
        ],
        drums: {}
    },

    floresta: {
        bpm: 88,
        padType: 'triangle',
        padFilter: 680,
        padGain: 0.045,
        arpType: 'triangle',
        arpFilter: 1850,
        arpGain: 0.05,
        leadType: 'sine',
        leadGain: 0.055,
        bassType: 'sine',
        bassGain: 0.065,
        chords: {
            0: ['E3', 'B3', 'G4'],
            8: ['C3', 'G3', 'E4'],
            16: ['G2', 'D3', 'B3'],
            24: ['D3', 'A3', 'F#4']
        },
        bass: [
            'E2', null, null, 'B2', null, null, 'E2', null,
            'C2', null, null, 'G2', null, null, 'C2', null,
            'G1', null, null, 'D2', null, null, 'G2', null,
            'D2', null, null, 'A2', null, null, 'F#2', null
        ],
        arp: [
            'E4', 'G4', 'B4', 'E5', 'B4', 'G4', 'F#4', 'G4',
            'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'D4', 'E4',
            'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'A3', 'B3',
            'D4', 'F#4', 'A4', 'D5', 'A4', 'F#4', 'E4', 'F#4'
        ],
        lead: [
            'B4', null, 'E5', null, 'D5', null, 'B4', null,
            'G4', null, null, 'A4', 'B4', null, null, null,
            'D5', null, 'B4', null, 'A4', null, 'G4', null,
            'F#4', null, 'A4', null, 'F#4', null, 'E4', null
        ],
        drums: {
            0: 'softKick', 6: 'shaker', 8: 'softKick', 14: 'shaker',
            16: 'softKick', 22: 'shaker', 24: 'softKick', 30: 'shaker'
        }
    },

    caverna: {
        bpm: 72,
        padType: 'sine',
        padFilter: 520,
        padGain: 0.055,
        arpType: 'sine',
        arpFilter: 2400,
        arpGain: 0.045,
        leadType: 'triangle',
        leadGain: 0.04,
        bassType: 'sine',
        bassGain: 0.075,
        chords: {
            0: ['D2', 'A2', 'F3'],
            8: ['Eb2', 'Bb2', 'G3'],
            16: ['C2', 'G2', 'Eb3'],
            24: ['A2', 'E3', 'C#4']
        },
        bass: [
            'D2', null, null, null, null, null, 'A2', null,
            'Eb2', null, null, null, null, null, 'Bb2', null,
            'C2', null, null, null, null, null, 'G2', null,
            'A1', null, null, null, 'E2', null, null, null
        ],
        arp: [
            'D5', null, null, 'A5', null, 'F5', null, null,
            'Eb5', null, null, 'Bb5', null, 'G5', null, null,
            'C5', null, null, 'G5', null, 'Eb5', null, null,
            'C#5', null, null, 'A5', null, 'E5', null, null
        ],
        lead: [
            null, null, 'F4', null, null, null, 'Eb4', null,
            null, null, 'D4', null, null, null, null, null,
            null, null, 'Eb4', null, null, null, 'C4', null,
            null, null, 'C#4', null, null, null, 'A3', null
        ],
        drums: {
            0: 'softKick', 12: 'shaker', 16: 'softKick', 28: 'shaker'
        }
    },

    ruinas: {
        bpm: 82,
        padType: 'sawtooth',
        padFilter: 560,
        padGain: 0.038,
        arpType: 'triangle',
        arpFilter: 1700,
        arpGain: 0.048,
        leadType: 'triangle',
        leadGain: 0.05,
        bassType: 'triangle',
        bassGain: 0.065,
        chords: {
            0: ['C#3', 'G#3', 'E4'],
            8: ['A2', 'E3', 'C#4'],
            16: ['F#2', 'C#3', 'A3'],
            24: ['G#2', 'D#3', 'C4']
        },
        bass: [
            'C#2', null, null, null, 'G#2', null, null, null,
            'A1', null, null, null, 'E2', null, null, null,
            'F#1', null, null, null, 'C#2', null, null, null,
            'G#1', null, null, null, 'D#2', null, 'G#2', null
        ],
        arp: [
            'C#4', 'E4', 'G#4', 'C#5', 'G#4', 'E4', 'D#4', 'E4',
            'A3', 'C#4', 'E4', 'A4', 'E4', 'C#4', 'B3', 'C#4',
            'F#3', 'A3', 'C#4', 'F#4', 'C#4', 'A3', 'G#3', 'A3',
            'G#3', 'C4', 'D#4', 'G#4', 'F#4', 'D#4', 'C4', 'D#4'
        ],
        lead: [
            'E5', null, null, 'D#5', 'C#5', null, null, null,
            'C#5', null, 'B4', null, 'A4', null, null, null,
            'A4', null, 'B4', null, 'C#5', null, 'A4', null,
            'G#4', null, null, null, 'C5', null, null, null
        ],
        drums: {
            0: 'kick', 8: 'softKick', 16: 'kick', 24: 'softKick'
        }
    },

    vulcao: {
        bpm: 108,
        padType: 'sawtooth',
        padFilter: 880,
        padGain: 0.042,
        arpType: 'sawtooth',
        arpFilter: 1400,
        arpGain: 0.04,
        leadType: 'sawtooth',
        leadFilter: 1900,
        leadGain: 0.052,
        bassType: 'sawtooth',
        bassFilter: 520,
        bassGain: 0.075,
        chords: {
            0: ['D3', 'A3', 'F#4'],
            8: ['Eb3', 'Bb3', 'G4'],
            16: ['C3', 'G3', 'Eb4'],
            24: ['D3', 'A3', 'F#4']
        },
        bass: [
            'D2', 'D2', 'A2', 'D2', 'D2', 'D2', 'Eb2', 'D2',
            'Eb2', 'Eb2', 'Bb2', 'Eb2', 'Eb2', 'Eb2', 'F#2', 'Eb2',
            'C2', 'C2', 'G2', 'C2', 'C2', 'C2', 'Eb2', 'C2',
            'D2', 'D2', 'A2', 'D2', 'F#2', 'G2', 'A2', 'C3'
        ],
        arp: [
            'D4', 'F#4', 'A4', 'D4', 'F#4', 'A4', 'Eb4', 'A4',
            'Eb4', 'G4', 'Bb4', 'Eb4', 'G4', 'Bb4', 'G4', 'Eb4',
            'C4', 'Eb4', 'G4', 'C4', 'Eb4', 'G4', 'Eb4', 'C4',
            'D4', 'F#4', 'A4', 'D5', 'A4', 'F#4', 'Eb4', 'D4'
        ],
        lead: [
            'D5', null, 'Eb5', null, 'F#5', null, 'D5', null,
            'Eb5', null, 'G5', null, 'F#5', null, 'Eb5', null,
            'C5', null, 'D5', null, 'Eb5', null, 'C5', null,
            'D5', null, null, null, 'A4', null, 'F#4', null
        ],
        drums: {
            0: 'kick', 3: 'kick', 4: 'snare', 6: 'hat',
            8: 'kick', 10: 'hat', 12: 'snare', 14: 'kick',
            16: 'kick', 19: 'kick', 20: 'snare', 22: 'hat',
            24: 'kick', 26: 'kick', 28: 'snare', 30: 'hat'
        }
    },

    abismo: {
        bpm: 96,
        padType: 'sawtooth',
        padFilter: 640,
        padGain: 0.045,
        arpType: 'sine',
        arpFilter: 2600,
        arpGain: 0.05,
        leadType: 'triangle',
        leadGain: 0.048,
        bassType: 'sawtooth',
        bassFilter: 440,
        bassGain: 0.068,
        chords: {
            0: ['F#2', 'C#3', 'A3'],
            8: ['C3', 'F#3', 'A3'],
            16: ['D3', 'A3', 'F#4'],
            24: ['C#3', 'G#3', 'F4']
        },
        bass: [
            'F#2', null, 'F#2', null, 'C#2', null, 'F#2', null,
            'C2', null, 'F#2', null, 'C2', null, 'G2', null,
            'D2', null, 'D2', null, 'A2', null, 'D2', null,
            'C#2', null, 'C#2', null, 'G#2', null, 'C#2', null
        ],
        arp: [
            'F#5', 'A5', 'C#6', null, 'F#5', 'C#6', 'A5', null,
            'C5', 'F#5', 'A5', null, 'G5', 'F#5', 'C5', null,
            'D5', 'F#5', 'A5', null, 'D6', 'A5', 'F#5', null,
            'C#5', 'F5', 'G#5', null, 'C#6', 'G#5', 'F5', null
        ],
        lead: [
            'C#5', null, null, 'D5', 'C#5', null, 'A4', null,
            'G4', null, null, 'F#4', null, null, null, null,
            'A4', null, 'B4', null, 'C#5', null, 'D5', null,
            'C#5', null, null, 'G#4', 'F4', null, null, null
        ],
        drums: {
            0: 'kick', 4: 'hat', 8: 'softKick', 12: 'snare',
            16: 'kick', 20: 'hat', 24: 'softKick', 28: 'snare'
        }
    },

    combat: {
        bpm: 128,
        padType: 'sawtooth',
        padFilter: 920,
        padGain: 0.036,
        arpType: 'triangle',
        arpFilter: 2200,
        arpGain: 0.052,
        leadType: 'sawtooth',
        leadFilter: 2100,
        leadGain: 0.055,
        bassType: 'sawtooth',
        bassFilter: 640,
        bassGain: 0.075,
        chords: {
            0: ['A2', 'E3', 'C4'],
            8: ['F2', 'C3', 'A3'],
            16: ['G2', 'D3', 'B3'],
            24: ['E2', 'B2', 'G3']
        },
        bass: [
            'A2', 'A2', 'E2', 'A2', 'A2', 'A2', 'G2', 'E2',
            'F2', 'F2', 'C2', 'F2', 'F2', 'F2', 'G2', 'A2',
            'G2', 'G2', 'D2', 'G2', 'G2', 'G2', 'F2', 'D2',
            'E2', 'E2', 'B2', 'E2', 'G2', 'E2', 'B1', 'E2'
        ],
        arp: [
            'A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3', 'E4',
            'F3', 'A3', 'C4', 'F4', 'C4', 'A3', 'F3', 'C4',
            'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'G3', 'D4',
            'E3', 'G3', 'B3', 'E4', 'B3', 'G3', 'E3', 'B3'
        ],
        lead: [
            'A4', 'C5', 'E5', null, 'D5', 'C5', 'B4', 'A4',
            'F4', 'A4', 'C5', null, 'B4', 'A4', 'G4', 'F4',
            'G4', 'B4', 'D5', null, 'C5', 'B4', 'A4', 'G4',
            'E4', 'G4', 'B4', null, 'E5', null, 'B4', null
        ],
        drums: {
            0: 'kick', 2: 'hat', 4: 'snare', 6: 'hat',
            8: 'kick', 10: 'kick', 12: 'snare', 14: 'hat',
            16: 'kick', 18: 'hat', 20: 'snare', 22: 'hat',
            24: 'kick', 26: 'kick', 28: 'snare', 30: 'snare'
        }
    },

    boss: {
        bpm: 144,
        padType: 'sawtooth',
        padFilter: 1100,
        padGain: 0.044,
        arpType: 'sawtooth',
        arpFilter: 2300,
        arpGain: 0.048,
        leadType: 'sawtooth',
        leadFilter: 2500,
        leadGain: 0.062,
        bassType: 'sawtooth',
        bassFilter: 720,
        bassGain: 0.082,
        chords: {
            0: ['D2', 'A2', 'F3'],
            8: ['Bb2', 'F3', 'D4'],
            16: ['G2', 'D3', 'Bb3'],
            24: ['A2', 'E3', 'C#4']
        },
        bass: [
            'D2', 'D2', 'D2', 'F2', 'D2', 'D2', 'Eb2', 'D2',
            'Bb1', 'Bb1', 'Bb1', 'D2', 'Bb1', 'Bb1', 'C2', 'Bb1',
            'G1', 'G1', 'G1', 'Bb1', 'G1', 'G1', 'A1', 'G1',
            'A1', 'A1', 'C#2', 'E2', 'A2', 'G2', 'F2', 'E2'
        ],
        arp: [
            'D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'Eb4', 'A4',
            'Bb3', 'D4', 'F4', 'Bb4', 'F4', 'D4', 'C4', 'F4',
            'G3', 'Bb3', 'D4', 'G4', 'D4', 'Bb3', 'A3', 'D4',
            'A3', 'C#4', 'E4', 'A4', 'G4', 'E4', 'C#4', 'A3'
        ],
        lead: [
            'D5', null, 'F5', 'E5', 'D5', null, 'Bb4', 'A4',
            'Bb4', null, 'D5', 'C5', 'Bb4', null, 'G4', 'F4',
            'G4', null, 'Bb4', 'A4', 'G4', 'A4', 'Bb4', 'G4',
            'A4', null, 'C#5', null, 'E5', null, 'A5', null
        ],
        drums: {
            0: 'kick', 2: 'kick', 4: 'snare', 6: 'hat',
            8: 'kick', 10: 'kick', 12: 'snare', 14: 'kick',
            16: 'kick', 18: 'hat', 20: 'snare', 22: 'kick',
            24: 'kick', 26: 'snare', 28: 'snare', 30: 'kick'
        }
    },

    victory: {
        bpm: 104,
        padType: 'triangle',
        padFilter: 1500,
        padGain: 0.055,
        arpType: 'triangle',
        arpFilter: 2400,
        arpGain: 0.052,
        leadType: 'triangle',
        leadFilter: 2400,
        leadGain: 0.065,
        bassType: 'triangle',
        bassGain: 0.07,
        chords: {
            0: ['D3', 'F#3', 'A3'],
            8: ['G2', 'B2', 'D3'],
            16: ['B2', 'D3', 'F#3'],
            24: ['A2', 'C#3', 'E3']
        },
        bass: [
            'D2', null, 'A2', null, 'D3', null, 'A2', null,
            'G1', null, 'D2', null, 'G2', null, 'D2', null,
            'B1', null, 'F#2', null, 'B2', null, 'F#2', null,
            'A1', null, 'E2', null, 'A2', null, 'E2', null
        ],
        arp: [
            'D4', 'F#4', 'A4', 'D5', 'A4', 'F#4', 'E4', 'F#4',
            'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'A3', 'B3',
            'B3', 'D4', 'F#4', 'B4', 'F#4', 'D4', 'C#4', 'D4',
            'A3', 'C#4', 'E4', 'A4', 'E4', 'C#4', 'B3', 'C#4'
        ],
        lead: [
            'D5', null, 'F#5', null, 'A5', null, 'F#5', null,
            'G5', null, 'B5', null, 'G5', null, 'D5', null,
            'F#5', null, 'D5', null, 'B4', null, 'D5', null,
            'E5', null, 'C#5', null, 'A4', null, null, null
        ],
        drums: {
            0: 'kick', 4: 'snare', 8: 'kick', 12: 'snare',
            16: 'kick', 20: 'snare', 24: 'kick', 28: 'snare'
        }
    }
});

class AudioManager {
    constructor() {
        this.muted = DEFAULT_AUDIO_SETTINGS.muted;
        this.masterVolume = DEFAULT_AUDIO_SETTINGS.masterVolume;
        this.sfxVolume = DEFAULT_AUDIO_SETTINGS.sfxVolume;
        this.musicVolume = DEFAULT_AUDIO_SETTINGS.musicVolume;
        this.currentTrack = 'none';

        this._ctx = null;
        this._masterGain = null;
        this._sfxGain = null;
        this._musicGain = null;
        this._compressor = null;
        this._noiseBuffer = null;

        this._unlocked = false;
        this._unlockBound = false;
        this._musicTimer = null;
        this._musicStep = 0;
        this._musicActiveNodes = new Set();

        this._onUserGesture = () => this.unlock();

        this._loadSettings();
        this._bindUnlockListeners();
    }

    static get STORAGE_KEY() {
        return AUDIO_STORAGE_KEY;
    }

    static get SFX_KEYS() {
        return ALL_SFX_KEYS;
    }

    static get TRACKS() {
        return [...Object.keys(BGM_TRACKS), 'none'];
    }

    static noteToFreq(note) {
        return noteToFreq(note);
    }

    // -----------------------------------------------------------------------
    // Environment & Persistence Helpers
    // -----------------------------------------------------------------------
    _getStorage() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage;
            }
        } catch (_) {
            // Ignore sandboxed storage access errors
        }
        return null;
    }

    _getAudioContextConstructor() {
        try {
            if (typeof window !== 'undefined') {
                if (window.AudioContext) return window.AudioContext;
                if (window.webkitAudioContext) return window.webkitAudioContext;
            }
            if (typeof globalThis !== 'undefined') {
                if (globalThis.AudioContext) return globalThis.AudioContext;
                if (globalThis.webkitAudioContext) return globalThis.webkitAudioContext;
            }
        } catch (_) {
            // Ignore restricted global access
        }
        return null;
    }

    _hasUserActivation() {
        try {
            if (this._unlocked) return true;
            if (typeof navigator !== 'undefined' && navigator.userActivation) {
                return Boolean(navigator.userActivation.hasBeenActive);
            }
            return true;
        } catch (_) {
            return true;
        }
    }

    _loadSettings() {
        const storage = this._getStorage();
        if (!storage) return;
        try {
            const raw = storage.getItem(AUDIO_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return;

            if (typeof parsed.muted === 'boolean') {
                this.muted = parsed.muted;
            }
            this.masterVolume = clamp01(parsed.masterVolume, this.masterVolume);
            this.sfxVolume = clamp01(parsed.sfxVolume, this.sfxVolume);
            this.musicVolume = clamp01(parsed.musicVolume, this.musicVolume);
        } catch (_) {
            // Keep defaults if localStorage data is corrupted
        }
    }

    _saveSettings() {
        const storage = this._getStorage();
        if (!storage) return;
        try {
            const payload = {
                muted: this.muted,
                masterVolume: this.masterVolume,
                sfxVolume: this.sfxVolume,
                musicVolume: this.musicVolume
            };
            storage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(payload));
        } catch (_) {
            // Ignore quota or privacy mode errors
        }
    }

    _emitSettingsChanged() {
        try {
            if (typeof window !== 'undefined' && window.Engine && typeof window.Engine.emit === 'function') {
                window.Engine.emit('audioSettingsChanged', this.getSettings());
            }
        } catch (_) {
            // Ignore listener errors
        }
    }

    _bindUnlockListeners() {
        if (this._unlockBound) return;
        try {
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('pointerdown', this._onUserGesture, true);
                window.addEventListener('keydown', this._onUserGesture, true);
                this._unlockBound = true;
            }
        } catch (_) {
            // Ignore non-DOM environments
        }
    }

    _unbindUnlockListeners() {
        if (!this._unlockBound) return;
        try {
            if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                window.removeEventListener('pointerdown', this._onUserGesture, true);
                window.removeEventListener('keydown', this._onUserGesture, true);
            }
        } catch (_) {
            // Ignore non-DOM environments
        }
        this._unlockBound = false;
    }

    // -----------------------------------------------------------------------
    // Web Audio Context & Gain Routing
    // -----------------------------------------------------------------------
    _ensureContext(forceCreate = false) {
        if (this._ctx) return this._ctx;
        if (!forceCreate && !this._hasUserActivation()) return null;

        const AudioCtx = this._getAudioContextConstructor();
        if (!AudioCtx) return null;

        try {
            const ctx = new AudioCtx();
            this._ctx = ctx;

            this._masterGain = ctx.createGain();
            this._sfxGain = ctx.createGain();
            this._musicGain = ctx.createGain();

            if (typeof ctx.createDynamicsCompressor === 'function') {
                const comp = ctx.createDynamicsCompressor();
                if (comp.threshold && typeof comp.threshold.value === 'number') comp.threshold.value = -14;
                if (comp.knee && typeof comp.knee.value === 'number') comp.knee.value = 18;
                if (comp.ratio && typeof comp.ratio.value === 'number') comp.ratio.value = 6;
                if (comp.attack && typeof comp.attack.value === 'number') comp.attack.value = 0.005;
                if (comp.release && typeof comp.release.value === 'number') comp.release.value = 0.18;
                this._compressor = comp;

                this._sfxGain.connect(comp);
                this._musicGain.connect(comp);
                comp.connect(this._masterGain);
            } else {
                this._sfxGain.connect(this._masterGain);
                this._musicGain.connect(this._masterGain);
            }

            this._masterGain.connect(ctx.destination);
            this._syncGains();
            return ctx;
        } catch (_) {
            this._ctx = null;
            return null;
        }
    }

    _setGainParam(gainNode, value) {
        if (!gainNode || !gainNode.gain) return;
        try {
            const now = this._ctx ? (this._ctx.currentTime || 0) : 0;
            if (typeof gainNode.gain.setTargetAtTime === 'function') {
                gainNode.gain.setTargetAtTime(value, now, 0.015);
            } else if (typeof gainNode.gain.setValueAtTime === 'function') {
                gainNode.gain.setValueAtTime(value, now);
            } else {
                gainNode.gain.value = value;
            }
        } catch (_) {
            gainNode.gain.value = value;
        }
    }

    _syncGains() {
        const effectiveMaster = this.muted ? 0 : this.masterVolume;
        this._setGainParam(this._masterGain, effectiveMaster);
        this._setGainParam(this._sfxGain, this.sfxVolume);
        this._setGainParam(this._musicGain, this.musicVolume);
    }

    _getNoiseBuffer(ctx) {
        if (this._noiseBuffer) return this._noiseBuffer;
        if (!ctx || typeof ctx.createBuffer !== 'function') return null;
        try {
            const sampleRate = ctx.sampleRate || 44100;
            const length = Math.max(1, Math.floor(sampleRate * 1.5));
            const buffer = ctx.createBuffer(1, length, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            this._noiseBuffer = buffer;
            return buffer;
        } catch (_) {
            return null;
        }
    }

    unlock() {
        this._unlocked = true;
        this._unbindUnlockListeners();

        const ctx = this._ensureContext(true);
        if (!ctx) return false;

        try {
            if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
                Promise.resolve(ctx.resume()).catch(() => {});
            }
        } catch (_) {
            // Ignore autoplay rejection
        }

        this._syncGains();

        if (this.currentTrack && this.currentTrack !== 'none' && !this.muted && this.masterVolume > 0 && this.musicVolume > 0 && !this._musicTimer) {
            this._startMusicLoop();
        }
        return true;
    }

    // -----------------------------------------------------------------------
    // Settings & Volume Controls
    // -----------------------------------------------------------------------
    toggleMute() {
        this.muted = !this.muted;
        this._syncGains();

        if (this.muted) {
            this._pauseMusicLoop();
        } else if (this.currentTrack !== 'none' && this.masterVolume > 0 && this.musicVolume > 0 && !this._musicTimer) {
            this._startMusicLoop();
        }

        this._saveSettings();
        this._emitSettingsChanged();
        return this.muted;
    }

    setMasterVolume(v) {
        this.masterVolume = clamp01(v, this.masterVolume);
        this._syncGains();

        if (this.masterVolume <= 0) {
            this._pauseMusicLoop();
        } else if (!this.muted && this.musicVolume > 0 && this.currentTrack !== 'none' && !this._musicTimer) {
            this._startMusicLoop();
        }

        this._saveSettings();
        this._emitSettingsChanged();
        return this.masterVolume;
    }

    setSfxVolume(v) {
        this.sfxVolume = clamp01(v, this.sfxVolume);
        this._syncGains();
        this._saveSettings();
        this._emitSettingsChanged();
        return this.sfxVolume;
    }

    setMusicVolume(v) {
        this.musicVolume = clamp01(v, this.musicVolume);
        this._syncGains();

        if (this.musicVolume <= 0) {
            this._pauseMusicLoop();
        } else if (!this.muted && this.masterVolume > 0 && this.currentTrack !== 'none' && !this._musicTimer) {
            this._startMusicLoop();
        }

        this._saveSettings();
        this._emitSettingsChanged();
        return this.musicVolume;
    }

    getSettings() {
        return {
            muted: this.muted,
            masterVolume: this.masterVolume,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume,
            currentTrack: this.currentTrack
        };
    }

    // -----------------------------------------------------------------------
    // Low-Level Web Audio Synthesis Primitives
    // -----------------------------------------------------------------------
    _clampFreq(freq) {
        const f = Number(freq);
        if (!Number.isFinite(f)) return 440;
        return Math.max(20, Math.min(20000, f));
    }

    _rampParam(param, target, time, exponential = true) {
        if (!param) return;
        const safeTarget = exponential ? Math.max(0.0001, target) : target;
        if (exponential && typeof param.exponentialRampToValueAtTime === 'function') {
            param.exponentialRampToValueAtTime(safeTarget, time);
        } else if (typeof param.linearRampToValueAtTime === 'function') {
            param.linearRampToValueAtTime(safeTarget, time);
        } else if (typeof param.setValueAtTime === 'function') {
            param.setValueAtTime(safeTarget, time);
        } else {
            param.value = safeTarget;
        }
    }

    _setParam(param, value, time) {
        if (!param) return;
        if (typeof param.setValueAtTime === 'function') {
            param.setValueAtTime(value, time);
        } else {
            param.value = value;
        }
    }

    _connectChain(ctx, source, dest, { filterType, filterFreq, filterEndFreq, filterQ, pan, startTime, duration } = {}) {
        let tail = source;

        if (filterType && typeof ctx.createBiquadFilter === 'function') {
            const filter = ctx.createBiquadFilter();
            filter.type = filterType;
            const fStart = this._clampFreq(filterFreq || 1200);
            this._setParam(filter.frequency, fStart, startTime);
            if (filterEndFreq) {
                this._rampParam(filter.frequency, this._clampFreq(filterEndFreq), startTime + duration, true);
            }
            if (filter.Q && filterQ !== undefined) {
                this._setParam(filter.Q, filterQ, startTime);
            }
            tail.connect(filter);
            tail = filter;
        }

        if (pan !== undefined && pan !== 0 && typeof ctx.createStereoPanner === 'function') {
            const panner = ctx.createStereoPanner();
            if (panner.pan) {
                this._setParam(panner.pan, Math.max(-1, Math.min(1, pan)), startTime);
            }
            tail.connect(panner);
            tail = panner;
        }

        tail.connect(dest);
    }

    _playTone(ctx, dest, opts = {}) {
        if (!ctx || typeof ctx.createOscillator !== 'function') return null;
        try {
            const now = ctx.currentTime || 0;
            const delay = Math.max(0, opts.delay || 0);
            const startTime = (opts.startTime !== undefined ? opts.startTime : now) + delay;
            const duration = Math.max(0.015, opts.duration || 0.15);
            const attack = Math.min(duration * 0.45, Math.max(0.002, opts.attack || 0.006));
            const peakGain = Math.max(0.001, (opts.gain !== undefined ? opts.gain : 0.12) * (opts.volScale || 1));

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = opts.type || 'sine';
            const fStart = this._clampFreq((opts.freq || 440) * (opts.pitchScale || 1));
            this._setParam(osc.frequency, fStart, startTime);

            if (opts.endFreq) {
                const fEnd = this._clampFreq(opts.endFreq * (opts.pitchScale || 1));
                this._rampParam(osc.frequency, fEnd, startTime + duration, opts.freqExp !== false);
            }
            if (opts.detune && osc.detune) {
                this._setParam(osc.detune, opts.detune, startTime);
            }

            this._setParam(gain.gain, 0.0001, startTime);
            this._rampParam(gain.gain, peakGain, startTime + attack, false);
            if (opts.hold && opts.hold > 0) {
                const holdTime = Math.min(startTime + duration * 0.7, startTime + attack + opts.hold);
                this._setParam(gain.gain, peakGain, holdTime);
            }
            this._rampParam(gain.gain, 0.0001, startTime + duration, true);

            osc.connect(gain);
            this._connectChain(ctx, gain, dest, {
                filterType: opts.filterType,
                filterFreq: opts.filterFreq,
                filterEndFreq: opts.filterEndFreq,
                filterQ: opts.filterQ,
                pan: opts.pan,
                startTime,
                duration
            });

            osc.start(startTime);
            osc.stop(startTime + duration + 0.02);

            if (opts.trackNode) {
                this._trackMusicNode(osc, gain);
            }
            return osc;
        } catch (_) {
            return null;
        }
    }

    _playNoise(ctx, dest, opts = {}) {
        if (!ctx || typeof ctx.createBufferSource !== 'function') return null;
        const buffer = this._getNoiseBuffer(ctx);
        if (!buffer) return null;

        try {
            const now = ctx.currentTime || 0;
            const delay = Math.max(0, opts.delay || 0);
            const startTime = (opts.startTime !== undefined ? opts.startTime : now) + delay;
            const duration = Math.max(0.015, opts.duration || 0.12);
            const attack = Math.min(duration * 0.4, Math.max(0.002, opts.attack || 0.005));
            const peakGain = Math.max(0.001, (opts.gain !== undefined ? opts.gain : 0.1) * (opts.volScale || 1));

            const src = ctx.createBufferSource();
            src.buffer = buffer;
            if (src.playbackRate && opts.playbackRate) {
                this._setParam(src.playbackRate, opts.playbackRate, startTime);
            }

            const gain = ctx.createGain();
            this._setParam(gain.gain, 0.0001, startTime);
            this._rampParam(gain.gain, peakGain, startTime + attack, false);
            this._rampParam(gain.gain, 0.0001, startTime + duration, true);

            src.connect(gain);
            this._connectChain(ctx, gain, dest, {
                filterType: opts.filterType || 'bandpass',
                filterFreq: opts.filterFreq || 1000,
                filterEndFreq: opts.filterEndFreq,
                filterQ: opts.filterQ !== undefined ? opts.filterQ : 1.2,
                pan: opts.pan,
                startTime,
                duration
            });

            const bufDur = buffer.duration || 1.5;
            const maxOffset = Math.max(0, bufDur - duration - 0.05);
            const offset = Math.random() * maxOffset;
            src.start(startTime, offset, Math.min(bufDur - offset, duration + 0.02));
            src.stop(startTime + duration + 0.02);
            return src;
        } catch (_) {
            return null;
        }
    }

    _playChord(ctx, dest, notes, opts = {}) {
        const stagger = opts.stagger || 0;
        const baseDelay = opts.delay || 0;
        const spread = opts.spread || 0;
        notes.forEach((n, idx) => {
            const freq = typeof n === 'string' ? noteToFreq(n) : n;
            const pan = spread ? ((idx / Math.max(1, notes.length - 1)) * 2 - 1) * spread : (opts.pan || 0);
            this._playTone(ctx, dest, {
                ...opts,
                freq,
                delay: baseDelay + idx * stagger,
                pan
            });
        });
    }

    _pitchJitter(amount = 0.06, options = {}) {
        const basePitch = Number.isFinite(Number(options.pitch)) ? Math.max(0.25, Math.min(4, Number(options.pitch))) : 1;
        const variance = options.pitchVariance !== undefined ? Number(options.pitchVariance) : amount;
        if (!variance) return basePitch;
        return basePitch * (1 + (Math.random() * 2 - 1) * variance);
    }

    // -----------------------------------------------------------------------
    // Sound Effects (43 Procedural Multi-Layered Recipes)
    // -----------------------------------------------------------------------
    play(name, options = {}) {
        if (!name || typeof name !== 'string') return false;
        if (this.muted || this.masterVolume <= 0 || this.sfxVolume <= 0) return false;

        const opts = (options && typeof options === 'object') ? options : {};
        const ctx = this._ensureContext(false);
        if (!ctx || !this._sfxGain) return false;

        const canonical = SFX_ALIASES[name] || name;
        const volScale = clamp01(opts.volume !== undefined ? opts.volume : 1, 1);
        const dest = this._sfxGain;
        const pan = Number.isFinite(Number(opts.pan)) ? Math.max(-1, Math.min(1, Number(opts.pan))) : 0;

        try {
            this._dispatchSfx(canonical, ctx, dest, { ...opts, volScale, pan });
            return true;
        } catch (_) {
            return false;
        }
    }

    _dispatchSfx(key, ctx, dest, opts) {
        const v = opts.volScale;
        const pan = opts.pan;
        const pv = (amt = 0.05) => this._pitchJitter(amt, opts);

        switch (key) {
            // --- Exploration (10) ---
            case 'step': {
                const p = pv(0.11);
                this._playNoise(ctx, dest, {
                    duration: 0.055, gain: 0.08, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 950 * p, filterEndFreq: 380 * p, filterQ: 1.5
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 118 * p, endFreq: 64 * p,
                    duration: 0.05, gain: 0.075, volScale: v, pan
                });
                break;
            }
            case 'blocked': {
                const p = pv(0.06);
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 125, endFreq: 52, pitchScale: p,
                    duration: 0.11, gain: 0.14, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 92, endFreq: 45, pitchScale: p,
                    delay: 0.035, duration: 0.09, gain: 0.11, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    duration: 0.045, gain: 0.05, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 400
                });
                break;
            }
            case 'reveal': {
                const p = pv(0.03);
                this._playNoise(ctx, dest, {
                    duration: 0.28, attack: 0.04, gain: 0.065, volScale: v, pan,
                    filterType: 'highpass', filterFreq: 1100, filterEndFreq: 2800
                });
                this._playChord(ctx, dest, ['D5', 'A5', 'D6'], {
                    type: 'sine', pitchScale: p, stagger: 0.055,
                    duration: 0.24, attack: 0.02, gain: 0.06, volScale: v, spread: 0.35
                });
                break;
            }
            case 'portal': {
                const p = pv(0.02);
                this._playNoise(ctx, dest, {
                    duration: 0.48, attack: 0.08, gain: 0.09, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 380, filterEndFreq: 1900, filterQ: 2.2
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 220, endFreq: 440, pitchScale: p,
                    duration: 0.45, attack: 0.06, gain: 0.085, volScale: v, pan: -0.2
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 223, endFreq: 660, pitchScale: p,
                    duration: 0.48, attack: 0.06, gain: 0.075, volScale: v, pan: 0.2
                });
                this._playChord(ctx, dest, ['D5', 'A5'], {
                    type: 'sine', delay: 0.16, stagger: 0.06, duration: 0.34, gain: 0.05, volScale: v
                });
                break;
            }
            case 'chest': {
                const p = pv(0.03);
                this._playNoise(ctx, dest, {
                    duration: 0.07, gain: 0.09, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 1400, filterEndFreq: 650
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 260, endFreq: 170, pitchScale: p,
                    duration: 0.08, gain: 0.09, volScale: v, pan
                });
                this._playChord(ctx, dest, ['E5', 'G#5', 'B5', 'E6'], {
                    type: 'triangle', pitchScale: p, delay: 0.075, stagger: 0.055,
                    duration: 0.28, gain: 0.08, volScale: v, spread: 0.4
                });
                break;
            }
            case 'shrine': {
                const p = pv(0.02);
                this._playChord(ctx, dest, ['D3', 'A3'], {
                    type: 'sine', pitchScale: p, duration: 0.65, attack: 0.06, gain: 0.08, volScale: v
                });
                this._playChord(ctx, dest, ['D5', 'F#5', 'A5', 'D6'], {
                    type: 'sine', pitchScale: p, delay: 0.05, stagger: 0.075,
                    duration: 0.48, attack: 0.02, gain: 0.065, volScale: v, spread: 0.5
                });
                break;
            }
            case 'camp': {
                const p = pv(0.03);
                this._playNoise(ctx, dest, {
                    duration: 0.38, attack: 0.04, gain: 0.07, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 1200, filterEndFreq: 500
                });
                [0.04, 0.12, 0.21].forEach((d, idx) => {
                    this._playNoise(ctx, dest, {
                        delay: d, duration: 0.02, gain: 0.08, volScale: v,
                        filterType: 'highpass', filterFreq: 2600 + idx * 600
                    });
                });
                this._playChord(ctx, dest, ['C4', 'G4', 'E5'], {
                    type: 'triangle', pitchScale: p, delay: 0.05, stagger: 0.06,
                    duration: 0.42, attack: 0.04, gain: 0.06, volScale: v
                });
                break;
            }
            case 'city': {
                const p = pv(0.02);
                this._playChord(ctx, dest, ['G3', 'D4', 'G4', 'B4'], {
                    type: 'triangle', pitchScale: p, stagger: 0.07,
                    duration: 0.4, attack: 0.02, gain: 0.075, volScale: v,
                    filterType: 'lowpass', filterFreq: 2200
                });
                break;
            }
            case 'npc': {
                const p = pv(0.05);
                this._playNoise(ctx, dest, {
                    duration: 0.045, gain: 0.045, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 2200
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 392, endFreq: 493.88, pitchScale: p,
                    duration: 0.11, gain: 0.085, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 587.33, pitchScale: p,
                    delay: 0.055, duration: 0.14, gain: 0.07, volScale: v, pan
                });
                break;
            }
            case 'rest': {
                const p = pv(0.02);
                this._playChord(ctx, dest, ['A4', 'F#4', 'D4', 'A4'], {
                    type: 'sine', pitchScale: p, stagger: 0.095,
                    duration: 0.42, attack: 0.03, gain: 0.075, volScale: v
                });
                this._playChord(ctx, dest, ['D3', 'A3'], {
                    type: 'triangle', pitchScale: p, delay: 0.18,
                    duration: 0.55, attack: 0.06, gain: 0.055, volScale: v,
                    filterType: 'lowpass', filterFreq: 900
                });
                break;
            }

            // --- Combat (23) ---
            case 'combat': {
                const p = pv(0.02);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 140, endFreq: 44, pitchScale: p,
                    duration: 0.25, gain: 0.18, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    duration: 0.16, gain: 0.1, volScale: v, pan,
                    filterType: 'highpass', filterFreq: 2600, filterEndFreq: 5200
                });
                this._playChord(ctx, dest, ['D3', 'A3', 'D4'], {
                    type: 'sawtooth', pitchScale: p, delay: 0.04, stagger: 0.03,
                    duration: 0.42, attack: 0.02, gain: 0.075, volScale: v,
                    filterType: 'lowpass', filterFreq: 350, filterEndFreq: 1800
                });
                break;
            }
            case 'sword': {
                const p = pv(0.08);
                this._playNoise(ctx, dest, {
                    duration: 0.14, gain: 0.13, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 900, filterEndFreq: 3400, filterQ: 1.8
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 210, endFreq: 72, pitchScale: p,
                    duration: 0.09, gain: 0.12, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 1520, endFreq: 1180, pitchScale: p,
                    delay: 0.02, duration: 0.11, gain: 0.06, volScale: v, pan
                });
                break;
            }
            case 'bow': {
                const p = pv(0.07);
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 260, endFreq: 145, pitchScale: p,
                    duration: 0.11, gain: 0.12, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    delay: 0.015, duration: 0.15, gain: 0.11, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 2400, filterEndFreq: 850, filterQ: 2.0
                });
                break;
            }
            case 'magic': {
                const p = pv(0.05);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 380, endFreq: 980, pitchScale: p,
                    duration: 0.22, gain: 0.1, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 760, endFreq: 1480, pitchScale: p,
                    delay: 0.03, duration: 0.22, gain: 0.07, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    duration: 0.24, attack: 0.03, gain: 0.07, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 1200, filterEndFreq: 3200, filterQ: 2.5
                });
                break;
            }
            case 'fire': {
                const p = pv(0.06);
                this._playNoise(ctx, dest, {
                    duration: 0.34, attack: 0.02, gain: 0.15, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 2200, filterEndFreq: 320
                });
                this._playTone(ctx, dest, {
                    type: 'sawtooth', freq: 125, endFreq: 52, pitchScale: p,
                    duration: 0.28, gain: 0.09, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 420
                });
                this._playNoise(ctx, dest, {
                    delay: 0.05, duration: 0.14, gain: 0.08, volScale: v, pan,
                    filterType: 'highpass', filterFreq: 2800
                });
                break;
            }
            case 'ice': {
                const p = pv(0.05);
                this._playNoise(ctx, dest, {
                    duration: 0.22, gain: 0.1, volScale: v, pan,
                    filterType: 'highpass', filterFreq: 3400, filterEndFreq: 6800
                });
                [1680, 2240, 2980].forEach((freq, i) => {
                    this._playTone(ctx, dest, {
                        type: 'sine', freq, endFreq: freq * 1.06, pitchScale: p,
                        delay: i * 0.035, duration: 0.18, gain: 0.065, volScale: v, pan: (i - 1) * 0.25
                    });
                });
                break;
            }
            case 'lightning': {
                const p = pv(0.06);
                this._playNoise(ctx, dest, {
                    duration: 0.09, gain: 0.16, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 3600, filterEndFreq: 1400
                });
                this._playTone(ctx, dest, {
                    type: 'sawtooth', freq: 1550, endFreq: 240, pitchScale: p,
                    duration: 0.13, gain: 0.095, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    delay: 0.04, duration: 0.4, attack: 0.02, gain: 0.14, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 520, filterEndFreq: 95
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 95, endFreq: 36, pitchScale: p,
                    delay: 0.04, duration: 0.35, gain: 0.15, volScale: v, pan
                });
                break;
            }
            case 'holy': {
                const p = pv(0.02);
                this._playChord(ctx, dest, ['C5', 'E5', 'G5', 'C6'], {
                    type: 'sine', pitchScale: p, stagger: 0.045,
                    duration: 0.48, attack: 0.02, gain: 0.075, volScale: v, spread: 0.45
                });
                this._playChord(ctx, dest, ['C4', 'G4'], {
                    type: 'triangle', pitchScale: p, duration: 0.45, attack: 0.04,
                    gain: 0.06, volScale: v, filterType: 'lowpass', filterFreq: 650, filterEndFreq: 2400
                });
                break;
            }
            case 'dark': {
                const p = pv(0.04);
                this._playChord(ctx, dest, [92.5, 96.5, 130.8], {
                    type: 'sawtooth', pitchScale: p, duration: 0.42, attack: 0.04,
                    gain: 0.07, volScale: v, filterType: 'lowpass', filterFreq: 950, filterEndFreq: 170
                });
                this._playNoise(ctx, dest, {
                    duration: 0.35, attack: 0.08, gain: 0.08, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 680, filterEndFreq: 210
                });
                break;
            }
            case 'poison': {
                const p = pv(0.07);
                this._playNoise(ctx, dest, {
                    duration: 0.28, gain: 0.1, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 1550, filterEndFreq: 580, filterQ: 3.6
                });
                [0.02, 0.085, 0.15].forEach((d, idx) => {
                    this._playTone(ctx, dest, {
                        type: 'sine', freq: 240 + idx * 45, endFreq: 480 + idx * 60, pitchScale: p,
                        delay: d, duration: 0.075, gain: 0.075, volScale: v, pan
                    });
                });
                break;
            }
            case 'hit': {
                const p = pv(0.08);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 165, endFreq: 46, pitchScale: p,
                    duration: 0.12, gain: 0.18, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    duration: 0.075, gain: 0.12, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 950, filterEndFreq: 280
                });
                break;
            }
            case 'crit': {
                const p = pv(0.04);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 210, endFreq: 42, pitchScale: p,
                    duration: 0.2, gain: 0.2, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    duration: 0.14, gain: 0.15, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 2400, filterEndFreq: 600
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 880, endFreq: 1760, pitchScale: p,
                    delay: 0.02, duration: 0.18, gain: 0.09, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 2340, endFreq: 1920, pitchScale: p,
                    delay: 0.02, duration: 0.22, gain: 0.06, volScale: v, pan
                });
                break;
            }
            case 'block': {
                const p = pv(0.05);
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 150, endFreq: 65, pitchScale: p,
                    duration: 0.12, gain: 0.15, volScale: v, pan
                });
                this._playChord(ctx, dest, [520, 785, 1140], {
                    type: 'square', pitchScale: p, duration: 0.18, gain: 0.05, volScale: v,
                    filterType: 'bandpass', filterFreq: 1100, filterQ: 2.2
                });
                this._playNoise(ctx, dest, {
                    duration: 0.06, gain: 0.09, volScale: v, pan,
                    filterType: 'highpass', filterFreq: 1800
                });
                break;
            }
            case 'heal': {
                const p = pv(0.02);
                this._playChord(ctx, dest, ['C5', 'D5', 'E5', 'G5', 'C6'], {
                    type: 'sine', pitchScale: p, stagger: 0.048,
                    duration: 0.28, attack: 0.015, gain: 0.075, volScale: v, spread: 0.35
                });
                this._playChord(ctx, dest, ['C4', 'G4'], {
                    type: 'triangle', pitchScale: p, duration: 0.42, attack: 0.04, gain: 0.05, volScale: v
                });
                break;
            }
            case 'buff': {
                const p = pv(0.03);
                this._playChord(ctx, dest, ['D4', 'G4', 'A4', 'D5'], {
                    type: 'sawtooth', pitchScale: p, stagger: 0.055,
                    duration: 0.28, attack: 0.015, gain: 0.065, volScale: v,
                    filterType: 'lowpass', filterFreq: 900, filterEndFreq: 2600
                });
                break;
            }
            case 'debuff': {
                const p = pv(0.03);
                this._playChord(ctx, dest, ['Eb4', 'D4', 'A3', 'F#3'], {
                    type: 'sawtooth', pitchScale: p, stagger: 0.065,
                    duration: 0.26, attack: 0.015, gain: 0.06, volScale: v,
                    filterType: 'lowpass', filterFreq: 1400, filterEndFreq: 420
                });
                break;
            }
            case 'combo': {
                const p = pv(0.03);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 300, endFreq: 1180, pitchScale: p,
                    duration: 0.1, gain: 0.11, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 150, endFreq: 38, pitchScale: p,
                    delay: 0.08, duration: 0.32, gain: 0.2, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    delay: 0.08, duration: 0.32, gain: 0.15, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 2600, filterEndFreq: 340
                });
                this._playChord(ctx, dest, ['D4', 'A4', 'F#5', 'A5'], {
                    type: 'triangle', pitchScale: p, delay: 0.09, stagger: 0.03,
                    duration: 0.38, gain: 0.075, volScale: v, spread: 0.5
                });
                break;
            }
            case 'ultimate': {
                const p = pv(0.02);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 130, endFreq: 34, pitchScale: p,
                    duration: 0.55, gain: 0.22, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    duration: 0.45, attack: 0.06, gain: 0.13, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 500, filterEndFreq: 3200
                });
                this._playChord(ctx, dest, ['D4', 'A4', 'F4', 'C5', 'A4', 'E5', 'A5'], {
                    type: 'sawtooth', pitchScale: p, delay: 0.05, stagger: 0.065,
                    duration: 0.55, attack: 0.02, gain: 0.06, volScale: v,
                    filterType: 'lowpass', filterFreq: 1200, filterEndFreq: 3200, spread: 0.55
                });
                break;
            }
            case 'death': {
                const p = pv(0.03);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 185, endFreq: 36, pitchScale: p,
                    duration: 0.42, gain: 0.16, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    duration: 0.36, gain: 0.1, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 900, filterEndFreq: 140
                });
                this._playChord(ctx, dest, ['F4', 'D4', 'B3'], {
                    type: 'triangle', pitchScale: p, stagger: 0.07,
                    duration: 0.32, gain: 0.07, volScale: v
                });
                break;
            }
            case 'bossPhase': {
                const p = pv(0.02);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 85, endFreq: 32, pitchScale: p,
                    duration: 0.72, gain: 0.22, volScale: v, pan
                });
                this._playChord(ctx, dest, ['D2', 'Eb3', 'A3', 'Bb3'], {
                    type: 'sawtooth', pitchScale: p, duration: 0.72, attack: 0.05,
                    gain: 0.075, volScale: v, filterType: 'lowpass', filterFreq: 220, filterEndFreq: 2200
                });
                this._playNoise(ctx, dest, {
                    duration: 0.65, attack: 0.05, gain: 0.14, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 320, filterEndFreq: 1400
                });
                break;
            }
            case 'victory': {
                const p = pv(0.01);
                this._playChord(ctx, dest, ['D4', 'F#4', 'A4', 'D5'], {
                    type: 'triangle', pitchScale: p, stagger: 0.1,
                    duration: 0.34, gain: 0.095, volScale: v
                });
                this._playChord(ctx, dest, ['D4', 'F#4', 'A4', 'D5', 'F#5'], {
                    type: 'sine', pitchScale: p, delay: 0.42,
                    duration: 0.72, attack: 0.02, gain: 0.08, volScale: v, spread: 0.45
                });
                break;
            }
            case 'defeat': {
                const p = pv(0.01);
                this._playChord(ctx, dest, ['A4', 'G4', 'F4', 'D4'], {
                    type: 'triangle', pitchScale: p, stagger: 0.14,
                    duration: 0.38, gain: 0.085, volScale: v
                });
                this._playChord(ctx, dest, ['D3', 'A2'], {
                    type: 'sawtooth', pitchScale: p, delay: 0.32,
                    duration: 0.68, attack: 0.05, gain: 0.055, volScale: v,
                    filterType: 'lowpass', filterFreq: 550
                });
                break;
            }
            case 'flee': {
                const p = pv(0.06);
                [0, 0.07, 0.14].forEach((d, idx) => {
                    this._playNoise(ctx, dest, {
                        delay: d, duration: 0.045, gain: 0.08, volScale: v, pan,
                        filterType: 'bandpass', filterFreq: 1100 + idx * 150
                    });
                });
                this._playNoise(ctx, dest, {
                    delay: 0.05, duration: 0.24, gain: 0.09, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 1600, filterEndFreq: 380
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 340, endFreq: 160, pitchScale: p,
                    delay: 0.04, duration: 0.22, gain: 0.07, volScale: v, pan
                });
                break;
            }

            // --- UI / RPG (10) ---
            case 'click': {
                const p = pv(0.06);
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 720, endFreq: 460, pitchScale: p,
                    duration: 0.032, attack: 0.002, gain: 0.08, volScale: v, pan
                });
                this._playNoise(ctx, dest, {
                    duration: 0.016, attack: 0.002, gain: 0.045, volScale: v, pan,
                    filterType: 'highpass', filterFreq: 2200
                });
                break;
            }
            case 'equip': {
                const p = pv(0.05);
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 220, endFreq: 110, pitchScale: p,
                    duration: 0.08, gain: 0.1, volScale: v, pan
                });
                this._playChord(ctx, dest, [920, 1380], {
                    type: 'sine', pitchScale: p, delay: 0.03, stagger: 0.02,
                    duration: 0.09, gain: 0.07, volScale: v
                });
                break;
            }
            case 'potion': {
                const p = pv(0.04);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 260, endFreq: 620, pitchScale: p,
                    duration: 0.045, gain: 0.09, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 340, endFreq: 540, pitchScale: p,
                    delay: 0.055, duration: 0.065, gain: 0.08, volScale: v, pan
                });
                this._playChord(ctx, dest, ['C6', 'G6'], {
                    type: 'sine', pitchScale: p, delay: 0.11, stagger: 0.035,
                    duration: 0.16, gain: 0.055, volScale: v
                });
                break;
            }
            case 'coin': {
                const p = pv(0.04);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 987.77, pitchScale: p,
                    duration: 0.1, gain: 0.09, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 1318.51, pitchScale: p,
                    delay: 0.055, duration: 0.2, gain: 0.09, volScale: v, pan
                });
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 1975.53, pitchScale: p,
                    delay: 0.055, duration: 0.14, gain: 0.045, volScale: v, pan
                });
                break;
            }
            case 'forge': {
                const p = pv(0.04);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 160, endFreq: 52, pitchScale: p,
                    duration: 0.14, gain: 0.16, volScale: v, pan
                });
                this._playChord(ctx, dest, [880, 1320, 2190], {
                    type: 'triangle', pitchScale: p, duration: 0.34, gain: 0.075, volScale: v
                });
                this._playNoise(ctx, dest, {
                    delay: 0.06, duration: 0.28, attack: 0.02, gain: 0.095, volScale: v, pan,
                    filterType: 'highpass', filterFreq: 2600, filterEndFreq: 4200
                });
                break;
            }
            case 'refine': {
                const p = pv(0.03);
                this._playTone(ctx, dest, {
                    type: 'sine', freq: 1120, endFreq: 1680, pitchScale: p,
                    duration: 0.12, gain: 0.08, volScale: v, pan
                });
                this._playChord(ctx, dest, ['A5', 'C#6', 'E6', 'A6'], {
                    type: 'sine', pitchScale: p, delay: 0.06, stagger: 0.045,
                    duration: 0.22, gain: 0.065, volScale: v, spread: 0.35
                });
                this._playNoise(ctx, dest, {
                    duration: 0.14, gain: 0.05, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 3500
                });
                break;
            }
            case 'levelup': {
                const p = pv(0.01);
                this._playChord(ctx, dest, ['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5'], {
                    type: 'triangle', pitchScale: p, stagger: 0.065,
                    duration: 0.36, attack: 0.015, gain: 0.085, volScale: v, spread: 0.45
                });
                this._playChord(ctx, dest, ['D4', 'A4', 'D5'], {
                    type: 'sine', pitchScale: p, delay: 0.34,
                    duration: 0.52, attack: 0.03, gain: 0.07, volScale: v
                });
                break;
            }
            case 'quest': {
                const p = pv(0.02);
                this._playNoise(ctx, dest, {
                    duration: 0.08, gain: 0.055, volScale: v, pan,
                    filterType: 'bandpass', filterFreq: 1800
                });
                this._playChord(ctx, dest, ['G4', 'B4'], {
                    type: 'triangle', pitchScale: p, delay: 0.03, duration: 0.18, gain: 0.08, volScale: v
                });
                this._playChord(ctx, dest, ['D5', 'G5'], {
                    type: 'sine', pitchScale: p, delay: 0.14, duration: 0.32, gain: 0.08, volScale: v
                });
                break;
            }
            case 'relic': {
                const p = pv(0.01);
                this._playChord(ctx, dest, ['A2', 'E3'], {
                    type: 'sine', pitchScale: p, duration: 0.78, attack: 0.06, gain: 0.09, volScale: v
                });
                this._playChord(ctx, dest, ['A4', 'E5', 'B5', 'C#6', 'E6'], {
                    type: 'sine', pitchScale: p, delay: 0.06, stagger: 0.075,
                    duration: 0.56, attack: 0.02, gain: 0.075, volScale: v, spread: 0.6
                });
                break;
            }
            case 'error': {
                const p = pv(0.03);
                this._playTone(ctx, dest, {
                    type: 'square', freq: 180, endFreq: 140, pitchScale: p,
                    duration: 0.085, gain: 0.075, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 560
                });
                this._playTone(ctx, dest, {
                    type: 'square', freq: 145, endFreq: 105, pitchScale: p,
                    delay: 0.095, duration: 0.11, gain: 0.075, volScale: v, pan,
                    filterType: 'lowpass', filterFreq: 480
                });
                break;
            }
            default: {
                // Safe gentle fallback for any custom/unknown SFX key
                this._playTone(ctx, dest, {
                    type: 'triangle', freq: 520, endFreq: 380, pitchScale: pv(0.04),
                    duration: 0.06, gain: 0.06, volScale: v, pan
                });
                break;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Adaptive Procedural BGM Step Sequencer
    // -----------------------------------------------------------------------
    playMusic(trackName) {
        if (!trackName || trackName === 'none') {
            return this.stopMusic();
        }

        const normalized = TRACK_ALIASES[trackName] || trackName;
        if (!BGM_TRACKS[normalized]) {
            return this.currentTrack;
        }

        if (this.currentTrack === normalized && this._musicTimer) {
            this._syncGains();
            return this.currentTrack;
        }

        this._pauseMusicLoop();
        this.currentTrack = normalized;
        this._musicStep = 0;

        if (!this.muted && this.masterVolume > 0 && this.musicVolume > 0) {
            this._startMusicLoop();
        }
        return this.currentTrack;
    }

    stopMusic() {
        this._pauseMusicLoop();
        this.currentTrack = 'none';
        this._musicStep = 0;
        return this.currentTrack;
    }

    _trackMusicNode(osc, gain) {
        if (this._musicActiveNodes.size > 128) {
            const first = this._musicActiveNodes.values().next().value;
            this._musicActiveNodes.delete(first);
        }
        const entry = { osc, gain };
        this._musicActiveNodes.add(entry);
        if (osc && typeof osc.onended !== 'undefined') {
            osc.onended = () => {
                this._musicActiveNodes.delete(entry);
            };
        }
    }

    dispose() {
        this.stopMusic();
        this._unbindUnlockListeners();
        if (this._ctx && typeof this._ctx.close === 'function') {
            try {
                Promise.resolve(this._ctx.close()).catch(() => {});
            } catch (_) {
                // Ignore close errors
            }
        }
        this._ctx = null;
        this._masterGain = null;
        this._sfxGain = null;
        this._musicGain = null;
        this._compressor = null;
        this._noiseBuffer = null;
    }

    _stopActiveMusicNodes() {
        const ctx = this._ctx;
        const now = ctx ? (ctx.currentTime || 0) : 0;
        this._musicActiveNodes.forEach(entry => {
            try {
                if (entry.gain && entry.gain.gain) {
                    this._setParam(entry.gain.gain, entry.gain.gain.value || 0.001, now);
                    this._rampParam(entry.gain.gain, 0.0001, now + 0.04, true);
                }
                if (entry.osc && typeof entry.osc.stop === 'function') {
                    entry.osc.stop(now + 0.05);
                }
            } catch (_) {
                // Ignore already-stopped nodes
            }
        });
        this._musicActiveNodes.clear();
    }

    _pauseMusicLoop() {
        if (this._musicTimer) {
            clearInterval(this._musicTimer);
            this._musicTimer = null;
        }
        this._stopActiveMusicNodes();
    }

    _startMusicLoop() {
        const track = BGM_TRACKS[this.currentTrack];
        if (!track) return;

        const ctx = this._ensureContext(false);
        if (!ctx) return;

        this._pauseMusicLoop();

        const stepSec = (60 / track.bpm) / 2; // 8th-note steps
        const stepMs = Math.max(80, Math.round(stepSec * 1000));

        // Play first step immediately
        this._scheduleMusicStep(track, stepSec);

        this._musicTimer = setInterval(() => {
            if (this.muted || this.masterVolume <= 0 || this.musicVolume <= 0 || this.currentTrack === 'none') {
                this._pauseMusicLoop();
                return;
            }
            const activeTrack = BGM_TRACKS[this.currentTrack];
            if (!activeTrack) {
                this._pauseMusicLoop();
                return;
            }
            const activeStepSec = (60 / activeTrack.bpm) / 2;
            this._scheduleMusicStep(activeTrack, activeStepSec);
        }, stepMs);

        if (this._musicTimer && typeof this._musicTimer.unref === 'function') {
            this._musicTimer.unref();
        }
    }

    _scheduleMusicStep(track, stepSec) {
        const ctx = this._ensureContext(false);
        if (!ctx || !this._musicGain) return;

        const step = this._musicStep % 32;
        const startTime = (ctx.currentTime || 0) + 0.015;
        const dest = this._musicGain;

        try {
            // 1. Sustained bar pad chord
            const chord = track.chords && track.chords[step];
            if (Array.isArray(chord)) {
                const padDur = stepSec * 7.8;
                chord.forEach((n, idx) => {
                    this._playTone(ctx, dest, {
                        startTime,
                        type: track.padType || 'sine',
                        freq: noteToFreq(n),
                        duration: padDur,
                        attack: stepSec * 1.1,
                        hold: padDur * 0.4,
                        gain: track.padGain || 0.045,
                        filterType: 'lowpass',
                        filterFreq: track.padFilter || 750,
                        pan: (idx - 1) * 0.25,
                        trackNode: true
                    });
                });
            }

            // 2. Bassline
            const bassNote = track.bass && track.bass[step];
            if (bassNote) {
                this._playTone(ctx, dest, {
                    startTime,
                    type: track.bassType || 'triangle',
                    freq: noteToFreq(bassNote),
                    duration: stepSec * 0.9,
                    attack: 0.008,
                    gain: track.bassGain || 0.065,
                    filterType: track.bassFilter ? 'lowpass' : undefined,
                    filterFreq: track.bassFilter || 550,
                    trackNode: true
                });
            }

            // 3. Arpeggio
            const arpNote = track.arp && track.arp[step];
            if (arpNote) {
                this._playTone(ctx, dest, {
                    startTime,
                    type: track.arpType || 'triangle',
                    freq: noteToFreq(arpNote),
                    duration: stepSec * 1.15,
                    attack: 0.008,
                    gain: track.arpGain || 0.048,
                    filterType: 'lowpass',
                    filterFreq: track.arpFilter || 1900,
                    pan: (step % 2 === 0 ? -0.18 : 0.18),
                    trackNode: true
                });
            }

            // 4. Melodic Lead
            const leadNote = track.lead && track.lead[step];
            if (leadNote) {
                this._playTone(ctx, dest, {
                    startTime,
                    type: track.leadType || 'sine',
                    freq: noteToFreq(leadNote),
                    duration: stepSec * 1.85,
                    attack: 0.02,
                    gain: track.leadGain || 0.052,
                    filterType: track.leadFilter ? 'lowpass' : undefined,
                    filterFreq: track.leadFilter || 2200,
                    pan: 0.08,
                    trackNode: true
                });
            }

            // 5. Procedural Percussion
            const drum = track.drums && track.drums[step];
            if (drum) {
                this._playMusicDrum(ctx, dest, drum, startTime);
            }
        } catch (_) {
            // Keep sequencer resilient against transient audio node errors
        }

        this._musicStep = (this._musicStep + 1) % 32;
    }

    _playMusicDrum(ctx, dest, kind, startTime) {
        switch (kind) {
            case 'kick':
                this._playTone(ctx, dest, {
                    startTime, type: 'sine', freq: 125, endFreq: 42,
                    duration: 0.13, attack: 0.003, gain: 0.13, trackNode: true
                });
                break;
            case 'softKick':
                this._playTone(ctx, dest, {
                    startTime, type: 'sine', freq: 95, endFreq: 44,
                    duration: 0.11, attack: 0.005, gain: 0.075, trackNode: true
                });
                break;
            case 'snare':
                this._playTone(ctx, dest, {
                    startTime, type: 'triangle', freq: 185, endFreq: 95,
                    duration: 0.07, attack: 0.002, gain: 0.06, trackNode: true
                });
                this._playNoise(ctx, dest, {
                    startTime, duration: 0.09, attack: 0.002, gain: 0.065,
                    filterType: 'bandpass', filterFreq: 1900, filterQ: 1.1
                });
                break;
            case 'hat':
                this._playNoise(ctx, dest, {
                    startTime, duration: 0.035, attack: 0.002, gain: 0.038,
                    filterType: 'highpass', filterFreq: 5500
                });
                break;
            case 'shaker':
                this._playNoise(ctx, dest, {
                    startTime, duration: 0.055, attack: 0.006, gain: 0.025,
                    filterType: 'highpass', filterFreq: 4200
                });
                break;
            default:
                break;
        }
    }
}

if (typeof window !== 'undefined') {
    window.AudioManager = AudioManager;
    window.gameAudio = new AudioManager();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
