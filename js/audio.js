/**
 * audio.js
 * Sound effects manager powered by Howler.js with Web Audio fallback.
 */
class AudioManager {
    constructor() {
        this.muted = false;
        this.sounds = {};

        const sfxFiles = {
            step:   'assets/audio/step.mp3',
            city:   'assets/audio/city.mp3',
            npc:    'assets/audio/npc.mp3',
            reveal: 'assets/audio/reveal.mp3'
        };

        if (typeof Howl !== 'undefined') {
            Object.entries(sfxFiles).forEach(([key, src]) => {
                this.sounds[key] = new Howl({
                    src: [src],
                    volume: 0.4,
                    preload: true,
                    onloaderror: () => {
                        // Marca como indisponível para usar o fallback sintetizado
                        this.sounds[key] = null;
                    }
                });
            });
        }
    }

    play(name) {
        if (this.muted) return;

        const sound = this.sounds[name];
        if (sound && typeof sound.play === 'function') {
            sound.play();
            return;
        }

        // Fallback leve via Web Audio API enquanto os .mp3 não são adicionados
        this._playSynthFallback(name);
    }

    _playSynthFallback(name) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!this._ctx) this._ctx = new AudioCtx();

            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();
            const presets = {
                step:   { freq: 140, type: 'triangle', dur: 0.06, vol: 0.08 },
                city:   { freq: 440, type: 'sine',     dur: 0.25, vol: 0.12 },
                npc:    { freq: 520, type: 'sine',     dur: 0.14, vol: 0.10 },
                reveal: { freq: 330, type: 'sine',     dur: 0.18, vol: 0.08 }
            };
            const p = presets[name] || presets.step;

            osc.type = p.type;
            osc.frequency.setValueAtTime(p.freq, this._ctx.currentTime);
            gain.gain.setValueAtTime(p.vol, this._ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + p.dur);

            osc.connect(gain);
            gain.connect(this._ctx.destination);
            osc.start();
            osc.stop(this._ctx.currentTime + p.dur);
        } catch (_) {
            // Ignora bloqueios de autoplay do navegador
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (typeof Howler !== 'undefined') {
            Howler.mute(this.muted);
        }
        return this.muted;
    }
}

window.gameAudio = new AudioManager();