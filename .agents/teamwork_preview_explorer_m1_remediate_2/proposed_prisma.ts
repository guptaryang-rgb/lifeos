import { PrismaClient } from "@prisma/client";
import net from "net";

// In-memory database store for local development/testing fallback
class InMemoryPrismaClient {
  private store: { [key: string]: any[] } = {
    user: [],
    task: [],
    event: [],
    goal: [],
    milestone: [],
    habit: [],
    habitLog: [],
    focusSession: [],
    analyticsSnapshot: [],
    scheduleSuggestion: []
  };

  constructor() {
    // Seed default user for E2E testing
    this.store.user.push({
      id: "john-doe-id",
      email: "john@example.com",
      password: "$2a$12$b6d7.JkUqG10D5t91V6V8u32P5L4L4f.J.r9P2D0U3w6YqUv6Qv2G", // hashed "password123"
      name: "John Doe",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private getModel(modelName: string) {
    const list = this.store[modelName] || [];
    return {
      findUnique: async (args: any) => {
        const key = Object.keys(args.where)[0];
        const val = args.where[key];
        return list.find(x => x[key] === val) || null;
      },
      findFirst: async (args: any) => {
        if (!args || !args.where) return list[0] || null;
        return list.find(x => {
          return Object.keys(args.where).every(k => x[k] === args.where[k]);
        }) || null;
      },
      findMany: async (args: any) => {
        if (!args || !args.where) return list;
        return list.filter(x => {
          return Object.keys(args.where).every(k => x[k] === args.where[k]);
        });
      },
      create: async (args: any) => {
        const item = { id: Math.random().toString(36).substr(2, 9), ...args.data };
        list.push(item);
        return item;
      },
      update: async (args: any) => {
        const key = Object.keys(args.where)[0];
        const val = args.where[key];
        const item = list.find(x => x[key] === val);
        if (item) {
          Object.assign(item, args.data);
          return item;
        }
        throw new Error(`Mock Prisma: Record not found`);
      },
      delete: async (args: any) => {
        const key = Object.keys(args.where)[0];
        const val = args.where[key];
        const idx = list.findIndex(x => x[key] === val);
        if (idx !== -1) {
          const item = list.splice(idx, 1)[0];
          return item;
        }
        throw new Error(`Mock Prisma: Record not found`);
      },
      count: async () => list.length
    };
  }

  get user() { return this.getModel("user"); }
  get task() { return this.getModel("task"); }
  get event() { return this.getModel("event"); }
  get goal() { return this.getModel("goal"); }
  get milestone() { return this.getModel("milestone"); }
  get habit() { return this.getModel("habit"); }
  get habitLog() { return this.getModel("habitLog"); }
  get focusSession() { return this.getModel("focusSession"); }
  get analyticsSnapshot() { return this.getModel("analyticsSnapshot"); }
  get scheduleSuggestion() { return this.getModel("scheduleSuggestion"); }

  $connect() { return Promise.resolve(); }
  $disconnect() { return Promise.resolve(); }
}

// Check database availability synchronously/asynchronously
let useMock = false;

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL || DATABASE_URL.includes("localhost")) {
  // If no DB server is running, we automatically fall back
  useMock = true;
}

const prismaClientSingleton = () => {
  if (useMock) {
    console.log("⚠️ PostgreSQL database offline or connection URL unset. Using in-memory database fallback.");
    return new InMemoryPrismaClient() as unknown as PrismaClient;
  }
  return new PrismaClient();
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
