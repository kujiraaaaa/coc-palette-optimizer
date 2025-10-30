import './style.css'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjjtdaoieuvakwufisdj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqanRkYW9pZXV2YWt3dWZpc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDYwMjQsImV4cCI6MjA3NzM4MjAyNH0.a-6wbr7aabX0EutpmM3n_vpuBKzMBXC0Zhok4byRaEM';
const supabase = createClient(supabaseUrl, supabaseKey);

// 最適化ボタン回数カウンターをSupabaseで取得・インクリメント・表示
async function incrementAndDisplayOptimizeCount() {
  const { data, error } = await supabase
    .from('counter')
    .select('count')
    .eq('id', 1)
    .single();

  if (error) {
    displayOptimizeCountText('カウント取得失敗');
    return;
  }

  let currentCount = (data?.count ?? 0) + 1;

  const { error: updateError } = await supabase
    .from('counter')
    .update({ count: currentCount })
    .eq('id', 1);

  if (updateError) {
    displayOptimizeCountText('カウント更新失敗');
    return;
  }
  displayOptimizeCountText(`最適化ボタンが${currentCount}回押されました`);
}

function displayOptimizeCountText(text: string) {
  const el = document.getElementById('optimize-count');
  if (el) el.textContent = text;
}

// HTMLの要素を取得
const inputArea = document.getElementById('input-palette') as HTMLTextAreaElement;
const outputArea = document.getElementById('output-palette') as HTMLTextAreaElement;
const optimizeButton = document.getElementById('optimize-button') as HTMLButtonElement;
const copyButton = document.getElementById('copy-button') as HTMLButtonElement;

// 「最適化」ボタンが押されたときの処理
optimizeButton.addEventListener('click', () => {
  const inputText = inputArea.value;
  const outputText = optimizePalette(inputText);
  outputArea.value = outputText;
  incrementAndDisplayOptimizeCount();
});

// 「コピー」ボタンが押されたときの処理
copyButton.addEventListener('click', () => {
  outputArea.select();
  navigator.clipboard.writeText(outputArea.value)
    .then(() => alert('コピーしました！'))
    .catch(err => alert('コピーに失敗しました: ' + err));
});

// ページロード時に現在値のみ表示
(async () => {
  const { data, error } = await supabase
    .from('counter')
    .select('count')
    .eq('id', 1)
    .single();
  if (error) {
    displayOptimizeCountText('カウント取得失敗');
    return;
  }
  const count = data?.count ?? 0;
  displayOptimizeCountText(`最適化ボタンが${count}回押されました`);
})();

// --- ここからがチャットパレット最適化のメインロジック ---
function optimizePalette(text: string): string {
  if (!text.trim()) return ""; // 空なら何もしない

  const lines = text.split('\n');
  const skills: { [key: string]: number } = {};
  let san = 0;

  // CoC6版の技能初期値リスト
  const initialSkills: { [key: string]: number } = {
    '回避': 0, 'キック': 25, '組み付き': 25, 'こぶし（パンチ）': 50, '頭突き': 10, '投擲': 25, 'マーシャルアーツ': 1, '拳銃': 20, 'サブマシンガン': 15, 'ショットガン': 30, 'マシンガン': 15, 'ライフル': 25,
    '応急手当': 30, '鍵開け': 1, '隠す': 15, '隠れる': 10, '聞き耳': 25, '忍び歩き': 10, '写真術': 10, '精神分析': 1, '追跡': 10, '登攀': 40, '図書館': 25, '目星': 25,
    '運転': 20, '機械修理': 20, '重機械操作': 1, '乗馬': 5, '水泳': 25, '製作': 5, '操縦': 1, '跳躍': 25, '電気修理': 10, 'ナビゲート': 10, '変装': 1,
    '言いくるめ': 5, '信用': 15, '説得': 15, '値切り': 5, '母国語': 0,
    '医学': 5, 'オカルト': 5, '化学': 1, 'クトゥルフ神話': 0, '芸術': 5, '経理': 10, '考古学': 1, 'コンピューター': 1, '心理学': 5, '人類学': 1, '生物学': 1, '地質学': 1, '電子工学': 1, '天文学': 1, '博物学': 10, '物理学': 1, '法律': 5, '薬学': 1, '歴史': 20,
  };
  
  // 1. 全行を解析して能力値と技能を抽出
  lines.forEach(line => {
    // 正気度ロール
    let match = line.match(/1d100<={SAN}\s*.*【正気度ロール】/);
    if(match) {
      san = 1; // SANの行があったことを記録
      return;
    }

    // 通常技能ロール
    match = line.match(/CCB<=(\d+)\s*【(.+)】/);
    if(match) {
      const skillName = match[2];
      const skillValue = parseInt(match[1]);
      
      // 「アイデア」「幸運」「知識」は能力値ロールなので技能リストから除外
      if(!['アイデア', '幸運', '知識'].includes(skillName)) {
        skills[skillName] = skillValue;
      }
    }
  });

  // 2. 抽出したデータを使って新しいパレットを組み立てる
  const result: string[] = [];
  if (san > 0) result.push("1d100<={SAN} 【正気度ロール】");
  result.push("---");
  
  result.push(`CCB<={STR}*5 【STR×5】`);
  result.push(`CCB<={CON}*5 【CON×5】（ショックロール）`);
  result.push(`CCB<={POW}*5 【POW×5】（幸運）`);
  result.push(`CCB<={DEX}*5 【DEX×5】`);
  result.push(`CCB<={APP}*5 【APP×5】`);
  result.push(`CCB<={SIZ}*5 【SIZ×5】`);
  result.push(`CCB<={INT}*5 【INT×5】（アイデア）`);
  result.push(`CCB<={EDU}*5 【EDU×5】（知識・母国語）`);
  
  result.push("---");

  // 技能を「初期値より高いもの」と「それ以外」に分類
  const grownSkills: string[] = [];
  const otherSkills: string[] = [];
  
  for (const skillName in skills) {
    const value = skills[skillName];
    const initialValue = initialSkills[skillName.replace(/《.+》/, '')] ?? -1; // 特殊技能《》を除外して検索
    const line = `CCB<=${value} 【${skillName}】`;
    
    if (value > initialValue) {
      grownSkills.push(line);
    } else {
      otherSkills.push(line);
    }
  }
  
  result.push(...grownSkills);
  result.push("---");
  result.push(...otherSkills);
  result.push("---");
  
  // こぶし・キックは初期値でも使うため、常に追加
  result.push(`1D3{DB} 【こぶしダメージ判定】`);
  result.push(`1D6{DB} 【キックダメージ判定】`);

  // マーシャルアーツは技能値を振っている（初期値1より大きい）場合のみ追加
  if (skills['マーシャルアーツ'] > initialSkills['マーシャルアーツ']) {
      result.push(`2D3{DB} 【こぶし+マーシャルアーツダメージ判定】`);
      result.push(`2D6{DB} 【キック+マーシャルアーツダメージ判定】`);
  }
  // 応急手当は初期値(30)でも使うため、常に追加
  result.push("1D3 【応急手当回復値判定】");

  // 医学は技能値を振っている（初期値5より大きい）場合のみ追加
  if (skills['医学'] > initialSkills['医学']) {
      result.push("2D3 【医学回復値判定】");
  }
  
  result.push("---");
  result.push("CCB<=");
  result.push("---");
  result.push("・組み合わせロール\nCBRB(x,y)");
  result.push("---");
  result.push("・抵抗表ロール\nRESB(x-y)");
  result.push("---");
  result.push("choice[A,B,C]");
  result.push("---");
  result.push("・ステータス操作\n:SAN\n:HP\n:MP");

  return result.join('\n');
}
// --- ここからがフィードバックフォームのロジック ---

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1417163291280674826/p0SVn6ZzLfIdvSpvZZC--d9poPjUayLwih3fO2kaVZFoNtR5ymvCiA3GmGB-Hvu1wLOe';

// フィードバックフォームのHTML要素を取得
const feedbackForm = document.getElementById('feedback-form') as HTMLFormElement;
const feedbackType = document.getElementById('feedback-type') as HTMLSelectElement;
const feedbackContent = document.getElementById('feedback-content') as HTMLTextAreaElement;
const submitButton = document.getElementById('feedback-submit-button') as HTMLButtonElement;

// フォームが送信されたときの処理
feedbackForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // フォームのデフォルトの送信動作（ページリロード）を防ぐ

  // 入力値を取得
  const type = feedbackType.value;
  const content = feedbackContent.value;

  if (!content.trim()) {
    alert('内容を入力してください。');
    return;
  }
  
  // 送信ボタンを無効化して二重送信を防ぐ
  submitButton.disabled = true;
  submitButton.textContent = '送信中...';

  // Discordに送信するデータ（ペイロード）を作成
  const payload = {
    embeds: [
      {
        title: `フィードバックを受信しました`,
        color: 0x5865F2, // Discordのブランドカラー
        fields: [
          {
            name: '種類',
            value: type,
            inline: true,
          },
          {
            name: '内容',
            value: content,
          }
        ],
        timestamp: new Date().toISOString(),
      }
    ]
  };

  try {
    // fetch APIを使ってDiscordにPOSTリクエストを送信
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert('フィードバックを送信しました。ご協力ありがとうございます！');
      feedbackForm.reset(); // フォームの内容をリセット
    } else {
      // Discordからのエラーレスポンス
      console.error('Discord API Error:', await response.json());
      alert('送信に失敗しました。時間をおいて再度お試しください。');
    }
  } catch (error) {
    // ネットワークエラーなど
    console.error('Fetch Error:', error);
    alert('送信中にエラーが発生しました。');
  } finally {
    // 成功・失敗にかかわらずボタンを元に戻す
    submitButton.disabled = false;
    submitButton.textContent = '送信';
  }
});