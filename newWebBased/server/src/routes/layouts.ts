import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';

const router = Router();

// Validation schemas
const createLayoutSchema = z.object({
  name: z.string().min(1, 'Layout name is required').max(100),
  comment: z.string().optional().nullable()
});

const updateLayoutSchema = z.object({
  name: z.string().min(1, 'Layout name is required').max(100).optional(),
  comment: z.string().optional().nullable()
});

const createLayoutFieldSchema = z.object({
  layoutId: z.number().int().positive().optional(), // layoutId is added from URL params
  type: z.number().int().min(0).max(10),
  font: z.string().max(150).optional().nullable(),
  x: z.number().min(0), // Remove max constraint temporarily 
  y: z.number().min(0), // Remove max constraint temporarily
  width: z.number().min(0), // Remove max constraint temporarily
  height: z.number().min(0), // Remove max constraint temporarily
  value: z.string().max(200).optional().nullable(), // Match database constraint: VarChar(200)
  align: z.number().int().min(0).max(2).default(0),
  layer: z.number().int().min(0).max(10).default(0)
});

// Get layouts count
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.tfx_layouts.count();
    res.json({ count });
  } catch (error) {
    console.error('Error counting layouts:', error);
    res.status(500).json({ 
      error: 'Failed to count layouts',
      details: process.env.DEBUG === 'true' ? error : undefined
    });
  }
});

const updateLayoutFieldSchema = z.object({
  type: z.number().int().min(0).max(10).optional(),
  font: z.string().max(150).optional().nullable(),
  x: z.number().min(0).optional(),
  y: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  value: z.string().max(200).optional().nullable(),
  align: z.number().int().min(0).max(2).optional(),
  layer: z.number().int().min(0).max(10).optional()
});

// Get all layouts
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('Fetching all certificate layouts');
    
    const layouts = await prisma.tfx_layouts.findMany({
      include: {
        tfx_layout_felder: true
      },
      orderBy: {
        var_name: 'asc'
      }
    });

    // Transform the data to include field count and better naming
    const transformedLayouts = layouts.map(layout => ({
      int_layoutid: layout.int_layoutid,
      var_name: layout.var_name,
      txt_comment: layout.txt_comment,
      fieldCount: layout.tfx_layout_felder.length,
      fields: layout.tfx_layout_felder.map(field => ({
        int_layout_felderid: field.int_layout_felderid,
        int_layoutid: field.int_layoutid,
        int_typ: field.int_typ,
        var_font: field.var_font,
        rel_x: field.rel_x,
        rel_y: field.rel_y,
        rel_w: field.rel_w,
        rel_h: field.rel_h,
        var_value: field.var_value,
        int_align: field.int_align,
        int_layer: field.int_layer
      }))
    }));

    console.log(`Found ${transformedLayouts.length} layouts`);
    res.json(transformedLayouts);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get layout by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const layout = await prisma.tfx_layouts.findUnique({
      where: { int_layoutid: id },
      include: {
        tfx_layout_felder: {
          orderBy: {
            int_layer: 'asc'
          }
        }
      }
    });

    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Transform the data
    const transformedLayout = {
      int_layoutid: layout.int_layoutid,
      var_name: layout.var_name,
      txt_comment: layout.txt_comment,
      fieldCount: layout.tfx_layout_felder.length,
      fields: layout.tfx_layout_felder.map(field => ({
        int_layout_felderid: field.int_layout_felderid,
        int_layoutid: field.int_layoutid,
        int_typ: field.int_typ,
        var_font: field.var_font,
        rel_x: field.rel_x,
        rel_y: field.rel_y,
        rel_w: field.rel_w,
        rel_h: field.rel_h,
        var_value: field.var_value,
        int_align: field.int_align,
        int_layer: field.int_layer
      }))
    };

    res.json(transformedLayout);
  } catch (error) {
    console.error('Error fetching layout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new layout
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createLayoutSchema.parse(req.body);
    console.log('Creating layout:', validatedData);

    const layout = await prisma.tfx_layouts.create({
      data: {
        var_name: validatedData.name,
        txt_comment: validatedData.comment || null
      }
    });

    console.log('Created layout:', layout);
    
    // Return the transformed layout
    const transformedLayout = {
      int_layoutid: layout.int_layoutid,
      var_name: layout.var_name,
      txt_comment: layout.txt_comment,
      fieldCount: 0,
      fields: []
    };

    res.status(201).json(transformedLayout);
  } catch (error) {
    console.error('Error creating layout:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update layout
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log('Updating layout request:', { id, body: req.body });
    
    const validatedData = updateLayoutSchema.parse(req.body);
    
    console.log('Updating layout:', id, validatedData);

    const layout = await prisma.tfx_layouts.update({
      where: { int_layoutid: id },
      data: {
        ...(validatedData.name && { var_name: validatedData.name }),
        ...(validatedData.comment !== undefined && { txt_comment: validatedData.comment || null })
      },
      include: {
        tfx_layout_felder: true
      }
    });

    // Transform the data
    const transformedLayout = {
      int_layoutid: layout.int_layoutid,
      var_name: layout.var_name,
      txt_comment: layout.txt_comment,
      fieldCount: layout.tfx_layout_felder.length,
      fields: layout.tfx_layout_felder.map(field => ({
        int_layout_felderid: field.int_layout_felderid,
        int_layoutid: field.int_layoutid,
        int_typ: field.int_typ,
        var_font: field.var_font,
        rel_x: field.rel_x,
        rel_y: field.rel_y,
        rel_w: field.rel_w,
        rel_h: field.rel_h,
        var_value: field.var_value,
        int_align: field.int_align,
        int_layer: field.int_layer
      }))
    };

    res.json(transformedLayout);
  } catch (error) {
    console.error('Error updating layout:', error);
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.issues);
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete layout
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log('Deleting layout:', id);

    // Check if layout exists
    const existingLayout = await prisma.tfx_layouts.findUnique({
      where: { int_layoutid: id }
    });

    if (!existingLayout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Delete the layout (cascade will delete associated fields)
    await prisma.tfx_layouts.delete({
      where: { int_layoutid: id }
    });

    console.log('Layout deleted successfully');
    res.json({ message: 'Layout deleted successfully' });
  } catch (error) {
    console.error('Error deleting layout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Layout Fields Routes

// Get fields for a layout
router.get('/:id/fields', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const layoutId = parseInt(req.params.id);
    
    const fields = await prisma.tfx_layout_felder.findMany({
      where: { int_layoutid: layoutId },
      orderBy: {
        int_layer: 'asc'
      }
    });

    // Transform the data
    const transformedFields = fields.map(field => ({
      int_layout_felderid: field.int_layout_felderid,
      int_layoutid: field.int_layoutid,
      int_typ: field.int_typ,
      var_font: field.var_font,
      rel_x: field.rel_x,
      rel_y: field.rel_y,
      rel_w: field.rel_w,
      rel_h: field.rel_h,
      var_value: field.var_value,
      int_align: field.int_align,
      int_layer: field.int_layer
    }));

    res.json(transformedFields);
  } catch (error) {
    console.error('Error fetching layout fields:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new layout field
router.post('/:id/fields', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const layoutId = parseInt(req.params.id);
    
    console.log('📝 Creating layout field - Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate the request body without layoutId, then add it
    // Note: Coordinates can be negative or outside [0,1] range during editing
    const baseValidation = z.object({
      type: z.number().int().min(0).max(10),
      font: z.string().max(150).optional().nullable(),
      x: z.number(), // Allow any number, validation happens in UI
      y: z.number(), // Allow any number, validation happens in UI
      width: z.number().min(0), // Width and height must be positive
      height: z.number().min(0),
      value: z.string().max(200).optional().nullable(),
      align: z.number().int().min(0).max(2).default(0),
      layer: z.number().int().min(0).max(10).default(0)
    });
    
    const validatedData = baseValidation.parse(req.body);

    console.log('✅ Validation passed - Creating layout field:', { layoutId, ...validatedData });

    const field = await prisma.tfx_layout_felder.create({
      data: {
        int_layoutid: layoutId,
        int_typ: validatedData.type,
        var_font: validatedData.font || null,
        rel_x: validatedData.x,
        rel_y: validatedData.y,
        rel_w: validatedData.width,
        rel_h: validatedData.height,
        var_value: validatedData.value || null,
        int_align: validatedData.align,
        int_layer: validatedData.layer
      }
    });

    // Transform the data
    const transformedField = {
      int_layout_felderid: field.int_layout_felderid,
      int_layoutid: field.int_layoutid,
      int_typ: field.int_typ,
      var_font: field.var_font,
      rel_x: field.rel_x,
      rel_y: field.rel_y,
      rel_w: field.rel_w,
      rel_h: field.rel_h,
      var_value: field.var_value,
      int_align: field.int_align,
      int_layer: field.int_layer
    };

    res.status(201).json(transformedField);
  } catch (error) {
    console.error('❌ Error creating layout field:', error);
    if (error instanceof z.ZodError) {
      console.error('📋 Validation errors:', JSON.stringify(error.issues, null, 2));
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues,
        message: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update layout field
router.put('/:id/fields/:fieldId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const fieldId = parseInt(req.params.fieldId);
    const validatedData = updateLayoutFieldSchema.parse(req.body);
    
    console.log('Updating layout field:', fieldId, validatedData);

    const field = await prisma.tfx_layout_felder.update({
      where: { int_layout_felderid: fieldId },
      data: {
        ...(validatedData.type !== undefined && { int_typ: validatedData.type }),
        ...(validatedData.font !== undefined && { var_font: validatedData.font || null }),
        ...(validatedData.x !== undefined && { rel_x: validatedData.x }),
        ...(validatedData.y !== undefined && { rel_y: validatedData.y }),
        ...(validatedData.width !== undefined && { rel_w: validatedData.width }),
        ...(validatedData.height !== undefined && { rel_h: validatedData.height }),
        ...(validatedData.value !== undefined && { var_value: validatedData.value || null }),
        ...(validatedData.align !== undefined && { int_align: validatedData.align }),
        ...(validatedData.layer !== undefined && { int_layer: validatedData.layer })
      }
    });

    // Transform the data
    const transformedField = {
      int_layout_felderid: field.int_layout_felderid,
      int_layoutid: field.int_layoutid,
      int_typ: field.int_typ,
      var_font: field.var_font,
      rel_x: field.rel_x,
      rel_y: field.rel_y,
      rel_w: field.rel_w,
      rel_h: field.rel_h,
      var_value: field.var_value,
      int_align: field.int_align,
      int_layer: field.int_layer
    };

    res.json(transformedField);
  } catch (error) {
    console.error('Error updating layout field:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete layout field
router.delete('/:id/fields/:fieldId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const fieldId = parseInt(req.params.fieldId);
    console.log('Deleting layout field:', fieldId);

    // Check if field exists
    const existingField = await prisma.tfx_layout_felder.findUnique({
      where: { int_layout_felderid: fieldId }
    });

    if (!existingField) {
      return res.status(404).json({ error: 'Layout field not found' });
    }

    // Delete the field
    await prisma.tfx_layout_felder.delete({
      where: { int_layout_felderid: fieldId }
    });

    console.log('Layout field deleted successfully');
    res.json({ message: 'Layout field deleted successfully' });
  } catch (error) {
    console.error('Error deleting layout field:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate layout
router.post('/:id/duplicate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sourceId = parseInt(req.params.id);
    const { name } = req.body; // New name for the duplicated layout
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required for duplicated layout' });
    }

    console.log('Duplicating layout:', sourceId, 'with new name:', name);

    // Get the source layout with its fields
    const sourceLayout = await prisma.tfx_layouts.findUnique({
      where: { int_layoutid: sourceId },
      include: {
        tfx_layout_felder: true
      }
    });

    if (!sourceLayout) {
      return res.status(404).json({ error: 'Source layout not found' });
    }

    // Create the new layout
    const newLayout = await prisma.tfx_layouts.create({
      data: {
        var_name: name,
        txt_comment: sourceLayout.txt_comment ? `Copy of ${sourceLayout.var_name}` : null
      }
    });

    // Duplicate all fields
    if (sourceLayout.tfx_layout_felder.length > 0) {
      await prisma.tfx_layout_felder.createMany({
        data: sourceLayout.tfx_layout_felder.map(field => ({
          int_layoutid: newLayout.int_layoutid,
          int_typ: field.int_typ,
          var_font: field.var_font,
          rel_x: field.rel_x,
          rel_y: field.rel_y,
          rel_w: field.rel_w,
          rel_h: field.rel_h,
          var_value: field.var_value,
          int_align: field.int_align,
          int_layer: field.int_layer
        }))
      });
    }

    // Return the new layout with its fields
    const duplicatedLayout = await prisma.tfx_layouts.findUnique({
      where: { int_layoutid: newLayout.int_layoutid },
      include: {
        tfx_layout_felder: true
      }
    });

    const transformedLayout = {
      int_layoutid: duplicatedLayout!.int_layoutid,
      var_name: duplicatedLayout!.var_name,
      txt_comment: duplicatedLayout!.txt_comment,
      fieldCount: duplicatedLayout!.tfx_layout_felder.length,
      fields: duplicatedLayout!.tfx_layout_felder.map(field => ({
        int_layout_felderid: field.int_layout_felderid,
        int_layoutid: field.int_layoutid,
        int_typ: field.int_typ,
        var_font: field.var_font,
        rel_x: field.rel_x,
        rel_y: field.rel_y,
        rel_w: field.rel_w,
        rel_h: field.rel_h,
        var_value: field.var_value,
        int_align: field.int_align,
        int_layer: field.int_layer
      }))
    };

    console.log('Layout duplicated successfully');
    res.status(201).json(transformedLayout);
  } catch (error) {
    console.error('Error duplicating layout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
