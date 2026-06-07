---
title: "TCP Sockets: Hands-on Intro"
description: "서버가 TCP 연결을 받고 응답하는 과정을 socket, bind, listen, accept 흐름으로 정리."
date: "2026-06-07"
tags: [network, tcp, sockets, server, linux]
source: "https://labs.iximiuz.com/"
---

## 핵심 흐름

TCP 서버의 기본 흐름은 다음 순서로 읽으면 이해하기 쉽다.

1. `socket`으로 통신 엔드포인트를 만든다.
2. `bind`로 주소와 포트를 붙인다.
3. `listen`으로 연결 대기 상태에 들어간다.
4. `accept`로 클라이언트 연결을 하나씩 받는다.

## 관찰 포인트

```bash
ss -ltnp
nc localhost 8080
curl -v http://localhost:8080
```

`ss`는 서버가 실제로 어떤 주소에서 listen 중인지 확인할 때 유용하다. `localhost`만 바인딩된 서버는 외부 인터페이스에서 접근할 수 없다.

## 배운 점

- 포트가 열려 있다는 것은 애플리케이션 레벨 응답이 정상이라는 뜻은 아니다.
- `0.0.0.0` 바인딩과 `127.0.0.1` 바인딩은 접근 범위가 다르다.
- 네트워크 문제를 볼 때는 DNS, routing, socket state, application response를 분리해서 확인해야 한다.
