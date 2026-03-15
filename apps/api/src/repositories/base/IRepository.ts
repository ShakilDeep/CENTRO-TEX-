/**
 * Base Repository Interface
 * Implements Repository Pattern for data access abstraction
 */
export interface IRepository<T> {
  findAll(options?: FindOptions): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findOne(where: Partial<T>): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(where?: Partial<T>): Promise<number>;
  exists(where: Partial<T>): Promise<boolean>;
}

export interface FindOptions {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  skip?: number;
  include?: Record<string, boolean>;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}