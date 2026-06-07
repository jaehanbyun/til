---
title: "Deployment rollout status is separate from app recovery"
description: "How to distinguish a recovered Kubernetes app from a Deployment that actually reached the target image."
date: "2026-06-07"
tags: [kubernetes, deployment, rollout, image, kubectl, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---

## Core Idea

An app responding again does not mean the Deployment has reached the target version. Recovery and rollout are different checkpoints.

In Kubernetes, changing the Pod template image creates a new ReplicaSet. You still need to watch rollout status to know when the transition is complete.

## When It Shows Up

After fixing Service, Endpoints, and DNS, the app begins responding. It may still run the old image tag, while the operational goal is to move to a specific version.

## What to Observe

```bash
kubectl get deployment klustered -o wide
kubectl describe deployment klustered
kubectl rollout history deployment/klustered
```

Current image, ReplicaSet changes, and rollout history help separate "alive" from "on the desired version".

## How It Works

The Deployment Pod template is the source of truth for future Pods. Changing the image tag makes the Deployment controller create a new ReplicaSet, scale new Pods up, and scale old Pods down.

This process is asynchronous, so do not assume the rollout is complete right after issuing the command.

## Verification and Fix Pattern

```bash
kubectl set image deployment/klustered klustered=ghcr.io/rawkode-academy/klustered:v2
kubectl rollout status deployment/klustered
kubectl get deployment klustered -o wide
kubectl get rs -l app=klustered
```

If the rollout goes wrong, inspect history and undo to the previous revision.

```bash
kubectl rollout history deployment/klustered
kubectl rollout undo deployment/klustered
```

## Revisit

- App recovery and target-version deployment are separate states.
- An image change persists as a Deployment template change.
- `rollout status` is the minimum check for an asynchronous deployment.
- ReplicaSets show whether the new template actually became Pods.

## Source

This is a personal learning note from the iximiuz Labs Klustered: Level One challenge. It does not mirror the original challenge text; it captures the Deployment rollout verification pattern.
