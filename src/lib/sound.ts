import { Howl, Howler } from "howler";
import {
    playRise,
    playChargeTick,
    playChargeComplete,
    playBallSweep,
    playBallStep,
    playBallCorner,
    playConfettiShimmer,
    playResultJingle,
    playTensionHold,
    playZukkoke,
    resumeAudioContext,
} from "./soundSynthesis";

/**
 * SoundManager
 *
 * public/sounds の素材 + Web Audio 合成で、柱選択・チャージ・玉の動き・結果を再生。
 */

class SoundManager {
    private isInitialized = false;
    private isMuted = false;
    private _volume: number = 0.3; // 初期音量

    private bgm: Howl | null = null;
    private selectSE: Howl | null = null;
    private sparkleSE: Howl | null = null;
    private resultSE: Howl | null = null;

    constructor() {
        // コンストラクタでのロードを避ける（Autoplay Policy対応）
    }

    private init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.bgm = new Howl({
            src: ["/sounds/bgm.ogg", "/sounds/bgm.mp3"],
            loop: true,
            volume: this._volume * 0.5,
            autoplay: false,
        });

        this.selectSE = new Howl({
            src: ["/sounds/select.ogg", "/sounds/select.mp3"],
            volume: this._volume,
        });

        this.sparkleSE = new Howl({
            src: ["/sounds/sparkle.ogg", "/sounds/sparkle.mp3"],
            volume: this._volume * 0.7,
        });

        this.resultSE = new Howl({
            src: ["/sounds/result.ogg", "/sounds/result.mp3"],
            volume: this._volume,
        });
    }

    public unlock() {
        this.init();
        const howler = Howler as unknown as { state?: string; ctx?: AudioContext };
        if (howler.state === "suspended" && howler.ctx) {
            howler.ctx.resume();
        }
        resumeAudioContext();
    }

    public toggleMute() {
        this.isMuted = !this.isMuted;
        Howler.mute(this.isMuted);
        return this.isMuted;
    }

    public setVolume(vol: number) {
        this._volume = Math.max(0, Math.min(1, vol));
        Howler.volume(this._volume);
    }

    public getVolume(): number {
        return this._volume;
    }

    /** BGMの開始 */
    public initAndPlayBGM() {
        this.unlock();
        if (this.bgm && !this.bgm.playing()) {
            this.bgm.play();
        }
    }

    /** BGM音量を現在の設定に戻す（リセット／もう一度用） */
    public resetBGMVolume() {
        if (this.bgm) {
            this.bgm.volume(this._volume * 0.5);
        }
    }

    /** 柱選択音（クリック＋短い上昇音で「選んだ！」感） */
    public playSelect() {
        this.unlock();
        this.selectSE?.play();
        const v = this._volume * 0.4;
        setTimeout(() => playRise(v), 80);
    }

    /** エフェクト音 */
    public playSparkle() {
        this.unlock();
        if (this.sparkleSE && !this.sparkleSE.playing()) {
            this.sparkleSE.play();
        }
    }

    /** チャージ完了音（降下開始前） */
    public playPon() {
        this.unlock();
        playChargeComplete(this._volume * 0.5);
    }

    /** チャージ中ティック（進捗 0〜1 でピッチ上昇） */
    public playChargeTick(progress: number) {
        this.unlock();
        playChargeTick(progress, this._volume * 0.25);
    }

    /** 玉・縦落下スウィープ */
    public playBallSweep() {
        this.unlock();
        playBallSweep(this._volume * 0.2);
    }

    /** 玉・横移動ステップ */
    public playBallStep() {
        this.unlock();
        playBallStep(this._volume * 0.18);
    }

    /** 玉・曲がり角 */
    public playBallCorner() {
        this.unlock();
        playBallCorner(this._volume * 0.35);
    }

    /** 紙吹雪シャラキラ */
    public playConfettiShimmer() {
        this.unlock();
        playConfettiShimmer(this._volume * 0.35);
    }

    /** 結果表示音（運勢別ジングル） */
    public playResult(resultLabel?: string | null) {
        this.unlock();
        playResultJingle(resultLabel ?? null, this._volume * 0.55);
    }

    /** ゴール直前の寸止めタメ音 */
    public playTensionHold() {
        this.unlock();
        playTensionHold(this._volume * 0.6);
    }

    /** 最高額（スポンサー様）決定時のズッコケ音 */
    public playZukkoke() {
        this.unlock();
        playZukkoke(this._volume * 0.65);
    }

    /** 全てのジングルやSEを止める */
    public stopAllJingles() {
        this.sparkleSE?.stop();
        this.resultSE?.stop();
    }
}

export const soundManager = new SoundManager();
 
