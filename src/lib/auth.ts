export interface User {
  id: number;
  nama: string;
  username: string;
  role: "admin" | "petugas";
  is_active: boolean;
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("vcf_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vcf_token");
}

export function setSession(token: string, user: User) {
  localStorage.setItem("vcf_token", token);
  localStorage.setItem("vcf_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("vcf_token");
  localStorage.removeItem("vcf_user");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function isAdmin(): boolean {
  return getUser()?.role === "admin";
}
