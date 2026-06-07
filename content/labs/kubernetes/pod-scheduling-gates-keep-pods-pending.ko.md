---
title: "Pod schedulingGates 때문에 Pending이 풀리지 않을 때"
description: "Kubernetes Pod가 node에 배치되기 전 scheduling gate에서 멈추는 경우를 확인하고 제거하는 흐름."
date: "2026-06-07"
tags: [kubernetes, pod, scheduling-gates, pending, deployment, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---

## 핵심 아이디어

Pod가 `Pending`이라고 해서 항상 node 자원 부족이나 taint 문제는 아니다. `spec.schedulingGates`가 있으면 scheduler는 gate가 사라질 때까지 Pod 배치를 시작하지 않는다.

실습에서 중요한 포인트는 live Pod만 보는 것이 아니라, Pod를 계속 만들어내는 Deployment template까지 확인해야 한다는 점이었다.

## 언제 마주치는가

`kubectl get pods`에서 특정 Pod가 계속 `Pending`이고, 시간이 지나도 node가 배정되지 않는다. 일반적인 자원 부족처럼 보이지만 Event를 보면 scheduler가 배치를 시도하지 않는 흐름일 수 있다.

## 관찰 포인트

```bash
kubectl get pods
kubectl describe pod -l app=database
kubectl get deployment database -o yaml
```

`describe`는 Pod가 왜 멈췄는지 보여주고, Deployment YAML은 같은 상태가 계속 재생산될지 확인하게 해준다.

## 동작 원리

Scheduling gate는 Pod가 scheduler queue로 들어가기 전에 대기하게 만드는 장치다. 외부 controller나 admission 흐름이 어떤 조건을 확인한 뒤 gate를 제거하는 식으로 쓴다.

문제는 gate를 제거해 줄 controller가 없을 때다. 이 경우 Pod는 정상적인 scheduling 단계로 넘어가지 못하고 계속 `Pending`에 머문다.

## 확인 및 수정 패턴

Deployment가 만든 Pod라면 live Pod를 직접 고치는 대신 Pod template을 고친다.

```bash
kubectl edit deployment database
kubectl rollout status deployment/database
kubectl get pods -l app=database
```

수정 후에는 새 Pod가 만들어졌는지, node가 배정되었는지, 이전 ReplicaSet이 같은 문제를 반복하지 않는지 확인한다.

## 다시 볼 포인트

- `Pending`의 원인을 자원 부족으로 단정하지 않는다.
- `kubectl describe pod`의 Conditions와 Events를 먼저 본다.
- Deployment가 원인이라면 `spec.template`을 고친다.
- live Pod 삭제는 증상을 지울 뿐 template 문제를 해결하지 못한다.

## 출처

이 노트는 iximiuz Labs의 Klustered: Level One 실습 후 작성한 개인 학습 노트다. 원문 challenge 내용은 복제하지 않고, scheduling gate와 Pending Pod 디버깅 패턴만 정리했다.
