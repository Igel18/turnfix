import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import layoutRoutes from '../../src/routes/layouts';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/layouts', layoutRoutes);

describe('Layouts (Certificate) API', () => {
  let prisma: PrismaClient;
  let testLayout: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    // Clean up test layouts
    if (testLayout) {
      await prisma.tfx_layout_felder.deleteMany({
        where: { int_layoutid: testLayout.int_layoutid }
      }).catch(() => {});
      await prisma.tfx_layouts.delete({
        where: { int_layoutid: testLayout.int_layoutid }
      }).catch(() => {});
      testLayout = null;
    }
    await TestUtils.cleanupCreatedRecords();
  });

  describe('GET /api/layouts', () => {
    it('should return all layouts', async () => {
      const response = await request(app)
        .get('/api/layouts')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should include field count and fields for each layout', async () => {
      // Create test layout
      testLayout = await prisma.tfx_layouts.create({
        data: { var_name: `Test Layout ${Date.now()}` }
      });
      TestUtils.trackCreated('layouts', testLayout.int_layoutid);

      const response = await request(app)
        .get('/api/layouts')
        .expect(200);

      const layout = response.body.find((l: any) => l.int_layoutid === testLayout.int_layoutid);
      expect(layout).toBeDefined();
      expect(layout).toHaveProperty('fieldCount');
      expect(layout).toHaveProperty('fields');
      expect(layout.fields).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/layouts/count', () => {
    it('should return layout count', async () => {
      const response = await request(app)
        .get('/api/layouts/count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('GET /api/layouts/:id', () => {
    it('should return a specific layout by ID', async () => {
      testLayout = await prisma.tfx_layouts.create({
        data: { var_name: `Test Layout Detail ${Date.now()}` }
      });
      TestUtils.trackCreated('layouts', testLayout.int_layoutid);

      const response = await request(app)
        .get(`/api/layouts/${testLayout.int_layoutid}`)
        .expect(200);

      expect(response.body.int_layoutid).toBe(testLayout.int_layoutid);
      expect(response.body.var_name).toBe(testLayout.var_name);
      expect(response.body).toHaveProperty('fieldCount');
      expect(response.body).toHaveProperty('fields');
    });

    it('should return 404 for non-existent layout', async () => {
      await request(app)
        .get('/api/layouts/999999')
        .expect(404);
    });
  });

  describe('POST /api/layouts', () => {
    it('should create a layout', async () => {
      const response = await request(app)
        .post('/api/layouts')
        .send({ name: `New Layout ${Date.now()}`, comment: 'Test comment' })
        .expect(201);

      expect(response.body).toHaveProperty('int_layoutid');
      expect(response.body.var_name).toContain('New Layout');
      expect(response.body.txt_comment).toBe('Test comment');
      expect(response.body.fieldCount).toBe(0);

      // Clean up
      testLayout = { int_layoutid: response.body.int_layoutid };
      TestUtils.trackCreated('layouts', response.body.int_layoutid);
    });

    it('should reject layout without name', async () => {
      await request(app)
        .post('/api/layouts')
        .send({ comment: 'No name' })
        .expect(400);
    });

    it('should reject empty name', async () => {
      await request(app)
        .post('/api/layouts')
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('PUT /api/layouts/:id', () => {
    it('should update layout name', async () => {
      testLayout = await prisma.tfx_layouts.create({
        data: { var_name: `Original ${Date.now()}` }
      });
      TestUtils.trackCreated('layouts', testLayout.int_layoutid);

      const response = await request(app)
        .put(`/api/layouts/${testLayout.int_layoutid}`)
        .send({ name: 'Updated Layout Name' })
        .expect(200);

      expect(response.body.var_name).toBe('Updated Layout Name');
    });

    it('should update layout comment', async () => {
      testLayout = await prisma.tfx_layouts.create({
        data: { var_name: `Layout Comment ${Date.now()}` }
      });
      TestUtils.trackCreated('layouts', testLayout.int_layoutid);

      const response = await request(app)
        .put(`/api/layouts/${testLayout.int_layoutid}`)
        .send({ comment: 'Updated comment' })
        .expect(200);

      expect(response.body.txt_comment).toBe('Updated comment');
    });
  });

  describe('DELETE /api/layouts/:id', () => {
    it('should delete a layout', async () => {
      testLayout = await prisma.tfx_layouts.create({
        data: { var_name: `Delete Me ${Date.now()}` }
      });

      const response = await request(app)
        .delete(`/api/layouts/${testLayout.int_layoutid}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
      testLayout = null; // Already deleted
    });

    it('should return 404 for non-existent layout', async () => {
      await request(app)
        .delete('/api/layouts/999999')
        .expect(404);
    });
  });

  describe('Layout Fields CRUD', () => {
    let testField: any;

    beforeEach(async () => {
      testLayout = await prisma.tfx_layouts.create({
        data: { var_name: `Layout Fields ${Date.now()}` }
      });
      TestUtils.trackCreated('layouts', testLayout.int_layoutid);
    });

    it('should list fields for a layout', async () => {
      const response = await request(app)
        .get(`/api/layouts/${testLayout.int_layoutid}/fields`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should create a layout field', async () => {
      const fieldData = {
        type: 1,
        font: 'Arial 12',
        x: 10,
        y: 20,
        width: 100,
        height: 30,
        value: 'Test Field',
        align: 0,
        layer: 0
      };

      const response = await request(app)
        .post(`/api/layouts/${testLayout.int_layoutid}/fields`)
        .send(fieldData)
        .expect(201);

      expect(response.body).toHaveProperty('int_layout_felderid');
      expect(response.body.int_layoutid).toBe(testLayout.int_layoutid);
      expect(response.body.int_typ).toBe(1);
      expect(response.body.var_font).toBe('Arial 12');
      expect(response.body.rel_x).toBe(10);
      expect(response.body.rel_y).toBe(20);

      testField = response.body;
    });

    it('should update a layout field', async () => {
      // Create field first
      const created = await prisma.tfx_layout_felder.create({
        data: {
          int_layoutid: testLayout.int_layoutid,
          int_typ: 1,
          rel_x: 10, rel_y: 20, rel_w: 100, rel_h: 30,
          int_align: 0, int_layer: 0
        }
      });

      const response = await request(app)
        .put(`/api/layouts/${testLayout.int_layoutid}/fields/${created.int_layout_felderid}`)
        .send({ x: 50, y: 60, value: 'Updated Value' })
        .expect(200);

      expect(response.body.rel_x).toBe(50);
      expect(response.body.rel_y).toBe(60);
      expect(response.body.var_value).toBe('Updated Value');
    });

    it('should delete a layout field', async () => {
      const created = await prisma.tfx_layout_felder.create({
        data: {
          int_layoutid: testLayout.int_layoutid,
          int_typ: 0,
          rel_x: 0, rel_y: 0, rel_w: 50, rel_h: 50,
          int_align: 0, int_layer: 0
        }
      });

      const response = await request(app)
        .delete(`/api/layouts/${testLayout.int_layoutid}/fields/${created.int_layout_felderid}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 when deleting non-existent field', async () => {
      await request(app)
        .delete(`/api/layouts/${testLayout.int_layoutid}/fields/999999`)
        .expect(404);
    });
  });

  describe('POST /api/layouts/:id/duplicate', () => {
    it('should duplicate a layout with fields', async () => {
      testLayout = await prisma.tfx_layouts.create({
        data: { var_name: `Source Layout ${Date.now()}`, txt_comment: 'Source comment' }
      });
      TestUtils.trackCreated('layouts', testLayout.int_layoutid);

      // Add fields to source
      await prisma.tfx_layout_felder.create({
        data: {
          int_layoutid: testLayout.int_layoutid,
          int_typ: 1, var_font: 'Helvetica 14',
          rel_x: 10, rel_y: 20, rel_w: 100, rel_h: 30,
          var_value: 'Title', int_align: 1, int_layer: 0
        }
      });

      const response = await request(app)
        .post(`/api/layouts/${testLayout.int_layoutid}/duplicate`)
        .send({ name: `Copy of Layout ${Date.now()}` })
        .expect(201);

      expect(response.body).toHaveProperty('int_layoutid');
      expect(response.body.int_layoutid).not.toBe(testLayout.int_layoutid);
      expect(response.body.fieldCount).toBe(1);
      expect(response.body.fields[0].var_font).toBe('Helvetica 14');

      // Clean up duplicated layout
      await prisma.tfx_layout_felder.deleteMany({ where: { int_layoutid: response.body.int_layoutid } }).catch(() => {});
      await prisma.tfx_layouts.delete({ where: { int_layoutid: response.body.int_layoutid } }).catch(() => {});
    });

    it('should return 400 when name is missing', async () => {
      testLayout = await prisma.tfx_layouts.create({
        data: { var_name: `Source ${Date.now()}` }
      });
      TestUtils.trackCreated('layouts', testLayout.int_layoutid);

      await request(app)
        .post(`/api/layouts/${testLayout.int_layoutid}/duplicate`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent source layout', async () => {
      await request(app)
        .post('/api/layouts/999999/duplicate')
        .send({ name: 'Copy of nothing' })
        .expect(404);
    });
  });
});
