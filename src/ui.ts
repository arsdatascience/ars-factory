export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ars Factory | Mission Control & Observability</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#f5f3ff',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
              900: '#4c1d95'
            }
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background-color: #0d1117; color: #c9d1d9; font-family: system-ui, -apple-system, sans-serif; }
    .glass-card { background: rgba(22, 27, 34, 0.85); border: 1px solid rgba(48, 54, 61, 0.8); backdrop-filter: blur(8px); }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Topbar -->
  <header class="glass-card sticky top-0 z-50 px-6 py-3 border-b border-gray-800 flex justify-between items-center">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
        <i class="fa-solid fa-industry text-lg"></i>
      </div>
      <div>
        <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          Ars Factory <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">v1.0.0</span>
        </h1>
        <p class="text-xs text-gray-400">EVEO Cloud Server · Production Orchestrator</p>
      </div>
    </div>
    <div class="flex items-center gap-4 text-xs">
      <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Sistema Operacional
      </span>
      <a href="/metrics" target="_blank" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 transition text-gray-300 flex items-center gap-1.5">
        <i class="fa-solid fa-chart-line text-purple-400"></i> Prometheus /metrics
      </a>
      <a href="/health" target="_blank" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 transition text-gray-300 flex items-center gap-1.5">
        <i class="fa-solid fa-heart-pulse text-emerald-400"></i> Healthcheck
      </a>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
    <!-- Quick KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="glass-card rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400 font-medium">Tarefas Concluídas</p>
          <p class="text-2xl font-bold text-white mt-1" id="kpi-completed">--</p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <i class="fa-solid fa-check-double"></i>
        </div>
      </div>
      <div class="glass-card rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400 font-medium">Tarefas em Execução</p>
          <p class="text-2xl font-bold text-purple-400 mt-1" id="kpi-active">--</p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
          <i class="fa-solid fa-gears animate-spin"></i>
        </div>
      </div>
      <div class="glass-card rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400 font-medium">Robôs Compilados</p>
          <p class="text-2xl font-bold text-indigo-400 mt-1" id="kpi-builds">--</p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <i class="fa-solid fa-robot"></i>
        </div>
      </div>
      <div class="glass-card rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400 font-medium">Memória RSS</p>
          <p class="text-2xl font-bold text-cyan-400 mt-1" id="kpi-memory">-- MB</p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
          <i class="fa-solid fa-microchip"></i>
        </div>
      </div>
    </div>

    <!-- Central Monitoring Hub Banner -->
    <div class="glass-card rounded-xl p-5 border-l-4 border-l-purple-500">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-tower-broadcast text-purple-400"></i> Central de Monitoramento & Observabilidade do Servidor
          </h2>
          <p class="text-xs text-gray-400 mt-1">Acesso direto aos painéis de telemetria, métricas de frota e logs da infraestrutura EVEO.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <a href="https://coolify.arsdatascience.com/metrics" target="_blank" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center gap-1.5 transition">
            <i class="fa-solid fa-chart-simple"></i> Fleet Metrics
          </a>
          <a href="https://coolify.arsdatascience.com/analytics" target="_blank" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 text-white text-xs font-medium flex items-center gap-1.5 transition">
            <i class="fa-solid fa-globe"></i> HTTP Analytics
          </a>
          <a href="https://coolify.arsdatascience.com/server/7p5nfb1vwriy7toqq7usgiea/sentinel" target="_blank" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 text-white text-xs font-medium flex items-center gap-1.5 transition">
            <i class="fa-solid fa-shield-halved"></i> Host Sentinel
          </a>
          <a href="https://coolify.arsdatascience.com/terminal" target="_blank" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 text-white text-xs font-medium flex items-center gap-1.5 transition">
            <i class="fa-solid fa-terminal"></i> Terminal 101 Containers
          </a>
        </div>
      </div>

      <!-- Observability Stack Badges -->
      <div class="mt-4 pt-4 border-t border-gray-800/80 flex flex-wrap gap-2 text-xs">
        <span class="px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700/60 flex items-center gap-1.5">
          <i class="fa-solid fa-circle text-emerald-400 text-[8px]"></i> Prometheus
        </span>
        <span class="px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700/60 flex items-center gap-1.5">
          <i class="fa-solid fa-circle text-emerald-400 text-[8px]"></i> Grafana
        </span>
        <span class="px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700/60 flex items-center gap-1.5">
          <i class="fa-solid fa-circle text-emerald-400 text-[8px]"></i> Uptime Kuma
        </span>
        <span class="px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700/60 flex items-center gap-1.5">
          <i class="fa-solid fa-circle text-emerald-400 text-[8px]"></i> Loki / Promtail
        </span>
        <span class="px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700/60 flex items-center gap-1.5">
          <i class="fa-solid fa-circle text-emerald-400 text-[8px]"></i> cAdvisor / Node Exporter
        </span>
        <span class="px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700/60 flex items-center gap-1.5">
          <i class="fa-solid fa-circle text-emerald-400 text-[8px]"></i> Tempo / OTEL Collector
        </span>
      </div>
    </div>

    <!-- Workspace Columns: Tasks & Robot Builds -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Tasks Panel -->
      <div class="glass-card rounded-xl p-5 space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-list-check text-purple-400"></i> Fila de Tarefas da Fábrica
          </h3>
          <button onclick="triggerNewTask()" class="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition flex items-center gap-1.5">
            <i class="fa-solid fa-plus"></i> Nova Tarefa
          </button>
        </div>
        <div id="tasks-container" class="space-y-2 max-h-96 overflow-y-auto pr-1">
          <!-- Loaded via JS -->
          <div class="text-xs text-gray-500 py-4 text-center">Carregando tarefas...</div>
        </div>
      </div>

      <!-- Robot Builds Panel -->
      <div class="glass-card rounded-xl p-5 space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-box-archive text-indigo-400"></i> Compilador & Pacotes de Robôs RPA
          </h3>
          <button onclick="triggerNewBuild()" class="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition flex items-center gap-1.5">
            <i class="fa-solid fa-hammer"></i> Compilar Robô
          </button>
        </div>
        <div id="builds-container" class="space-y-2 max-h-96 overflow-y-auto pr-1">
          <!-- Loaded via JS -->
          <div class="text-xs text-gray-500 py-4 text-center">Carregando pacotes de robôs...</div>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="glass-card mt-auto border-t border-gray-800 px-6 py-4 text-center text-xs text-gray-500">
    Ars Factory · Intelligent RPA & Agentic Orchestration Engine · Servidor EVEO Cloud
  </footer>

  <script>
    async function loadMetrics() {
      try {
        const res = await fetch('/api/v1/metrics');
        const data = await res.json();
        document.getElementById('kpi-completed').innerText = data.tasks.completed;
        document.getElementById('kpi-active').innerText = data.tasks.activeTasks;
        document.getElementById('kpi-builds').innerText = data.builds.total;
        document.getElementById('kpi-memory').innerText = data.system.memory.rssMb + ' MB';
      } catch (e) {
        console.error(e);
      }
    }

    async function loadTasks() {
      try {
        const res = await fetch('/api/v1/tasks');
        const data = await res.json();
        const container = document.getElementById('tasks-container');
        if (!data.tasks.length) {
          container.innerHTML = '<div class="text-xs text-gray-500 py-4 text-center">Nenhuma tarefa registrada.</div>';
          return;
        }
        container.innerHTML = data.tasks.map(t => \`
          <div class="p-3 rounded-lg bg-gray-900/60 border border-gray-800/80 flex justify-between items-start">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-white">\${t.name}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono \${
                  t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  t.status === 'running' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  'bg-gray-800 text-gray-400'
                }">\${t.status}</span>
              </div>
              <p class="text-[11px] text-gray-400 mt-1 font-mono">ID: \${t.id} · Tipo: \${t.type}</p>
            </div>
            <span class="text-[10px] text-gray-500">\${t.durationMs ? t.durationMs + 'ms' : ''}</span>
          </div>
        \`).join('');
      } catch (e) {
        console.error(e);
      }
    }

    async function loadBuilds() {
      try {
        const res = await fetch('/api/v1/builds');
        const data = await res.json();
        const container = document.getElementById('builds-container');
        if (!data.builds.length) {
          container.innerHTML = '<div class="text-xs text-gray-500 py-4 text-center">Nenhum pacote compilado.</div>';
          return;
        }
        container.innerHTML = data.builds.map(b => \`
          <div class="p-3 rounded-lg bg-gray-900/60 border border-gray-800/80 flex justify-between items-start">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-white">\${b.name}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono \${
                  b.status === 'ready' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }">\${b.status}</span>
              </div>
              <p class="text-[11px] text-gray-400 mt-1 font-mono">Plataforma: \${b.targetPlatform} · Tam: \${b.artifactSizeMb ? b.artifactSizeMb + ' MB' : '--'}</p>
            </div>
            \${b.downloadUrl ? \`<a href="\${b.downloadUrl}" target="_blank" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Download</a>\` : ''}
          </div>
        \`).join('');
      } catch (e) {
        console.error(e);
      }
    }

    async function triggerNewTask() {
      const name = prompt('Nome da tarefa a executar:', 'RPA Fiscal Automated Audit');
      if (!name) return;
      await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'rpa' })
      });
      loadTasks();
      loadMetrics();
    }

    async function triggerNewBuild() {
      const name = prompt('Nome do Robô a compilar:', 'Robot Coleta de Prontuários');
      if (!name) return;
      await fetch('/api/v1/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, targetPlatform: 'docker' })
      });
      loadBuilds();
      loadMetrics();
    }

    loadMetrics();
    loadTasks();
    loadBuilds();
    setInterval(loadMetrics, 5000);
    setInterval(loadTasks, 5000);
    setInterval(loadBuilds, 5000);
  </script>
</body>
</html>`;
}
