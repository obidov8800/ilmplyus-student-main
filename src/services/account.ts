/**
 * YAGONA HISOB (account) SERVISI — sarlavha (Header) va profil sahifalari shu yerdan ma'lumot oladi.
 *
 * Nega: ilgari har sahifa `/me` ni o'zicha so'rardi va javob shakli hisob turiga qarab farq qiladi:
 *   - talaba (shu ilova)                       → `{ student: {…}, permissions }`  (yoki talabaning o'zi to'g'ridan-to'g'ri)
 *   - o'z login/paroli bilan kirgan xodim      → `{ type: 'employee', employee: {…}, permissions, branch_ids }`
 *   - talaba                                   → `{ student: {…}, permissions }`
 * Bu servis uchalasini bitta `Account` shakliga keltiradi (`kind` — hisob turi), `/me` esa BITTA so'rov bilan
 * (`['me']` kaliti) olinadi va hamma ishlatuvchi o'rtasida bo'lishiladi — profil uchun alohida so'rov kerak emas.
 *
 * Yangilanish siyosati (backendga yuk tushmasligi uchun TINMASDAN so'rov YO'Q):
 *   - ilova ochilganda / sahifa yangilanganda bir marta (`useMeSync`);
 *   - oynaga qaytganda faqat ma'lumot `ME_STALE_MS` (5 daqiqa)dan eski bo'lsa;
 *   - backend 403 (ruxsat yo'q) qaytarsa — ruxsat o'zgargan bo'lishi mumkin: `api/api.ts` shu paytda bir marta qayta so'raydi.
 *
 * Ism: `account.fullName` (to'liq), `account.shortName` (familiya to'liq, qolganlari bosh harf, «o'g'li/qizi» yo'q), `formatName(mode)` — istalgan rejimda.
 */
import { useCallback, useMemo } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { API } from '../api/api';
import useAuthStore from '../store/useAuthStore';
import { formatPersonName, type NameFormatOptions, type NameMode } from '../utils/initials';

export type AccountKind = 'user' | 'employee' | 'student';

/** Hisobning yagona (normallashtirilgan) ko'rinishi. Turga xos maydonlar kerak bo'lsa — `raw` (serverdagi obyekt). */
export interface Account {
  kind: AccountKind;
  id: number;
  /** F.I.Sh — to'liq. */
  fullName: string;
  /** Sarlavhaga sig'adigan ko'rinish (`auto`: uzun bo'lsa familiya + bosh harflar). */
  shortName: string;
  username: string;
  phone: string;
  photoUrl: string | null;
  /** Sarlavhadagi rol yozuvi (birinchi rol). */
  roleName: string;
  roleNames: string[];
  branchName: string;
  permissions: string[];
  /** Serverdagi asl obyekt (`user` / `employee` / `student`) — profil sahifasi o'z maydonlarini shundan oladi. */
  raw: Record<string, unknown>;
}

/** `/me` hali kelmagan paytda brauzerda saqlangan hisob shu turda deb olinadi (Student ilovasida — `'student'`). */
const FALLBACK_KIND: AccountKind = 'student';

export const ME_QUERY_KEY = ['me'] as const;
/** `/me` shuncha vaqt yangi hisoblanadi — shundan keyingina (oynaga qaytganda/sahifa ochilganda) qayta so'raladi. */
export const ME_STALE_MS = 5 * 60 * 1000;

type Dict = Record<string, unknown>;

const rec = (value: unknown): Dict => (value && typeof value === 'object' ? (value as Dict) : {});
const str = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
const firstOf = (...values: unknown[]): string => values.map(str).find(Boolean) ?? '';
const joinName = (...parts: unknown[]): string => parts.map(str).filter(Boolean).join(' ');

const namesOf = (list: unknown): string[] =>
  Array.isArray(list) ? list.map((item) => str(typeof item === 'string' ? item : rec(item).name)).filter(Boolean) : [];

/**
 * `/me` javobini (yoki brauzerda saqlangan hisobni) `Account` ga keltiradi. `/me` hali kelmagan bo'lsa,
 * login javobidan saqlangan `stored` ishlatiladi — sarlavha darhol to'ladi.
 */
export function normalizeAccount(me: unknown, stored?: unknown, nameOptions?: NameFormatOptions): Account | null {
  const m = rec(me);
  const s = rec(stored);

  let kind: AccountKind;
  let entity: Dict;
  if (m.student) {
    kind = 'student';
    entity = rec(m.student);
  } else if (m.type === 'employee' || (m.employee && !m.user)) {
    kind = 'employee';
    entity = rec(m.employee);
  } else if (m.user) {
    kind = 'user';
    entity = rec(m.user);
  } else if (Object.keys(s).length > 0) {
    kind = s.account_type === 'employee' ? 'employee' : FALLBACK_KIND;
    entity = s;
  } else {
    return null;
  }

  const roleNames = namesOf(entity.roles);
  if (roleNames.length === 0 && entity.role) roleNames.push(str(typeof entity.role === 'string' ? entity.role : rec(entity.role).name));

  const fullName = firstOf(
    entity.full_name,
    joinName(entity.last_name, entity.first_name, entity.middle_name ?? entity.father_name),
    entity.name,
    entity.username,
  );

  const branches = Array.isArray(entity.branches) ? entity.branches : [];
  const branch = rec(entity.branch ?? branches[0]);

  const permissions = Array.isArray(m.permissions)
    ? (m.permissions as unknown[]).map(str).filter(Boolean)
    : rolePermissions(entity.roles ?? entity.role);

  return {
    kind,
    id: Number(entity.id) || 0,
    fullName,
    shortName: formatPersonName(fullName, { mode: 'short', ...nameOptions }),
    username: str(entity.username),
    phone: str(entity.phone),
    photoUrl: firstOf(entity.photo_url, entity.image_url, entity.photo, entity.image) || null,
    roleName: roleNames[0] ?? (kind === 'student' ? 'Student' : ''),
    roleNames,
    branchName: firstOf(branch.name_uz, branch.name, branch.name_ru),
    permissions,
    raw: entity,
  };
}

/** Rol(lar)dagi ruxsat nomlari: `roles: [...]` (xodim) yoki bitta `role: {...}` (talaba). */
export function rolePermissions(roles: unknown): string[] {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : [];
  const all = list.flatMap((role) => (Array.isArray(rec(role).permissions) ? (rec(role).permissions as unknown[]) : []));
  return Array.from(new Set(all.map((p) => str(typeof p === 'string' ? p : rec(p).name)).filter(Boolean)));
}

/* ─────────────── /me — bitta so'rov, store bilan sinxron ─────────────── */

/** `/me` talabani `{ student: {…} }` ichida yoki to'g'ridan-to'g'ri qaytaradi; `id` yo'q bo'lsa — talaba emas. */
export const studentOf = (data: unknown): Dict | null => {
  const entity = rec(rec(data).student ?? data);
  return entity.id ? entity : null;
};

/**
 * `/me` ni so'raydi va store'ni (talaba, ruxsatlar) yangilaydi. Store queryFn ichida yangilanadi (effectda emas) —
 * Header, profil, davomat va kurslar sahifasi BITTA shu so'rovdan foydalanadi (ilgari uch xil kalit ostida uch marta so'ralardi).
 */
export const fetchMe = async (): Promise<unknown> => {
  const { data } = await API.get('/me');
  const student = studentOf(data);
  if (!student) return null;

  const state = useAuthStore.getState();
  const permissions = Array.isArray(rec(data).permissions)
    ? (rec(data).permissions as unknown[]).map(str).filter(Boolean)
    : rolePermissions(student.role);
  if (permissions.length) state.setPermissions(permissions);
  state.setUser({
    ...(state.user ?? {}),
    id: Number(student.id),
    name: firstOf(student.full_name, joinName(student.last_name, student.first_name, student.father_name)),
    role: str(rec(student.role).name) || 'student',
  });
  return data;
};

/**
 * `/me` so'rovi sozlamasi — `useMeSync` (ProtectedRoute) va `useAccount` (Header, profil) BIR XIL ishlatadi, shuning
 * uchun bitta kalit ostida bitta so'rov ketadi. Faqat eskirganda (ME_STALE_MS) qayta so'raladi; `refetchInterval` YO'Q.
 */
export const meQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled,
    staleTime: ME_STALE_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

/**
 * Joriy hisob (sarlavha, profil). `/me` so'rovi BITTA va hamma ishlatuvchi o'rtasida bo'lishiladi; `/me` kelguncha
 * brauzerda saqlangan hisobdan to'ladi. Qo'shimcha `/me` so'rovi YUBORMAYDI (yangilash siyosati — fayl boshida).
 */
export function useAccount(nameOptions?: NameFormatOptions) {
  const isAuth = useAuthStore((state) => state.isAuth);
  const stored = useAuthStore((state) => state.user);

  const query = useQuery(meQueryOptions(isAuth));

  const mode = nameOptions?.mode;
  const account = useMemo(
    () => normalizeAccount(query.data, stored, mode ? { mode } : undefined),
    [query.data, stored, mode],
  );

  /** Ism-familiyani tanlangan rejimda qaytaradi: `auto`/`short` (familiya to'liq, qolganlari bosh harf, «o'g'li/qizi» yo'q), `full` (to'liq). */
  const formatName = useCallback(
    (mode: NameMode = 'auto', options?: Omit<NameFormatOptions, 'mode'>) =>
      formatPersonName(account?.fullName, { ...options, mode }),
    [account?.fullName],
  );

  return { account, formatName, isLoading: query.isLoading, isFetching: query.isFetching, isError: query.isError };
}

/**
 * Talabaning serverdagi yozuvi (`student`) — profil, davomat, kurslar sahifalari uchun. Alohida so'rov yo'q: Header bilan
 * BIR XIL `['me']` so'rovi (`select` faqat ko'rinishni tanlaydi).
 */
export function useStudentMe<T = Dict>() {
  const isAuth = useAuthStore((state) => state.isAuth);
  const query = useQuery({ ...meQueryOptions(isAuth), select: (data) => studentOf(data) as T | null });
  return { data: query.data ?? undefined, isLoading: query.isLoading };
}
