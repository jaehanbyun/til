---
title: "SSH pipelining은 Linux 원격 실행 비용을 줄인다"
description: "Ansible이 Linux 원격 호스트에서 모듈을 실행할 때 임시 파일 전송과 sudo TTY 조건이 왜 성능에 영향을 주는지 정리."
date: "2026-07-09"
tags: [linux, openstack, kolla-ansible, ansible, ssh, sudo, pipelining, performance]
source: "https://docs.openstack.org/kolla-ansible/2025.1/user/ansible-tuning.html"
---

## 핵심 아이디어

SSH pipelining은 Ansible이 Linux 원격 호스트에서 모듈을 실행할 때 원격 임시 파일을 만들고 전송하는 비용을 줄이는 옵션이다.

핵심은 "SSH 연결 하나를 오래 쓴다"보다 "모듈 코드를 원격 파일로 복사하지 않고 SSH 표준 입력으로 넘겨 실행한다"에 가깝다. SSH 연결 재사용은 `ControlPersist` 같은 SSH 설정의 영역이고, pipelining은 Ansible 모듈이 Linux 호스트 위에서 준비되고 실행되는 경로를 바꾼다.

## Linux 관점의 기본 실행 경로

Ansible 모듈은 대부분 원격 Linux 호스트에서 실행되는 작은 프로그램이다. Pipelining이 꺼져 있으면 Ansible은 일반적인 모듈 작업마다 원격 호스트의 임시 디렉터리에 실행 파일을 준비한다.

```text
control node
  -> SSH 접속
  -> remote_tmp 아래 임시 디렉터리 생성
  -> SFTP/SCP 등으로 모듈 파일 전송
  -> 실행 권한과 소유권 조정
  -> 원격 Python 또는 shell로 모듈 실행
  -> 임시 파일 삭제
```

작업 하나만 보면 작은 차이지만, 호스트 수와 task 수가 늘어나면 이 파일 전송, 권한 조정, 정리 과정이 전체 실행 시간에 누적된다. 특히 원격 파일시스템이 느리거나 SSH 왕복 지연이 큰 환경에서는 체감이 커진다.

## 켜졌을 때 바뀌는 것

Pipelining을 켜면 Ansible은 지원되는 연결 플러그인에서 모듈을 실제 파일로 전송하지 않고 원격 인터프리터에 파이프로 전달한다.

```ini
[ssh_connection]
pipelining = True
```

또는 Ansible 공통 설정으로는 다음 위치에서도 지정할 수 있다.

```ini
[defaults]
pipelining = True

[connection]
pipelining = True
```

실행 경로에서 모듈 파일 전송, 임시 파일 생성, 정리 단계가 줄어드므로 네트워크 왕복과 원격 파일시스템 작업이 감소한다. 단, `copy`, `template`, `fetch`처럼 작업 자체가 파일 payload를 다루는 경우에는 그 payload 전송까지 사라지는 것은 아니다.

## sudo와 requiretty가 중요한 이유

Pipelining은 `become` 또는 `sudo`와 함께 쓸 때 sudoers의 `requiretty` 설정과 충돌할 수 있다. `requiretty`는 sudo 명령이 TTY를 요구하게 만드는 설정인데, pipelining은 표준 입력으로 모듈을 흘려보내는 실행 경로를 쓰므로 이 조건과 맞지 않는다.

관리 대상 호스트에서 다음 형태의 설정이 남아 있으면 pipelining을 켜기 전에 제거하거나 사용자별로 비활성화해야 한다.

```sudoers
Defaults requiretty
```

대부분의 최신 Linux 배포판에서는 기본값으로 `requiretty`가 꺼져 있지만, 오래된 RHEL 계열 환경이나 보안 베이스라인을 강하게 적용한 이미지에서는 직접 확인하는 편이 안전하다.

즉, 이 옵션은 단순한 Ansible 성능 옵션이 아니라 Linux의 SSH, 표준 입력, 원격 임시 디렉터리, sudo 정책이 만나는 지점에 있다.

## 적용 사례: Kolla-Ansible

Kolla-Ansible 배포는 많은 Linux 노드에 대해 많은 Ansible task를 반복 실행한다. 컨트롤 노드와 원격 노드 사이의 모듈 준비 왕복이 task마다 붙으면 OpenStack 배포 전체 시간이 길어진다.

그래서 Kolla-Ansible의 Ansible tuning 문서는 `ansible.cfg`의 `[ssh_connection]` 섹션에서 `pipelining = True`를 켜는 방법을 성능 튜닝 항목으로 제시한다. Kolla-Ansible에서는 이 옵션을 단독으로 보기보다 `forks`, fact caching, fact filtering 같은 다른 Ansible 튜닝과 함께 본다.

효과가 큰 구간은 많은 호스트에 반복되는 작은 모듈 작업이다. 반대로 이미지, 설정 파일, 템플릿처럼 실제 파일 payload를 전송해야 하는 작업에서는 pipelining만으로 전송량이 사라지지 않는다.

## 확인 패턴

현재 Ansible 설정이 어떻게 해석되는지는 컨트롤 노드에서 확인한다.

```bash
ansible-config dump --only-changed | grep -i pipelining
```

임시로만 켜서 비교하고 싶다면 환경 변수로 실행 범위를 제한할 수 있다.

```bash
ANSIBLE_PIPELINING=True ansible-playbook -i inventory playbook.yml
```

SSH 연결 플러그인 기준으로는 `ANSIBLE_SSH_PIPELINING` 또는 inventory 변수 `ansible_ssh_pipelining`도 사용할 수 있다.

## 다시 볼 포인트

- SSH pipelining은 Linux 원격 호스트에 모듈 파일을 준비하는 비용을 줄이는 옵션이다.
- SSH 연결 재사용과 같은 말은 아니며, 모듈 전달 및 실행 경로를 바꾸는 설정이다.
- `requiretty`가 켜진 sudo 환경에서는 `become` 작업과 충돌할 수 있다.
- Kolla-Ansible은 이 Linux 원격 실행 비용이 대규모 OpenStack 배포 시간으로 커지는 적용 사례다.
- 파일 전송 작업의 payload 자체를 없애는 옵션은 아니며, 모듈 실행 준비 비용을 줄이는 옵션이다.

## 출처

- [Kolla-Ansible 2025.1 Ansible tuning](https://docs.openstack.org/kolla-ansible/2025.1/user/ansible-tuning.html)
- [Ansible configuration setting: ANSIBLE_PIPELINING](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#ansible-pipelining)
- [ansible.builtin.ssh connection pipelining](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html)
