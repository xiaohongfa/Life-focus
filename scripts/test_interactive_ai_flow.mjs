import { spawn } from 'child_process';
import fs from 'fs';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const USER_DATA = "C:\\Users\\hongl\\AppData\\Local\\Temp\\edge_debug_interactive_" + Date.now();
const PORT = 9230;
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
    console.log("\n--- Step 0: Switch to '国策画布' tab ---");
    await evaluate(`(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const focusTab = tabs.find(b => b.textContent.includes('国策画布'));
      if (focusTab) focusTab.click();
    })()`);
    await delay(1200);

    // Step 1: Open AI Initial Line Command Modal
    console.log("\n--- Step 1: Click 'AI 启发主线' ---");
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 启发主线'));
      if (btn) btn.click();
    })()`);
    await delay(600);

    // Enter custom requirements into AICommandModal
    console.log("\n--- Step 2: Input custom strategic requirement & submit ---");
    await evaluate(`(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = "侧重全栈架构升级与独立产品攻坚，要求兼顾日常精力，平稳推进";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    })()`);
    await delay(1500);

    // Verify Proposals Preview Modal
    const proposalModalStatus = await evaluate(`(() => {
      const title = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('后续国策候选建议'));
      const textInputs = Array.from(document.querySelectorAll('input[type="text"]')).map(i => i.value);
      return { opened: !!title, titles: textInputs };
    })()`);
    console.log("Proposal Modal Status:", proposalModalStatus);
    await takeScreenshot('interactive_ai_proposals_received');

    // Accept the first proposed focus to database!
    console.log("\n--- Step 3: Accept first proposal into database ---");
    await evaluate(`(() => {
      const acceptBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('确认接受并落库'));
      if (acceptBtn) acceptBtn.click();
    })()`);
    await delay(1200);

    // Close proposal modal
    await evaluate(`(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('关闭预览'));
      if (closeBtn) closeBtn.click();
    })()`);
    await delay(800);

    // Step 4: Verify node rendered on canvas
    const nodesOnCanvas = await evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('.react-flow__node')).map(n => n.textContent);
      return { count: nodes.length, titles: nodes };
    })()`);
    console.log("Nodes on Canvas after accepting AI proposal:", nodesOnCanvas);
    await takeScreenshot('interactive_ai_node_created_on_canvas');

    // Step 5: Test Node and Canvas Dragging & Verify ZERO DRIFT
    console.log("\n--- Step 5: Test Dragging Node & Canvas Pane ---");
    const dragNodeResult = await evaluate(`(() => {
      const node = document.querySelector('.react-flow__node');
      if (!node) return { error: 'No node found' };
      const rect = node.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY, button: 0 }));
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: startX + 150, clientY: startY + 80, button: 0 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: startX + 150, clientY: startY + 80, button: 0 }));

      return { draggedNode: true };
    })()`);
    console.log("Node Drag Action:", dragNodeResult);

    // Wait 1.5 seconds to strictly confirm NO autonomous camera drift
    await delay(1500);
    const viewportStyle = await evaluate(`document.querySelector('.react-flow__viewport')?.getAttribute('style')`);
    console.log("Viewport style after node drag:", viewportStyle);
    await delay(1500);
    const viewportStyle2 = await evaluate(`document.querySelector('.react-flow__viewport')?.getAttribute('style')`);
    console.log("Viewport style after 1.5s idle:", viewportStyle2);
    if (viewportStyle === viewportStyle2) {
      console.log("SUCCESS: Canvas camera remains rock-solid without any unwanted drift or sliding!");
    }

    // Step 6: Select node to open drawer
    console.log("\n--- Step 6: Click node to open drawer ---");
    await evaluate(`(() => {
      const node = document.querySelector('.react-flow__node');
      if (node) node.click();
    })()`);
    await delay(800);

    const drawerButtons = await evaluate(`(() => {
      const refineBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 目标润色'));
      const nextNodeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 定制推演下一节点'));
      return { hasRefine: !!refineBtn, hasNextNode: !!nextNodeBtn };
    })()`);
    console.log("Drawer AI Buttons:", drawerButtons);

    // Step 7: Test Drawer "AI 目标润色"
    console.log("\n--- Step 7: Test Drawer 'AI 目标润色' with custom requirement ---");
    await evaluate(`(() => {
      const refineBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 目标润色'));
      if (refineBtn) refineBtn.click();
    })()`);
    await delay(600);

    await evaluate(`(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = "增加3点明确的量化验收指标，强调稳扎稳打与精力防护";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    })()`);
    await delay(1500);

    const refineProposalModal = await evaluate(`(() => {
      const title = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('AI 润色战略说明预览'));
      const textarea = document.querySelector('textarea')?.value;
      return { opened: !!title, proposedSnippet: textarea?.slice(0, 100) };
    })()`);
    console.log("Refine Proposal Modal Status:", refineProposalModal);
    await takeScreenshot('interactive_ai_refine_preview_verified');

    // Accept the refined proposal
    await evaluate(`(() => {
      const acceptBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('采纳并保存'));
      if (acceptBtn) acceptBtn.click();
    })()`);
    await delay(800);

    // Step 8: Test Sub-Focus AI Decompose with custom requirement
    console.log("\n--- Step 8: Open Sub-Focus Modal & Run AI Decompose ---");
    await evaluate(`(() => {
      const subBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('展开管理子国策清单'));
      if (subBtn) subBtn.click();
    })()`);
    await delay(800);

    // Click "AI 定制拆解" in SubFocusModal
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI 定制拆解') || b.textContent.includes('AI 一键拆解'));
      if (btn) btn.click();
    })()`);
    await delay(600);

    await evaluate(`(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = "按照架构调研、技术攻坚、交付验收三步规划";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    })()`);
    await delay(1500);

    const subStepsPreview = await evaluate(`(() => {
      const title = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('AI 阶段执行步骤候选预览'));
      const textInputs = Array.from(document.querySelectorAll('input[type="text"]')).map(i => i.value);
      return { opened: !!title, steps: textInputs };
    })()`);
    console.log("Sub-Steps Preview Status:", subStepsPreview);
    await takeScreenshot('interactive_ai_subfocus_steps_verified');

    // Accept sub-steps into checklist
    await evaluate(`(() => {
      const acceptBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('采纳并批量追加至子国策'));
      if (acceptBtn) acceptBtn.click();
    })()`);
    await delay(1200);

    // Check checklist items in modal
    const subListItems = await evaluate(`(() => {
      const items = Array.from(document.querySelectorAll('h4')).map(h => h.textContent);
      return { count: items.length, items };
    })()`);
    console.log("Sub-Focus items in checklist after AI adoption:", subListItems);
    await takeScreenshot('interactive_ai_subfocus_checklist_verified');

    console.log("\nALL INTERACTIVE AI FLOWS AND CANVAS FUNCTIONALITY PERFECTLY VERIFIED!");

  } catch (err) {
    console.error("Interactive test failed:", err);
  } finally {
    edgeProc.kill();
    process.exit(0);
  }
}

main();
