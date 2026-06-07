---
title: "dnsPolicy: Default는 Kubernetes Service DNS를 우회한다"
description: "Pod가 CoreDNS 대신 node resolver를 쓰면서 Service 이름 해석에 실패하는 흐름."
date: "2026-06-07"
tags: [kubernetes, dns, dnspolicy, coredns, service-discovery, debugging]
source: "https://labs.iximiuz.com/challenges/klustered-l1-b71142bd"
lab: "Klustered: Level One"
---

## 핵심 아이디어

Pod가 `dnsPolicy: Default`로 실행되면 cluster DNS를 우선 사용하는 기본 흐름에서 벗어난다. 이 경우 Pod는 node의 resolver 설정을 따라가고, `postgres` 같은 Kubernetes Service 이름을 해석하지 못할 수 있다.

Service와 Endpoints가 정상이어도 앱 내부에서 Service DNS를 못 찾으면 요청은 여전히 실패한다.

## 언제 마주치는가

Service selector와 Endpoints를 고쳤고 트래픽이 앱 Pod까지 도달하는 것처럼 보인다. 그런데 앱 로그에는 database host를 찾지 못하는 DNS 오류가 남거나 요청이 내부 의존성에서 멈춘다.

## 관찰 포인트

```bash
kubectl logs deploy/klustered
kubectl get deployment klustered -o yaml
kubectl exec deploy/klustered -- cat /etc/resolv.conf
```

로그는 앱이 어떤 이름을 해석하지 못했는지 보여주고, Deployment YAML은 Pod가 어떤 DNS 정책으로 생성되는지 보여준다.

## 동작 원리

일반적인 Pod의 DNS 정책은 `ClusterFirst`다. 이 설정에서는 CoreDNS를 통해 같은 namespace의 Service 이름이나 FQDN을 해석할 수 있다.

`Default`는 cluster DNS 대신 node의 `/etc/resolv.conf`를 상속한다. node resolver는 Kubernetes Service registry를 모르기 때문에 cluster-local 이름 해석이 깨진다.

## 확인 및 수정 패턴

```bash
kubectl get deployment klustered -o yaml | grep -n "dnsPolicy"
kubectl edit deployment klustered
kubectl rollout status deployment/klustered
kubectl logs deploy/klustered
```

수정 방향은 `dnsPolicy: Default`를 제거해 기본값으로 되돌리거나, 명시적으로 `ClusterFirst`를 설정하는 것이다.

## 다시 볼 포인트

- Service가 정상이어도 앱 Pod의 resolver 설정이 틀리면 Service DNS가 실패한다.
- Pod DNS 문제는 로그와 `/etc/resolv.conf`를 같이 본다.
- `ClusterFirst`는 Kubernetes Service discovery의 기본 경로다.
- Deployment template을 고친 뒤 rollout된 새 Pod에서 다시 확인한다.

## 출처

이 노트는 iximiuz Labs의 Klustered: Level One 실습 후 작성한 개인 학습 노트다. 원문 challenge 내용은 복제하지 않고, Pod DNS 정책과 Service discovery 관계만 정리했다.
