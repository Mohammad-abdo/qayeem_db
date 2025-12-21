import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
    
    res.json({ settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSettingByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ setting });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createSetting = async (req: AuthRequest, res: Response) => {
  try {
    const { key, value, valueAr, description, descriptionAr } = req.body;
    
    if (!key || !value) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    const setting = await prisma.setting.create({
      data: {
        key,
        value,
        valueAr,
        description,
        descriptionAr,
      },
    });
    
    res.status(201).json({ setting });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Setting with this key already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateSetting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { key, value, valueAr, description, descriptionAr } = req.body;
    
    const updateData: any = {};
    if (key !== undefined) updateData.key = key;
    if (value !== undefined) updateData.value = value;
    if (valueAr !== undefined) updateData.valueAr = valueAr;
    if (description !== undefined) updateData.description = description;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    
    const setting = await prisma.setting.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    
    res.json({ setting });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteSetting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.setting.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Setting deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const updateSettingByKey = async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, valueAr, description, descriptionAr } = req.body;
    
    const updateData: any = {};
    if (value !== undefined) updateData.value = value;
    if (valueAr !== undefined) updateData.valueAr = valueAr;
    if (description !== undefined) updateData.description = description;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    
    const setting = await prisma.setting.update({
      where: { key },
      data: updateData,
    });
    
    res.json({ setting });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.status(500).json({ error: error.message });
  }
};











