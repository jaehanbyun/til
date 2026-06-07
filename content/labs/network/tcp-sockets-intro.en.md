---
title: "TCP Sockets: Hands-on Intro"
description: "A short note on socket, bind, listen, and accept in a basic TCP server."
date: "2026-06-07"
tags: [network, tcp, sockets, server, linux]
source: "https://labs.iximiuz.com/"
---

## Core Flow

A basic TCP server is easier to reason about as a sequence:

1. `socket` creates the communication endpoint.
2. `bind` attaches it to an address and port.
3. `listen` starts accepting connection attempts.
4. `accept` receives client connections one at a time.

## What to Observe

```bash
ss -ltnp
nc localhost 8080
curl -v http://localhost:8080
```

`ss` is useful for checking which address the server is listening on. A server bound only to `localhost` is not reachable from external interfaces.

## Takeaways

- An open port does not prove a healthy application-level response.
- Binding to `0.0.0.0` and binding to `127.0.0.1` expose different reachability.
- DNS, routing, socket state, and application response should be checked separately.
