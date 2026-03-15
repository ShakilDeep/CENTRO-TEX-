/**
 * Seed script to populate Samples + Inventory tables with realistic test data.
 * Run: npx tsx prisma/seed-inventory.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_TYPES = ['FABRIC', 'YARN', 'THREAD', 'ACCESSORY', 'TRIM'] as const;
const OFFICES = ['UK', 'BD'] as const;
const STATUSES = ['CHECKED_IN', 'CHECKED_OUT', 'PENDING_RETURN', 'OVERDUE'] as const;
const UNITS = ['meters', 'yards', 'kg', 'pcs', 'rolls'] as const;

const BUYER_NAMES = [
    'H&M Group', 'Primark', 'Next PLC', 'ASOS', 'Marks & Spencer',
    'Zara / Inditex', 'Uniqlo', 'GAP Inc.', 'Tesco', 'Debenhams',
    'John Lewis', 'Sainsbury', 'Matalan', 'New Look', 'River Island',
];

const DESCRIPTIONS: Record<string, string[]> = {
    FABRIC: [
        '100% Cotton Twill 240gsm', 'Polyester Blend Chiffon 80gsm',
        'Organic Linen Canvas 300gsm', 'Viscose Jersey Knit 180gsm',
        'Denim 12oz Indigo Wash', 'Silk Charmeuse 19mm', 'Nylon Ripstop 70D',
        'Bamboo Modal Fleece 280gsm', 'Recycled Poly Satin 120gsm',
    ],
    YARN: [
        '30/1 Combed Cotton Ring Spun', '20/2 Melange Yarn Grey',
        'Ne 40/1 Compact Siro', 'Acrylic Blended 28/2 HB',
        'Slub Yarn Ne 16/1 Open End',
    ],
    THREAD: [
        'Polyester Core Spun 40/2', 'Cotton Sewing Thread 50/3',
        'Tex 60 Bonded Nylon', 'Embroidery Thread Rayon 40wt',
    ],
    ACCESSORY: [
        'YKK Zipper #5 Brass', 'Corozo Button 20L 4-Hole',
        'Metal Snap Button 15mm', 'Elastic Waistband 30mm',
        'Woven Label - Main Brand', 'Hang Tag Recycled Kraft',
    ],
    TRIM: [
        'Grosgrain Ribbon 25mm', 'Lace Trim Guipure 50mm',
        'Bias Binding Satin 20mm', 'Rib Collar 1x1 Cotton Lycra',
        'Drawcord Waxed Cotton 5mm',
    ],
};

function randomPick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateSampleId(index: number): string {
    const prefix = 'CTX';
    const year = '26';
    const seq = String(index + 1).padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
}

async function main() {
    console.log('🌱 Seeding Samples + Inventory...\n');

    // 1. Fetch existing locations & users
    const locations = await prisma.locations.findMany({ where: { is_active: true } });
    const users = await prisma.users.findMany({ where: { is_active: true } });

    if (locations.length === 0) {
        console.error('❌ No locations found. Run `npx prisma db seed` first.');
        process.exit(1);
    }

    console.log(`  Found ${locations.length} locations, ${users.length} users\n`);

    // 2. Check for existing samples to avoid duplicate sample_ids
    const existingCount = await prisma.samples.count();
    const startIndex = existingCount;
    const TOTAL_SAMPLES = 25;

    console.log(`  Existing samples: ${existingCount}. Creating ${TOTAL_SAMPLES} new samples starting at index ${startIndex}.\n`);

    for (let i = 0; i < TOTAL_SAMPLES; i++) {
        const idx = startIndex + i;
        const sampleType = randomPick(SAMPLE_TYPES);
        const office = randomPick(OFFICES);
        const buyer = randomPick(BUYER_NAMES);
        const location = randomPick(locations);
        const description = randomPick(DESCRIPTIONS[sampleType]);
        const sampleId = generateSampleId(idx);
        const status = randomPick(STATUSES);
        const unit = randomPick(UNITS);
        const quantity = parseFloat((Math.random() * 100 + 1).toFixed(2));

        // Optionally assign a user for checked-out samples
        const isCheckedOut = status === 'CHECKED_OUT' || status === 'PENDING_RETURN' || status === 'OVERDUE';
        const checkoutUser = isCheckedOut && users.length > 0 ? randomPick(users) : null;

        // Due date for overdue items should be in the past
        let dueDate: Date | null = null;
        if (status === 'OVERDUE') {
            const daysAgo = Math.floor(Math.random() * 30) + 1;
            dueDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        } else if (isCheckedOut) {
            const daysAhead = Math.floor(Math.random() * 14) + 1;
            dueDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
        }

        try {
            const sample = await prisma.samples.create({
                data: {
                    sample_id: sampleId,
                    sample_type: sampleType,
                    description,
                    buyer_name: buyer,
                    office,
                    qr_code_url: `http://localhost:3000/samples/${sampleId}`,
                    location_id: location.id,
                    checked_out_by: checkoutUser?.id ?? null,
                    checked_out_at: isCheckedOut ? new Date() : null,
                    due_date: dueDate,
                },
            });

            await prisma.inventory.create({
                data: {
                    sample_id: sample.id,
                    quantity,
                    unit,
                    status,
                    notes: isCheckedOut ? `Checked out to ${checkoutUser?.name ?? 'unknown'}` : null,
                },
            });

            console.log(`  ✅ [${i + 1}/${TOTAL_SAMPLES}] ${sampleId} (${sampleType} / ${office}) → status: ${status}`);
        } catch (err: any) {
            console.error(`  ❌ Failed to create ${sampleId}: ${err.message}`);
        }
    }

    // 3. Summary
    const totalSamples = await prisma.samples.count();
    const totalInventory = await prisma.inventory.count();
    console.log(`\n🎉 Done! Database now has ${totalSamples} samples and ${totalInventory} inventory records.\n`);
}

main()
    .catch((e) => {
        console.error('Fatal error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
