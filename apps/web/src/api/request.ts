/**
 * One place where a failed response becomes a sentence somebody can act on. Three
 * situations that need three different reactions used to arrive as one string,
 * `Lỗi HTTP 500`, which told the reader to guess.
 */

const NETWORK = 'Mất kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.';
const SERVER = 'Hệ thống đang gặp sự cố. Thử lại sau ít phút.';
const REQUEST = 'Thiết lập không hợp lệ. Kiểm tra lại các giá trị vừa nhập.';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    // An aborted request is the caller's own doing, so it stays recognisable to them.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, NETWORK);
  }

  if (!response.ok) throw new ApiError(response.status, await explain(response));
  return response.json() as Promise<T>;
}

async function explain(response: Response): Promise<string> {
  const fromServer = await messageFrom(response);
  if (response.status >= 500) return SERVER;
  return fromServer ?? REQUEST;
}

async function messageFrom(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return null;
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
    if (Array.isArray(message) && message.length > 0) return message.join('. ');
    return null;
  } catch {
    return null;
  }
}
