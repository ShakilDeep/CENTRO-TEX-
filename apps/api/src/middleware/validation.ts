import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

export const validationErrorResponse = {
  statusCode: 400,
  error: 'Bad Request',
  message: 'Validation failed'
};

export const loginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string' },
    mfaCode: { type: 'string' }
  }
};

export const logoutSchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: { type: 'string', minLength: 1 }
  }
};

export const refreshTokenSchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: { type: 'string', minLength: 1 }
  }
};

export const ssoCallbackSchema = {
  type: 'object',
  required: ['code', 'state'],
  properties: {
    code: { type: 'string', minLength: 1 },
    state: { type: 'string', minLength: 1 },
    provider: { type: 'string' }
  }
};

export const createSampleSchema = {
  type: 'object',
  required: ['buyer_id', 'sample_type', 'description'],
  properties: {
    buyer_id: { type: 'string', minLength: 1 },
    sample_type: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    photo_url: { type: 'string' }
  }
};

export const dispatchReceiveSchema = {
  type: 'object',
  required: ['sender', 'rfid_epc'],
  properties: {
    sender: { type: 'string', minLength: 1 },
    rfid_epc: { type: 'string', minLength: 1 }
  }
};

export const merchandiserReceiveSchema = {
  type: 'object',
  required: ['rfid_epc'],
  properties: {
    rfid_epc: { type: 'string', minLength: 1 }
  }
};

export const storeSampleSchema = {
  type: 'object',
  required: ['rfid_epc', 'location_id'],
  properties: {
    rfid_epc: { type: 'string', minLength: 1 },
    location_id: { type: 'string', minLength: 1 } // UUID of storage_locations
  }
};

export const disposeSampleSchema = {
  type: 'object',
  required: ['rfid_epc', 'reason'],
  properties: {
    rfid_epc: { type: 'string', minLength: 1 },
    reason: { type: 'string', minLength: 1 },
    comment: { type: 'string' }
  }
};

export const initiateTransferSchema = {
  type: 'object',
  required: ['rfid_epc', 'to_user_id', 'reason'],
  properties: {
    rfid_epc: { type: 'string', minLength: 1 },
    to_user_id: { type: 'string', minLength: 1 },
    reason: { type: 'string', minLength: 1 }
  }
};

export async function validateSampleId(fastify: FastifyInstance, sampleId: string): Promise<boolean> {
  const sample = await prisma.samples.findUnique({ where: { sample_id: sampleId }, select: { id: true } });
  return !!sample;
}

export async function validateLocationId(fastify: FastifyInstance, locationId: string): Promise<boolean> {
  const loc = await prisma.storageLocations.findUnique({ where: { id: locationId }, select: { id: true } });
  return !!loc;
}

export async function validateUserId(fastify: FastifyInstance, userId: string): Promise<boolean> {
  const user = await prisma.users.findUnique({ where: { id: userId }, select: { id: true } });
  return !!user;
}
