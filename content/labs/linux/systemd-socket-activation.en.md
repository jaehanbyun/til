---
title: "systemd Socket Activation"
description: "A Linux lab note on starting a service only when the first connection arrives."
date: "2026-06-07"
tags: [linux, systemd, socket, service, activation]
source: "https://labs.iximiuz.com/"
---

## Core Idea

Socket activation lets systemd open the socket first and start the service only when the first connection arrives.

This is useful for rarely used services, boot-time optimization, and cases where systemd should own the dependency ordering.

## Unit Files

The `.socket` and `.service` units are usually inspected together.

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

## Debugging Checklist

- Check whether the `.socket` unit is active.
- Distinguish direct service startup from socket-triggered startup.
- Inspect the Unix socket path, owner, and permissions.
- Watch how the `.service` unit changes after the first connection.

```bash
systemctl status example.socket
systemctl status example.service
ss -lx | grep example
journalctl -u example.socket -u example.service
```

## Takeaway

systemd is not only a process launcher. It can also coordinate sockets and service lifecycle at runtime.
