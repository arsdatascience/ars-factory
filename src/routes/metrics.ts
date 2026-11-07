import { Hono } from "hono";
import { taskOrchestrator } from "../services/task-orchestrator.js";
import { robotBuilder } from "../services/robot-builder.js";
import { config } from "../config.js";

export const metricsRoutes = new Hono();

// JSON Metrics for API consumers & Dashboard
metricsRoutes.get("/api/v1/metrics", (c) => {
  const taskStats = taskOrchestrator.getStats();
  const memory = process.memoryUsage();
  const uptime = Math.floor(process.uptime());

  return c.json({
    service: config.serviceName,
    version: config.serviceVersion,
    timestamp: new Date().toISOString(),
    uptimeSeconds: uptime,
    tasks: taskStats,
    builds: {
      total: robotBuilder.listBuilds().length,
      ready: robotBuilder.listBuilds().filter((b) => b.status === "ready").length,
      building: robotBuilder.listBuilds().filter((b) => b.status === "building").length,
      failed: robotBuilder.listBuilds().filter((b) => b.status === "failed").length
    },
    system: {
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024)
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
});

// Prometheus scraping endpoint (/metrics) - compatible with Prometheus & cAdvisor
metricsRoutes.get("/metrics", (c) => {
  const taskStats = taskOrchestrator.getStats();
  const memory = process.memoryUsage();
  const uptime = Math.floor(process.uptime());

  const prometheusText = [
    `# HELP ars_factory_uptime_seconds Total service uptime in seconds`,
    `# TYPE ars_factory_uptime_seconds counter`,
    `ars_factory_uptime_seconds ${uptime}`,
    ``,
    `# HELP ars_factory_tasks_total Number of factory tasks by status`,
    `# TYPE ars_factory_tasks_total gauge`,
    `ars_factory_tasks_total{status="completed"} ${taskStats.completed}`,
    `ars_factory_tasks_total{status="failed"} ${taskStats.failed}`,
    `ars_factory_tasks_total{status="running"} ${taskStats.activeTasks}`,
    `ars_factory_tasks_total{status="queued"} ${taskStats.queued}`,
    ``,
    `# HELP ars_factory_memory_bytes Node.js memory consumption`,
    `# TYPE ars_factory_memory_bytes gauge`,
    `ars_factory_memory_bytes{type="rss"} ${memory.rss}`,
    `ars_factory_memory_bytes{type="heap_used"} ${memory.heapUsed}`,
    `ars_factory_memory_bytes{type="heap_total"} ${memory.heapTotal}`,
    ``
  ].join("\n");

  c.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return c.text(prometheusText);
});

// Catalog of server monitoring URLs and infrastructure services
metricsRoutes.get("/api/v1/monitoring/services", (c) => {
  return c.json({
    coolifyNative: [
      {
        name: "Fleet Metrics",
        description: "CPU, RAM, Disk I/O de todos os containers ativos no host",
        url: "https://coolify.arsdatascience.com/metrics"
      },
      {
        name: "HTTP Traffic Analytics",
        description: "Requisições, latência e códigos HTTP roteados pelo Traefik",
        url: "https://coolify.arsdatascience.com/analytics"
      },
      {
        name: "Host Sentinel",
        description: "Status de saúde do nó host EVEO Cloud",
        url: "https://coolify.arsdatascience.com/server/7p5nfb1vwriy7toqq7usgiea/sentinel"
      },
      {
        name: "Terminal & Containers",
        description: "Terminal interativo e status dos 101 containers",
        url: "https://coolify.arsdatascience.com/terminal"
      }
    ],
    observabilityStack: [
      {
        name: "Prometheus",
        container: "prometheus-uenauovgxblihpw9qyn2juln",
        role: "Métricas Time-Series",
        scrapeEndpoint: "/metrics"
      },
      {
        name: "Grafana",
        container: "grafana-uenauovgxblihpw9qyn2juln",
        role: "Dashboards e Alertas"
      },
      {
        name: "Uptime Kuma",
        container: "uptime-kuma-uenauovgxblihpw9qyn2juln",
        role: "Monitoramento de Uptime & SLAs"
      },
      {
        name: "Loki & Promtail",
        container: "loki-uenauovgxblihpw9qyn2juln",
        role: "Central de Agregação de Logs"
      },
      {
        name: "cAdvisor & Node Exporter",
        container: "cadvisor-uenauovgxblihpw9qyn2juln",
        role: "Telemetria de Hardware e Containers"
      },
      {
        name: "Tempo & OpenTelemetry",
        container: "tempo-uenauovgxblihpw9qyn2juln",
        role: "Tracing distribuído de chamadas"
      }
    ]
  });
});
