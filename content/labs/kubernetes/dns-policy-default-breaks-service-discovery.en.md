---
title: "dnsPolicy: Default bypasses Kubernetes Service DNS"
description: "How a Pod can skip CoreDNS, inherit the node resolver, and fail to resolve Service names."
date: "2026-06-07"
tags: [kubernetes, dns, dnspolicy, coredns, service-discovery, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---

## Core Idea

When a Pod runs with `dnsPolicy: Default`, it leaves the normal cluster DNS path. The Pod inherits the node resolver and may fail to resolve Kubernetes Service names such as `postgres`.

Even with a valid Service and Endpoints, the request can still fail inside the app if Service DNS is broken.

## When It Shows Up

The Service selector and Endpoints have been fixed, and traffic appears to reach the app Pod. The app logs still show DNS failures for a database host, or requests hang on an internal dependency.

## What to Observe

```bash
kubectl logs deploy/klustered
kubectl get deployment klustered -o yaml
kubectl exec deploy/klustered -- cat /etc/resolv.conf
```

Logs show which name the app cannot resolve. The Deployment YAML shows which DNS policy creates the Pod.

## How It Works

The usual Pod DNS policy is `ClusterFirst`. With it, CoreDNS resolves same-namespace Service names and cluster-local FQDNs.

`Default` makes the Pod inherit the node's `/etc/resolv.conf` instead. The node resolver does not know the Kubernetes Service registry, so cluster-local names can fail.

## Verification and Fix Pattern

```bash
kubectl get deployment klustered -o yaml | grep -n "dnsPolicy"
kubectl edit deployment klustered
kubectl rollout status deployment/klustered
kubectl logs deploy/klustered
```

The fix is to remove `dnsPolicy: Default` so the default applies, or set it explicitly to `ClusterFirst`.

## Revisit

- A healthy Service can still fail if the app Pod resolver is wrong.
- For Pod DNS issues, inspect both logs and `/etc/resolv.conf`.
- `ClusterFirst` is the default path for Kubernetes Service discovery.
- Fix the Deployment template and recheck on the rolled-out Pod.

## Source

This is a personal learning note from the iximiuz Labs Klustered: Level One challenge. It does not mirror the original challenge text; it captures the relationship between Pod DNS policy and Service discovery.
