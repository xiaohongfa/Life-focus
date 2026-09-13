import { execSync } from 'child_process';

const port = process.argv[2] || '1420';

function freePort(targetPort) {
  const isWin = process.platform === 'win32';
  try {
    if (isWin) {
      // Fast targeted netstat filtered by target port (supports both IPv4 and IPv6)
      let output = '';
      try {
        output = execSync(`netstat -ano | findstr :${targetPort}`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      } catch (e) {
        // findstr exits with 1 if port is not in use -> instantly free!
        return;
      }

      const lines = output.split('\n');
      const pids = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        // Format IPv4: TCP    127.0.0.1:1420    0.0.0.0:0    LISTENING    20380
        // Format IPv6: TCP    [::1]:1420        [::]:0       LISTENING    20380
        if (parts.length >= 5 && parts[0].toUpperCase() === 'TCP') {
          const localAddress = parts[1];
          const state = parts[3];
          const pid = parts[4];
          if (localAddress.endsWith(`:${targetPort}`) && state.toUpperCase() === 'LISTENING') {
            if (pid && pid !== '0' && pid !== String(process.pid)) {
              pids.add(pid);
            }
          }
        }
      }

      if (pids.size > 0) {
        for (const pid of pids) {
          try {
            console.log(`[free-port] 检测到端口 ${targetPort} 被残留进程 (PID: ${pid}) 占用，正在自动释放...`);
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[free-port] 端口 ${targetPort} 已成功释放 (PID: ${pid})`);
          } catch (e) {
            // Already gone
          }
        }
        // Brief pause for Windows TCP stack to release socket handle
        try {
          execSync('ping 127.0.0.1 -n 1 >nul', { stdio: 'ignore' });
        } catch (e) {}
      }
    } else {
      // Unix / macOS
      try {
        const pids = execSync(`lsof -ti :${targetPort}`, { encoding: 'utf-8' }).trim().split('\n');
        for (const pid of pids) {
          if (pid && pid !== String(process.pid)) {
            console.log(`[free-port] 检测到端口 ${targetPort} 被占用 (PID: ${pid})，正在释放...`);
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          }
        }
      } catch (e) {
        // Port free
      }
    }
  } catch (err) {
    // Graceful exit
  }
}

freePort(port);
