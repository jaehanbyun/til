---
title: "A wrong Service selector leaves Endpoints empty"
description: "How Kubernetes Services find Pods through selectors, labels, and Endpoints."
date: "2026-06-07"
tags: [kubernetes, service, selector, labels, endpoints, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---

## Core Idea

A Service does not find backends by Pod name. It finds Pods whose labels exactly match its selector. Only then are Endpoints created and traffic has a real target.

So "the Service exists" and "traffic reaches a Pod" are separate claims.

## When It Shows Up

The Pod is `Running`, the Service exists, but the app does not respond. The Service can look fine on its own, while empty Endpoints show that it has no backend target.

## What to Observe

```bash
kubectl get svc klustered -o yaml
kubectl get pod -l app=klustered --show-labels
kubectl get endpoints klustered
```

The key is comparing selectors and labels character by character. A single typo creates empty Endpoints without a warning.

## How It Works

The Service controller finds Pods matching the selector and creates Endpoints or EndpointSlices. If the selector does not match the actual Pod labels, the Service object still exists but has no route target.

In that state, a failed `curl` does not mean the Service is missing. It means the Service points to no backend.

## Verification and Fix Pattern

```bash
kubectl get svc klustered -o jsonpath='{.spec.selector}'
kubectl get pods --show-labels
kubectl edit svc klustered
kubectl get endpoints klustered
```

After the change, first verify that Endpoints contain a Pod IP. Check the app response only after that.

## Revisit

- Treat Service existence and Endpoint existence separately.
- Selectors are exact label matches, not fuzzy matches.
- `kubectl get endpoints` is a fast connection proof during Service debugging.
- Trace traffic as `Service selector -> Pod labels -> Endpoints -> Pod`.

## Source

This is a personal learning note from the iximiuz Labs Klustered: Level One challenge. It does not mirror the original challenge text; it captures the Service selector debugging pattern.
