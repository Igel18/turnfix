/**
 * Status Import Utility - Production Status Management
 * 
 * This utility imports all status types from the production TurnFix database.
 * Status types are used to track participant progress through competitions:
 * - Registration status
 * - Squad assignment
 * - Score capture
 * - Certificate printing
 * - etc.
 * 
 * Each status has:
 * - Descriptive name
 * - Color code for visual identification
 * - Flags for printing on squad sheets (Bogen) and participant cards (Karte)
 * 
 * Now uses JSON-based data loaders for better maintainability.
 */

import prisma from '../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { loadProductionStatuses } from '../data/loaders/statusLoader';

export async function applyProductionStatuses(customPrismaClient?: PrismaClient) {
  // Use custom client if provided (for wizard), otherwise use default
  const db = customPrismaClient || prisma;
  
  try {
    // Check if database schema exists
    try {
      await db.tfx_status.count();
    } catch (error: any) {
      if (error.message && error.message.includes('does not exist')) {
        throw new Error('Database schema not initialized. Please run "Create Schema" step first.');
      }
      throw error;
    }

    console.log('[ProductionStatuses] Starting import...');
    
    // Load statuses from JSON
    const statuses = loadProductionStatuses();
    console.log(`[ProductionStatuses] Loaded ${statuses.length} statuses from JSON`);
    
    let createdStatuses = 0;
    let skippedStatuses = 0;

    // Process each status
    for (const status of statuses) {
      // Check if status already exists
      const existing = await db.tfx_status.findFirst({
        where: { var_name: status.name }
      });

      if (existing) {
        skippedStatuses++;
        continue; // Skip if already exists
      }

      // Create status
      await db.tfx_status.create({
        data: {
          var_name: status.name,
          ary_colorcode: status.colorCode,
          bol_bogen: status.bogen,
          bol_karte: status.karte
        }
      });

      createdStatuses++;
    }

    const result = {
      success: true,
      stats: {
        createdStatuses: createdStatuses,
        skippedStatuses: skippedStatuses,
        totalStatuses: statuses.length
      }
    };

    console.log('[ProductionStatuses] Import complete!');
    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error: any) {
    console.error('[ProductionStatuses] Import failed:', error);
    throw error;
  }
}
