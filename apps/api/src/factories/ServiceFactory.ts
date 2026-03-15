import { PrismaClient } from '@prisma/client';
import { SampleRepository } from '../repositories/SampleRepository';
import { FastifyInstance } from 'fastify';

/**
 * Service Factory Pattern
 * Centralizes service creation and dependency injection
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private prisma: PrismaClient;
  private repositories: Map<string, any> = new Map();
  private services: Map<string, any> = new Map();

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeRepositories();
  }

  /**
   * Singleton pattern for factory instance
   */
  public static getInstance(prisma: PrismaClient): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(prisma);
    }
    return ServiceFactory.instance;
  }

  /**
   * Initialize all repositories
   */
  private initializeRepositories(): void {
    this.repositories.set('sample', new SampleRepository(this.prisma));
    // Add other repositories as needed
  }

  /**
   * Get repository by name
   */
  public getRepository<T>(name: string): T {
    if (!this.repositories.has(name)) {
      throw new Error(`Repository ${name} not found`);
    }
    return this.repositories.get(name) as T;
  }

  /**
   * Get or create service
   */
  public getService<T>(name: string, ...args: any[]): T {
    if (!this.services.has(name)) {
      this.services.set(name, this.createService(name, ...args));
    }
    return this.services.get(name) as T;
  }

  /**
   * Create service based on name
   */
  private createService(name: string, ...args: any[]): any {
    switch (name) {
      case 'auth':
        // Return auth service instance
        break;
      case 'sample':
        // Return sample service instance
        break;
      default:
        throw new Error(`Service ${name} not found`);
    }
  }

  /**
   * Clean up resources
   */
  public async dispose(): Promise<void> {
    await this.prisma.$disconnect();
    this.repositories.clear();
    this.services.clear();
  }
}

/**
 * Fastify plugin to inject service factory
 */
export async function serviceFactoryPlugin(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const factory = ServiceFactory.getInstance(options.prisma);
  
  fastify.decorate('serviceFactory', factory);
  
  fastify.addHook('onClose', async () => {
    await factory.dispose();
  });
}

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    serviceFactory: ServiceFactory;
  }
}