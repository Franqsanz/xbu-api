import { Request, Response, NextFunction } from 'express';

import { CollectionService } from '../../services/collectionService';
import { NotFound } from '../../utils/errors';

async function getAllCollections(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { userId } = req.params;

  try {
    const findAllCollections = await CollectionService.findAllCollections(userId);

    return res.status(200).json(findAllCollections);
  } catch (err) {
    return next(err) as any;
  }
}

async function postCreateCollections(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { userId } = req.params;
  const { name } = req.body;

  try {
    await CollectionService.saveCollections(userId, name);

    return res.status(201).json({
      success: {
        status: 201,
        message: 'Colección creada',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteCollections(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { userId, collectionId } = req.params;

  try {
    await CollectionService.deleteCollections(userId, collectionId);

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Colección eliminada',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function getOneCollection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { collectionId } = req.params;

  try {
    const findOneCollection = await CollectionService.findOneCollection(collectionId);

    if (!findOneCollection) {
      throw NotFound('Esta colección no existe');
    }

    return res.status(200).json(findOneCollection[0]);
  } catch (err) {
    return next(err) as any;
  }
}

async function getCollectionsForUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { userId, bookId } = req.params;

  try {
    const findCollections = await CollectionService.findCollectionsForUser(userId, bookId);

    return res.status(200).json(findCollections);
  } catch (err) {
    return next(err) as any;
  }
}

async function patchCollectionName(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { collectionId } = req.params;
  const { userId, name } = req.body;

  try {
    await CollectionService.updateCollectionName(userId, collectionId, name);

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Nombre actualizado',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function patchToggleBookInCollection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<any>> {
  const { userId, collections, bookId, checked } = req.body;

  try {
    const actions = collections.map(async (collection: any) => {
      const { collectionId, collectionName, isInCollection } = collection;

      if (isInCollection) {
        await CollectionService.addBookToCollection(userId, [collectionId], bookId, checked);
        return `Libro agregado a la colección ${collectionName}`;
      } else {
        await CollectionService.removeBookFromCollection(userId, [collectionId], bookId);
        return `Libro eliminado de la colección ${collectionName}`;
      }
    });

    const messages = await Promise.all(actions);

    return res.status(200).json({
      success: {
        status: 200,
        message: messages,
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function patchRemoveBookFromCollection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<any>> {
  const { userId, collectionId, bookId } = req.body;

  try {
    const collectionIds = collectionId
      ? Array.isArray(collectionId)
        ? collectionId
        : [collectionId]
      : [];

    await CollectionService.removeBookFromCollection(userId, collectionIds, bookId);

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Libro eliminado de la colección exitosamente',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteUserCollections(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { userId } = req.params;

  try {
    await CollectionService.deleteUserCollections(userId);

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Colecciones eliminadas',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

export {
  getAllCollections,
  postCreateCollections,
  deleteCollections,
  getOneCollection,
  getCollectionsForUser,
  patchCollectionName,
  patchToggleBookInCollection,
  patchRemoveBookFromCollection,
  deleteUserCollections,
};
