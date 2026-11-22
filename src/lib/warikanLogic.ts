/**
 * warikanLogic.ts
 *
 * 飲み会・宇宙割り勘あみだくじの金額分配＆あみだ生成ロジック（純粋関数）。
 * - すべての分配パターンで「全員の合計 === totalAmount」を厳密に保証する。
 * - maxPerPerson（1人あたり最大金額）が指定された場合、数学的に可能な限り上限を厳守する。
 */

export type WarikanPattern = "equal" | "one_free" | "random_range";

export interface WarikanInput {
    totalAmount: number;
    memberCount: number;
    pattern: WarikanPattern;
    /** random_range 時の振れ幅（パーセンテージ: 10 〜 100） */
    rangePercent?: number;
    /** 1人あたりの最大支払額（円）。null または undefined なら上限なし */
    maxPerPerson?: number | null;
    /** 丸め単位（円）。デフォルト 100 円 */
    unit?: number;
}

export interface WarikanAllocationResult {
    amounts: number[];
    warning: string | null;
}

export interface WarikanBridge {
    fromIndex: number;
    toIndex: number;
    level: number;
}

export interface WarikanLadder {
    memberCount: number;
    levels: number;
    bridges: WarikanBridge[];
    /** startToGoal[startIndex] = goalIndex */
    startToGoal: number[];
}

/** 配列を Fisher-Yates でシャッフルした新配列を返す */
export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * 指定された最小・最大制約のもとで、配列の合計を targetSum に厳密に一致させる。
 * 可能な限り unit 単位で調整し、最後に端数（< unit）を吸収する。
 */
function rebalanceToTarget(
    raw: number[],
    targetSum: number,
    mins: number[],
    maxs: number[],
    unit: number,
    rng: () => number
): number[] {
    const arr = raw.map((v, i) => Math.max(mins[i], Math.min(maxs[i], v)));
    const n = arr.length;

    const adjustStep = (step: number) => {
        let safety = 0;
        while (safety < 10000) {
            safety++;
            const currentSum = arr.reduce((a, b) => a + b, 0);
            const diff = targetSum - currentSum;
            if (Math.abs(diff) < step) break;

            if (diff > 0) {
                const candidates: number[] = [];
                for (let i = 0; i < n; i++) {
                    if (arr[i] + step <= maxs[i]) candidates.push(i);
                }
                if (candidates.length === 0) break;
                const pick = candidates[Math.floor(rng() * candidates.length)];
                arr[pick] += step;
            } else {
                const candidates: number[] = [];
                for (let i = 0; i < n; i++) {
                    if (arr[i] - step >= mins[i]) candidates.push(i);
                }
                if (candidates.length === 0) break;
                const pick = candidates[Math.floor(rng() * candidates.length)];
                arr[pick] -= step;
            }
        }
    };

    if (unit > 1) {
        adjustStep(unit);
    }
    adjustStep(1);

    return arr;
}

/**
 * 割り勘の分配金額配列を算出する。
 */
export function calculateWarikanAmounts(
    input: WarikanInput,
    rng: () => number = Math.random
): WarikanAllocationResult {
    const total = Math.max(0, Math.round(input.totalAmount));
    const n = Math.max(2, Math.min(8, Math.round(input.memberCount)));
    const unit = input.unit ?? 100;
    const minRequiredCap = Math.ceil(total / n);

    let effectiveCap =
        input.maxPerPerson != null && input.maxPerPerson > 0
            ? Math.round(input.maxPerPerson)
            : total;
    let warning: string | null = null;

    if (effectiveCap * n < total) {
        effectiveCap = minRequiredCap;
        warning = `合計金額を${n}人で割るには最低 ${minRequiredCap.toLocaleString()}円/人 必要なため、上限を自動調整しました。`;
    }

    if (total === 0) {
        return { amounts: Array(n).fill(0), warning };
    }

    if (input.pattern === "equal") {
        const base = Math.floor(total / n / unit) * unit;
        const raw = Array(n).fill(Math.min(base, effectiveCap));
        const mins = Array(n).fill(0);
        const maxs = Array(n).fill(effectiveCap);
        const balanced = rebalanceToTarget(raw, total, mins, maxs, unit, rng);
        return { amounts: shuffleArray(balanced, rng), warning };
    }

    if (input.pattern === "one_free") {
        const payers = n - 1;
        const maxFromPayers = payers * effectiveCap;

        if (maxFromPayers >= total) {
            // 1人を完全に 0 円にできる
            const base = Math.floor(total / payers / unit) * unit;
            const payerRaw = Array(payers).fill(Math.min(base, effectiveCap));
            const payerBalanced = rebalanceToTarget(
                payerRaw,
                total,
                Array(payers).fill(0),
                Array(payers).fill(effectiveCap),
                unit,
                rng
            );
            return {
                amounts: shuffleArray([0, ...payerBalanced], rng),
                warning,
            };
        } else {
            // 上限キャップがあるため、残り全員を上限まで払い、溢れ分をラッキー枠が負担
            const overflow = total - maxFromPayers;
            const amounts = [overflow, ...Array(payers).fill(effectiveCap)];
            return {
                amounts: shuffleArray(amounts, rng),
                warning:
                    warning ??
                    `最大金額（${effectiveCap.toLocaleString()}円）を守るため、1人無料枠を ${overflow.toLocaleString()}円 に調整しました。`,
            };
        }
    }

    // pattern === "random_range"
    const pct = Math.max(0, Math.min(100, input.rangePercent ?? 30)) / 100;
    const avg = total / n;
    const lowerBound = Math.max(0, Math.floor((avg * (1 - pct)) / unit) * unit);
    const upperBound = Math.min(
        effectiveCap,
        Math.ceil((avg * (1 + pct)) / unit) * unit
    );

    const mins = Array(n).fill(Math.min(lowerBound, effectiveCap));
    const maxs = Array(n).fill(Math.max(upperBound, Math.min(minRequiredCap, effectiveCap)));

    // 範囲の合計が target を挟めない場合は上限/下限を緩和
    const minSum = mins.reduce((a, b) => a + b, 0);
    const maxSum = maxs.reduce((a, b) => a + b, 0);
    if (minSum > total) {
        mins.fill(0);
    }
    if (maxSum < total) {
        maxs.fill(effectiveCap);
    }

    const raw = Array.from({ length: n }, (_, i) => {
        const lo = mins[i];
        const hi = maxs[i];
        if (hi <= lo) return lo;
        const steps = Math.max(1, Math.floor((hi - lo) / unit));
        const val = lo + Math.floor(rng() * (steps + 1)) * unit;
        return Math.min(hi, val);
    });

    const balanced = rebalanceToTarget(raw, total, mins, maxs, unit, rng);
    return { amounts: shuffleArray(balanced, rng), warning };
}

/**
 * 2〜8人対応のあみだくじ構造と、各スタート位置の到達ゴールを算出する。
 */
export function generateWarikanLadder(
    memberCount: number,
    rng: () => number = Math.random
): WarikanLadder {
    const n = Math.max(2, Math.min(8, Math.round(memberCount)));
    const levels = Math.max(6, n * 2 + 2);
    const bridges: WarikanBridge[] = [];

    for (let level = 0; level < levels; level++) {
        let col = 0;
        while (col < n - 1) {
            // 隣接する横線が同じ段で重ならないように配置
            if (rng() < 0.45) {
                bridges.push({ fromIndex: col, toIndex: col + 1, level });
                col += 2;
            } else {
                col += 1;
            }
        }
    }

    // 最低1本は横線があることを保証
    if (bridges.length === 0) {
        bridges.push({ fromIndex: 0, toIndex: 1, level: Math.floor(levels / 2) });
    }

    // 各スタート柱の到達ゴールを計算
    const startToGoal = Array.from({ length: n }, (_, start) => {
        let pos = start;
        for (let level = 0; level < levels; level++) {
            const b = bridges.find(
                (br) => br.level === level && (br.fromIndex === pos || br.toIndex === pos)
            );
            if (b) {
                pos = b.fromIndex === pos ? b.toIndex : b.fromIndex;
            }
        }
        return pos;
    });

    return { memberCount: n, levels, bridges, startToGoal };
}
