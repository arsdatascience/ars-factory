import { readFileSync } from "node:fs";

const dashboardCss = readFileSync(new URL("../dist/ui.css", import.meta.url), "utf8");

export function renderDashboardHtml(nonce: string, demoMode: boolean): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ars Factory | Mission Control & Observability</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style nonce="${nonce}">${dashboardCss}</style>
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
        <p class="text-xs text-gray-400">EVEO Cloud · ${demoMode ? "Modo demonstrativo" : "Somente consulta"}</p>
      </div>
    </div>
    <div class="flex items-center gap-4 text-xs">
      <span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span id="readiness" role="status">Verificando prontidão…</span>
      </span>
      <a href="/metrics" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 transition text-gray-300 flex items-center gap-1.5">
        <i class="fa-solid fa-chart-line text-purple-400"></i> Prometheus /metrics
      </a>
      <a href="/health" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 transition text-gray-300 flex items-center gap-1.5">
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
          <p class="text-xs text-gray-400 font-medium">Tarefas Simuladas</p>
          <p class="text-2xl font-bold text-white mt-1" id="kpi-completed">--</p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <i class="fa-solid fa-check-double"></i>
        </div>
      </div>
      <div class="glass-card rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400 font-medium">Tarefas na Fila</p>
          <p class="text-2xl font-bold text-purple-400 mt-1" id="kpi-active">--</p>
        </div>
        <div class="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
          <i class="fa-solid fa-gears animate-spin"></i>
        </div>
      </div>
      <div class="glass-card rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400 font-medium">Builds Simulados</p>
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
          <a href="https://coolify.arsdatascience.com/metrics" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center gap-1.5 transition">
            <i class="fa-solid fa-chart-simple"></i> Fleet Metrics
          </a>
          <a href="https://coolify.arsdatascience.com/analytics" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 text-white text-xs font-medium flex items-center gap-1.5 transition">
            <i class="fa-solid fa-globe"></i> HTTP Analytics
          </a>
          <a href="https://coolify.arsdatascience.com/server/7p5nfb1vwriy7toqq7usgiea/sentinel" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 text-white text-xs font-medium flex items-center gap-1.5 transition">
            <i class="fa-solid fa-shield-halved"></i> Host Sentinel
          </a>
          <a href="https://coolify.arsdatascience.com/terminal" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg glass-card hover:bg-gray-800 text-white text-xs font-medium flex items-center gap-1.5 transition">
            <i class="fa-solid fa-terminal"></i> Terminal e containers
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
          ${demoMode ? '<button id="new-task" class="px-3 py-1 rounded-lg bg-purple-600 text-white text-xs">Simular tarefa</button>' : ""}
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
            <i class="fa-solid fa-box-archive text-indigo-400"></i> Histórico de Builds RPA
          </h3>
          ${demoMode ? '<button id="new-build" class="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs">Simular build</button>' : ""}
        </div>
        <div id="builds-container" class="space-y-2 max-h-96 overflow-y-auto pr-1">
          <!-- Loaded via JS -->
          <div class="text-xs text-gray-500 py-4 text-center">Carregando pacotes de robôs...</div>
        </div>
      </div>
    </div>
    <p id="action-status" role="status" class="text-sm text-gray-300"></p>
  </main>

  <!-- Footer -->
  <footer class="glass-card mt-auto border-t border-gray-800 px-6 py-4 text-center text-xs text-gray-500">
    Ars Factory · Intelligent RPA & Agentic Orchestration Engine · Servidor EVEO Cloud
  </footer>

  <script nonce="${nonce}">
    const statusLabels = { queued: 'Na fila', simulated: 'Simulado', cancelled: 'Cancelado' };
    const byId = (id) => document.getElementById(id);

    async function getJson(path) {
      const response = await fetch(path);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }

    async function loadMetrics() {
      try {
        const data = await getJson('/api/v1/metrics');
        byId('kpi-completed').textContent = data.tasks.simulated;
        byId('kpi-active').textContent = data.tasks.queued;
        byId('kpi-builds').textContent = data.builds.simulated;
        byId('kpi-memory').textContent = data.system.memory.rssMb + ' MB';
        byId('readiness').textContent = 'Consulta disponível';
      } catch {
        for (const id of ['kpi-completed', 'kpi-active', 'kpi-builds', 'kpi-memory']) byId(id).textContent = '—';
        byId('readiness').textContent = 'Dados indisponíveis';
      }
    }

    function jobCard(job, target) {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-lg bg-gray-900/60 border border-gray-800/80';
      const title = document.createElement('strong');
      title.className = 'text-xs font-semibold text-white';
      title.textContent = job.name;
      const details = document.createElement('p');
      details.className = 'text-[11px] text-gray-400 mt-1 font-mono';
      details.textContent = [statusLabels[job.status] || job.status, target, job.id].join(' · ');
      card.append(title, details);
      return card;
    }

    async function loadJobs(kind, targetField) {
      const container = byId(kind + '-container');
      try {
        const data = await getJson('/api/v1/' + kind);
        const cards = data[kind].map(job => jobCard(job, job[targetField]));
        container.replaceChildren(...cards);
        if (cards.length === 0) container.textContent = 'Nenhum registro.';
      } catch {
        container.textContent = 'Histórico indisponível.';
      }
    }

    async function refresh() {
      await Promise.all([loadMetrics(), loadJobs('tasks', 'type'), loadJobs('builds', 'targetPlatform')]);
      setTimeout(refresh, 5000);
    }

    async function submitDemo(kind, label) {
      const name = prompt(label);
      if (!name) return;
      const status = byId('action-status');
      try {
        const response = await fetch('/api/v1/' + kind, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        status.textContent = 'Simulação enfileirada.';
      } catch (error) {
        status.textContent = 'Falha ao enfileirar a simulação. ' + error.message;
      }
    }

    byId('new-task')?.addEventListener('click', () => submitDemo('tasks', 'Nome da tarefa de demonstração'));
    byId('new-build')?.addEventListener('click', () => submitDemo('builds', 'Nome do build de demonstração'));
    refresh();
  </script>
</body>
</html>`;
}
