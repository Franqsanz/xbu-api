import { Request, Response, NextFunction } from 'express';

import { commentService } from '../../services/commentService';
import { IComment } from '../../types/types';

async function findAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment[]>> {
  const { bookId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const result = await commentService.findAll(bookId, Number(limit), Number(offset));

    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function findByUserId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment[]>> {
  const { userId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const comments = await commentService.findByUserId(userId, Number(limit), Number(offset));

    return res.status(200).json(comments);
  } catch (err) {
    return next(err) as any;
  }
}

// export const getCommentById = async (req: Request, res: Response) => {
//   try {
//     const { commentId } = req.params;

//     const comment = await commentService.getCommentById(commentId);

//     if (!comment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Comentario no encontrado'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: comment
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al obtener comentario',
//       error: error.message
//     });
//   }
// };

// export const getCommentsStats = async (req: Request, res: Response) => {
//   try {
//     const { contentId } = req.params;

//     const stats = await commentService.getCommentsStats(contentId);

//     res.status(200).json({
//       success: true,
//       data: stats
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al obtener estadísticas',
//       error: error.message
//     });
//   }
// };

async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment>> {
  // const { userId, username } = req.params;
  const { body } = req;

  try {
    // const commentData = {
    //   text,
    //   author: {
    //     userId,
    //     username
    //   },
    //   contentId,
    //   reactions: [],
    //   likesCount: 0,
    //   dislikesCount: 0,
    //   isEdited: false
    // };

    // Validaciones básicas
    // if (!text || text.trim().length === 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'El texto del comentario es requerido'
    //   });
    // }

    // if (text.length > 500) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'El comentario no puede exceder 500 caracteres'
    //   });
    // }

    // if (!contentId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'El ID del contenido es requerido'
    //   });
    // }

    const newComment = await commentService.create(body);

    return res.status(201).json(newComment);
  } catch (err) {
    return next(err) as any;
  }
}

async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment>> {
  const { commentId, userId } = req.params;
  const { text } = req.body;

  try {
    // Validaciones básicas
    // if (!text || text.trim().length === 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'El texto del comentario es requerido'
    //   });
    // }

    // if (text.length > 500) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'El comentario no puede exceder 500 caracteres'
    //   });
    // }

    const updatedComment = await commentService.update(commentId, userId, text.trim());

    if (!updatedComment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Comentario actualizado exitosamente',
      data: updatedComment,
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment>> {
  const { commentId, userId } = req.params;

  try {
    const deletedComment = await commentService.delete(commentId, userId);

    if (!deletedComment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Comentario eliminado',
    });
  } catch (err) {
    return next(err) as any;
  }
}

// // =============================================
// // REACTIONS
// // =============================================

// export const addReaction = async (req: Request, res: Response) => {
//   try {
//     const { commentId } = req.params;
//     const { type } = req.body; // 'like' o 'dislike'
//     const { userId } = req.user;

//     // Validar tipo de reacción
//     if (!['like', 'dislike'].includes(type)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Tipo de reacción inválido. Debe ser "like" o "dislike"'
//       });
//     }

//     const updatedComment = await commentService.addReaction(commentId, userId, type);

//     if (!updatedComment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Comentario no encontrado'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Reacción agregada exitosamente',
//       data: updatedComment
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al agregar reacción',
//       error: error.message
//     });
//   }
// };

// export const removeReaction = async (req: Request, res: Response) => {
//   try {
//     const { commentId } = req.params;
//     const { userId } = req.user;

//     const updatedComment = await commentService.removeReaction(commentId, userId);

//     if (!updatedComment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Comentario no encontrado'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Reacción removida exitosamente',
//       data: updatedComment
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al remover reacción',
//       error: error.message
//     });
//   }
// };

// export const getUserReaction = async (req: Request, res: Response) => {
//   try {
//     const { commentId } = req.params;
//     const { userId } = req.user;

//     const reaction = await commentService.getUserReaction(commentId, userId);

//     res.status(200).json({
//       success: true,
//       data: {
//         reaction: reaction
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al obtener reacción del usuario',
//       error: error.message
//     });
//   }
// };

export { findAll, findByUserId, create, update, deleteComment };
