---
title: "Deployment rollout은 앱 복구와 별도로 확인해야 한다"
description: "Kubernetes 앱이 다시 응답하는 상태와 목표 이미지로 롤아웃된 상태를 분리해서 검증하는 흐름."
date: "2026-06-07"
tags: [kubernetes, deployment, rollout, image, kubectl, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---

## 핵심 아이디어

앱이 다시 응답한다고 해서 Deployment가 목표 버전으로 배포된 것은 아니다. 복구와 rollout은 서로 다른 체크포인트다.

Kubernetes에서는 Pod template의 image가 바뀌어야 새 ReplicaSet이 만들어지고, rollout 상태를 확인해야 실제 전환이 끝났는지 알 수 있다.

## 언제 마주치는가

Service, Endpoints, DNS 문제를 해결해서 앱이 응답하기 시작한다. 하지만 여전히 이전 image tag로 실행 중일 수 있고, 실습이나 운영 목표는 특정 버전으로 전환하는 것일 수 있다.

## 관찰 포인트

```bash
kubectl get deployment klustered -o wide
kubectl describe deployment klustered
kubectl rollout history deployment/klustered
```

현재 image, ReplicaSet 변화, rollout history를 함께 보면 "살아 있음"과 "목표 버전"을 분리해서 볼 수 있다.

## 동작 원리

Deployment의 Pod template은 어떤 Pod를 만들지 정하는 source of truth다. image tag를 변경하면 Deployment controller가 새 ReplicaSet을 만들고, 새 Pod를 늘리며, 이전 ReplicaSet을 줄인다.

이 과정은 비동기적으로 진행되기 때문에 명령을 실행한 직후 바로 완료되었다고 가정하면 안 된다.

## 확인 및 수정 패턴

```bash
kubectl set image deployment/klustered klustered=ghcr.io/rawkode-academy/klustered:v2
kubectl rollout status deployment/klustered
kubectl get deployment klustered -o wide
kubectl get rs -l app=klustered
```

문제가 생기면 rollout history를 보고 이전 revision으로 되돌릴 수 있다.

```bash
kubectl rollout history deployment/klustered
kubectl rollout undo deployment/klustered
```

## 다시 볼 포인트

- 앱 복구와 목표 버전 배포는 별도 상태다.
- image 변경은 Deployment template 변경으로 남는다.
- `rollout status`는 비동기 배포가 끝났는지 확인하는 최소 체크다.
- ReplicaSet을 보면 새 template이 실제 Pod로 전개되었는지 추적할 수 있다.

## 출처

이 노트는 iximiuz Labs의 Klustered: Level One 실습 후 작성한 개인 학습 노트다. 원문 challenge 내용은 복제하지 않고, Deployment rollout 검증 패턴만 정리했다.
