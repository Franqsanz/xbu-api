/**
 * Tipos compartidos para responses de la API.
 * Reemplazan el uso de `Promise<Response<any>>` en los controllers.
 */

export interface SuccessMessage {
  success: {
    status: number;
    message: string | string[];
  };
}

export interface ErrorMessage {
  error: {
    status: number;
    message: string;
  };
}

export interface FollowStatsResponse {
  user: { id: string; username: string };
  followersCount: number;
  followingCount: number;
}

export interface FollowersListResponse {
  user: { id: string; username: string };
  followers: Array<{
    uid: string;
    username: string;
    name: string;
    picture?: string;
  }>;
  totalFollowers: number;
  limit: number;
  offset: number;
}

export interface FollowingListResponse {
  user: { id: string; username: string };
  following: Array<{
    uid: string;
    username: string;
    name: string;
    picture?: string;
  }>;
  totalFollowing: number;
  limit: number;
  offset: number;
}

export interface FeedResponse {
  activities: any[];
  info: {
    total: number;
    limit: number;
    offset: number;
    nextPage: number | null;
  };
}

export interface BookStatusResponse {
  status: 'read' | 'reading' | 'want_to_read' | null;
}
