const AudioManager = require('../js/audio');

function createAudioParam(initial = 0) {
    return {
        value: initial,
        setValueAtTime: jest.fn(function (v) { this.value = v; }),
        setTargetAtTime: jest.fn(function (v) { this.value = v; }),
        linearRampToValueAtTime: jest.fn(function (v) { this.value = v; }),
        exponentialRampToValueAtTime: jest.fn(function (v) {
            if (v <= 0) {
                throw new RangeError(`exponentialRampToValueAtTime target must be > 0, got ${v}`);
            }
            this.value = v;
        })
    };
}

function createMockAudioContext(options = {}) {
    const oscillators = [];
    const gains = [];
    const filters = [];
    const bufferSources = [];
    const panners = [];

    const ctx = {
        state: options.state || 'running',
        currentTime: 1.0,
        sampleRate: 44100,
        destination: { kind: 'destination' },
        resume: jest.fn(() => {
            ctx.state = 'running';
            return Promise.resolve();
        }),
        close: jest.fn(() => {
            ctx.state = 'closed';
            return Promise.resolve();
        }),
        createGain: jest.fn(() => {
            const node = {
                gain: createAudioParam(1),
                connect: jest.fn(),
                disconnect: jest.fn()
            };
            gains.push(node);
            return node;
        }),
        createOscillator: jest.fn(() => {
            const node = {
                type: 'sine',
                frequency: createAudioParam(440),
                detune: createAudioParam(0),
                onended: null,
                connect: jest.fn(),
                disconnect: jest.fn(),
                start: jest.fn(),
                stop: jest.fn()
            };
            oscillators.push(node);
            return node;
        }),
        createBiquadFilter: jest.fn(() => {
            const node = {
                type: 'lowpass',
                frequency: createAudioParam(1000),
                Q: createAudioParam(1),
                connect: jest.fn(),
                disconnect: jest.fn()
            };
            filters.push(node);
            return node;
        }),
        createBuffer: jest.fn((channels, length, sampleRate) => {
            const data = new Float32Array(length);
            return {
                numberOfChannels: channels,
                length,
                sampleRate,
                duration: length / sampleRate,
                getChannelData: jest.fn(() => data)
            };
        }),
        createBufferSource: jest.fn(() => {
            const node = {
                buffer: null,
                playbackRate: createAudioParam(1),
                connect: jest.fn(),
                disconnect: jest.fn(),
                start: jest.fn(),
                stop: jest.fn()
            };
            bufferSources.push(node);
            return node;
        }),
        createStereoPanner: jest.fn(() => {
            const node = {
                pan: createAudioParam(0),
                connect: jest.fn(),
                disconnect: jest.fn()
            };
            panners.push(node);
            return node;
        }),
        createDynamicsCompressor: jest.fn(() => ({
            threshold: createAudioParam(-24),
            knee: createAudioParam(30),
            ratio: createAudioParam(12),
            attack: createAudioParam(0.003),
            release: createAudioParam(0.25),
            connect: jest.fn(),
            disconnect: jest.fn()
        })),
        _nodes: { oscillators, gains, filters, bufferSources, panners }
    };

    return ctx;
}

const ALL_EXPECTED_SFX = [
    // Exploration (10)
    'step', 'blocked', 'reveal', 'portal', 'chest', 'shrine', 'camp', 'city', 'npc', 'rest',
    // Combat (23)
    'combat', 'sword', 'bow', 'magic', 'fire', 'ice', 'lightning', 'holy', 'dark', 'poison',
    'hit', 'crit', 'block', 'heal', 'buff', 'debuff', 'combo', 'ultimate', 'death', 'bossPhase',
    'victory', 'defeat', 'flee',
    // UI/RPG (10)
    'click', 'equip', 'potion', 'coin', 'forge', 'refine', 'levelup', 'quest', 'relic', 'error'
];

const ALL_EXPECTED_TRACKS = [
    'title', 'floresta', 'caverna', 'ruinas', 'vulcao', 'abismo', 'combat', 'boss', 'victory', 'none'
];

describe('AudioManager (Procedural Web Audio + Adaptive BGM Engine)', () => {
    let mockCtx;
    let activeManagers;

    beforeEach(() => {
        activeManagers = [];
        mockCtx = createMockAudioContext();
        window.AudioContext = jest.fn(() => mockCtx);
        delete window.webkitAudioContext;
        window.Engine = { emit: jest.fn() };
        localStorage.clear();
        jest.clearAllMocks();
    });

    afterEach(() => {
        activeManagers.forEach((mgr) => mgr.dispose());
        jest.useRealTimers();
        delete window.AudioContext;
        delete window.webkitAudioContext;
        delete window.Engine;
        delete navigator.userActivation;
    });

    function createManager() {
        const mgr = new AudioManager();
        activeManagers.push(mgr);
        return mgr;
    }

    test('1. Preserva exports, instância global window.gameAudio e NÃO pré-carrega MP3 via Howler (zero 404)', () => {
        expect(typeof AudioManager).toBe('function');
        expect(window.gameAudio).toBeInstanceOf(AudioManager);
        window.gameAudio.dispose();

        const howlSpy = jest.fn();
        jest.isolateModules(() => {
            window.Howl = howlSpy;
            window.Howler = { mute: jest.fn() };
            const IsolatedAudioManager = require('../js/audio');
            expect(typeof IsolatedAudioManager).toBe('function');
            expect(howlSpy).not.toHaveBeenCalled();
            expect(window.gameAudio).toBeInstanceOf(IsolatedAudioManager);
            window.gameAudio.dispose();
        });
        delete window.Howl;
        delete window.Howler;
    });

    test('2. Sintetiza todas as 43 chaves de SFX sem erros e respeita opções de volume/pitch/pan', () => {
        const audio = createManager();

        expect(ALL_EXPECTED_SFX.length).toBe(43);

        ALL_EXPECTED_SFX.forEach((key) => {
            const oscBefore = mockCtx._nodes.oscillators.length;
            const played = audio.play(key);
            expect(played).toBe(true);
            expect(mockCtx._nodes.oscillators.length).toBeGreaterThan(oscBefore);

            const latestOsc = mockCtx._nodes.oscillators[mockCtx._nodes.oscillators.length - 1];
            expect(latestOsc.start).toHaveBeenCalled();
            expect(latestOsc.stop).toHaveBeenCalled();
            const startArg = latestOsc.start.mock.calls[0][0];
            const stopArg = latestOsc.stop.mock.calls[0][0];
            expect(stopArg).toBeGreaterThan(startArg);
        });

        // Options: volume, pitch, pan, pitchVariance
        const beforeOpts = mockCtx._nodes.oscillators.length;
        expect(audio.play('sword', { volume: 0.5, pitch: 1.5, pan: -0.6, pitchVariance: 0 })).toBe(true);
        expect(mockCtx._nodes.oscillators.length).toBeGreaterThan(beforeOpts);
        expect(mockCtx.createStereoPanner).toHaveBeenCalled();

        // Aliases & safe handling of invalid/unknown keys
        expect(audio.play('boss_phase')).toBe(true);
        expect(audio.play('levelUp')).toBe(true);
        expect(audio.play('unknown_custom_cue')).toBe(true);
        expect(audio.play('')).toBe(false);
        expect(audio.play(null)).toBe(false);
    });

    test('3. Respeita mute e volumes 0 ao chamar play()', () => {
        const audio = createManager();

        audio.toggleMute();
        expect(audio.play('click')).toBe(false);
        expect(mockCtx.createOscillator).not.toHaveBeenCalled();

        audio.toggleMute();
        audio.setSfxVolume(0);
        expect(audio.play('hit')).toBe(false);
        expect(mockCtx.createOscillator).not.toHaveBeenCalled();

        audio.setSfxVolume(0.8);
        audio.setMasterVolume(0);
        expect(audio.play('hit')).toBe(false);
        expect(mockCtx.createOscillator).not.toHaveBeenCalled();

        audio.setMasterVolume(0.9);
        expect(audio.play('hit')).toBe(true);
        expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    test('4. Sequenciador de BGM suporta todas as 10 faixas, alternância limpa, aliases e stopMusic()', () => {
        jest.useFakeTimers();
        const audio = createManager();

        ALL_EXPECTED_TRACKS.forEach((track) => {
            const res = audio.playMusic(track);
            expect(res).toBe(track);
            expect(audio.getSettings().currentTrack).toBe(track);

            if (track !== 'none') {
                const countBefore = mockCtx._nodes.oscillators.length;
                jest.advanceTimersByTime(1000);
                expect(mockCtx._nodes.oscillators.length).toBeGreaterThan(countBefore);
            }
        });

        // Calling playMusic with same active track does not wipe/reset step
        audio.playMusic('combat');
        jest.advanceTimersByTime(500);
        const stepBeforeSameCall = audio._musicStep;
        expect(stepBeforeSameCall).toBeGreaterThan(0);
        audio.playMusic('combat');
        expect(audio._musicStep).toBe(stepBeforeSameCall);

        // Biome English aliases
        expect(audio.playMusic('forest')).toBe('floresta');
        expect(audio.playMusic('cave')).toBe('caverna');
        expect(audio.playMusic('ruins')).toBe('ruinas');
        expect(audio.playMusic('volcano')).toBe('vulcao');
        expect(audio.playMusic('abyss')).toBe('abismo');

        // Stop music halts further scheduling
        audio.stopMusic();
        expect(audio.getSettings().currentTrack).toBe('none');
        const countAfterStop = mockCtx._nodes.oscillators.length;
        jest.advanceTimersByTime(2000);
        expect(mockCtx._nodes.oscillators.length).toBe(countAfterStop);
    });

    test('5. Pausa BGM quando mutado e retoma faixa atual ao desmutar', () => {
        jest.useFakeTimers();
        const audio = createManager();

        audio.playMusic('boss');
        expect(audio.getSettings().currentTrack).toBe('boss');

        expect(audio.toggleMute()).toBe(true);
        const countMuted = mockCtx._nodes.oscillators.length;
        jest.advanceTimersByTime(1500);
        expect(mockCtx._nodes.oscillators.length).toBe(countMuted);
        expect(audio.getSettings().currentTrack).toBe('boss');

        expect(audio.toggleMute()).toBe(false);
        jest.advanceTimersByTime(600);
        expect(mockCtx._nodes.oscillators.length).toBeGreaterThan(countMuted);
    });

    test('6. Persistência no localStorage (a_ordem_dos_vigias_audio), clamping e evento Engine audioSettingsChanged', () => {
        const audio = createManager();

        expect(audio.setMasterVolume(1.8)).toBe(1);
        expect(audio.setSfxVolume(-0.4)).toBe(0);
        expect(audio.setMusicVolume(0.42)).toBe(0.42);
        expect(audio.toggleMute()).toBe(true);

        const expectedSettings = {
            muted: true,
            masterVolume: 1,
            sfxVolume: 0,
            musicVolume: 0.42,
            currentTrack: 'none'
        };

        expect(audio.getSettings()).toEqual(expectedSettings);
        expect(window.Engine.emit).toHaveBeenCalledWith('audioSettingsChanged', expectedSettings);
        expect(window.Engine.emit).toHaveBeenCalledTimes(4);

        const stored = JSON.parse(localStorage.getItem('a_ordem_dos_vigias_audio'));
        expect(stored).toEqual({
            muted: true,
            masterVolume: 1,
            sfxVolume: 0,
            musicVolume: 0.42
        });

        // New AudioManager instance restores persisted settings
        const restored = createManager();
        expect(restored.getSettings()).toEqual(expectedSettings);

        // NaN values are safely ignored
        const prevVol = restored.setMasterVolume('not-a-number');
        expect(prevVol).toBe(1);
    });

    test('7. unlock() desbloqueia AudioContext suspenso via pointerdown/keydown uma única vez e inicia BGM pendente', () => {
        jest.useFakeTimers();
        if (window.gameAudio && typeof window.gameAudio.dispose === 'function') {
            window.gameAudio.dispose();
        }
        mockCtx = createMockAudioContext({ state: 'suspended' });
        window.AudioContext = jest.fn(() => mockCtx);

        // Simulate browser pre-gesture userActivation gate
        Object.defineProperty(navigator, 'userActivation', {
            configurable: true,
            value: { hasBeenActive: false }
        });

        const audio = createManager();
        audio.playMusic('title');

        // AudioContext must not be instantiated before user gesture
        expect(window.AudioContext).not.toHaveBeenCalled();
        expect(audio.getSettings().currentTrack).toBe('title');

        // Dispatch pointerdown to trigger auto-bound unlock()
        window.dispatchEvent(new Event('pointerdown'));
        expect(window.AudioContext).toHaveBeenCalledTimes(1);
        expect(mockCtx.resume).toHaveBeenCalledTimes(1);
        expect(mockCtx.state).toBe('running');

        // BGM pending track ('title') starts automatically after unlock
        expect(mockCtx._nodes.oscillators.length).toBeGreaterThan(0);

        // Subsequent keydown should NOT re-trigger resume because listener unbound
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(mockCtx.resume).toHaveBeenCalledTimes(1);

        // Direct unlock on a second instance works via keydown too
        const audio2 = createManager();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        expect(audio2._unlocked).toBe(true);
    });

    test('8. Fallback gracioso em jsdom sem AudioContext, sem localStorage ou com Web Audio parcial/com falhas', () => {
        // Default jsdom: no AudioContext
        delete window.AudioContext;
        delete window.webkitAudioContext;

        const noWebAudio = createManager();
        expect(noWebAudio.unlock()).toBe(false);
        ALL_EXPECTED_SFX.forEach((key) => {
            expect(() => noWebAudio.play(key)).not.toThrow();
            expect(noWebAudio.play(key)).toBe(false);
        });
        expect(() => noWebAudio.playMusic('combat')).not.toThrow();
        expect(noWebAudio.getSettings().currentTrack).toBe('combat');
        expect(() => noWebAudio.stopMusic()).not.toThrow();
        expect(noWebAudio.toggleMute()).toBe(true);

        // Corrupted localStorage JSON & throwing storage
        localStorage.setItem('a_ordem_dos_vigias_audio', '{invalid-json');
        expect(() => createManager()).not.toThrow();

        const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        expect(() => {
            const restricted = createManager();
            restricted.setMasterVolume(0.5);
            restricted.toggleMute();
        }).not.toThrow();
        getItemSpy.mockRestore();
        setItemSpy.mockRestore();

        // Throwing AudioContext constructor
        window.AudioContext = jest.fn(() => {
            throw new Error('NotAllowedError');
        });
        const brokenCtxMgr = createManager();
        expect(brokenCtxMgr.unlock()).toBe(false);
        expect(() => brokenCtxMgr.play('sword')).not.toThrow();

        // Minimal partial AudioContext (no filter, no buffer source, no panner, no compressor)
        window.AudioContext = jest.fn(() => ({
            currentTime: 0,
            destination: {},
            createGain: () => ({ gain: { value: 1 }, connect: jest.fn() }),
            createOscillator: () => ({
                type: 'sine',
                frequency: { value: 440 },
                connect: jest.fn(),
                start: jest.fn(),
                stop: jest.fn()
            })
        }));
        const minimalMgr = createManager();
        expect(() => {
            minimalMgr.play('lightning', { pan: 0.5 });
            minimalMgr.play('forge');
            minimalMgr.playMusic('boss');
            minimalMgr.stopMusic();
        }).not.toThrow();

        // webkitAudioContext fallback
        delete window.AudioContext;
        const webkitCtx = createMockAudioContext();
        window.webkitAudioContext = jest.fn(() => webkitCtx);
        const webkitMgr = createManager();
        expect(webkitMgr.play('relic')).toBe(true);
        expect(window.webkitAudioContext).toHaveBeenCalledTimes(1);
    });
});
