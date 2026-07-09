---
title: "SSH pipelining reduces Linux remote execution overhead"
description: "How Ansible reduces temporary module transfer cost on Linux hosts, and why sudo TTY policy can affect performance tuning."
date: "2026-07-09"
tags: [linux, openstack, kolla-ansible, ansible, ssh, sudo, pipelining, performance]
source: "https://docs.openstack.org/kolla-ansible/2025.1/user/ansible-tuning.html"
---

## Core Idea

SSH pipelining is an Ansible option that reduces the cost of creating and transferring temporary module files on remote Linux hosts.

The important point is not simply "reuse one SSH connection for longer". It is closer to "send module code through SSH standard input instead of copying it as a remote file first". SSH connection reuse belongs to settings such as `ControlPersist`; pipelining changes how Ansible modules are prepared and executed on Linux hosts.

## Linux Remote Execution Path

Most Ansible modules are small programs executed on the remote Linux host. With pipelining disabled, Ansible prepares an executable file in a temporary directory on the remote host for many module tasks.

```text
control node
  -> SSH connection
  -> create a temporary directory under remote_tmp
  -> transfer the module file through SFTP/SCP or a similar path
  -> adjust execution permissions and ownership
  -> run the module through remote Python or shell
  -> delete temporary files
```

The cost looks small for one task, but file transfer, permission adjustment, and cleanup accumulate as host count and task count grow. The effect becomes more visible when remote filesystems are slow or SSH round-trip latency is high.

## What Changes When It Is Enabled

When pipelining is enabled, Ansible can pass the module to the remote interpreter through a pipe instead of transferring it as a real file first, when the connection plugin supports it.

```ini
[ssh_connection]
pipelining = True
```

It can also be configured through Ansible's common configuration sections.

```ini
[defaults]
pipelining = True

[connection]
pipelining = True
```

This removes part of the module file transfer, temporary file creation, and cleanup path, reducing network round trips and remote filesystem work. It does not remove the actual payload transfer for tasks such as `copy`, `template`, or `fetch`, where the task itself is about moving file data.

## Why sudo and requiretty Matter

Pipelining can conflict with sudoers `requiretty` when used with `become` or `sudo`. `requiretty` forces sudo commands to have a TTY, while pipelining uses a path where module code is sent through standard input.

If a managed host still has this sudoers setting, remove it or disable it for the relevant user before enabling pipelining.

```sudoers
Defaults requiretty
```

Most modern Linux distributions disable `requiretty` by default, but it is still worth checking on older RHEL-derived systems or hardened base images.

So this is not just an Ansible performance switch. It sits at the intersection of Linux SSH behavior, standard input, remote temporary directories, and sudo policy.

## Applied Case: Kolla-Ansible

Kolla-Ansible runs many Ansible tasks across many Linux nodes. If module preparation round trips are paid for every task, OpenStack deployment time grows quickly.

That is why the Kolla-Ansible Ansible tuning documentation recommends setting `pipelining = True` under the `[ssh_connection]` section of `ansible.cfg`. In Kolla-Ansible, this option is best understood alongside other Ansible tuning knobs such as `forks`, fact caching, and fact filtering.

The biggest benefit appears in repeated small module tasks across many hosts. For image files, rendered configuration files, templates, or other real file payloads, pipelining does not make the payload transfer disappear.

## Verification Pattern

Check the effective Ansible configuration from the control node.

```bash
ansible-config dump --only-changed | grep -i pipelining
```

To compare behavior only for one run, enable it through an environment variable.

```bash
ANSIBLE_PIPELINING=True ansible-playbook -i inventory playbook.yml
```

For the SSH connection plugin, `ANSIBLE_SSH_PIPELINING` or the inventory variable `ansible_ssh_pipelining` can also be used.

## Revisit

- SSH pipelining reduces the cost of preparing module files on remote Linux hosts.
- It is not the same thing as SSH connection reuse; it changes the module transfer and execution path.
- sudo environments with `requiretty` enabled can conflict with `become` tasks.
- Kolla-Ansible is an applied case where this Linux remote execution cost grows into OpenStack deployment time.
- It does not remove the payload transfer for tasks whose purpose is file transfer.

## Sources

- [Kolla-Ansible 2025.1 Ansible tuning](https://docs.openstack.org/kolla-ansible/2025.1/user/ansible-tuning.html)
- [Ansible configuration setting: ANSIBLE_PIPELINING](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#ansible-pipelining)
- [ansible.builtin.ssh connection pipelining](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html)
