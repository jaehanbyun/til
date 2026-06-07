---
title: "Klustered: Level One"
description: "Kubernetes 클러스터 디버깅 실습에서 앱, 서비스, 데이터베이스 연결을 따라가며 문제를 좁힌 기록."
date: "2026-06-07"
tags: [kubernetes, kubectl, deployment, service, dns, debugging]
source: "https://labs.iximiuz.com/"
---

## 실습 목표

깨진 Kubernetes 클러스터에서 애플리케이션이 다시 응답하도록 만들고, 최종적으로 `v2` 이미지로 롤아웃하는 것이 목표다.

이 실습은 단순히 명령을 외우는 것보다 **현재 리소스 상태를 읽고 다음 확인 지점을 정하는 방식**을 연습하는 데 좋았다.

## 관찰한 증상

처음에는 App 탭이 비어 있었고, 워크로드는 떠 있는 것처럼 보여도 실제 서비스 경로가 완전히 정상이라고 보기 어려웠다.

확인한 명령:

```bash
kubectl get pods
kubectl get svc
kubectl get endpoints
kubectl logs deploy/klustered
```

`kubectl logs deploy/klustered`와 Pod 직접 로그가 모두 빈 출력이었는데, 이것은 애플리케이션이 stdout/stderr로 로그를 남기지 않는 상황이었다. 즉, 빈 로그 자체를 실패 신호로 해석하면 안 된다.

## 디버깅 흐름

1. Pod가 `Running`인지 확인한다.
2. Service가 올바른 selector로 Pod를 바라보는지 확인한다.
3. Endpoints가 실제 Pod IP를 포함하는지 확인한다.
4. 앱이 데이터베이스에 접근할 수 있는지 확인한다.
5. DNS 설정이 클러스터 DNS를 깨뜨리지 않는지 확인한다.

```bash
kubectl get pods -o wide
kubectl describe svc klustered
kubectl get endpoints klustered
kubectl get deploy klustered -o yaml
```

## 배운 점

- `kubectl logs`가 비어 있어도 프로세스가 실패했다는 뜻은 아니다.
- Service 문제는 `selector -> endpoints -> pod` 순서로 확인하면 빠르게 좁혀진다.
- Kubernetes 디버깅에서는 "리소스가 존재한다"와 "연결 경로가 살아 있다"를 분리해서 봐야 한다.
- 앱 증상만 보지 말고 Deployment, Service, Endpoint, DNS를 한 줄의 데이터 경로로 봐야 한다.

## 다시 볼 키워드

- Deployment rollout
- Service selector
- Endpoints
- CoreDNS
- `dnsPolicy`
