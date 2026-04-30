import { supabase } from "./supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * 401 ハンドラの差し替え点。デフォルトは Supabase signOut を呼ぶだけ。
 *
 * ルートレイアウトで bindUnauthorizedHandler() を呼んで
 * 「authStore.reset() + /login へリダイレクト」を結線する想定。
 * lib/api 単独で expo-router / store を import するとサイクルが
 * 発生するため、このフックで切り離している。
 */
type UnauthorizedHandler = () => Promise<void> | void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function bindUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

async function handleUnauthorized() {
  // デフォルト: Supabase の sign out のみ。UI遷移はホスト側で。
  try {
    await supabase.auth.signOut();
  } catch {
    // sign out 失敗は致命的ではない (token は既に無効)
  }
  if (unauthorizedHandler) {
    try {
      await unauthorizedHandler();
    } catch {
      // ハンドラの失敗で API 呼び出し全体を巻き込まない
    }
  }
}

/**
 * Mobile API クライアント
 * Bearer token認証でサーバー側 Action endpoint を呼び出す。
 *
 * 401 受信時は session を破棄し、登録された unauthorizedHandler を呼んで
 * UIをログイン画面へ戻す（呼び出し側は ApiError(401) を catch しても良いし、
 * ホスト層に任せても良い）。
 */
export async function mobileApi<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    // ローカルにトークンが無い → サインアウト誘導
    await handleUnauthorized();
    throw new ApiError("認証が必要です", 401);
  }

  const url = `${API_BASE_URL}/api/mobile${path}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...headers,
    },
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));

    // 401 → セッション失効。グローバルにサインアウト誘導してから throw。
    // 各画面で個別に "再ログインしてください" を出していた重複処理を集約。
    if (response.status === 401) {
      await handleUnauthorized();
    }

    throw new ApiError(
      errorBody.error || `API Error: ${response.status}`,
      response.status,
      errorBody
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}
