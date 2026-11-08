/**
 * @gallery/database - Database Migrations Runner
 */

import { INITIAL_SCHEMA_SQL } from './schema.js';

export interface DatabaseAdapter {
  exec(sql: string): Promise<void> | void;
}

export class MigrationRunner {
  public static async initialize(db: DatabaseAdapter): Promise<void> {
    await db.exec(INITIAL_SCHEMA_SQL);
  }
}

