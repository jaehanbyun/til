---
title: "A TCP server opens through socket-bind-listen-accept"
description: "The basic flow from creating a TCP socket to accepting client connections."
date: "2026-06-07"
tags: [network, tcp, sockets, server, linux]
source: "https://labs.iximiuz.com/"
---

## Core Flow

A TCP server usually opens through `socket -> bind -> listen -> accept`. Knowing this sequence helps separate "the port is open" from "the application responds correctly".

1. `socket` creates the communication endpoint.
2. `bind` attaches the endpoint to an IP address and port.
3. `listen` makes it ready to receive connection attempts.
4. `accept` takes pending client connections and hands them to application logic.

## When It Shows Up

A server may be running but unreachable, or it may work on `localhost` but not from another host. The problem may be bind address, listen state, firewall, routing, or application logic.

## What to Observe

```bash
ss -ltnp
nc localhost 8080
curl -v http://localhost:8080
```

`ss` is useful for checking the actual listen address and port. A server bound only to `127.0.0.1:8080` can be reachable from the same host but not from external interfaces.

## How It Works

The address chosen at `bind` time determines reachability. `127.0.0.1` is loopback-only, while `0.0.0.0` listens on all IPv4 interfaces.

`listen` creates a kernel backlog for connection attempts, but if the application does not call `accept` or its handling loop is stuck, connections can still stall or fail.

## Verification and Fix Pattern

```bash
ss -ltnp | grep 8080
curl -v http://127.0.0.1:8080
curl -v http://$(hostname -I | awk '{print $1}'):8080
```

Separate these questions while debugging:

- Is the process running?
- Is the socket listening?
- Which address is it bound to?
- Can the network path reach that address?
- Is the application response healthy?

## Revisit

- An open port is not the same as a healthy response.
- Bind address determines reachability.
- `ss -ltnp` is one of the first commands for network debugging.
- Judge TCP state and application state separately.
