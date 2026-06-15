import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove,
  type FieldValue,
} from 'firebase/firestore';
import { db } from './config';
import type { UserProfile, UserRole } from './authService';
import type { FormatPreset } from '../../types/formatPreset';

export type ContentType = 'screenplay' | 'novel';

export interface FirestoreScript {
  id: string;
  ownerId: string;
  /**
   * Document mode. Pre-migration documents have no value and are treated as
   * 'screenplay' on read (see `resolveScriptContentType`). Immutable after creation.
   */
  contentType?: ContentType;
  title: string;
  authorName: string;
  synopsis: string;
  content: string;
  characterText: string;
  characters: Array<{
    id: string;
    name: string;
    age?: string;
    traits?: string;
    background?: string;
  }>;
  settings: {
    lineLength: number;
    linesPerPage?: number;
    pageCount: number;
  };
  synopsisSettings?: {
    lineLength: number;
    linesPerPage?: number;
    pageCount: number;
  };
  characterSettings?: {
    lineLength: number;
    linesPerPage?: number;
    pageCount: number;
  };
  contentCommentary?: { director: unknown[]; scriptdoctor: unknown[]; proofreader: unknown[] };
  synopsisCommentary?: { story: unknown[]; producer: unknown[]; proofreader: unknown[] };
  discussionMessages?: unknown[];
  createdAt?: FieldValue | Date;
  updatedAt?: FieldValue | Date;
}

/**
 * Normalize a possibly-missing contentType from Firestore into a concrete value.
 * Pre-migration documents have no `contentType` field and are treated as 'screenplay'.
 */
export function resolveScriptContentType(value: ContentType | undefined | null): ContentType {
  return value === 'novel' ? 'novel' : 'screenplay';
}

/**
 * Create a new script document in Firestore.
 */
export async function createScript(
  ownerId: string,
  data: {
    title: string;
    authorName: string;
    settings: { lineLength: number; pageCount: number };
    contentType?: ContentType;
  },
): Promise<string> {
  const docRef = doc(collection(db, 'scripts'));
  const contentType = resolveScriptContentType(data.contentType);
  const newScript: Omit<FirestoreScript, 'id'> = {
    ownerId,
    contentType,
    title: data.title || (contentType === 'novel' ? '無題の小説' : '無題の脚本'),
    authorName: data.authorName || '',
    synopsis: '',
    content: '',
    characterText: '',
    characters: [],
    settings: data.settings,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, newScript);
  return docRef.id;
}

/**
 * List all scripts for a given user, sorted by most recently updated.
 */
export async function listScripts(ownerId: string): Promise<FirestoreScript[]> {
  const q = query(
    collection(db, 'scripts'),
    where('ownerId', '==', ownerId),
    orderBy('updatedAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  const scripts: FirestoreScript[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Omit<FirestoreScript, 'id'>;
    scripts.push({
      id: docSnap.id,
      ...data,
      contentType: resolveScriptContentType(data.contentType),
    } as FirestoreScript);
  });
  return scripts;
}

/**
 * Fetch a single script by its ID.
 */
export async function getScript(scriptId: string): Promise<FirestoreScript | null> {
  const docRef = doc(db, 'scripts', scriptId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as Omit<FirestoreScript, 'id'>;
    return {
      id: docSnap.id,
      ...data,
      contentType: resolveScriptContentType(data.contentType),
    } as FirestoreScript;
  }
  return null;
}

/**
 * Update a script's fields.
 */
export async function updateScript(
  scriptId: string,
  data: Partial<
    Pick<
      FirestoreScript,
      | 'title'
      | 'authorName'
      | 'synopsis'
      | 'content'
      | 'characterText'
      | 'characters'
      | 'settings'
      | 'synopsisSettings'
      | 'characterSettings'
      | 'contentCommentary'
      | 'synopsisCommentary'
      | 'discussionMessages'
    >
  >,
): Promise<void> {
  const docRef = doc(db, 'scripts', scriptId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a script permanently.
 */
export async function deleteScript(scriptId: string): Promise<void> {
  const docRef = doc(db, 'scripts', scriptId);
  await deleteDoc(docRef);
}

// ────────────────────────────────────────
// バージョン履歴
// ────────────────────────────────────────

const MAX_VERSIONS = 5;

export interface ScriptVersion {
  id: string;
  title: string;
  authorName: string;
  synopsis: string;
  content: string;
  characterText: string;
  settings: { lineLength: number; linesPerPage?: number; pageCount: number };
  savedAt?: unknown;
}

export async function saveVersion(
  scriptId: string,
  data: Omit<ScriptVersion, 'id' | 'savedAt'>,
): Promise<void> {
  const docRef = doc(collection(db, 'scripts', scriptId, 'versions'));
  await setDoc(docRef, { ...data, savedAt: serverTimestamp() });

  // 古いバージョンを削除（MAX_VERSIONS を超えた分）
  const q = query(collection(db, 'scripts', scriptId, 'versions'), orderBy('savedAt', 'desc'));
  const snap = await getDocs(q);
  const toDelete = snap.docs.slice(MAX_VERSIONS);
  for (const d of toDelete) {
    await deleteDoc(d.ref);
  }
}

export async function listVersions(scriptId: string): Promise<ScriptVersion[]> {
  const q = query(collection(db, 'scripts', scriptId, 'versions'), orderBy('savedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ScriptVersion);
}

export async function getVersion(
  scriptId: string,
  versionId: string,
): Promise<ScriptVersion | null> {
  const snap = await getDoc(doc(db, 'scripts', scriptId, 'versions', versionId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ScriptVersion) : null;
}

// ────────────────────────────────────────
// 機能フラグ
// ────────────────────────────────────────

export interface FeatureFlags {
  groups: boolean;
  contests: boolean;
  corrections: boolean;
  comments: boolean;
  aiAdvice: boolean;
  aiDiscussion: boolean;
  /** Novel mode UI (mode selection, novel editor, catalog novel filter). Data is retained when off. */
  novelMode: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  groups: true,
  contests: true,
  corrections: true,
  comments: true,
  aiAdvice: true,
  aiDiscussion: true,
  novelMode: true,
};

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const snap = await getDoc(doc(db, 'config', 'features'));
  if (snap.exists()) {
    return { ...DEFAULT_FLAGS, ...snap.data() } as FeatureFlags;
  }
  return DEFAULT_FLAGS;
}

export async function updateFeatureFlags(flags: Partial<FeatureFlags>): Promise<void> {
  await setDoc(
    doc(db, 'config', 'features'),
    { ...flags, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// ────────────────────────────────────────
// ユーザー管理
// ────────────────────────────────────────

export async function listUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { role, updatedAt: serverTimestamp() });
}

// ────────────────────────────────────────
// グループ
// ────────────────────────────────────────

export interface FirestoreGroup {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  memberCount: number;
  memberIds?: string[];
  createdAt?: FieldValue | Date;
  updatedAt?: FieldValue | Date;
}

export interface GroupMember {
  uid: string;
  role: 'operator' | 'teacher' | 'student';
  displayName?: string;
  email?: string;
  joinedAt?: FieldValue | Date;
}

export async function createGroup(
  createdBy: string,
  name: string,
  description: string,
  displayName?: string,
  email?: string,
): Promise<string> {
  const docRef = doc(collection(db, 'groups'));
  await setDoc(docRef, {
    name,
    description,
    createdBy,
    memberCount: 1,
    memberIds: [createdBy],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // 作成者をoperatorメンバーとして追加
  await setDoc(doc(db, 'groups', docRef.id, 'members', createdBy), {
    uid: createdBy,
    role: 'operator',
    displayName: displayName ?? null,
    email: email ?? null,
    joinedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listMyGroups(uid: string): Promise<FirestoreGroup[]> {
  // まず全グループを取得してデバッグ
  const allSnap = await getDocs(collection(db, 'groups'));
  console.log(
    '[groups] all groups:',
    allSnap.docs.map((d) => ({ id: d.id, memberIds: d.data().memberIds })),
  );
  // memberIds でフィルタ
  const groups: FirestoreGroup[] = [];
  for (const d of allSnap.docs) {
    const data = d.data();
    if (Array.isArray(data.memberIds) && data.memberIds.includes(uid)) {
      groups.push({ id: d.id, ...data } as FirestoreGroup);
    }
  }
  return groups;
}

export async function getGroup(groupId: string): Promise<FirestoreGroup | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as FirestoreGroup) : null;
}

export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
  const snap = await getDocs(collection(db, 'groups', groupId, 'members'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as GroupMember);
}

export async function addGroupMember(
  groupId: string,
  uid: string,
  role: GroupMember['role'],
  displayName?: string,
  email?: string,
): Promise<void> {
  await setDoc(doc(db, 'groups', groupId, 'members', uid), {
    uid,
    role,
    displayName: displayName ?? null,
    email: email ?? null,
    joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'groups', groupId), {
    memberCount: increment(1),
    memberIds: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
}

export async function removeGroupMember(groupId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId, 'members', uid));
  await updateDoc(doc(db, 'groups', groupId), {
    memberCount: increment(-1),
    memberIds: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  });
}

// ────────────────────────────────────────
// 提出物
// ────────────────────────────────────────

export interface ScriptSnapshot {
  title: string;
  authorName: string;
  synopsis: string;
  content: string;
  characterText: string;
  settings: { lineLength: number; linesPerPage?: number; pageCount: number };
}

export interface GroupSubmission {
  id: string;
  scriptId: string;
  submittedBy: string;
  scriptTitle: string;
  authorName: string;
  status: 'submitted' | 'in_review' | 'reviewed';
  scriptSnapshot: ScriptSnapshot;
  submittedAt?: FieldValue | Date;
  reviewedAt?: FieldValue | Date | null;
  reviewedBy?: string | null;
}

export async function createSubmission(
  groupId: string,
  scriptId: string,
  submittedBy: string,
  script: FirestoreScript,
): Promise<string> {
  const docRef = doc(collection(db, 'groups', groupId, 'submissions'));
  const submission: Omit<GroupSubmission, 'id'> = {
    scriptId,
    submittedBy,
    scriptTitle: script.title,
    authorName: script.authorName,
    status: 'submitted',
    scriptSnapshot: {
      title: script.title,
      authorName: script.authorName,
      synopsis: script.synopsis,
      content: script.content,
      characterText: script.characterText,
      settings: script.settings,
    },
    submittedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  };
  await setDoc(docRef, submission);
  return docRef.id;
}

export async function listSubmissions(groupId: string): Promise<GroupSubmission[]> {
  const q = query(collection(db, 'groups', groupId, 'submissions'), orderBy('submittedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupSubmission);
}

export async function getSubmission(
  groupId: string,
  submissionId: string,
): Promise<GroupSubmission | null> {
  const snap = await getDoc(doc(db, 'groups', groupId, 'submissions', submissionId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as GroupSubmission) : null;
}

export async function updateSubmissionStatus(
  groupId: string,
  submissionId: string,
  status: GroupSubmission['status'],
  reviewedBy?: string,
): Promise<void> {
  const data: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
  if (status === 'reviewed' && reviewedBy) {
    data.reviewedAt = serverTimestamp();
    data.reviewedBy = reviewedBy;
  }
  await updateDoc(doc(db, 'groups', groupId, 'submissions', submissionId), data);
}

// ────────────────────────────────────────
// コメント
// ────────────────────────────────────────

export interface FirestoreComment {
  id: string;
  scriptId: string;
  submissionId: string | null;
  groupId: string | null;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  body: string;
  createdAt?: FieldValue | Date;
  updatedAt?: FieldValue | Date;
}

export async function createComment(
  data: Omit<FirestoreComment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const docRef = doc(collection(db, 'comments'));
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listComments(
  submissionId: string,
  groupId: string,
): Promise<FirestoreComment[]> {
  const q = query(
    collection(db, 'comments'),
    where('submissionId', '==', submissionId),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FirestoreComment);
}

export async function deleteComment(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'comments', commentId));
}

// ────────────────────────────────────────
// 添削（Corrections）
// ────────────────────────────────────────

export interface Correction {
  id: string;
  teacherId: string;
  teacherName: string;
  field: 'content' | 'synopsis' | 'characterText';
  startOffset: number;
  endOffset: number;
  originalText: string;
  correctionType: 'replace' | 'delete' | 'insert' | 'comment_only';
  suggestedText: string | null;
  explanation: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function createCorrection(
  groupId: string,
  submissionId: string,
  data: Omit<Correction, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const docRef = doc(collection(db, 'groups', groupId, 'submissions', submissionId, 'corrections'));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function listCorrections(
  groupId: string,
  submissionId: string,
): Promise<Correction[]> {
  const q = query(
    collection(db, 'groups', groupId, 'submissions', submissionId, 'corrections'),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Correction);
}

export async function updateCorrectionStatus(
  groupId: string,
  submissionId: string,
  correctionId: string,
  status: Correction['status'],
): Promise<void> {
  await updateDoc(
    doc(db, 'groups', groupId, 'submissions', submissionId, 'corrections', correctionId),
    { status, updatedAt: serverTimestamp() },
  );
}

// ────────────────────────────────────────
// コンテスト
// ────────────────────────────────────────

export interface ScoringCriterion {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
}

export interface Contest {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  status: 'draft' | 'open' | 'closed' | 'judging' | 'published';
  submissionDeadline: unknown;
  judgingDeadline: unknown;
  scoringCriteria: ScoringCriterion[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ContestEntry {
  id: string;
  scriptId: string;
  submittedBy: string;
  authorName: string;
  scriptTitle: string;
  scriptSnapshot: ScriptSnapshot;
  averageScore: number | null;
  totalScore: number | null;
  rank: number | null;
  submittedAt?: unknown;
}

export interface Evaluation {
  evaluatorId: string;
  evaluatorName: string;
  scores: Array<{ criterionId: string; score: number }>;
  totalScore: number;
  feedback: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function createContest(
  data: Omit<Contest, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const docRef = doc(collection(db, 'contests'));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
}

export async function listContests(): Promise<Contest[]> {
  const q = query(collection(db, 'contests'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Contest);
}

export async function getContest(contestId: string): Promise<Contest | null> {
  const snap = await getDoc(doc(db, 'contests', contestId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Contest) : null;
}

export async function updateContest(
  contestId: string,
  data: Partial<Omit<Contest, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'contests', contestId), { ...data, updatedAt: serverTimestamp() });
}

export async function createContestEntry(
  contestId: string,
  scriptId: string,
  submittedBy: string,
  script: FirestoreScript,
): Promise<string> {
  const docRef = doc(collection(db, 'contests', contestId, 'entries'));
  const entry: Omit<ContestEntry, 'id'> = {
    scriptId,
    submittedBy,
    authorName: script.authorName,
    scriptTitle: script.title,
    scriptSnapshot: {
      title: script.title,
      authorName: script.authorName,
      synopsis: script.synopsis,
      content: script.content,
      characterText: script.characterText,
      settings: script.settings,
    },
    averageScore: null,
    totalScore: null,
    rank: null,
    submittedAt: serverTimestamp(),
  };
  await setDoc(docRef, entry);
  return docRef.id;
}

export async function listContestEntries(contestId: string): Promise<ContestEntry[]> {
  const q = query(collection(db, 'contests', contestId, 'entries'), orderBy('submittedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContestEntry);
}

export async function getContestEntry(
  contestId: string,
  entryId: string,
): Promise<ContestEntry | null> {
  const snap = await getDoc(doc(db, 'contests', contestId, 'entries', entryId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ContestEntry) : null;
}

export async function saveEvaluation(
  contestId: string,
  entryId: string,
  evaluation: Evaluation,
): Promise<void> {
  await setDoc(
    doc(db, 'contests', contestId, 'entries', entryId, 'evaluations', evaluation.evaluatorId),
    { ...evaluation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  );
}

export async function getEvaluation(
  contestId: string,
  entryId: string,
  evaluatorId: string,
): Promise<Evaluation | null> {
  const snap = await getDoc(
    doc(db, 'contests', contestId, 'entries', entryId, 'evaluations', evaluatorId),
  );
  return snap.exists() ? (snap.data() as Evaluation) : null;
}

export async function listEvaluations(contestId: string, entryId: string): Promise<Evaluation[]> {
  const snap = await getDocs(
    collection(db, 'contests', contestId, 'entries', entryId, 'evaluations'),
  );
  return snap.docs.map((d) => d.data() as Evaluation);
}

// ────────────────────────────────────────
// フォーマットプリセット
// ────────────────────────────────────────

export async function createFormatPreset(
  ownerId: string,
  data: Omit<FormatPreset, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const docRef = doc(collection(db, 'formatPresets'));
  await setDoc(docRef, {
    ...data,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listFormatPresets(ownerId: string): Promise<FormatPreset[]> {
  const q = query(
    collection(db, 'formatPresets'),
    where('ownerId', '==', ownerId),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FormatPreset);
}

export async function deleteFormatPreset(presetId: string): Promise<void> {
  await deleteDoc(doc(db, 'formatPresets', presetId));
}

// ────────────────────────────────────────
// 管理ダッシュボード
// ────────────────────────────────────────

export interface AdminStats {
  userCount: number;
  scriptCount: number;
  groupCount: number;
  submissionCount: number;
  roleBreakdown: Record<string, number>;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [usersSnap, scriptsSnap, groupsSnap, submissionsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'scripts')),
    getDocs(collection(db, 'groups')),
    getDocs(collectionGroup(db, 'submissions')),
  ]);

  const roleBreakdown: Record<string, number> = {};
  usersSnap.docs.forEach((d) => {
    const role = (d.data().role as string) || 'student';
    roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
  });

  return {
    userCount: usersSnap.size,
    scriptCount: scriptsSnap.size,
    groupCount: groupsSnap.size,
    submissionCount: submissionsSnap.size,
    roleBreakdown,
  };
}

export async function listAllGroups(): Promise<FirestoreGroup[]> {
  const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FirestoreGroup);
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId));
}
