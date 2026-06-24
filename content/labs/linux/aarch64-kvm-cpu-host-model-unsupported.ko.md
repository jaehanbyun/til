---
title: "aarch64 KVM에서는 --cpu host가 host-model 오류로 실패할 수 있다"
description: "virt-install의 --cpu 옵션이 게스트에 노출할 CPU 모델을 정하고, aarch64 환경에서 host-model이 막힐 때 우회하는 방법."
date: "2026-06-24"
tags: [linux, kvm, libvirt, virt-install, aarch64, cpu]
---

## 한 줄 결론

`virt-install --cpu`는 VM 안에 어떤 CPU 모델과 feature를 보여줄지 정하는 옵션이다. aarch64 KVM 환경에서 `--cpu host`가 내부적으로 `host-model`처럼 처리되면 hypervisor가 이를 지원하지 않아 VM 생성이 실패할 수 있다.

이때 같은 host에 고정해서 돌릴 VM이라면 먼저 `--cpu host-passthrough`를 시도하고, 그래도 실패하면 `--cpu` 옵션을 제거해 libvirt/QEMU 기본값으로 생성한다.

## 언제 마주치는가

cloud image를 가져와 `virt-install --import`로 VM을 만들 때 CPU 옵션을 명시하는 경우에 마주친다. 특히 x86_64에서 쓰던 VM 생성 스크립트를 aarch64 서버로 옮겼을 때 같은 옵션이 그대로 동작하지 않을 수 있다.

대표적인 실패 흐름은 다음과 같다.

```text
WARNING  CPU model=host is deprecated, use model=host-model
ERROR    unsupported configuration: CPU mode 'host-model' for aarch64 kvm domain on aarch64 host is not supported by hypervisor
Domain installation does not appear to have been successful.
error: failed to get domain 'monitoring-01'
```

마지막의 `failed to get domain`은 별도 원인이 아니라, 앞에서 domain 생성이 실패했기 때문에 `virsh autostart`가 대상 VM을 찾지 못해 이어서 발생한 결과다.

## 관찰 포인트

에러를 볼 때는 `virt-install` 명령 자체보다 libvirt가 실제로 어떤 CPU mode를 해석했는지 먼저 본다.

```bash
sudo virt-install \
  --name "${VM}" \
  --cpu host \
  --import \
  ...
```

이 명령에서 사용자는 `host`를 지정했지만, 경고와 에러는 `host-model`을 말한다. 즉 문제는 VM 이름, disk, network, cloud-init seed ISO가 아니라 CPU mode 해석 단계에 있다.

## 동작 원리

`--cpu`는 게스트 VM에 노출할 CPU 모델과 명령어 feature set을 정한다. VM 내부 OS는 이 가상 CPU 정보를 기준으로 부팅하고, 커널과 유저 공간 프로그램은 사용 가능한 CPU feature를 판단한다.

자주 보이는 값은 다음처럼 구분할 수 있다.

| 옵션 | 의미 |
| --- | --- |
| `--cpu host` | host CPU와 가까운 모델을 자동 선택하려고 한다. 환경에 따라 `host-model` 계열로 처리될 수 있다. |
| `--cpu host-model` | libvirt가 host와 유사한 호환 CPU 모델을 guest에 노출하려고 한다. |
| `--cpu host-passthrough` | host CPU feature를 최대한 그대로 guest에 전달한다. |
| 옵션 없음 | libvirt/QEMU의 기본 CPU 모델을 사용한다. |

이번 실패의 핵심은 aarch64 KVM 환경에서 `host-model` mode가 지원되지 않았다는 점이다. 그래서 `--cpu host`가 x86_64에서 문제 없던 습관이라도 aarch64에서는 그대로 재사용하면 안 된다.

## 확인/수정 패턴

첫 번째 대안은 `host-passthrough`로 바꾸는 것이다.

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

생성이 성공한 뒤에만 autostart를 설정한다.

```bash
sudo virsh dominfo "${VM}"
sudo virsh autostart "${VM}"
```

같은 계열의 CPU 오류가 계속 나면 두 번째 대안은 `--cpu` 라인을 제거하는 것이다.

```bash
# --cpu 옵션을 제거하고 libvirt/QEMU 기본값 사용
sudo virt-install \
  --name "${VM}" \
  --memory 32768 \
  --vcpus 8 \
  --os-variant rocky9 \
  --import \
  ...
```

`host-passthrough`는 성능과 feature 노출 측면에서 유리하지만, guest가 특정 host CPU에 더 강하게 묶인다. live migration이나 서로 다른 CPU host 간 이동성을 중요하게 보는 VM이라면 기본 CPU 모델이나 명시적 호환 CPU 모델을 검토해야 한다.

## 다시 볼 포인트

- `--cpu`는 VM에 보이는 CPU 모델과 feature set을 정한다.
- `--cpu host`는 환경에 따라 `host-model` 계열로 해석될 수 있다.
- aarch64 KVM에서 `host-model`이 지원되지 않으면 VM 생성 전 단계에서 실패한다.
- domain 생성 실패 후의 `virsh autostart` 실패는 후속 증상일 뿐이다.
- 단일 host에 고정된 운영 VM이면 `host-passthrough`가 현실적인 첫 대안이다.
- portability가 더 중요하면 `--cpu`를 빼고 기본값으로 생성하는 쪽이 더 안전할 수 있다.
