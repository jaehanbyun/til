---
title: "systemd Socket Activation"
description: "첫 연결이 들어올 때 systemd가 서비스를 시작하는 흐름을 정리한 Linux 실습 노트."
date: "2026-06-07"
tags: [linux, systemd, socket, service, activation]
source: "https://labs.iximiuz.com/"
---

## 핵심 아이디어

Socket activation은 서비스 프로세스를 항상 띄워두는 대신, systemd가 소켓을 먼저 열고 있다가 첫 연결 시점에 서비스를 시작하는 방식이다.

이 패턴은 요청이 드문 서비스, 부팅 시간을 줄이고 싶은 서비스, 또는 의존성 순서를 systemd에 맡기고 싶은 경우에 유용하다.

## 확인할 파일

보통 같은 이름의 `.socket`과 `.service` 유닛을 함께 본다.

```ini
[Socket]
ListenStream=/run/example.sock

[Install]
WantedBy=sockets.target
```

```ini
[Service]
ExecStart=/usr/local/bin/example-server
```

## 디버깅 체크리스트

- `.socket` 유닛이 active 상태인지 확인한다.
- 서비스가 직접 실행되는지, socket을 통해 실행되는지 구분한다.
- Unix socket 경로의 권한과 소유자를 확인한다.
- 첫 연결 이후 `.service` 유닛 상태가 어떻게 바뀌는지 본다.

```bash
systemctl status example.socket
systemctl status example.service
ss -lx | grep example
journalctl -u example.socket -u example.service
```

## 배운 점

systemd는 단순한 프로세스 시작 도구가 아니라, 소켓과 서비스 생명주기를 연결하는 런타임 조정자 역할도 한다.
