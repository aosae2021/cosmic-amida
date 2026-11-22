/**
 * deviceConfig.ts
 * 起動時にUA判定してモバイル・デスクトップ別の設定を返す。
 * モバイルでは Bloom 解像度と Particle 数を軽量化する。
 *
 * 注意: navigator はクライアントサイドのみ有効。
 * Client Component の useEffect 内または動的インポート後に呼ぶこと。
 */

import type { AmidaConfig } from "./amidaConfig";

/**
 * UA判定でモバイルかどうかを返す。
 */
export function isMobileDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * デバイスに応じたコンフィグを返す。
 * モバイルの場合は bloom.resolutionScale を 0.25、
 * bridge.particleCount を 15 に自動軽量化する。
 *
 * @param config ベースとなる AmidaConfig
 * @returns デバイス最適化済みコンフィグ
 */
export function getDeviceConfig(config: AmidaConfig): AmidaConfig {
    if (!isMobileDevice()) return config;

    return {
        ...config,
        bloom: {
            ...config.bloom,
            resolutionScale: 0.25,
        },
        bridge: {
            ...config.bridge,
            particleCount: 15,
        },
    } as unknown as AmidaConfig;
}
