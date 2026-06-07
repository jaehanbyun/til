---
title: "systemd socket activation은 첫 연결에서 서비스를 깨운다"
description: "systemd가 소켓을 먼저 열어두고 요청이 들어올 때 service unit을 시작하는 구조."
date: "2026-06-07"
tags: [linux, systemd, socket, service, activation]
source: "https://labs.iximiuz.com/"
---

## 핵심 아이디어

Socket activation은 서비스 프로세스를 항상 실행해 두지 않고, systemd가 소켓을 먼저 열어 둔 뒤 첫 연결이 들어올 때 service unit을 시작하는 방식이다.

이 패턴에서는 "포트나 Unix socket이 열려 있다"와 "서비스 프로세스가 이미 떠 있다"가 같은 말이 아니다.

## 언제 마주치는가

요청이 드문 서비스, 부팅 시간을 줄이고 싶은 서비스, 또는 dependency ordering을 systemd에 맡기고 싶은 서비스에서 유용하다. 클라이언트 입장에서는 socket endpoint가 먼저 준비되므로 서비스 시작 지연을 덜 의식하게 된다.

## 확인할 파일

보통 같은 이름의 `.socket`과 `.service` unit을 함께 본다.

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

`.socket` unit은 systemd가 어떤 endpoint를 listen할지 정하고, `.service` unit은 실제 요청을 처리할 process를 어떻게 시작할지 정한다.

## 동작 원리

systemd가 socket을 소유하고 있다가 연결이 들어오면 연결된 file descriptor를 service process에 넘긴다. 따라서 service process는 처음부터 listen socket을 직접 만드는 방식과 다르게 시작될 수 있다.

이 구조에서는 socket unit과 service unit의 상태를 분리해서 봐야 한다. socket은 active인데 service는 inactive일 수 있고, 이것이 정상일 수 있다.

## 확인 및 수정 패턴

```bash
systemctl status example.socket
systemctl status example.service
ss -lx | grep example
journalctl -u example.socket -u example.service
```

첫 연결 전후로 service 상태가 어떻게 바뀌는지 확인한다. Unix socket이라면 경로, 소유자, 권한도 함께 본다.

## 다시 볼 포인트

- socket unit active와 service process running은 다른 상태다.
- socket activation은 요청이 있을 때 service를 깨우는 지연 시작 패턴이다.
- `.socket`과 `.service` unit은 함께 읽어야 한다.
- 디버깅할 때는 endpoint listen 상태와 service 실행 상태를 분리한다.
