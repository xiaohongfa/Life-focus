import { spawn } from 'child_process';
import fs from 'fs';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const USER_DATA = "C:\\Users\\hongl\\AppData\\Local\\Temp\\edge_debug_cycle_" + Date.now();
const PORT = 9248;
const SCREENSHOT_DIR = "C:\\Users\\hongl\\.gemini\\antigravity\\brain\\b632b386-68b3-4ecf-8795-4543cb5ede80";

const edgeProc = spawn(EDGE_PATH, [
  '--headless=new',
  '--window-size=1440,960',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DATA}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-fre',
  '--disable-sync',
  '--disable-extensions',
  '--guest',
  'about:blank'
], { stdio: 'ignore' });

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function main() {
  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await delay(500);
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const list = await res.json();
        const page = list.find(t => t.type === 'page' && !t.url.startsWith('edge://'));
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
    }

    if (!wsUrl) throw new Error("CDP URL not found");
    const ws = new WebSocket(wsUrl);
    let idCounter = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((res) => ws.onopen = res);
    await send('Page.enable');
    await send('Runtime.enable');

    console.log("Navigating to http://localhost:1420...");
    await send('Page.navigate', { url: 'http://localhost:1420' });
    await delay(3000);

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (res.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails));
      }
      return res.result?.value;
    }

    async function takeScreenshot(filename) {
      const snap = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(snap.data, 'base64');
      fs.writeFileSync(`${SCREENSHOT_DIR}\\${filename}`, buf);
      console.log(`Saved screenshot: ${filename}`);
    }

    // Helper to click tab by label
    async function clickTab(label) {
      await evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent.trim() === '${label}');
        if (target) target.click();
      })()`);
      await delay(1200);
    }

    // ==========================================
    // 1. DECISION VIEW: +1 AND -1 (DECREMENT)
    // ==========================================
    console.log("--- 1. Testing Decision View Decrement (-1) ---");
    await clickTab('战略决议');

    // Create a repeatable decision via api client
    await evaluate(`(async () => {
      const { api } = await import('/src/api/client.ts');
      const lives = await api.listLives();
      const lifeId = lives[0].id;
      await api.createDecision(lifeId, '每日晨跑3公里与战术体能', '保持心肺耐力与充沛脑力', 'repeatable', '精力管理');
    })()`);
    await delay(500);

    // Refresh view by clicking filter
    await evaluate(`(() => {
      const allFilter = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('全部') || b.textContent.includes('待执行'));
      if (allFilter) allFilter.click();
    })()`);
    await delay(800);

    // Click "做了 (+1)"
    console.log("Clicking 做了 (+1)...");
    await evaluate(`(() => {
      const plusBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('做了 (+1)'));
      if (plusBtns.length > 0) plusBtns[0].click();
    })()`);
    await delay(1000);

    const hasDecrementBtn = await evaluate(`(() => {
      const minusBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('撤销 (-1)'));
      return minusBtns.length > 0;
    })()`);
    console.log("Decrement (-1) button rendered after +1:", hasDecrementBtn);
    await takeScreenshot('decision_incremented_with_decrement_btn.png');

    // Click "撤销 (-1)"
    console.log("Clicking 撤销 (-1)...");
    await evaluate(`(() => {
      const minusBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('撤销 (-1)'));
      if (minusBtns.length > 0) minusBtns[0].click();
    })()`);
    await delay(1000);

    const countAfterDec = await evaluate(`(() => {
      const countBadges = Array.from(document.querySelectorAll('.font-mono')).filter(el => el.textContent.includes('已执行'));
      return countBadges.map(el => el.textContent.trim());
    })()`);
    console.log("Count badges after decrement:", countAfterDec);
    await takeScreenshot('decision_decremented_back_to_zero.png');

    // ==========================================
    // 2. LEADER VIEW: TRAIT DEADLOCK & UNBIND
    // ==========================================
    console.log("--- 2. Testing Trait Deadlock Alert & Unbind ---");
    await clickTab('领袖与特质');

    // Create the exact cyclic traits from user screenshot: 三角洲能力等级一 and 三角洲能力等级二
    await evaluate(`(async () => {
      const { api } = await import('/src/api/client.ts');
      const lives = await api.listLives();
      const lifeId = lives[0].id;
      const t1 = await api.createTrait(lifeId, '三角洲能力等级一', '等级一特质自述与决断表现');
      const t2 = await api.createTrait(lifeId, '三角洲能力等级二', '等级二特质进阶心智表现');
      // Bidirectional cyclic edges: 1 -> 2 and 2 -> 1
      await api.addTraitRelation(lifeId, t1.id, t2.id, '演化');
      await api.addTraitRelation(lifeId, t2.id, t1.id, '回环死锁演化');
    })()`);
    await delay(600);

    // Refresh leader tab by clicking tab again
    await clickTab('领袖与特质');

    // Switch to Grid View
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const gridBtn = btns.find(b => b.textContent.includes('网格列表'));
      if (gridBtn) gridBtn.click();
    })()`);
    await delay(800);

    const deadlockBanner = await evaluate(`(() => {
      const banner = document.querySelector('.bg-rose-950\\\\/70');
      return banner ? banner.textContent.trim() : null;
    })()`);
    console.log("Deadlock banner detected:", deadlockBanner ? "YES: " + deadlockBanner.slice(0, 70) : "NO");
    await takeScreenshot('trait_deadlock_alert_and_unbind_badges.png');

    // Unbind test: Click the "一键破除闭环死锁" button
    console.log("Clicking 一键破除闭环死锁 button...");
    await evaluate(`(() => {
      const breakBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('破除闭环死锁'));
      if (breakBtn) breakBtn.click();
    })()`);
    await delay(1200);

    const deadlockAfter = await evaluate(`(() => {
      const banner = document.querySelector('.bg-rose-950\\\\/70');
      return banner ? banner.textContent.trim() : null;
    })()`);
    console.log("Deadlock banner after break:", deadlockAfter ? "STILL PRESENT" : "CLEARED (SUCCESS)");
    await takeScreenshot('trait_deadlock_resolved_verified.png');

    // Switch to Tree View (脉络谱系流)
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const treeBtn = btns.find(b => b.textContent.includes('脉络谱系流'));
      if (treeBtn) treeBtn.click();
    })()`);
    await delay(800);
    await takeScreenshot('trait_tree_view_lineage_recovered.png');

    // Open Evolution Modal (连线演化) to test cycle prevention
    console.log("Testing Evolution Modal cycle prevention...");
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const evoBtn = btns.find(b => b.textContent.includes('连线演化 (A → B)'));
      if (evoBtn) evoBtn.click();
    })()`);
    await delay(800);

    // Select Predecessor A = 等级二
    await evaluate(`(() => {
      const selects = document.querySelectorAll('.fixed select');
      if (selects.length >= 1) {
        const predSelect = selects[0];
        const opt = Array.from(predSelect.options).find(o => o.text.includes('三角洲能力等级二'));
        if (opt) {
          predSelect.value = opt.value;
          predSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    })()`);
    await delay(600);

    const succOptions = await evaluate(`(() => {
      const selects = document.querySelectorAll('.fixed select');
      if (selects.length >= 2) {
        return Array.from(selects[1].options).map(o => ({ text: o.text, disabled: o.disabled }));
      }
      return [];
    })()`);
    console.log("Successor B options status:", JSON.stringify(succOptions));
    await takeScreenshot('evolution_modal_cycle_prevention.png');

    // Close modal
    await evaluate(`(() => {
      const cancelBtn = Array.from(document.querySelectorAll('.fixed button')).find(b => b.textContent.includes('取消'));
      if (cancelBtn) cancelBtn.click();
    })()`);
    await delay(500);

    // ==========================================
    // 3. CABINET VIEW: NATURALIZED DEBATE PERSONAS
    // ==========================================
    console.log("--- 3. Testing Cabinet Debate Persona Naturalization ---");
    await clickTab('内阁参谋部');

    // Open "召集战略研讨会" modal
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const meetBtn = btns.find(b => b.textContent.includes('召集战略研讨会') || b.textContent.includes('召集参谋合议'));
      if (meetBtn) meetBtn.click();
    })()`);
    await delay(800);

    // Enter test prompt: "测试，请发送你好"
    await evaluate(`(() => {
      const reqInput = document.querySelector('textarea[placeholder*="统帅特别批示"]') || document.querySelectorAll('.fixed textarea')[0];
      if (reqInput) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(reqInput, '测试，请发送你好');
        reqInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const launchBtn = Array.from(document.querySelectorAll('.fixed button')).find(b => b.textContent.includes('开始深入辩论推演'));
      if (launchBtn) launchBtn.click();
    })()`);
    await delay(2500);

    // Check advisor debate content to verify natural personas
    const speechLogs = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.fixed .p-3\\\\.5, .fixed .border.rounded-lg'));
      return cards.map(c => c.textContent).filter(t => t && t.length > 25);
    })()`);
    console.log("Cabinet speaker speeches found:", speechLogs.length);
    for (let i = 0; i < Math.min(3, speechLogs.length); i++) {
      console.log(`Speech ${i + 1}:`, speechLogs[i].slice(0, 100));
    }
    await takeScreenshot('cabinet_natural_debate_no_parrot.png');

    console.log("All automated CDP tests completed successfully!");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    edgeProc.kill();
    process.exit(0);
  }
}

main();
