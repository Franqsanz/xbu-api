import followsModel from '../models/follows';
import booksModel from '../models/books';
import commentsModel from '../models/comments';
import usersModel from '../models/users';

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

type FeedActivity = {
  type: 'book' | 'comment';
  createdAt: Date;
  actor: FeedActor;
  book: FeedBook;
  comment?: { id: string; text: string };
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

    if (followingUids.length === 0) {
      return { activities: [], total: 0 };
    }

    const fetchUpTo = offset + limit;

    const [bookDocs, commentDocs] = await Promise.all([
      booksModel
        .find({ userId: { $in: followingUids } })
        .sort({ createdAt: -1 })
        .limit(fetchUpTo)
        .lean()
        .exec(),
      commentsModel
        .find({ 'author.userId': { $in: followingUids } })
        .sort({ createdAt: -1 })
        .limit(fetchUpTo)
        .lean()
        .exec(),
    ]);

    const commentBookIds = Array.from(new Set(commentDocs.map((c: any) => c.bookId)));
    const actorUids = Array.from(
      new Set([
        ...bookDocs.map((b: any) => b.userId),
        ...commentDocs.map((c: any) => c.author.userId),
      ])
    );

    const [commentBooks, actors] = await Promise.all([
      commentBookIds.length > 0
        ? booksModel
            .find({ _id: { $in: commentBookIds } })
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
      commentBooks.map((b: any) => [
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

    const merged = [...bookActivities, ...commentActivities].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = merged.slice(offset, offset + limit);

    return { activities: paginated, total: merged.length };
  },
};
