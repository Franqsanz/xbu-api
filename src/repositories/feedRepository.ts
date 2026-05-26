import followsModel from '../models/follows';
import booksModel from '../models/books';
import commentsModel from '../models/comments';
import usersModel from '../models/users';
import bookStatusesModel from '../models/bookStatuses';
import activityLogModel from '../models/activityLog';

type FeedActor = {
  uid: string;
  username: string;
  name: string;
  picture?: string;
};

type FeedBook = {
  id: string;
  title: string;
  pathUrl: string;
  image: { url: string };
  authors: string[];
  category: string[];
  synopsis: string;
};

type StatusValue = 'read' | 'reading' | 'want_to_read';

type FeedActivity = {
  type: 'book' | 'comment' | 'status' | 'follow' | 'favorite' | 'collection';
  createdAt: Date;
  actor: FeedActor;
  book?: FeedBook;
  target?: FeedActor;
  comment?: { id: string; text: string };
  status?: StatusValue;
};

export const FeedRepository = {
  async getFeed(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ activities: FeedActivity[]; total: number }> {
    const followingRecords = await followsModel
      .find({ follower: userId })
      .select('following')
      .lean()
      .exec();

    const followingUids = followingRecords.map((f: any) => f.following);
    const targetUids = Array.from(new Set([...followingUids, userId]));

    const fetchUpTo = offset + limit;

    const [bookDocs, commentDocs, statusDocs, followDocs, activityDocs] = await Promise.all([
      booksModel
        .find({ userId: { $in: targetUids } })
        .sort({ createdAt: -1 })
        .limit(fetchUpTo)
        .lean()
        .exec(),
      commentsModel
        .find({ 'author.userId': { $in: targetUids } })
        .sort({ createdAt: -1 })
        .limit(fetchUpTo)
        .lean()
        .exec(),
      bookStatusesModel
        .find({ userId: { $in: targetUids } })
        .sort({ updatedAt: -1 })
        .limit(fetchUpTo)
        .lean()
        .exec(),
      followsModel
        .find({ follower: { $in: targetUids } })
        .sort({ createdAt: -1 })
        .limit(fetchUpTo)
        .lean()
        .exec(),
      activityLogModel
        .find({ userId: { $in: targetUids } })
        .sort({ createdAt: -1 })
        .limit(fetchUpTo)
        .lean()
        .exec(),
    ]);

    const referencedBookIds = Array.from(
      new Set([
        ...commentDocs.map((c: any) => c.bookId),
        ...statusDocs.map((s: any) => s.bookId),
        ...activityDocs.map((a: any) => a.bookId),
      ])
    );
    const actorUids = Array.from(
      new Set([
        ...bookDocs.map((b: any) => b.userId),
        ...commentDocs.map((c: any) => c.author.userId),
        ...statusDocs.map((s: any) => s.userId),
        ...followDocs.map((f: any) => f.follower),
        ...followDocs.map((f: any) => f.following),
        ...activityDocs.map((a: any) => a.userId),
      ])
    );

    const [referencedBooks, actors] = await Promise.all([
      referencedBookIds.length > 0
        ? booksModel
            .find({ _id: { $in: referencedBookIds } })
            .select('title pathUrl image authors category synopsis')
            .lean()
            .exec()
        : Promise.resolve([]),
      actorUids.length > 0
        ? usersModel
            .find({ uid: { $in: actorUids } })
            .select('uid username name picture')
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    const actorByUid = new Map<string, FeedActor>(
      actors.map((u: any) => [
        u.uid,
        { uid: u.uid, username: u.username, name: u.name, picture: u.picture },
      ])
    );

    const bookById = new Map<string, FeedBook>(
      referencedBooks.map((b: any) => [
        b._id.toString(),
        {
          id: b._id.toString(),
          title: b.title,
          pathUrl: b.pathUrl,
          image: b.image,
          authors: b.authors,
          category: b.category,
          synopsis: b.synopsis,
        },
      ])
    );

    const bookActivities: FeedActivity[] = bookDocs
      .map((b: any): FeedActivity | null => {
        const actor = actorByUid.get(b.userId);
        if (!actor) return null;
        return {
          type: 'book',
          createdAt: b.createdAt,
          actor,
          book: {
            id: b._id.toString(),
            title: b.title,
            pathUrl: b.pathUrl,
            image: b.image,
            authors: b.authors,
            category: b.category,
            synopsis: b.synopsis,
          },
        };
      })
      .filter((a): a is FeedActivity => a !== null);

    const commentActivities: FeedActivity[] = commentDocs
      .map((c: any): FeedActivity | null => {
        const actor = actorByUid.get(c.author.userId);
        const book = bookById.get(c.bookId);
        if (!actor || !book) return null;
        return {
          type: 'comment',
          createdAt: c.createdAt,
          actor,
          book,
          comment: { id: c._id.toString(), text: c.text },
        };
      })
      .filter((a): a is FeedActivity => a !== null);

    const statusActivities: FeedActivity[] = statusDocs
      .map((s: any): FeedActivity | null => {
        const actor = actorByUid.get(s.userId);
        const book = bookById.get(s.bookId);
        if (!actor || !book) return null;
        return {
          type: 'status',
          createdAt: s.updatedAt ?? s.createdAt,
          actor,
          book,
          status: s.status,
        };
      })
      .filter((a): a is FeedActivity => a !== null);

    const followActivities: FeedActivity[] = followDocs
      .map((f: any): FeedActivity | null => {
        const actor = actorByUid.get(f.follower);
        const target = actorByUid.get(f.following);
        if (!actor || !target || actor.uid === target.uid) return null;
        return {
          type: 'follow',
          createdAt: f.createdAt,
          actor,
          target,
        };
      })
      .filter((a): a is FeedActivity => a !== null);

    const logActivities: FeedActivity[] = activityDocs
      .map((a: any): FeedActivity | null => {
        const actor = actorByUid.get(a.userId);
        const book = bookById.get(a.bookId);
        if (!actor || !book) return null;
        return {
          type: a.type,
          createdAt: a.createdAt,
          actor,
          book,
        };
      })
      .filter((a): a is FeedActivity => a !== null);

    const merged = [
      ...bookActivities,
      ...commentActivities,
      ...statusActivities,
      ...followActivities,
      ...logActivities,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const paginated = merged.slice(offset, offset + limit);

    return { activities: paginated, total: merged.length };
  },
};
