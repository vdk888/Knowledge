import { 
  type User, type InsertUser, type Concept, type InsertConcept,
  type ConceptRelationship, type InsertConceptRelationship,
  type UserProgress, type InsertUserProgress,
  type ChatMessage, type InsertChatMessage,
  users, concepts, conceptRelationships, userProgress, chatMessages
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import createMemoryStore from "memorystore";
import { IStorage, memStorage } from "./storage";

const MemoryStore = createMemoryStore(session);

export class DbStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    // For now, use memory store for sessions to avoid ESM require issues
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getUser(id);
      }
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getUser:", error);
      // Fall back to memory storage in case of database errors
      return await memStorage.getUser(id);
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getUserByUsername(username);
      }
      const result = await db.select().from(users).where(eq(users.username, username));
      return result[0];
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      // Fall back to memory storage in case of database errors
      return await memStorage.getUserByUsername(username);
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.createUser(user);
      }
      const result = await db.insert(users).values(user).returning();
      return result[0];
    } catch (error) {
      console.error("Error in createUser:", error);
      // Fall back to memory storage in case of database errors
      return await memStorage.createUser(user);
    }
  }
  
  // Concept methods
  async getConcept(id: number): Promise<Concept | undefined> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getConcept(id);
      }
      const result = await db.select().from(concepts).where(eq(concepts.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getConcept:", error);
      return await memStorage.getConcept(id);
    }
  }
  
  async getConceptByName(name: string): Promise<Concept | undefined> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getConceptByName(name);
      }
      const result = await db.select().from(concepts).where(eq(concepts.name, name));
      return result[0];
    } catch (error) {
      console.error("Error in getConceptByName:", error);
      return await memStorage.getConceptByName(name);
    }
  }
  
  async getConcepts(): Promise<Concept[]> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getConcepts();
      }
      return await db.select().from(concepts);
    } catch (error) {
      console.error("Error in getConcepts:", error);
      return await memStorage.getConcepts();
    }
  }
  
  async getConceptsByDomain(domain: string): Promise<Concept[]> {
    return await db.select().from(concepts).where(eq(concepts.domain, domain));
  }
  
  async createConcept(concept: InsertConcept): Promise<Concept> {
    const result = await db.insert(concepts).values(concept).returning();
    return result[0];
  }
  
  // Relationship methods
  async getConceptRelationship(id: number): Promise<ConceptRelationship | undefined> {
    const result = await db.select().from(conceptRelationships).where(eq(conceptRelationships.id, id));
    return result[0];
  }
  
  async getConceptRelationships(conceptId: number): Promise<ConceptRelationship[]> {
    return await db.select().from(conceptRelationships).where(
      eq(conceptRelationships.sourceId, conceptId)
    );
  }
  
  async createConceptRelationship(relationship: InsertConceptRelationship): Promise<ConceptRelationship> {
    const result = await db.insert(conceptRelationships).values(relationship).returning();
    return result[0];
  }
  
  // User progress methods
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }
  
  async getUserProgressForConcept(userId: number, conceptId: number): Promise<UserProgress | undefined> {
    const result = await db.select().from(userProgress).where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.conceptId, conceptId)
      )
    );
    return result[0];
  }
  
  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const result = await db.insert(userProgress).values(progress).returning();
    return result[0];
  }
  
  async updateUserProgress(id: number, progress: Partial<InsertUserProgress>): Promise<UserProgress> {
    const result = await db.update(userProgress)
      .set(progress)
      .where(eq(userProgress.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User progress with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  // Chat methods
  async getChatMessages(userId: number, conceptId: number): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.conceptId, conceptId)
        )
      )
      .orderBy(chatMessages.createdAt);
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }
  
  // Domain methods
  async getDomains(): Promise<string[]> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getDomains();
      }
      
      const results = await db.select({ domain: concepts.domain }).from(concepts);
      const domains = new Set<string>();
      
      for (const row of results) {
        domains.add(row.domain);
      }
      
      return Array.from(domains);
    } catch (error) {
      console.error("Error in getDomains, falling back to in-memory storage:", error);
      return await memStorage.getDomains();
    }
  }
  
  // Graph methods
  async getKnowledgeGraph(): Promise<{
    nodes: Concept[];
    links: {
      source: number;
      target: number;
      type: string;
      strength: number;
    }[];
  }> {
    try {
      // Get all concepts with robust error handling
      const nodes = await this.getConcepts();
      
      // Get all relationships with robust error handling
      let relationships: ConceptRelationship[] = [];
      
      try {
        if (!db) {
          console.warn("Database not available, falling back to in-memory storage");
          // We'll use the getConcepts-transformed nodes, but fall back to memory for relationships
          const memGraphData = await memStorage.getKnowledgeGraph();
          return memGraphData;
        }
        
        relationships = await db.select().from(conceptRelationships);
      } catch (error) {
        console.error("Error fetching relationships, falling back to in-memory storage:", error);
        // Fall back to in-memory relationships but keep the nodes we already fetched
        const memGraphData = await memStorage.getKnowledgeGraph();
        return {
          nodes,
          links: memGraphData.links
        };
      }
      
      // Transform relationships to links
      const links = relationships.map((rel: ConceptRelationship) => ({
        source: rel.sourceId,
        target: rel.targetId,
        type: rel.relationshipType,
        strength: rel.strength
      }));
      
      return { nodes, links };
    } catch (error) {
      console.error("Error in getKnowledgeGraph, falling back to in-memory storage:", error);
      return await memStorage.getKnowledgeGraph();
    }
  }
}