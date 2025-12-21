import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCriteriaByEvaluation = async (req: Request, res: Response) => {
  try {
    const { evaluationId } = req.params;
    const { bookType } = req.query; // Optional filter by bookType
    
    const where: any = { evaluationId: parseInt(evaluationId) };
    if (bookType) {
      where.bookType = bookType;
    }
    
    const criteria = await prisma.criterion.findMany({
      where,
      orderBy: { order: 'asc' },
    });
    
    res.json({ criteria });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCriterion = async (req: Request, res: Response) => {
  try {
    // Get evaluationId from params or body
    const evaluationId = req.params.evaluationId || req.body.evaluationId;
    
    if (!evaluationId) {
      return res.status(400).json({ error: 'evaluationId is required' });
    }
    
    const { 
      title, 
      titleAr, 
      description, 
      descriptionAr, 
      weight, 
      maxScore, 
      order, 
      isRequired, 
      bookType,
      questionPercentage,
      answer1Percentage,
      answer2Percentage,
      answer3Percentage,
      answer4Percentage,
      answer5Percentage,
    } = req.body;
    
    const criterion = await prisma.criterion.create({
      data: {
        evaluationId: parseInt(evaluationId),
        title,
        titleAr,
        description,
        descriptionAr,
        weight: weight || 1.0,
        maxScore: maxScore || 10.0,
        order: order || 0,
        isRequired: isRequired !== false,
        bookType: bookType || null,
        questionPercentage: questionPercentage ? parseFloat(questionPercentage) : 0,
        answer1Percentage: answer1Percentage ? parseFloat(answer1Percentage) : 20,
        answer2Percentage: answer2Percentage ? parseFloat(answer2Percentage) : 20,
        answer3Percentage: answer3Percentage ? parseFloat(answer3Percentage) : 20,
        answer4Percentage: answer4Percentage ? parseFloat(answer4Percentage) : 20,
        answer5Percentage: answer5Percentage ? parseFloat(answer5Percentage) : 20,
      },
    });
    
    res.status(201).json({ criterion });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCriterion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      titleAr,
      description,
      descriptionAr,
      weight,
      maxScore,
      order,
      isRequired,
      bookType,
      questionPercentage,
      answer1Percentage,
      answer2Percentage,
      answer3Percentage,
      answer4Percentage,
      answer5Percentage,
    } = req.body;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (description !== undefined) updateData.description = description;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (weight !== undefined) updateData.weight = weight;
    if (maxScore !== undefined) updateData.maxScore = maxScore;
    if (order !== undefined) updateData.order = order;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (bookType !== undefined) updateData.bookType = bookType;
    if (questionPercentage !== undefined) updateData.questionPercentage = parseFloat(questionPercentage);
    if (answer1Percentage !== undefined) updateData.answer1Percentage = parseFloat(answer1Percentage);
    if (answer2Percentage !== undefined) updateData.answer2Percentage = parseFloat(answer2Percentage);
    if (answer3Percentage !== undefined) updateData.answer3Percentage = parseFloat(answer3Percentage);
    if (answer4Percentage !== undefined) updateData.answer4Percentage = parseFloat(answer4Percentage);
    if (answer5Percentage !== undefined) updateData.answer5Percentage = parseFloat(answer5Percentage);
    
    const criterion = await prisma.criterion.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    
    res.json({ criterion });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCriterion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.criterion.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Criterion deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



