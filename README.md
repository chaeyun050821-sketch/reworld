# Re:world (diary-cover-design)

Figma 기반 다이어리/미니룸 웹앱. Supabase 인증·친구 추가 지원.

## 로컬 실행

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
# .env에 Supabase URL / anon key 입력
npm run dev
```

## 팀 테스트용 배포 (Vercel 권장)

무료로 공개 URL을 만들어 팀원이 바로 접속·회원가입·친구 추가를 테스트할 수 있습니다.

### 1. GitHub에 코드 올리기

이미 `origin`이 연결되어 있으면 변경사항을 push합니다.

```bash
git add .
git commit -m "배포 설정 추가"
git push origin main
```

### 2. Vercel에 프로젝트 연결

1. [vercel.com](https://vercel.com) 로그인 (GitHub 계정 연동)
2. **Add New → Project**
3. `reworld` 저장소 Import
4. Framework: **Vite** (자동 감지)
5. **Environment Variables** 추가:

| 이름 | 값 |
|------|-----|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |

6. **Deploy** 클릭 → 몇 분 후 `https://프로젝트명.vercel.app` URL 생성

이후 `main` 브랜치에 push할 때마다 자동 재배포됩니다.

배포가 끝나면 **Settings → Environment Variables**에 아래도 추가하세요:

| 이름 | 값 |
|------|-----|
| `VITE_APP_URL` | `https://프로젝트명.vercel.app` (끝에 `/` 없이) |

> 코드를 수정하고 GitHub `main`에 push하면 Vercel이 자동으로 다시 빌드·배포합니다. 별도 작업 없이 URL은 그대로 최신 코드가 반영됩니다.

### 3. Supabase 인증 URL 설정 (필수)

배포 URL이 생기면 Supabase Dashboard에서:

**Authentication → URL Configuration**

- **Site URL**: `https://프로젝트명.vercel.app`
- **Redirect URLs**에 추가:
  - `https://프로젝트명.vercel.app/**`
  - `http://localhost:5173/**` (로컬 개발용)

### 4. 소셜 로그인 (Google / GitHub)

앱 로그인 화면에 Google·GitHub 버튼이 있습니다. Supabase에서 Provider를 켜야 동작합니다.

**Authentication → Providers**

1. **Google** (또는 **GitHub**) Enable
2. 각 Provider 개발자 콘솔에서 OAuth Client ID / Secret 발급
   - Google: [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 클라이언트
   - GitHub: Settings → Developer settings → OAuth Apps
3. **Authorized redirect URI** (Google/GitHub 콘솔에 등록):

```
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

(`YOUR-PROJECT-REF`는 Supabase Project Settings → API의 URL 중간 부분)

4. Supabase Provider 설정에 Client ID / Secret 입력 후 Save
5. Supabase **Redirect URLs**에 배포 URL이 들어 있는지 다시 확인

로컬 테스트 시에도 `http://localhost:5173/**`가 Redirect URLs에 있어야 합니다.

> 카카오 로그인은 Supabase 기본 Provider에 없어 별도 커스텀 OAuth 설정이 필요합니다. 우선 Google을 권장합니다.

### 5. DB 설정 (친구 검색용)

Supabase **SQL Editor**에서 한 번 실행:

- `supabase/schema.sql` (최초 1회)
- `supabase/fix-profiles-rls.sql` (친구 닉네임 검색용)

### 6. 팀 테스트 팁

- **Authentication → Providers → Email**에서 개발 중에는 **Confirm email** 끄기 (가입 즉시 로그인)
- 팀원에게 배포 URL + 테스트 계정 안내 또는 각자 회원가입
- 친구 추가: 홈 → 이웃 → `+` → 닉네임 검색

## Netlify로 배포 (대안)

1. [netlify.com](https://netlify.com) → Import from Git
2. Build command: `npm run build`, Publish directory: `dist`
3. 동일하게 `VITE_SUPABASE_*` 환경 변수 설정
4. Supabase Site URL / Redirect URLs를 Netlify 도메인으로 변경

`netlify.toml`이 포함되어 있어 설정은 대부분 자동입니다.

## 환경 변수

`.env.example` 참고:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=https://your-app.vercel.app
```

> `VITE_` 접두사가 붙은 값만 빌드 시 앱에 포함됩니다. Vercel/Netlify 대시보드에도 동일한 이름으로 등록하세요.

## 로컬 프로덕션 미리보기

```bash
npm run build
npm run preview
```

## Capacitor 모바일 앱 (Android / iOS)

웹앱을 그대로 감싼 **네이티브 앱**입니다. Supabase 서버는 변경 없이 동일하게 사용합니다.

### 사전 준비

1. `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정 (빌드 시 앱에 포함됨)
2. **Android**: [Android Studio](https://developer.android.com/studio) 설치
3. **iOS** (Mac만): Xcode 설치

### 빌드 & 실행

```bash
# 웹 빌드 + 네이티브 프로젝트 동기화
npm run cap:sync

# Android Studio 열기 → Run ▶
npm run cap:android

# Mac에서 Xcode 열기
npm run cap:ios
```

USB로 연결한 기기 또는 에뮬레이터에서 바로 실행할 수 있습니다.

```bash
# CLI로 Android 실행 (Android Studio/ SDK 필요)
npm run cap:run:android
```

### 코드 수정 후

웹 코드를 바꿀 때마다:

```bash
npm run cap:sync
```

그다음 Android Studio / Xcode에서 다시 Run.

### 앱 정보

| 항목 | 값 |
|------|-----|
| App ID | `com.reworld.app` |
| App Name | Re:world |
| 네이티브 폴더 | `android/`, `ios/` |

### Supabase (앱용)

- Email 로그인: 추가 설정 없이 동작
- OAuth 사용 시: Supabase Redirect URLs에 `com.reworld.app://**` 추가

### 개발 팁 (Live Reload)

로컬 dev 서버를 폰에서 바로 보려면 `capacitor.config.json`에 임시로 추가:

```json
"server": {
  "url": "http://YOUR_PC_IP:5173",
  "cleartext": true
}
```

`npm run dev` 실행 후 `npx cap sync` → 앱 재실행. **배포 전에는 `server.url` 제거**하세요.
