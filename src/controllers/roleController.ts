import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ roles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createRole = async (req: AuthRequest, res: Response) => {
  try {
    const { name, nameAr, description, descriptionAr, permissionIds } = req.body;
    
    const role = await prisma.role.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        permissions: permissionIds && Array.isArray(permissionIds) ? {
          create: permissionIds.map((permissionId: number) => ({
            permissionId,
          })),
        } : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    
    res.status(201).json({ role });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, nameAr, description, descriptionAr, permissionIds } = req.body;
    
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        permissions: true,
      },
    });
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Update role
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (description !== undefined) updateData.description = description;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    
    const updatedRole = await prisma.$transaction(async (tx) => {
      const role = await tx.role.update({
        where: { id: parseInt(id) },
        data: updateData,
      });
      
      // Update permissions if provided
      if (permissionIds && Array.isArray(permissionIds)) {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: parseInt(id) },
        });
        
        // Create new permissions
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId: number) => ({
              roleId: parseInt(id),
              permissionId,
            })),
          });
        }
      }
      
      // Fetch updated role with permissions
      return await tx.role.findUnique({
        where: { id: parseInt(id) },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              userRoles: true,
            },
          },
        },
      });
    });
    
    res.json({ role: updatedRole });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (role.isSystem) {
      return res.status(400).json({ error: 'Cannot delete system role' });
    }
    
    await prisma.role.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

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



