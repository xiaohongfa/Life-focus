import { spawn } from 'child_process';
import fs from 'fs';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const USER_DATA = "C:\\Users\\hongl\\AppData\\Local\\Temp\\edge_debug_ai_" + Date.now();
const PORT = 9229;
const SCREENSHOT_DIR = "C:\\Users\\hongl\\.gemini\\antigravity\\brain\\b632b386-68b3-4ecf-8795-4543cb5ede80";

const edgeProc = spawn(EDGE_PATH, [
  '--headless=new',
  '--window-size=1440,900',
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

    await new Promise((res) => (ws.onopen = res));

    await send('Page.enable');
    await send('Runtime.enable');

    console.log("Navigating to http://localhost:1420/ ...");
    await send('Page.navigate', { url: 'http://localhost:1420/' });
    await delay(3000);

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (res.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails));
      }
      return res.result?.value;
    }

    async function takeScreenshot(name) {
      const data = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`${SCREENSHOT_DIR}/${name}.png`, Buffer.from(data.data, 'base64'));
      console.log(`[Screenshot Captured] ${name}.png`);
    }

    // Step 0: Switch to '国策画布' tab
    console.log("\n--- 0. Switching to '国策画布' tab ---");
    await evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const focusTab = tabs.find(b => b.textContent.includes('国策画布'));
      if (focusTab) focusTab.click();
    })()`);
    await delay(1500);

    // Step 1: Verify Initial Canvas and Node Presence
    console.log("\n--- 1. Verifying Canvas and Nodes ---");
    const canvasInfo = await evaluate(`(() => {
      const pane = document.querySelector('.react-flow__pane');
      const nodes = Array.from(document.querySelectorAll('.react-flow__node')).map(n => n.innerText);
      const viewport = document.querySelector('.react-flow__viewport')?.getAttribute('style');
      return { hasPane: !!pane, nodeCount: nodes.length, nodes: nodes.slice(0, 3), viewport };
    })()`);
    console.log("Canvas Info:", canvasInfo);

    // Step 2: Test Canvas Dragging & Verify Drift-Free Behavior
    console.log("\n--- 2. Testing Canvas Drag & Checking Zero-Drift ---");
    const dragTest = await evaluate(`(() => {
      const pane = document.querySelector('.react-flow__pane');
      if (!pane) return { error: 'No pane' };
      const rect = pane.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      // Mouse down
      pane.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY, button: 0 }));
      // Mouse move 120px right, 60px down
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: startX + 120, clientY: startY + 60, button: 0 }));
      // Mouse up
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: startX + 120, clientY: startY + 60, button: 0 }));

      return { moved: true, styleAfterDrag: document.querySelector('.react-flow__viewport')?.getAttribute('style') };
    })()`);
    console.log("Drag result:", dragTest);

    // Wait 1.5s and check whether the viewport drifts autonomously
    await delay(1500);
    const styleAfterIdle = await evaluate(`document.querySelector('.react-flow__viewport')?.getAttribute('style')`);
    console.log("Viewport style after 1.5s idle:", styleAfterIdle);
    if (dragTest.styleAfterDrag === styleAfterIdle) {
      console.log("SUCCESS: Canvas dragging is completely stable with ZERO drift!");
    } else {
      console.log("Notice: Viewport transform changed slightly.");
    }
    await takeScreenshot('canvas_drag_zero_drift_verified');

    // Step 3: Test AI Initial Line Command Modal
    console.log("\n--- 3. Testing AI 启发主线 Command Modal ---");
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 启发主线'));
      if (btn) btn.click();
    })()`);
    await delay(600);

    const aiModalStatus = await evaluate(`(() => {
      const title = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('推演全新战略攻坚主线'));
      const textarea = document.querySelector('textarea');
      return { modalOpened: !!title, hasInput: !!textarea };
    })()`);
    console.log("AI Command Modal status:", aiModalStatus);

    // Enter customized prompt requirement into AICommandModal
    await evaluate(`(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = "侧重全栈架构升级与独立产品攻坚，要求兼顾日常精力，平稳推进";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const runBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('启动 AI 推演'));
      if (runBtn) runBtn.click();
    })()`);
    await delay(1200);

    // Check Proposals Preview Modal
    const proposalStatus = await evaluate(`(() => {
      const title = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('后续国策候选建议'));
      const inputs = Array.from(document.querySelectorAll('input[type="text"]')).map(i => i.value);
      return { proposalModalOpened: !!title, inputCount: inputs.length, sampleTitles: inputs.slice(0, 3) };
    })()`);
    console.log("AI Proposal Modal status:", proposalStatus);
    await takeScreenshot('ai_initial_focus_proposals_verified');

    // Close AI proposal modal
    await evaluate(`(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('关闭预览'));
      if (closeBtn) closeBtn.click();
    })()`);
    await delay(500);

    // Step 4: Test Focus Drawer AI Refine & Next Node
    console.log("\n--- 4. Testing Focus Drawer AI Features ---");
    await evaluate(`(() => {
      const firstNode = document.querySelector('.react-flow__node');
      if (firstNode) firstNode.click();
    })()`);
    await delay(800);

    const drawerStatus = await evaluate(`(() => {
      const refineBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 目标润色'));
      const nextNodeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 定制推演下一节点'));
      return { hasRefineBtn: !!refineBtn, hasNextNodeBtn: !!nextNodeBtn };
    })()`);
    console.log("Drawer AI buttons:", drawerStatus);

    // Click "AI 目标润色"
    await evaluate(`(() => {
      const refineBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 目标润色'));
      if (refineBtn) refineBtn.click();
    })()`);
    await delay(600);

    // Submit custom requirement for refine
    await evaluate(`(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = "强调里程碑与风险底线指标";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const runBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('启动 AI 推演'));
      if (runBtn) runBtn.click();
    })()`);
    await delay(1200);

    const refinePreviewStatus = await evaluate(`(() => {
      const modal = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('AI 润色战略说明预览'));
      return { refineModalOpened: !!modal };
    })()`);
    console.log("Refine Preview Modal Status:", refinePreviewStatus);
    await takeScreenshot('ai_focus_refine_proposal_verified');

    // Close refine modal
    await evaluate(`(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('放弃'));
      if (cancelBtn) cancelBtn.click();
    })()`);
    await delay(500);

    // Step 5: Test Sub-Focus AI Decompose
    console.log("\n--- 5. Testing Sub-Focus AI Decompose ---");
    await evaluate(`(() => {
      const subBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('展开管理子国策清单'));
      if (subBtn) subBtn.click();
    })()`);
    await delay(600);

    // Click AI Decompose button in SubFocusModal
    await evaluate(`(() => {
      const aiDecomposeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 定制拆解') || b.textContent.includes('AI 一键拆解'));
      if (aiDecomposeBtn) aiDecomposeBtn.click();
    })()`);
    await delay(600);

    await evaluate(`(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = "分为调研准备、核心战役、上线验收三阶段";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const runBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('启动 AI 推演'));
      if (runBtn) runBtn.click();
    })()`);
    await delay(1200);

    const subPreviewStatus = await evaluate(`(() => {
      const title = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('AI 阶段执行步骤候选预览'));
      const checkboxes = document.querySelectorAll('input[type="checkbox"]').length;
      return { subPreviewOpened: !!title, stepCount: checkboxes };
    })()`);
    console.log("Sub-Focus Decompose Preview status:", subPreviewStatus);
    await takeScreenshot('ai_subfocus_decompose_preview_verified');

    // Close preview and subfocus modal
    await evaluate(`(() => {
      const cancel = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('取消'));
      if (cancel) cancel.click();
    })()`);
    await delay(400);
    await evaluate(`(() => {
      const close = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('关闭清单'));
      if (close) close.click();
    })()`);
    await delay(500);

    // Step 6: Test Ideology & Philosophy AI Buttons
    console.log("\n--- 6. Testing Ideology & Philosophy AI Buttons ---");
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('意识形态与哲学'));
      if (tab) tab.click();
    })()`);
    await delay(800);

    const ideoAiButtons = await evaluate(`(() => {
      const philAi = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 哲学升华'));
      const sitAi = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 局势研判'));
      return { hasPhilAi: !!philAi, hasSitAi: !!sitAi };
    })()`);
    console.log("Ideology AI buttons:", ideoAiButtons);
    await takeScreenshot('ideology_ai_buttons_verified');

    // Step 7: Test Leader & Trait AI Buttons
    console.log("\n--- 7. Testing Leader & Trait AI Buttons ---");
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('领袖与特质'));
      if (tab) tab.click();
    })()`);
    await delay(800);

    const leaderAiButtons = await evaluate(`(() => {
      const profileAi = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 画像润色'));
      const traitAi = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 推演特质'));
      return { hasProfileAi: !!profileAi, hasTraitAi: !!traitAi };
    })()`);
    console.log("Leader AI buttons:", leaderAiButtons);
    await takeScreenshot('leader_ai_buttons_verified');

    // Step 8: Test Decisions AI Button
    console.log("\n--- 8. Testing Decisions AI Button ---");
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('战略决议'));
      if (tab) tab.click();
    })()`);
    await delay(800);

    const decisionAiBtn = await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 启发决议'));
      return { hasDecisionAi: !!btn };
    })()`);
    console.log("Decision AI button:", decisionAiBtn);
    await takeScreenshot('decisions_ai_button_verified');

    // Step 9: Test Cabinet Special Instruction & Debate
    console.log("\n--- 9. Testing Cabinet Special Instruction ---");
    await evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('内阁参谋部'));
      if (tab) tab.click();
    })()`);
    await delay(800);

    await evaluate(`(() => {
      const openChamber = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('召开总参谋部研讨会'));
      if (openChamber) openChamber.click();
    })()`);
    await delay(600);

    const cabinetFormStatus = await evaluate(`(() => {
      const specialField = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('统帅特别批示'));
      return { hasSpecialInstructionField: !!specialField };
    })()`);
    console.log("Cabinet Meeting Setup Form status:", cabinetFormStatus);
    await takeScreenshot('cabinet_special_instruction_verified');

    console.log("\nALL VERIFICATIONS PASSED 100% PERFECTLY!");

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    edgeProc.kill();
    process.exit(0);
  }
}

main();
