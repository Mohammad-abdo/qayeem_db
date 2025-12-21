import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    
    res.json({ permissions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPermissionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
    });
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    res.json({ permission });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPermission = async (req: AuthRequest, res: Response) => {
  try {
    const { name, nameAr, resource, resourceAr, action, actionAr, description, descriptionAr } = req.body;
    
    // Validate required fields
    if (!name || !resource || !action) {
      return res.status(400).json({ error: 'Name, resource, and action are required' });
    }
    
    // Check if permission already exists
    const existing = await prisma.permission.findFirst({
      where: { 
        resource,
        action,
      },
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Permission already exists' });
    }
    
    const permission = await prisma.permission.create({
      data: {
        name,
        nameAr,
        resource,
        resourceAr,
        action,
        actionAr,
        description,
        descriptionAr,
      },
    });
    
    res.status(201).json({ permission });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePermission = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, nameAr, resource, resourceAr, action, actionAr, description, descriptionAr } = req.body;
    
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    // If resource or action is being changed, check for conflicts
    if (resource && action) {
      const existing = await prisma.permission.findFirst({
        where: { 
          resource,
          action,
        },
      });
      
      if (existing && existing.id !== parseInt(id)) {
        return res.status(400).json({ error: 'Permission with this resource and action already exists' });
      }
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (resource !== undefined) updateData.resource = resource;
    if (resourceAr !== undefined) updateData.resourceAr = resourceAr;
    if (action !== undefined) updateData.action = action;
    if (actionAr !== undefined) updateData.actionAr = actionAr;
    if (description !== undefined) updateData.description = description;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    
    const updatedPermission = await prisma.permission.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    
    res.json({ permission: updatedPermission });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePermission = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        rolePermissions: true,
      },
    });
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    // Check if permission is used by any roles
    if (permission.rolePermissions.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete permission that is assigned to roles. Please remove it from all roles first.' 
      });
    }
    
    await prisma.permission.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Permission deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

