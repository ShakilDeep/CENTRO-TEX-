import { z } from 'zod';

export class ValidationSchemas {
  static loginSchema = z.object({
    email: z.string().email("Invalid email format").nonempty("Email is required"),
    password: z.string().min(6, "Password must be at least 6 characters")
  });

  static qrSampleIdSchema = z.string().regex(/^[A-Z]{2}-\d{4}-\d{3}$/, "Invalid sample ID format. Expected: UK-2024-001");
  
  static qrLocationIdSchema = z.string().uuid("Invalid location ID format");

  static locationSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
    type: z.enum(["Showroom", "Warehouse", "Office"], {
      error: () => "Invalid location type"
    }),
    office: z.enum(["BD", "NY", "LA"], {
      error: () => "Invalid office"
    }),
    building: z.string().max(50, "Building name too long").optional(),
    floor: z.string().max(10, "Floor name too long").optional(),
    capacity: z.number().min(1, "Capacity must be at least 1").max(1000, "Capacity must be 1000 or less"),
    is_active: z.boolean().optional()
  });

  static sampleSchema = z.object({
    sample_type: z.string().min(1, "Sample type is required").max(50, "Sample type too long"),
    description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
    location_id: z.string().uuid("Invalid location ID"),
    reference: z.string().max(100, "Reference must be 100 characters or less").optional()
  });
}
