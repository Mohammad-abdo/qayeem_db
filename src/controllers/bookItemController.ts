import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getBookItems = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    
    const items = await prisma.bookItem.findMany({
      where: { bookId: parseInt(bookId) },
      orderBy: { order: 'asc' },
    });
    
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createBookItem = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const { title, titleAr, content, contentAr, itemType, order, pageNumber, isFree, fileUrl } = req.body;
    
    const item = await prisma.bookItem.create({
      data: {
        bookId: parseInt(bookId),
        title,
        titleAr,
        content,
        contentAr,
        itemType: itemType || 'CHAPTER',
        order: order || 0,
        pageNumber,
        isFree: isFree || false,
        fileUrl,
      },
    });
    
    res.status(201).json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBookItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, titleAr, content, contentAr, itemType, order, pageNumber, isFree, fileUrl } = req.body;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (content !== undefined) updateData.content = content;
    if (contentAr !== undefined) updateData.contentAr = contentAr;
    if (itemType !== undefined) updateData.itemType = itemType;
    if (order !== undefined) updateData.order = parseInt(order);
    if (pageNumber !== undefined) updateData.pageNumber = pageNumber ? parseInt(pageNumber) : null;
    if (isFree !== undefined) updateData.isFree = isFree;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    
    const item = await prisma.bookItem.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    
    res.json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBookItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.bookItem.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Book item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



