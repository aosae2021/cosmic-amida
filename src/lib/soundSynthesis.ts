/**
 * soundSynthesis.ts
 * Web Audio API で合成効果音を再生するヘルパー。
 * 追加の音声ファイルなしで、チャージ・玉の動き・結果ジングルなどを鳴らす。
 */

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContext;
}

/** 単音を再生（周波数 Hz, 長さ秒, 波形） */
export function playTone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine"
): void {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
}

/** 短いクリック（柱選択・曲がり角） */
export function playClick(volume: number = 0.15): void {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.06);
}

/** 上昇する短い音（柱選択の「キラッ」） */
export function playRise(volume: number = 0.12): void {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
}

/** チャージ用ティック（進捗に応じてピッチ上昇） */
export function playChargeTick(progress: number, volume: number = 0.08): void {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = 400 + progress * 600;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.start(now);
    osc.stop(now + 0.04);
}

/** チャージ完了時の小さなクライマックス */
export function playChargeComplete(volume: number = 0.2): void {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.setValueAtTime(659, now + 0.05);
    osc.frequency.setValueAtTime(784, now + 0.1);
    osc.frequency.setValueAtTime(1047, now + 0.15);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
}

/** 玉が縦に落ちるスウィープ */
export function playBallSweep(volume: number = 0.06): void {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
}

/** 玉が横に進むステップ音 */
export function playBallStep(volume: number = 0.05): void {
    playTone(320, 0.04, volume, "square");
}

/** 曲がり角のカチッ */
export function playBallCorner(volume: number = 0.1): void {
    playClick(volume);
}

/** 紙吹雪のシャラキラ（高めのキラキラ） */
export function playConfettiShimmer(volume: number = 0.1): void {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200 + i * 400, now + i * 0.05);
        gain.gain.setValueAtTime(0, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(volume * 0.5, now + i * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.2);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.2);
    }
}

/** 運勢別ジングル（大吉＝華やか、末吉＝おもしろ系など） */
export function playResultJingle(resultLabel: string | null | undefined, volume: number = 0.22): void {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes: { freq: number; start: number; duration: number }[] = [];

    switch (resultLabel) {
        case "大吉":
            notes.push(
                { freq: 523, start: 0, duration: 0.12 },
                { freq: 659, start: 0.1, duration: 0.12 },
                { freq: 784, start: 0.2, duration: 0.12 },
                { freq: 1047, start: 0.3, duration: 0.25 }
            );
            break;
        case "中吉":
        case "小吉":
            notes.push(
                { freq: 523, start: 0, duration: 0.1 },
                { freq: 659, start: 0.12, duration: 0.15 }
            );
            break;
        case "吉":
            notes.push(
                { freq: 440, start: 0, duration: 0.12 },
                { freq: 554, start: 0.1, duration: 0.12 }
            );
            break;
        case "末吉":
            notes.push(
                { freq: 200, start: 0, duration: 0.08 },
                { freq: 180, start: 0.1, duration: 0.12 }
            );
            break;
        default:
            notes.push(
                { freq: 523, start: 0, duration: 0.12 },
                { freq: 659, start: 0.1, duration: 0.15 }
            );
    }

    notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = resultLabel === "末吉" ? "square" : "sine";
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(volume, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
        osc.start(now + start);
        osc.stop(now + start + duration);
    });
}

export function resumeAudioContext(): void {
    const ctx = getContext();
    if (ctx?.state === "suspended") ctx.resume();
}
