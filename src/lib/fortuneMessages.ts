/**
 * fortuneMessages.ts
 * AIメッセージの代替となる文字列プール（AI API不使用）。
 * カテゴリごとに分類し、バリエーションを豊富に用意。
 */

export const FORTUNE_MESSAGES = [
    // 運命・未来
    "今日のあなたは最高の輝きを放っています！",
    "運命はあなたに味方しています！",
    "あなたの未来は黄金に満ちています！",
    "宇宙があなたの願いを後押ししています！",
    // 自信・可能性
    "あなたなら何でもできる！信じてください！",
    "全力で輝いてください！あなたを応援しています！",
    "あなたの才能は無限大です！",
    "今日という日があなたを選びました！",
    // 出会い・縁
    "素晴らしい出会いと幸運があなたを待っています！",
    "笑顔があなたの最強の武器です！",
    // 即日・今日の運
    "今日は何をしても上手くいく日です！",
    "素晴らしい一日が待っています！",
    "この瞬間から、あなたの幸運が始まります！",
    "今日のあなたは誰よりも運が良い！",
    // 達成・成功
    "努力が実を結ぶとき、それが今日です！",
    "大きな幸せがもうすぐドアをノックします！",
] as const;

export type FortuneMessage = (typeof FORTUNE_MESSAGES)[number];

/**
 * ランダムな大吉メッセージを返す。
 * @returns ランダムに選ばれたメッセージ文字列
 */
export function getRandomMessage(): FortuneMessage {
    return FORTUNE_MESSAGES[
        Math.floor(Math.random() * FORTUNE_MESSAGES.length)
    ];
}
