/**
 * amidaConfig.ts
 * 調整可能なパラメータを一元管理。
 * デバイス別設定は lib/deviceConfig.ts が自動上書きする。
 */

export const AMIDA_CONFIG = {
    /** ─── カメラパスの補間 ─── */
    camera: {
        transitionDuration: 1.5,
        splineTension: 0.3,
        descentSpeed: 0.075,
        accelerationFactor: 1.0,
        /** カウントダウン1数字あたりの表示秒数 */
        countdownInterval: 1.0,
        lookAheadDistance: 1.5,
        rotationSlerpFactor: 0.08,
        /** フラッシュ開始 progress 値（終点ぶれのマスク兼用, 推奨: 0.9） */
        flashTriggerProgress: 1.0,
        /** 降下時のカメラの引き距離 (基準の何倍か) */
        descendDistanceMultiplier: 1.5,
        /** 降下時の遠心力の強さ */
        centrifugalForceMultiplier: 6.0,
        /** バンキング（傾き）の乗数 */
        bankingMultiplier: 0.05,
    },

    /** ─── 横線（マジックブリッジ） ─── */
    bridge: {
        revealDistance: 3.0,
        revealDuration: 0.6,
        revealEasing: "easeOutBack" as const,
        particleCount: 30,
        particleColor: { h: 200, s: 100, l: 70 },
        particleLifetime: 1.0,
        /** true: 横線を最初から半透明で表示（カメラ接近で完全発光） */
        initiallyVisible: true,
    },

    /** ─── Bloomエフェクト & パフォーマンス ─── */
    bloom: {
        intensity: 1.2,
        luminanceThreshold: 0.4,
        luminanceSmoothing: 0.9,
        /** モバイルでは deviceConfig.ts により 0.25 へ自動切り替え */
        resolutionScale: 0.5,
    },

    /** ─── 全体レイアウト ─── */
    layout: {
        pillarCount: 5,
        pillarSpacing: 2.5,
        pillarHeight: 30,
        /** 横線の本数。対角線も含めてランダムに配置される */
        bridgeCount: 20,
        /** 円周配置の半径 */
        cylinderRadius: 12,
    },

    /** ─── 宇宙背景演出 ─── */
    galaxy: {
        particleCount: 50000,
        spiralSpin: 1.5,
        branches: 3,
        galaxyRadius: 60,
    },

    /** ─── 結末の演出 ─── */
    result: {
        flashDuration: 0.5,
        confettiCount: 200,
        confettiColors: ["#FFEB3B", "#FFD54F", "#FFF176", "#FFE082", "#FFCC80", "#FFFFFF", "#B3E5FC", "#C5CAE9"],
        textRotationDuration: 12,
        textSize: 4.0,
        /** リザルト画面で通ったラインを表示するか */
        showPathTrace: true,
    },
} as const;

export type AmidaConfig = typeof AMIDA_CONFIG;
