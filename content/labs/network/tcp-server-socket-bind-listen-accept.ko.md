---
title: "TCP 서버는 socket-bind-listen-accept 순서로 열린다"
description: "TCP 서버가 연결을 받기까지 필요한 socket 생성, 주소 바인딩, listen, accept 흐름."
date: "2026-06-07"
tags: [network, tcp, sockets, server, linux]
source: "https://labs.iximiuz.com/"
---

## 핵심 흐름

TCP 서버는 대체로 `socket -> bind -> listen -> accept` 순서로 열린다. 이 순서를 알고 있으면 "포트가 열려 있다"와 "요청 처리가 정상이다"를 분리해서 볼 수 있다.

1. `socket`은 통신 endpoint를 만든다.
2. `bind`는 endpoint에 IP 주소와 port를 붙인다.
3. `listen`은 연결 요청을 받을 준비 상태로 만든다.
4. `accept`는 대기 중인 client 연결을 하나씩 받아 application 처리로 넘긴다.

## 언제 마주치는가

서버가 실행 중이라고 생각했지만 접속이 안 되거나, `localhost`에서는 되는데 외부에서는 안 되는 경우가 있다. 이때 문제는 application logic이 아니라 bind address, listen 상태, firewall, routing 중 하나일 수 있다.

## 관찰 포인트

```bash
ss -ltnp
nc localhost 8080
curl -v http://localhost:8080
```

`ss`는 실제 listen address와 port를 확인하는 데 유용하다. `127.0.0.1:8080`에만 bind된 서버는 같은 host 안에서는 접근되지만 외부 interface로는 접근되지 않는다.

## 동작 원리

`bind` 단계에서 선택한 주소가 접근 범위를 결정한다. `127.0.0.1`은 loopback 전용이고, `0.0.0.0`은 모든 IPv4 interface에서 listen한다.

`listen`은 kernel에 connection backlog를 만들지만, application이 `accept`를 호출하지 않거나 처리 loop가 멈추면 연결은 지연되거나 실패할 수 있다.

## 확인 및 수정 패턴

```bash
ss -ltnp | grep 8080
curl -v http://127.0.0.1:8080
curl -v http://$(hostname -I | awk '{print $1}'):8080
```

문제를 볼 때는 다음을 분리한다.

- process가 떠 있는가?
- socket이 listen 중인가?
- 어떤 address에 bind되어 있는가?
- network path가 해당 address까지 도달하는가?
- application response가 정상인가?

## 다시 볼 포인트

- open port는 healthy response와 다르다.
- bind address는 접근 범위를 결정한다.
- `ss -ltnp`는 network debugging의 첫 확인 명령 중 하나다.
- TCP 상태와 application 상태를 분리해서 판단한다.
