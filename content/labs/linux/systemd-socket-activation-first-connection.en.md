---
title: "systemd socket activation starts a service on first connection"
description: "How systemd can listen on a socket first and start the matching service only when a request arrives."
date: "2026-06-07"
tags: [linux, systemd, socket, service, activation]
source: "https://labs.iximiuz.com/"
---

## Core Idea

Socket activation lets systemd open the socket first and start the service unit only when the first connection arrives.

In this pattern, "the port or Unix socket is listening" and "the service process is already running" are not the same claim.

## When It Shows Up

This is useful for rarely used services, boot-time optimization, or services whose dependency ordering should be owned by systemd. From the client side, the socket endpoint can exist before the service process is active.

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

The `.socket` unit defines what systemd listens on. The `.service` unit defines how the process that handles requests starts.

## How It Works

systemd owns the socket and passes the connected file descriptor to the service process when a connection arrives. This differs from a service process that creates and listens on the socket by itself.

With this model, inspect socket state and service state separately. The socket can be active while the service is inactive, and that can be normal.

## Verification and Fix Pattern

```bash
systemctl status example.socket
systemctl status example.service
ss -lx | grep example
journalctl -u example.socket -u example.service
```

Check how the service state changes before and after the first connection. For Unix sockets, also inspect path, owner, and permissions.

## Revisit

- Active socket unit and running service process are different states.
- Socket activation is a lazy-start pattern triggered by demand.
- Read `.socket` and `.service` units together.
- During debugging, separate endpoint listen state from service execution state.
