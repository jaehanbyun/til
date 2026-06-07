---
title: "Pod schedulingGates can keep a Pod stuck in Pending"
description: "How to recognize a Kubernetes Pod blocked before scheduling and fix the Deployment template that keeps recreating it."
date: "2026-06-07"
tags: [kubernetes, pod, scheduling-gates, pending, deployment, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---

## Core Idea

A `Pending` Pod is not always waiting for CPU, memory, or taint toleration. When `spec.schedulingGates` is present, the scheduler will not place the Pod until every gate is removed.

The durable lesson is to inspect both the live Pod and the Deployment template that will keep recreating that Pod.

## When It Shows Up

`kubectl get pods` shows a Pod that remains `Pending`, and time does not lead to node assignment. It can look like a capacity problem, but the Events may show that normal scheduling has not started yet.

## What to Observe

```bash
kubectl get pods
kubectl describe pod -l app=database
kubectl get deployment database -o yaml
```

`describe` explains why the Pod is blocked. The Deployment YAML tells you whether the same state will be recreated.

## How It Works

A scheduling gate holds a Pod before it enters the normal scheduler flow. It is useful when an external controller or admission process must clear a precondition first.

If no controller removes the gate, the Pod never reaches normal scheduling and remains `Pending`.

## Verification and Fix Pattern

If the Pod came from a Deployment, fix the Pod template rather than only touching the live Pod.

```bash
kubectl edit deployment database
kubectl rollout status deployment/database
kubectl get pods -l app=database
```

After the change, verify that a new Pod is created, a node is assigned, and the next ReplicaSet no longer repeats the same problem.

## Revisit

- Do not assume every `Pending` Pod is a capacity problem.
- Start with Conditions and Events from `kubectl describe pod`.
- If the Deployment is the source, fix `spec.template`.
- Deleting the live Pod clears a symptom, not the template cause.

## Source

This is a personal learning note from the iximiuz Labs Klustered: Level One challenge. It does not mirror the original challenge text; it captures the scheduling gate debugging pattern.
