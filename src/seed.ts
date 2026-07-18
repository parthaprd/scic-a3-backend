/**
 * Seed Script — Eventify Task Management
 *
 * Creates:
 *  - 1 user  : user@example.com / User@123
 *  - 20 tasks spread across all categories, priorities, statuses, and due dates
 *
 * Run with:
 *   npx ts-node src/seed.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';
import { User } from './models/User';
import { Task } from './models/Task';
import { TaskCategory, TaskPriority, TaskStatus } from './types';

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

// Force Node.js to use Google DNS so SRV records resolve correctly on Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eventify_tasks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return a Date offset from today by `days` (positive = future, negative = past). */
const d = (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
    console.log('🔌 Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to:', MONGO_URI);

    // ── 1. Upsert the demo user ────────────────────────────────────────────────
    const email = 'user@example.com';
    const plainPassword = 'User@123';

    let user = await User.findOne({ email });

    if (user) {
        console.log('👤 User already exists — updating password…');
        user.password = await bcrypt.hash(plainPassword, 10);
        user.name = 'Demo User';
        await user.save();
    } else {
        console.log('👤 Creating user…');
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        user = await User.create({
            name: 'Demo User',
            email,
            password: hashedPassword,
            role: 'user',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser',
        });
    }

    const userId = (user._id as mongoose.Types.ObjectId).toString();
    const userName = user.name;
    const userEmail = user.email;

    console.log(`✅ User ready — id: ${userId}`);

    // ── 2. Clear existing tasks owned by this user ─────────────────────────────
    const deleted = await Task.deleteMany({ 'createdBy.email': userEmail });
    console.log(`🗑️  Removed ${deleted.deletedCount} existing task(s) for this user`);

    // ── 3. Build task list ─────────────────────────────────────────────────────
    const tasksData: Array<{
        title: string;
        description: string;
        category: TaskCategory;
        priority: TaskPriority;
        status: TaskStatus;
        dueDate: Date;
        tags: string[];
        attachments: string[];
        createdAt: Date;
        updatedAt: Date;
        createdBy: { userId: string; name: string; email: string };
    }> = [
            // ── Work ──────────────────────────────────────────────────────────────────
            {
                title: 'Design System Architecture',
                description:
                    'Document the overall system architecture including microservices boundaries, API contracts, database schemas, and deployment topology for the Eventify platform.',
                category: 'Work',
                priority: 'high',
                status: 'completed',
                dueDate: d(2),
                tags: ['architecture', 'design', 'backend'],
                attachments: ['https://example.com/architecture-v1.pdf'],
                createdAt: d(-10),
                updatedAt: d(-3),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Implement JWT Authentication Flow',
                description:
                    'Build secure login, registration, token refresh, and logout endpoints using JWT. Include rate-limiting on auth routes and proper error messages.',
                category: 'Work',
                priority: 'high',
                status: 'in-progress',
                dueDate: d(3),
                tags: ['auth', 'security', 'jwt'],
                attachments: [],
                createdAt: d(-5),
                updatedAt: d(-1),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Write Unit Tests for Task Controller',
                description:
                    'Achieve ≥ 80 % test coverage on the task controller. Cover happy paths, validation errors, 404s, and authorization failures.',
                category: 'Work',
                priority: 'medium',
                status: 'todo',
                dueDate: d(7),
                tags: ['testing', 'jest', 'backend'],
                attachments: [],
                createdAt: d(-3),
                updatedAt: d(-3),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Code Review — Frontend Dashboard PR',
                description:
                    'Review the open pull request for the new analytics dashboard component. Check for accessibility issues, performance regressions, and adherence to the design system.',
                category: 'Work',
                priority: 'medium',
                status: 'todo',
                dueDate: d(1),
                tags: ['code-review', 'frontend'],
                attachments: [],
                createdAt: d(-1),
                updatedAt: d(-1),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Deploy Backend to Production',
                description:
                    'Package the Node/Express API into a Docker image, push to registry, update Kubernetes manifests, and deploy to production with a blue-green strategy.',
                category: 'Work',
                priority: 'high',
                status: 'in-progress',
                dueDate: d(5),
                tags: ['devops', 'docker', 'kubernetes'],
                attachments: ['https://example.com/deployment-checklist.md'],
                createdAt: d(-2),
                updatedAt: d(0),
                createdBy: { userId, name: userName, email: userEmail },
            },

            // ── Personal ──────────────────────────────────────────────────────────────
            {
                title: 'Plan Weekend Hiking Trip',
                description:
                    'Research trails within 100 km, book accommodation, prepare gear list (tent, sleeping bag, first-aid kit), and share itinerary with friends.',
                category: 'Personal',
                priority: 'low',
                status: 'todo',
                dueDate: d(10),
                tags: ['travel', 'outdoors', 'weekend'],
                attachments: [],
                createdAt: d(-4),
                updatedAt: d(-4),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Organise Home Office Desk',
                description:
                    'Clear cable clutter, label power strips, add monitor riser, and set up a minimal aesthetic workspace with proper lighting.',
                category: 'Personal',
                priority: 'low',
                status: 'completed',
                dueDate: d(1),
                tags: ['productivity', 'home'],
                attachments: [],
                createdAt: d(-7),
                updatedAt: d(-2),
                createdBy: { userId, name: userName, email: userEmail },
            },

            // ── Shopping ──────────────────────────────────────────────────────────────
            {
                title: 'Weekly Grocery Run',
                description:
                    'Buy fresh vegetables (spinach, broccoli, bell peppers), fruits, whole-grain bread, eggs, Greek yogurt, and coffee beans.',
                category: 'Shopping',
                priority: 'medium',
                status: 'todo',
                dueDate: d(2),
                tags: ['groceries', 'weekly'],
                attachments: [],
                createdAt: d(-1),
                updatedAt: d(-1),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Purchase New Mechanical Keyboard',
                description:
                    'Research TKL mechanical keyboards under ₹8 000. Compare switches (Red, Brown, Blue), firmware support, and warranty. Order the chosen model.',
                category: 'Shopping',
                priority: 'low',
                status: 'in-progress',
                dueDate: d(6),
                tags: ['tech', 'peripherals'],
                attachments: ['https://example.com/keyboard-comparison.xlsx'],
                createdAt: d(-3),
                updatedAt: d(-1),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Restock Office Supplies',
                description:
                    'Order printer paper, pens, sticky notes, whiteboard markers, and a new webcam for video calls.',
                category: 'Shopping',
                priority: 'low',
                status: 'completed',
                dueDate: d(3),
                tags: ['office', 'supplies'],
                attachments: [],
                createdAt: d(-6),
                updatedAt: d(-4),
                createdBy: { userId, name: userName, email: userEmail },
            },

            // ── Health ────────────────────────────────────────────────────────────────
            {
                title: '30-Minute Morning Jog',
                description:
                    'Complete a 5 km morning jog maintaining a pace under 6 min/km. Track on Strava and log heart rate data.',
                category: 'Health',
                priority: 'medium',
                status: 'completed',
                dueDate: d(1),
                tags: ['fitness', 'cardio', 'morning'],
                attachments: [],
                createdAt: d(-2),
                updatedAt: d(-1),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Schedule Annual Health Check-up',
                description:
                    'Book appointments for blood tests (CBC, lipid panel, HbA1c), eye examination, and dental cleaning.',
                category: 'Health',
                priority: 'high',
                status: 'todo',
                dueDate: d(14),
                tags: ['medical', 'preventive-care'],
                attachments: [],
                createdAt: d(-5),
                updatedAt: d(-5),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Meal Prep for the Week',
                description:
                    'Cook and portion 5 days of lunches and dinners. Focus on high-protein, low-carb meals. Include overnight oats for breakfast.',
                category: 'Health',
                priority: 'medium',
                status: 'in-progress',
                dueDate: d(2),
                tags: ['nutrition', 'meal-prep'],
                attachments: [],
                createdAt: d(-1),
                updatedAt: d(0),
                createdBy: { userId, name: userName, email: userEmail },
            },

            // ── Finance ───────────────────────────────────────────────────────────────
            {
                title: 'Review Q2 Budget vs Actuals',
                description:
                    'Pull expense reports from accounting, compare against Q2 budget lines, identify over-runs, and prepare a variance analysis slide for the board.',
                category: 'Finance',
                priority: 'high',
                status: 'completed',
                dueDate: d(4),
                tags: ['budget', 'reporting', 'q2'],
                attachments: ['https://example.com/q2-budget.xlsx'],
                createdAt: d(-8),
                updatedAt: d(-3),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Set Up Automated SIP Investments',
                description:
                    'Configure monthly SIP transfers of ₹10 000 into a diversified mutual fund portfolio (60 % equity, 30 % debt, 10 % gold) via the broker app.',
                category: 'Finance',
                priority: 'medium',
                status: 'todo',
                dueDate: d(8),
                tags: ['investments', 'sip', 'savings'],
                attachments: [],
                createdAt: d(-2),
                updatedAt: d(-2),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Audit Recurring Subscriptions',
                description:
                    'List all monthly/annual subscriptions (SaaS tools, streaming, cloud), cancel unused ones, and renegotiate enterprise plans.',
                category: 'Finance',
                priority: 'low',
                status: 'in-progress',
                dueDate: d(5),
                tags: ['subscriptions', 'cost-cutting'],
                attachments: [],
                createdAt: d(-4),
                updatedAt: d(-1),
                createdBy: { userId, name: userName, email: userEmail },
            },

            // ── Education ─────────────────────────────────────────────────────────────
            {
                title: 'Complete React 19 & Next.js 15 Course',
                description:
                    'Finish the remaining 8 modules on Server Components, React Server Actions, Partial Pre-rendering, and the new caching model.',
                category: 'Education',
                priority: 'high',
                status: 'in-progress',
                dueDate: d(12),
                tags: ['react', 'nextjs', 'course'],
                attachments: [],
                createdAt: d(-10),
                updatedAt: d(-1),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Read "Designing Data-Intensive Applications"',
                description:
                    'Read chapters 7–9 covering transactions, distributed systems, and consistency guarantees. Take notes on key patterns.',
                category: 'Education',
                priority: 'medium',
                status: 'todo',
                dueDate: d(20),
                tags: ['book', 'distributed-systems'],
                attachments: [],
                createdAt: d(-3),
                updatedAt: d(-3),
                createdBy: { userId, name: userName, email: userEmail },
            },

            // ── Other ─────────────────────────────────────────────────────────────────
            {
                title: 'Update LinkedIn Profile & Portfolio',
                description:
                    'Refresh LinkedIn headline, add recent projects with screenshots, update resume PDF, and request recommendations from 2 colleagues.',
                category: 'Other',
                priority: 'low',
                status: 'todo',
                dueDate: d(15),
                tags: ['career', 'networking'],
                attachments: [],
                createdAt: d(-6),
                updatedAt: d(-6),
                createdBy: { userId, name: userName, email: userEmail },
            },
            {
                title: 'Volunteer at Local Community Garden',
                description:
                    'Attend the Saturday planting session at the community garden, help with composting, and sign up for the monthly maintenance roster.',
                category: 'Other',
                priority: 'low',
                status: 'completed',
                dueDate: d(9),
                tags: ['community', 'volunteer'],
                attachments: [],
                createdAt: d(-9),
                updatedAt: d(-5),
                createdBy: { userId, name: userName, email: userEmail },
            },
        ];

    // ── 4. Insert tasks ────────────────────────────────────────────────────────
    // Use insertMany with timestamps option off so our manual dates are respected.
    await Task.insertMany(tasksData, { timestamps: false } as any);
    console.log(`✅ Inserted ${tasksData.length} tasks`);

    // ── 5. Summary ────────────────────────────────────────────────────────────
    const summary = {
        total: tasksData.length,
        byStatus: {
            todo: tasksData.filter((t) => t.status === 'todo').length,
            'in-progress': tasksData.filter((t) => t.status === 'in-progress').length,
            completed: tasksData.filter((t) => t.status === 'completed').length,
        },
        byCategory: [...new Set(tasksData.map((t) => t.category))].reduce(
            (acc, cat) => ({
                ...acc,
                [cat]: tasksData.filter((t) => t.category === cat).length,
            }),
            {} as Record<string, number>
        ),
        byPriority: {
            high: tasksData.filter((t) => t.priority === 'high').length,
            medium: tasksData.filter((t) => t.priority === 'medium').length,
            low: tasksData.filter((t) => t.priority === 'low').length,
        },
    };

    console.log('\n📊 Seed Summary:');
    console.table(summary.byStatus);
    console.table(summary.byCategory);
    console.table(summary.byPriority);

    console.log('\n🔑 Login credentials:');
    console.log('   Email   :', email);
    console.log('   Password:', plainPassword);
    console.log('\n🎉 Seed complete!');

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
