---
title: "Klustered: Level One"
description: "A Kubernetes debugging lab note that follows the app, service, endpoints, and database path."
date: "2026-06-07"
tags: [kubernetes, kubectl, deployment, service, dns, debugging]
source: "https://labs.iximiuz.com/"
---

## Goal

The lab starts with a broken Kubernetes cluster. The goal is to bring the application back to life and then roll the deployment forward to the `v2` image.

The useful part of the exercise was not memorizing commands. It was learning how to read the current state and choose the next thing to inspect.

## Symptoms

The App tab was blank at first. Some workloads looked alive, but that did not prove the full service path was healthy.

Commands used:

```bash
kubectl get pods
kubectl get svc
kubectl get endpoints
kubectl logs deploy/klustered
```

Both `kubectl logs deploy/klustered` and direct Pod logs returned empty output. In this case, that meant the application did not write anything to stdout or stderr. Empty logs were not enough to prove a crash.

## Debugging Flow

1. Check whether the Pod is `Running`.
2. Check whether the Service selector targets the right Pod.
3. Check whether Endpoints contain the actual Pod IP.
4. Check whether the app can reach the database.
5. Check whether DNS settings interfere with cluster DNS.

```bash
kubectl get pods -o wide
kubectl describe svc klustered
kubectl get endpoints klustered
kubectl get deploy klustered -o yaml
```

## Takeaways

- Empty `kubectl logs` output does not always mean the process failed.
- Service issues become easier when traced as `selector -> endpoints -> pod`.
- In Kubernetes debugging, "the resource exists" and "the connection path works" are separate claims.
- App symptoms should be mapped back to Deployment, Service, Endpoint, and DNS state.

## Revisit

- Deployment rollout
- Service selector
- Endpoints
- CoreDNS
- `dnsPolicy`
