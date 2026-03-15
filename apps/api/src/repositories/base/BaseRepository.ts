import { PrismaClient } from '@prisma/client';
import { IRepository, FindOptions } from './IRepository';

/**
 * Base Repository Implementation
 * Provides common CRUD operations for all entities
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    return await this.model.findMany({
      where: options?.where,
      orderBy: options?.orderBy,
      take: options?.take,
      skip: options?.skip,
      include: options?.include
    });
  }

  async findById(id: string): Promise<T | null> {
    return await this.model.findUnique({
      where: { id }
    });
  }

  async findOne(where: Partial<T>): Promise<T | null> {
    return await this.model.findFirst({
      where
    });
  }

  async create(data: Partial<T>): Promise<T> {
    return await this.model.create({
      data
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return await this.model.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.model.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  async count(where?: Partial<T>): Promise<number> {
    return await this.model.count({
      where
    });
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Execute operations in a transaction
   */
  async transaction<R>(fn: (tx: PrismaClient) => Promise<R>): Promise<R> {
    return await this.prisma.$transaction(fn);
  }
}