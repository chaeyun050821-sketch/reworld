export type User = {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
};

type StoredUser = User & { passwordHash: string };

const USERS_KEY = "reworld_users";
const SESSION_KEY = "reworld_session";

function hashPassword(password: string): string {
  let h = 0;
  for (let i = 0; i < password.length; i++) {
    h = (Math.imul(31, h) + password.charCodeAt(i)) | 0;
  }
  return `h${h}`;
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setSession(user: User) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export function signUp(email: string, nickname: string, password: string): AuthResult {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedNick = nickname.trim();

  if (!trimmedEmail || !trimmedNick || !password) {
    return { ok: false, error: "모든 항목을 입력해 주세요." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false, error: "올바른 이메일 형식이 아니에요." };
  }
  if (trimmedNick.length < 2 || trimmedNick.length > 12) {
    return { ok: false, error: "닉네임은 2~12자로 입력해 주세요." };
  }
  if (password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 해요." };
  }

  const users = loadUsers();
  if (users.some((u) => u.email === trimmedEmail)) {
    return { ok: false, error: "이미 가입된 이메일이에요." };
  }
  if (users.some((u) => u.nickname === trimmedNick)) {
    return { ok: false, error: "이미 사용 중인 닉네임이에요." };
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    email: trimmedEmail,
    nickname: trimmedNick,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
  };

  saveUsers([...users, user]);
  const { passwordHash: _, ...publicUser } = user;
  setSession(publicUser);
  return { ok: true, user: publicUser };
}

export function signIn(email: string, password: string): AuthResult {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !password) {
    return { ok: false, error: "이메일과 비밀번호를 입력해 주세요." };
  }

  const users = loadUsers();
  const found = users.find((u) => u.email === trimmedEmail);

  if (!found || found.passwordHash !== hashPassword(password)) {
    return { ok: false, error: "이메일 또는 비밀번호가 맞지 않아요." };
  }

  const { passwordHash: _, ...publicUser } = found;
  setSession(publicUser);
  return { ok: true, user: publicUser };
}

export function signOut() {
  clearSession();
}

export function updateUserNickname(userId: string, nickname: string): User | null {
  const trimmed = nickname.trim();
  if (!trimmed) return null;

  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;

  if (users.some((u) => u.id !== userId && u.nickname === trimmed)) {
    return null;
  }

  users[idx] = { ...users[idx], nickname: trimmed };
  saveUsers(users);
  const { passwordHash: _, ...publicUser } = users[idx];
  setSession(publicUser);
  return publicUser;
}
