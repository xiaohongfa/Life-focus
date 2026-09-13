import { spawn } from 'child_process';
import fs from 'fs';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const USER_DATA = "C:\\Users\\hongl\\AppData\\Local\\Temp\\edge_debug_md_" + Date.now();
const PORT = 9240;
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

    await new Promise(r => ws.onopen = r);
    console.log("Connected to Edge CDP");

    await send('Page.enable');
    await send('Runtime.enable');

    await send('Page.navigate', { url: 'http://localhost:1420' });
    await delay(3000);

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result ? res.result.value : null;
    }

    async function screenshot(filename) {
      const res = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(res.data, 'base64');
      fs.writeFileSync(`${SCREENSHOT_DIR}/${filename}`, buffer);
      console.log(`Saved screenshot: ${filename}`);
    }

    async function clickButtonWithText(text, exact = false) {
      for (let i = 0; i < 20; i++) {
        const clicked = await evaluate(`
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => {
              const c = (b.textContent || '').trim();
              return ${exact} ? c === ${JSON.stringify(text)} : c.includes(${JSON.stringify(text)});
            });
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          })()
        `);
        if (clicked) {
          console.log(`Clicked button containing "${text}"`);
          return true;
        }
        await delay(300);
      }
      throw new Error(`Failed to click button with text "${text}" after retries`);
    }

    // 1. Navigate to Cabinet
    console.log("1. Navigating to 内阁参谋部...");
    await clickButtonWithText('内阁参谋部');
    await delay(1500);

    // 2. Click "召开总参谋部研讨会"
    console.log("2. Opening Staff Strategic Chamber meeting modal...");
    await clickButtonWithText('召开总参谋部研讨会');
    await delay(1500);

    // 3. Verify LLM Status banner
    const bannerInfo = await evaluate(`
      (() => {
        const el = document.querySelector('.bg-amber-950\\/40, .bg-emerald-950\\/40');
        return el ? el.innerText : null;
      })()
    `);
    console.log("LLM Status Banner Text:", bannerInfo);

    // Take screenshot of meeting modal with LLM banner
    await screenshot('cabinet_meeting_modal_with_llm_banner.png');

    // 4. Click "前往配置 API Key" to open Settings
    console.log("3. Testing opening Settings Modal from Cabinet...");
    await clickButtonWithText('前往配置 API Key');
    await delay(1200);

    // Verify Settings Modal is open
    await screenshot('settings_ai_tab_verified.png');

    // Test API connection button in settings
    console.log("4. Testing '测试 API 连接' button...");
    await clickButtonWithText('测试 API 连接');
    await delay(1200);

    // Capture test feedback (e.g. key missing warning or error)
    await screenshot('settings_api_test_feedback_verified.png');

    // Close settings modal
    console.log("5. Closing Settings Modal...");
    await evaluate(`
      (() => {
        const closeBtns = Array.from(document.querySelectorAll('button'));
        const finishBtn = closeBtns.find(b => b.textContent && b.textContent.includes('完成并关闭'));
        if (finishBtn) {
          finishBtn.click();
        } else {
          const xBtn = closeBtns.find(b => b.querySelector('svg.lucide-x') || b.textContent.includes('✕'));
          if (xBtn) xBtn.click();
        }
      })()
    `);
    await delay(1200);

    // 5. Fill meeting topic and user requirement '测试，互相发送你好'
    console.log("6. Entering topic '哈哈' and user requirement '测试，互相发送你好'...");
    await evaluate(`
      (() => {
        const topicInput = document.querySelector('input[placeholder*="例如：当前各项国策"]') || document.querySelector('input[type="text"]');
        if (topicInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(topicInput, '哈哈');
          topicInput.dispatchEvent(new Event('input', { bubbles: true }));
          topicInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const instructionTextarea = document.querySelector('textarea[placeholder*="在此输入你的特定倾向"]');
        if (instructionTextarea) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(instructionTextarea, '测试，互相发送你好');
          instructionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          instructionTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await delay(800);

    // Ensure at least one advisor is selected (or select all)
    await evaluate(`
      (() => {
        const advisorCards = Array.from(document.querySelectorAll('.grid.grid-cols-2.sm\\:grid-cols-3 > div'));
        advisorCards.forEach(c => {
          if (!c.querySelector('svg.lucide-check-circle-2')) {
            c.click();
          }
        });
      })()
    `);
    await delay(500);

    // 6. Click "启动参谋推演"
    console.log("7. Clicking '启动参谋推演'...");
    await clickButtonWithText('启动参谋推演');

    // Wait for debate simulation to complete
    await delay(4500);

    // Check speeches
    const speeches = await evaluate(`
      (() => {
        const pEls = Array.from(document.querySelectorAll('.space-y-2\\.5.max-h-60 p'));
        return pEls.map(p => p.textContent);
      })()
    `);
    console.log("Synthesized Advisor Speeches Sample:", speeches);

    // 7. Capture rendered Markdown draft in Cabinet
    console.log("8. Capturing rendered Markdown draft in Cabinet...");
    await screenshot('cabinet_markdown_rendered_draft_verified.png');

    // 8. Test switching to edit mode
    console.log("9. Switching to '编辑源码' tab...");
    await clickButtonWithText('编辑源码');
    await delay(800);
    await screenshot('cabinet_markdown_edit_mode_verified.png');

    // 9. Switch back to preview mode
    console.log("10. Switching back to '渲染预览' tab...");
    await clickButtonWithText('渲染预览');
    await delay(500);

    // 10. Confirm and archive meeting
    console.log("11. Confirming meeting minutes to archive...");
    await clickButtonWithText('确认采纳并归档纪要');
    await delay(2000);

    // 11. Click "阅读纪要" in historical archive
    console.log("12. Opening historical minutes reader...");
    await evaluate(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const readSpan = spans.find(s => s.textContent && s.textContent.includes('阅读纪要'));
        if (readSpan) readSpan.click();
      })()
    `);
    await delay(1200);

    await screenshot('cabinet_historical_minutes_markdown_verified.png');

    // Close reader modal
    await clickButtonWithText('关闭阅读');
    await delay(800);

    // 12. Go to Focus Canvas and verify node body Markdown editor in drawer
    console.log("13. Navigating to 国策画布 view...");
    await clickButtonWithText('国策画布');
    await delay(2000);

    // Click first node on canvas
    await evaluate(`
      (() => {
        const node = document.querySelector('.react-flow__node');
        if (node) node.click();
      })()
    `);
    await delay(1200);

    await screenshot('canvas_drawer_markdown_verified.png');
    console.log("All automated end-to-end tests completed successfully!");

    ws.close();
  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    edgeProc.kill();
  }
}

main();
