# Kube Log Helper

Kubernetes 컨테이너 다중 로그 뷰어 - Electron 기반 데스크톱 애플리케이션

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

## 주요 기능

- **다중 로그 뷰어**: 여러 Pod/Container의 로그를 동시에 모니터링
- **분할 화면**: 단일 뷰 또는 2분할 모드로 로그 확인
- **실시간 스트리밍**: Follow 모드로 실시간 로그 추적
- **고급 필터링**: Grep 파이프라인 문법 지원 (`grep "패턴" | grep -v "제외"`)
- **워크로드 지원**: Deployment, StatefulSet, DaemonSet, Label Selector
- **다크/라이트 테마**: 사용자 환경에 맞는 테마 선택
- **SSH 터널링**: SSH를 통한 원격 클러스터 접속 지원

## 기술 스택

### Frontend
- **React 19** - UI 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS v4** - 스타일링
- **Zustand** - 상태 관리

### Backend
- **Electron 39** - 데스크톱 애플리케이션
- **@kubernetes/client-node** - Kubernetes API 클라이언트
- **ssh2** - SSH 터널링

### Build Tools
- **Vite 7** - 빌드 도구
- **electron-builder** - 애플리케이션 패키징

## 설치 및 실행

### 개발 환경 요구사항

- Node.js 18 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/kube-log-helper.git
cd kube-log-helper

# 의존성 설치
npm install
```

### 개발 모드 실행

```bash
# Web 개발 서버만 실행
npm run dev

# Electron 개발 모드 실행
npm run dev:electron
```

### 프로덕션 빌드

```bash
# Web 빌드
npm run build

# Electron 앱 빌드
npm run build:electron
```

빌드된 앱은 `release/` 폴더에 생성됩니다:
- macOS: `.dmg`, `.zip`
- Windows: `.exe` (NSIS), `.zip`
- Linux: `.AppImage`, `.deb`

## 사용 방법

### 1. 연결 추가

좌상단 **"+ 연결 추가"** 버튼을 클릭하여 Kubernetes 클러스터 연결을 추가합니다.

**지원하는 연결 방식:**
- **직접 연결**: kubeconfig 파일 사용
- **SSH 터널**: SSH를 통한 원격 클러스터 접속

### 2. 로그 조회

1. 연결 선택
2. Namespace 선택
3. Pod 또는 Workload 선택
4. Container 선택
5. **"조회"** 버튼 클릭

### 3. 고급 기능

#### Grep 필터링
```bash
# 특정 패턴만 표시
grep "ERROR"

# 여러 조건 조합
grep "ERROR" | grep -v "ignored"

# 복잡한 필터링
grep "INFO" | grep "database" | grep -v "cache"
```

#### 워크로드 셀렉터
- Deployment, StatefulSet, DaemonSet의 모든 Pod를 한 번에 조회
- 각 Pod를 개별 탭으로 확인

#### 화면 분할
- **단일**: 하나의 로그 뷰어
- **2분할**: 두 개의 로그를 좌우로 비교

## 프로젝트 구조

```
kube-log-helper/
├── electron/              # Electron main process
│   └── main.ts           # Main process 진입점
├── src/
│   ├── components/       # React 컴포넌트
│   │   ├── layout/      # Header 등 레이아웃
│   │   ├── selector/    # Connection, Namespace, Pod 선택
│   │   ├── log/         # LogViewer, LogToolbar
│   │   └── view/        # SplitView, LogPanel
│   ├── stores/          # Zustand 상태 관리
│   ├── types/           # TypeScript 타입 정의
│   └── index.css        # 글로벌 스타일
├── dist/                # Vite 빌드 출력
├── dist-electron/       # Electron 빌드 출력
└── release/             # 최종 패키징된 앱
```

## 환경 설정

### Kubeconfig

기본적으로 `~/.kube/config` 파일을 사용합니다. 다른 위치의 kubeconfig를 사용하려면 연결 추가 시 경로를 지정하세요.

### SSH 설정

SSH 연결 시 `~/.ssh/config` 파일의 설정을 사용할 수 있습니다.

## 라이선스

MIT

## 기여

이슈 리포트 및 Pull Request를 환영합니다!

## 문제 해결

### 스크롤이 작동하지 않는 경우
- 최신 버전으로 업데이트하세요
- Electron 앱을 다시 빌드하세요: `npm run build:electron`

### SSH 연결 오류
- SSH 키 권한 확인: `chmod 600 ~/.ssh/id_rsa`
- SSH 설정 파일 확인: `~/.ssh/config`

### 로그가 표시되지 않는 경우
- Kubernetes 클러스터 접속 확인
- Pod의 상태가 Running인지 확인
- Container 이름이 정확한지 확인

## 개발자

프로젝트 관리 및 문의: [GitHub Issues](https://github.com/yourusername/kube-log-helper/issues)
