# KUDA 라이브 타이머

관리자는 시간 설정 · 시작 · 일시정지 · 리셋을 하고, 이용자는 같은 시간을 보기만 하는 웹 타이머입니다.

## 가장 빠른 배포

프런트엔드는 이미 빌드되어 있습니다. Vercel 배포 시 별도 빌드나 패키지 설치가 필요 없습니다.

1. 이 폴더를 GitHub 저장소에 올리고 Vercel에서 Import 하세요. `public` 폴더만 올리면 API가 빠지므로 **api, server, public, package.json, vercel.json이 있는 전체 프로젝트 폴더**를 올려야 합니다.
2. Framework Preset은 **Other**로 선택합니다. `vercel.json`에 설정된 Output Directory `public`과 비어 있는 Install / Build Command를 사용합니다.
3. [Upstash](https://console.upstash.com/)에서 Redis 데이터베이스를 만드세요. 데이터베이스의 REST API 영역에서 HTTPS URL과 **쓰기 가능한 Token**을 복사합니다. Read-only Token은 사용할 수 없습니다.
4. Vercel 프로젝트 → Settings → Environment Variables에 아래 두 값을 넣습니다. Production에 적용하세요. Preview 배포도 시험한다면 Preview에도 적용합니다.

| 환경변수 | 값 |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Redis의 HTTPS REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Redis의 쓰기 가능한 REST Token |

5. Deploy 하세요. 이미 배포한 후 환경변수를 추가했다면 **Redeploy**합니다.
6. 배포 URL에서 **설정**으로 시간을 정하고 **적용**을 누릅니다. 생성된 관리자 화면의 **설정 → 이용자 링크 복사**로 보기 전용 링크를 전달합니다.

Vercel Marketplace에서 Upstash를 연결해 `KV_REST_API_URL`, `KV_REST_API_TOKEN`이 자동 추가된 경우도 지원합니다. `REDIS_URL`만 제공된 경우에는 Upstash 콘솔에서 REST URL/Token을 확인하고 위 표의 변수를 직접 설정하세요. 서버 환경변수에만 넣고 프런트엔드 코드에는 넣지 마세요.

터미널 배포를 선호하면, Vercel CLI가 설치된 컴퓨터에서 프로젝트 폴더를 열고 실행하세요.

```sh
vercel --prod
```

환경변수 설정 후 다시 배포해야 합니다. 공개 공유가 필요하면 Vercel 프로젝트의 Deployment Protection에서 **배포 URL에 대한 방문자 로그인 제한**도 확인하세요. 앱 자체 이용자 화면에는 로그인이 필요 없습니다.

## 이용 방법

- 이용자 화면에는 시간만 표시됩니다.
- 관리자 화면에는 시간 아래 `설정`, `시작`, `멈춤` 세 버튼만 표시됩니다.
- `설정`을 누르면 시·분·초 입력창이 열립니다. `적용`하면 해당 시간으로 돌아가고 멈춥니다.
- `시작`은 카운트다운을 시작하거나 멈춘 시점부터 재개합니다. `멈춤`은 남은 시간을 유지한 채 정지합니다.
- 설정창의 `이용자 링크 복사`로 보기 전용 링크를 공유할 수 있습니다.
- 모바일 세로·가로 화면에 맞춰 글자 크기가 자동 조정됩니다. 기본 화면은 스크롤되지 않습니다.
- 첫 화면에서 `시작`을 누르면 새 공유 타이머가 생성되고 시작됩니다. 먼저 `설정`에서 시간을 입력하고 `적용`하면 대기 상태의 새 타이머가 만들어집니다.
- 기존 관리자·이용자 링크는 그대로 사용할 수 있습니다. 관리자 링크의 `#key=...`를 포함한 원본을 보관하고 이용자에게는 보기 전용 링크만 전달하세요.
- 설정 범위: 1초 ~ 99시간 59분 59초. 00:00:00에서 멈추며 종료음은 없습니다.

## 동기화와 운영

서버에 종료 시각을 저장하므로 관리자 창을 닫아도 시간이 흐릅니다. 새로고침하거나 다른 기기로 접속해도 같은 상태를 읽습니다. 휴대폰/PC의 시계가 달라도 각 화면은 서버 기준 남은 시간과 `performance.now()`로 표시합니다.

상태는 약 1초 주기로 가져옵니다. 네트워크 상태에 따라 조작 반영에 지연이 있을 수 있습니다. 연결이 끊어지면 시간을 흐리게 표시하며, 진행 중인 화면은 마지막으로 받은 종료 시각을 기준으로 계속 표시합니다. 연결이 복구되면 최신 상태로 맞춥니다. 여러 관리자 창의 동시 변경은 원자적 비교·저장으로 충돌을 감지합니다.

장시간 열어두면 이용자 한 화면당 시간당 약 3,600번의 API/Redis 읽기가 발생합니다. Vercel과 Upstash의 사용량 및 선택한 요금제를 확인하세요. 타이머 데이터는 자동 만료시키지 않습니다. 공개 생성 API에는 IP 기준 시간당 30개 생성 제한이 있습니다. 관리자 링크 방식이므로 별도 계정/비밀번호 관리 기능은 없습니다.

## 로컬 실행과 수정

이미 빌드된 파일로 로컬 데모를 실행하려면 Node.js 22 이상에서:

```sh
npm run demo
```

`http://127.0.0.1:4173`에 접속하세요. 로컬 데모는 **서버 메모리만 사용**하며 종료 시 초기화됩니다. 공개 배포의 API에는 데모 저장소가 포함되지 않습니다.

실제 Redis를 연결한 로컬 실행은 `.env.example`을 참고해 환경변수를 설정한 다음:

```sh
node --env-file=.env.local scripts/dev.mjs
```

화면 소스를 수정한 경우만 패키지를 설치하고 다시 빌드합니다.

```sh
npm install
npm run build
npm test
```

- `src/timer-app.tsx`: 관리자·이용자·생성 화면
- `public/`: 빌드된 배포용 화면과 스타일
- `api/`: Vercel Node 함수
- `server/`: 타이머 상태 처리, 권한 검증, Redis 연결
- `vercel.json`: 배포 및 URL 라우팅

## 검증 범위

로컬 자동 검증: 시작·정지·재개·리셋·시간 설정·종료 후 재시작, 권한 없는 조작 차단, 비밀 키 비노출, 동시 변경 충돌, 잘못된 시간 입력, Redis REST 요청 형식.

이 작업 환경에서 외부 배포 서버 연결과 로컬 서버 포트 열기가 제한되어 **실제 Vercel/Upstash 연결 및 브라우저 검증은 수행하지 못했습니다**. 배포 후 휴대폰에서 이용자 링크를 열고 PC 관리자 화면에서 시작·정지·리셋을 눌러 두 화면이 맞는지 확인하세요.

참고: [Vercel Node 함수](https://vercel.com/docs/functions/runtimes/node-js), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).
