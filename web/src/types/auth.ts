export interface AuthUser { id: number; email: string; role: "owner" | "staff"; businessId: number; businessName: string; businessSlug: string; }
export interface AuthResponse { token: string; user: AuthUser; }
