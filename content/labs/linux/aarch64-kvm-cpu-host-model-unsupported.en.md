---
title: "On aarch64 KVM, --cpu host can fail through host-model"
description: "How virt-install --cpu controls the CPU model exposed to a guest, and how to work around host-model failures on aarch64."
date: "2026-06-24"
tags: [linux, kvm, libvirt, virt-install, aarch64, cpu]
---

## One-Line Conclusion

`virt-install --cpu` controls which CPU model and features are exposed inside the VM. On aarch64 KVM, if `--cpu host` is internally treated like `host-model`, VM creation can fail because the hypervisor does not support that CPU mode.

For a VM that will stay pinned to the same host, try `--cpu host-passthrough` first. If that still fails, remove the `--cpu` option and let libvirt/QEMU use its default CPU model.

## When It Shows Up

This can happen when creating a VM from a cloud image with `virt-install --import` and an explicit CPU option. It is especially common when a VM creation script originally used on x86_64 is moved to an aarch64 server without changing the CPU mode.

A representative failure looks like this.

```text
WARNING  CPU model=host is deprecated, use model=host-model
ERROR    unsupported configuration: CPU mode 'host-model' for aarch64 kvm domain on aarch64 host is not supported by hypervisor
Domain installation does not appear to have been successful.
error: failed to get domain 'monitoring-01'
```

The final `failed to get domain` message is not a separate root cause. The domain was never created because of the earlier CPU mode error, so the later `virsh autostart` step could not find the VM.

## What to Observe

When reading the error, focus on how libvirt interpreted the CPU mode rather than only looking at the original `virt-install` command.

```bash
sudo virt-install \
  --name "${VM}" \
  --cpu host \
  --import \
  ...
```

The command says `host`, but the warning and error mention `host-model`. That means the failure is in CPU mode interpretation, not in the VM name, disk, network, or cloud-init seed ISO.

## How It Works

`--cpu` decides which CPU model and instruction feature set the guest VM sees. The guest OS boots against that virtual CPU information, and both the kernel and user space use it to decide which CPU features are available.

Common values can be separated like this.

| Option | Meaning |
| --- | --- |
| `--cpu host` | Tries to automatically select a model close to the host CPU. Depending on the environment, it can be handled through the `host-model` path. |
| `--cpu host-model` | Asks libvirt to expose a compatible CPU model similar to the host. |
| `--cpu host-passthrough` | Passes through host CPU features to the guest as directly as possible. |
| No option | Uses the libvirt/QEMU default CPU model. |

The key point in this failure is that `host-model` mode was not supported for the aarch64 KVM environment. So even if `--cpu host` was harmless on x86_64, it should not be reused blindly on aarch64.

## Verification and Fix Pattern

The first alternative is to switch to `host-passthrough`.

```bash
sudo virt-install \
  --name "${VM}" \
  --memory 32768 \
  --vcpus 8 \
  --cpu host-passthrough \
  --os-variant rocky9 \
  --import \
  --disk path="${VM_DIR}/disk.qcow2",format=qcow2,bus=virtio \
  --disk path="${VM_DIR}/seed.iso",device=cdrom \
  --network network=pub,model=virtio,mac="${PUB_MAC}" \
  --network network=int,model=virtio,mac="${MGMT_MAC}" \
  --graphics none \
  --console pty,target_type=serial \
  --noautoconsole
```

Only set autostart after the domain is actually created.

```bash
sudo virsh dominfo "${VM}"
sudo virsh autostart "${VM}"
```

If the same kind of CPU error continues, the second alternative is to remove the `--cpu` line.

```bash
# Remove --cpu and use the libvirt/QEMU default.
sudo virt-install \
  --name "${VM}" \
  --memory 32768 \
  --vcpus 8 \
  --os-variant rocky9 \
  --import \
  ...
```

`host-passthrough` is useful for performance and feature exposure, but it ties the guest more tightly to a specific host CPU. If live migration or portability across hosts with different CPUs matters, prefer the default CPU model or review an explicit compatible CPU model.

## Revisit

- `--cpu` controls the CPU model and feature set visible to the VM.
- `--cpu host` can be interpreted through the `host-model` path depending on the environment.
- If `host-model` is unsupported on aarch64 KVM, VM creation fails before the domain exists.
- A later `virsh autostart` failure is a follow-up symptom of the failed domain creation.
- For an operational VM pinned to one host, `host-passthrough` is a practical first alternative.
- If portability matters more, removing `--cpu` and using the default model can be safer.
