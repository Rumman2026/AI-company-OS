# Monitoring

Health/uptime monitoring for the Hostinger VPS stack (reverse proxy,
n8n, `apps/ai-gateway`, `apps/worker-service`, `apps/jervis-api`) and the
GreenCal Website and Lead Health Agent's own checks (see
[docs/agents/GREENCAL_WEBSITE_AND_LEAD_HEALTH_AGENT.md](../../docs/agents/GREENCAL_WEBSITE_AND_LEAD_HEALTH_AGENT.md)).

`prometheus.yml.example` is a placeholder scrape-config template for the
`infra/docker/docker-compose.cloud.yml` monitoring service — not a live
configuration; no monitoring stack is running or deployed from this
repository.

Phase 1 includes only this planning scaffold and template.
