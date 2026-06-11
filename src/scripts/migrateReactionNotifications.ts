import mongoose from 'mongoose';

import connect from '../db/connection';
import commentsModel from '../models/comments';
import notificationsModel from '../models/notifications';

/**
 * Migración one-shot: crea notificaciones para las reacciones (like/dislike)
 * que ya existen en los comentarios, para que el autor del comentario las vea
 * en su historial.
 *
 * IMPORTANTE: en local conviene crear con read:false para poder testear.
 * En producción cambiar `READ_VALUE` a true antes de correr para evitar
 * inflar el badge de no leídas con notificaciones históricas.
 *
 * Idempotente: si ya existe una notif para esa combinación de
 * (userId destinatario + actorId + commentId + type='reaction'), no la duplica.
 */
const READ_VALUE = false;

async function migrate() {
  await connect();

  const comments = await commentsModel
    .find({ 'reactions.0': { $exists: true } }, '_id author bookId reactions createdAt updatedAt')
    .lean()
    .exec();

  console.log(`Found ${comments.length} comments with reactions`);

  let created = 0;
  let skipped = 0;
  let selfReaction = 0;

  for (const comment of comments) {
    const commentId = (comment as any)._id.toString();
    const authorId = (comment as any).author?.userId;
    const bookId = (comment as any).bookId;
    const reactions: Array<{ userId: string; type: 'like' | 'dislike' }> =
      (comment as any).reactions ?? [];

    if (!authorId) continue;

    for (const reaction of reactions) {
      const actorId = reaction.userId;
      const reactionType = reaction.type;

      if (actorId === authorId) {
        selfReaction++;
        continue;
      }

      const existing = await notificationsModel
        .findOne({
          userId: authorId,
          actorId,
          commentId,
          type: 'reaction',
        })
        .lean()
        .exec();

      if (existing) {
        skipped++;
        continue;
      }

      await notificationsModel.create({
        userId: authorId,
        type: 'reaction',
        actorId,
        bookId,
        commentId,
        reactionType,
        read: READ_VALUE,
      });
      created++;
    }
  }

  console.log(
    `Created: ${created}, Already existed: ${skipped}, Skipped self-reactions: ${selfReaction}`
  );
  console.log(`READ_VALUE used: ${READ_VALUE}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
