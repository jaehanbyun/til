---
title: "Service selector가 틀리면 Endpoints가 비는 이유"
description: "Kubernetes Service가 Pod를 찾는 방식과 selector, label, endpoints 확인 순서."
date: "2026-06-07"
tags: [kubernetes, service, selector, labels, endpoints, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---

## 핵심 아이디어

Service는 Pod 이름으로 backend를 찾지 않는다. Service의 selector와 Pod의 label이 정확히 일치할 때 Endpoints가 만들어지고, 그때서야 트래픽을 보낼 대상이 생긴다.

따라서 Service가 존재한다는 사실과 트래픽이 Pod까지 도달한다는 사실은 서로 다르다.

## 언제 마주치는가

Pod는 `Running`이고 Service도 존재하지만, 앱 접속이 안 되거나 응답이 없다. 이때 Service만 보면 정상처럼 보일 수 있지만 Endpoints가 비어 있으면 Service는 실제 backend를 갖지 못한 상태다.

## 관찰 포인트

```bash
kubectl get svc klustered -o yaml
kubectl get pod -l app=klustered --show-labels
kubectl get endpoints klustered
```

핵심은 selector와 label을 문자 단위로 비교하는 것이다. 한 글자만 달라도 Kubernetes는 경고 없이 빈 Endpoints를 만든다.

## 동작 원리

Service controller는 selector에 맞는 Pod를 찾아 Endpoints 또는 EndpointSlice를 만든다. selector가 실제 Pod label과 맞지 않으면 Service object는 남아 있지만 route target은 없다.

이 상태에서 `curl`이 실패해도 Service 자체가 없는 것이 아니다. Service가 가리키는 대상이 없는 것이다.

## 확인 및 수정 패턴

```bash
kubectl get svc klustered -o jsonpath='{.spec.selector}'
kubectl get pods --show-labels
kubectl edit svc klustered
kubectl get endpoints klustered
```

수정 후 Endpoints에 Pod IP가 생기는지 먼저 확인한다. 앱 응답 확인은 그 다음이다.

## 다시 볼 포인트

- Service 존재 여부와 Endpoints 존재 여부를 분리해서 본다.
- selector는 fuzzy match가 아니라 정확한 label match다.
- Service 디버깅에서는 `kubectl get endpoints`가 빠른 연결 증거다.
- 트래픽 경로는 `Service selector -> Pod labels -> Endpoints -> Pod` 순서로 확인한다.

## 출처

이 노트는 iximiuz Labs의 Klustered: Level One 실습 후 작성한 개인 학습 노트다. 원문 challenge 내용은 복제하지 않고, Service selector 디버깅 패턴만 정리했다.
