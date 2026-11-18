// ===== 圖片相關變數 =====
let bgImg; // 用來存放背景圖片（background.png，城市像素風）
let sheetImg; // 用來存放整張角色圖片精靈（2_all.png，共 8 格）
let effectImg; // 用來存放愛心特效的圖片精靈（effect.png，由 gif 拆成 11 格橫向排列）

// 背景圖片四周有一圈深灰色邊框，所以只裁切中間真正的畫面來使用
const BG_X = 36; // 要裁切的區域：左上角 x
const BG_Y = 114; // 要裁切的區域：左上角 y
const BG_W = 1728; // 要裁切的區域：寬度
const BG_H = 972; // 要裁切的區域：高度

// 每一格在精靈圖中的 [起點x, 寬度, 頭頂的y]（頭頂的y 是這一格裡，角色最上面一點離圖片頂端幾個像素）
const FRAMES = [
  [6, 43, 4], // 第 0 格：站立（雙手放下）
  [67, 41, 8], // 第 1 格：蹲下（雙手抱頭）
  [122, 51, 8], // 第 2 格：蹲下（雙手張開）
  [187, 40, 1], // 第 3 格：腳底噴火
  [245, 45, 3], // 第 4 格：腳底噴火（小）
  [303, 49, 9], // 第 5 格：蹲下（手向外）
  [360, 55, 2], // 第 6 格：斜飛（噴火）
  [420, 55, 2], // 第 7 格：斜飛（反向）
];
const SHEET_H = 63; // 整張精靈圖的高度（每一格高度都一樣）

// 「站立」與「走路」各自要循環播放哪幾格（填上面 FRAMES 的編號，可自行調整）
const STOP_SEQ = [0, 1, 2, 1]; // 站立動畫：依序播放第 0、1、2、1 格
const WALK_SEQ = [3, 4, 5, 4]; // 走路（奔跑）動畫：依序播放第 3、4、5、4 格

// ===== 愛心特效（gif 拆成的圖片精靈）設定 =====
const EFFECT_FRAMES = 11; // 特效一共有幾格
const EFFECT_SRC_W = 280; // 特效精靈圖中，每一格的寬度
const EFFECT_SRC_H = 262; // 特效精靈圖中，每一格的高度
const EFFECT_W = 140; // 特效畫在畫面上的寬度
const EFFECT_H = 131; // 特效畫在畫面上的高度
const EFFECT_MS = 70; // 每一格停留幾毫秒（和原本的 gif 一樣是 70）
const EFFECT_TAIL = 0.15; // 對話泡泡的小尾巴在圖片由左算起約 15% 的位置，用來讓尾巴對準頭頂
const CM_PX = 96 / 2.54; // 1 公分等於幾個像素（網頁標準：96 像素 = 2.54 公分）
const HEAD_GAP = 0.7 * CM_PX; // 特效離頭頂 0.7 公分，換算成像素約 26 像素

// ===== 其他設定 =====
const SCALE = 3; // 角色放大倍率（原圖很小，放大 3 倍比較清楚）
const FLOOR_RATIO = 0.88; // 角色腳底站的位置，佔畫面高度的比例
const FRAME_DELAY = 8; // 每隔幾個畫面才換下一格（數字越大動畫越慢）
const BG_SPEED = 8; // 背景每個畫面移動的像素數（數字越大，跑得越快）
const TILE_COUNT = 3; // 背景要複製幾份並排（這裡是 3 份）
const EFFECT_START = 0.75; // 往右跑的距離累積到「畫面寬度的 75%」後，就出現特效

let players = []; // 用來存放所有角色的陣列（這裡會放 2 個角色）
let scrollX = 0; // 背景目前捲動了多少像素（用來畫背景，會繞圈）
let traveled = 0; // 一共往右跑了多遠（像素，不會繞圈；往左跑會變少）

// ===== 角色類別：把「一個角色」需要的資料和動作包在一起 =====
class Player {
  // constructor 是建立角色時自動執行的函式，參數為：位置比例、向右鍵、向左鍵、起始面向
  constructor(xRatio, rightKey, leftKey, facing) {
    this.xRatio = xRatio; // 角色在畫面水平方向的位置比例（角色本身不會左右移動，是背景在動）
    this.rightKey = rightKey; // 控制向右跑的按鍵代碼
    this.leftKey = leftKey; // 控制向左跑的按鍵代碼
    this.facing = facing; // 面向：1 代表朝右，-1 代表朝左
    this.dir = 0; // 目前的跑步方向：1 向右、-1 向左、0 沒有跑
    this.step = 0; // 目前播放到動畫序列的第幾步
  }

  // update() 負責更新角色的狀態（按鍵、面向、動畫步驟）
  update() {
    if (keyIsDown(this.rightKey)) { // 如果這個角色的「向右鍵」正被按住
      this.dir = 1; // 方向設為向右
      this.facing = 1; // 面向右邊
    } else if (keyIsDown(this.leftKey)) { // 否則如果「向左鍵」正被按住
      this.dir = -1; // 方向設為向左
      this.facing = -1; // 面向左邊（畫的時候會左右翻轉）
    } else { // 兩個鍵都沒按
      this.dir = 0; // 沒有跑步，回到站立
    }

    let seq = this.dir !== 0 ? WALK_SEQ : STOP_SEQ; // 有在跑用 WALK_SEQ，否則用 STOP_SEQ
    if (frameCount % FRAME_DELAY === 0) { // 每經過 FRAME_DELAY 個畫面才進來一次
      this.step++; // 換成下一步
    }
    this.step = this.step % seq.length; // 超過最後一步就回到第 0 步（循環播放）
  }

  // display() 負責把角色畫到畫布上；showEffect 為 true 時，頭上會多一個愛心特效
  display(showEffect) {
    let seq = this.dir !== 0 ? WALK_SEQ : STOP_SEQ; // 選擇目前要播放的動畫序列
    let f = FRAMES[seq[this.step]]; // 取出目前要播放的那一格資料
    let sx = f[0]; // 這一格在精靈圖中的起點 x
    let sw = f[1]; // 這一格的寬度
    let headTop = f[2]; // 這一格裡，頭頂離圖片頂端的像素數

    let x = width * this.xRatio; // 角色的 x 座標：畫面寬度 × 位置比例
    let y = height * FLOOR_RATIO - (SHEET_H * SCALE) / 2; // 腳底位置 − 角色高度的一半 = 角色中心點的 y

    push(); // 儲存目前的繪圖設定，避免翻轉影響到其他東西
    translate(x, y); // 把座標原點移到角色所在的位置
    scale(this.facing, 1); // 水平縮放：facing 為 -1 時圖片會左右翻轉
    image(
      sheetImg, // 要畫的圖片精靈
      0, // 畫在原點的 x
      0, // 畫在原點的 y
      sw * SCALE, // 畫出來的寬度（單格寬度 × 放大倍率）
      SHEET_H * SCALE, // 畫出來的高度（單格高度 × 放大倍率）
      sx, // 從精靈圖的哪個 x 位置開始裁切
      0, // 從精靈圖的哪個 y 位置開始裁切
      sw, // 裁切下來的寬度
      SHEET_H // 裁切下來的高度
    ); // 把精靈圖中目前這一格畫到畫布上
    pop(); // 還原剛才儲存的繪圖設定

    if (showEffect) { // 如果現在要顯示特效
      let headY = y - (SHEET_H * SCALE) / 2 + headTop * SCALE; // 頭頂在畫面上的 y 座標
      let effectBottom = headY - HEAD_GAP; // 特效的底部：頭頂再往上 0.7 公分
      let ex = x + (0.5 - EFFECT_TAIL) * EFFECT_W; // 特效中心的 x：讓小尾巴剛好在頭的正上方，泡泡往右上方展開
      let ey = effectBottom - EFFECT_H / 2; // 特效中心的 y：底部再往上半個特效高度
      let idx = floor(millis() / EFFECT_MS) % EFFECT_FRAMES; // 依照經過的時間，算出現在播到第幾格（循環播放）
      push(); // 儲存目前的繪圖設定
      smooth(); // 特效是平滑的插圖，開啟平滑處理，縮小後才不會粗糙
      image(
        effectImg, // 特效圖片精靈
        ex, // 畫在特效中心的 x
        ey, // 畫在特效中心的 y
        EFFECT_W, // 畫出來的寬度
        EFFECT_H, // 畫出來的高度
        idx * EFFECT_SRC_W, // 從精靈圖的哪個 x 位置開始裁切（第幾格 × 每格寬度）
        0, // 從精靈圖的哪個 y 位置開始裁切
        EFFECT_SRC_W, // 裁切下來的寬度
        EFFECT_SRC_H // 裁切下來的高度
      ); // 把特效目前這一格畫出來
      pop(); // 還原繪圖設定
    }
  }
}

// preload() 會在 setup() 之前執行，專門用來載入圖片、聲音等檔案
function preload() {
  bgImg = loadImage("background.png"); // 載入背景圖片（要和 index.html 放在同一個資料夾）
  sheetImg = loadImage("2_all.png"); // 載入角色圖片精靈
  effectImg = loadImage("effect.png"); // 載入愛心特效圖片精靈
}

// setup() 只會在程式開始時執行一次，用來做初始設定
function setup() {
  createCanvas(windowWidth, windowHeight); // 建立與瀏覽器視窗一樣大的全螢幕畫布
  imageMode(CENTER); // 設定圖片以「中心點」為基準來擺放（角色與特效使用）
  noSmooth(); // 關閉圖片平滑處理，像素畫放大後才不會變模糊
  players.push(new Player(1 / 3, RIGHT_ARROW, LEFT_ARROW, 1)); // 角色 1：在畫面 1/3 處，用方向鍵 → ← 控制
  players.push(new Player(2 / 3, 68, 65, -1)); // 角色 2：在畫面 2/3 處，用 D（向右）和 A（向左）控制，一開始面向左
}

// 畫出會捲動的背景：把同一張圖片複製 3 份並排，整排一起移動
function drawBackground() {
  background("#edf2fb"); // 先塗上底色 edf2fb，萬一圖片還沒載入也不會是黑的

  let s = max(height / BG_H, width / ((TILE_COUNT - 1) * BG_W)); // 計算放大倍率：至少要讓高度填滿，且 3 份要能蓋住整個畫面寬度
  let tileW = BG_W * s; // 每一份背景放大後的寬度（3 份的大小都一樣）
  let tileH = BG_H * s; // 每一份背景放大後的高度
  let top = height - tileH; // 背景貼齊畫面底部（如果比畫面高，上方會被裁掉）

  scrollX = ((scrollX % tileW) + tileW) % tileW; // 讓捲動量永遠落在 0 到 tileW 之間，超過就繞回來，背景才能無限循環

  push(); // 儲存目前的繪圖設定
  imageMode(CORNER); // 背景改用「左上角」為基準來擺放
  for (let i = 0; i < TILE_COUNT; i++) { // 重複 3 次，畫出 3 份背景
    let x0 = round(-scrollX + i * tileW); // 這一份的左邊位置（用 round 取整數，避免份與份之間出現細縫）
    let x1 = round(-scrollX + (i + 1) * tileW); // 這一份的右邊位置（也就是下一份的左邊）
    image(bgImg, x0, top, x1 - x0, tileH, BG_X, BG_Y, BG_W, BG_H); // 畫出一份背景，只裁切圖片中間沒有邊框的部分
  } // 迴圈結束
  pop(); // 還原繪圖設定
}

// draw() 會不斷重複執行（每秒約 60 次），用來畫出動畫
function draw() {
  let move = 0; // 用來累計「背景要往哪個方向跑」
  for (let p of players) { // 對陣列裡的每一個角色依序處理
    p.update(); // 更新這個角色的按鍵、面向與動畫
    move += p.dir; // 把角色的跑步方向加總：向右 +1、向左 -1
  }
  move = constrain(move, -1, 1); // 把結果限制在 -1 到 1 之間（兩人方向相反會互相抵消）
  scrollX += BG_SPEED * move; // 角色向右跑，背景就向左移（scrollX 增加）；向左跑則相反
  traveled += BG_SPEED * move; // 同時累計一共往右跑了多遠

  let showEffect = traveled >= width * EFFECT_START; // 往右跑的距離達到畫面寬度的 75% 以上，就開啟特效

  drawBackground(); // 先畫背景
  for (let p of players) { // 再對每一個角色
    p.display(showEffect); // 把角色畫在背景上面，需要時頭上也畫出特效
  }
}

// 當瀏覽器視窗大小改變時，p5.js 會自動呼叫這個函式
function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // 讓畫布重新調整成新的視窗大小
}
