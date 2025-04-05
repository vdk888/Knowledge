import { 
  type User, type InsertUser, type Concept, type InsertConcept,
  type ConceptRelationship, type InsertConceptRelationship,
  type UserProgress, type InsertUserProgress,
  type ChatMessage, type InsertChatMessage,
  users, concepts, conceptRelationships, userProgress, chatMessages
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, desc, like } from "drizzle-orm"; // Import 'like'
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
    
    // Check db availability and warn if it's not available
    if (!db) {
      console.warn("PostgreSQL database connection not available, DbStorage will use in-memory fallbacks");
    } else {
      try {
        if (typeof db.select !== 'function' || typeof db.insert !== 'function') {
          console.warn("PostgreSQL database interface incomplete, DbStorage will use in-memory fallbacks");
        } else {
          console.log("Database storage initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing database storage:", error);
        console.warn("Falling back to in-memory storage for all operations");
      }
    }
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
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getConceptsByDomain(domain);
      }
      return await db.select().from(concepts).where(eq(concepts.domain, domain));
    } catch (error) {
      console.error("Error in getConceptsByDomain:", error);
      return await memStorage.getConceptsByDomain(domain);
    }
  }
  
  async searchConcepts(query: string): Promise<Concept[]> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.searchConcepts(query);
      }
      if (!query) {
        return []; // Return empty if query is empty
      }
      // Use 'like' for case-insensitive search (PostgreSQL specific: ILIKE)
      // Drizzle's 'like' typically maps to ILIKE on PostgreSQL
      return await db.select().from(concepts)
        .where(like(concepts.name, `%${query}%`)); 
    } catch (error) {
      console.error("Error in searchConcepts:", error);
      return await memStorage.searchConcepts(query); // Fallback
    }
  }
  
  async createConcept(concept: InsertConcept): Promise<Concept> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.createConcept(concept);
      }
      const result = await db.insert(concepts).values(concept).returning();
      return result[0];
    } catch (error) {
      console.error("Error in createConcept:", error);
      return await memStorage.createConcept(concept);
    }
  }
  
  // Relationship methods
  async getConceptRelationship(id: number): Promise<ConceptRelationship | undefined> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getConceptRelationship(id);
      }
      const result = await db.select().from(conceptRelationships).where(eq(conceptRelationships.id, id));
      return result[0];
    } catch (error) {
      console.error("Error in getConceptRelationship:", error);
      return await memStorage.getConceptRelationship(id);
    }
  }
  
  async getConceptRelationships(conceptId: number): Promise<ConceptRelationship[]> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getConceptRelationships(conceptId);
      }
      return await db.select().from(conceptRelationships).where(
        eq(conceptRelationships.sourceId, conceptId)
      );
    } catch (error) {
      console.error("Error in getConceptRelationships:", error);
      return await memStorage.getConceptRelationships(conceptId);
    }
  }
  
  async createConceptRelationship(relationship: InsertConceptRelationship): Promise<ConceptRelationship> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.createConceptRelationship(relationship);
      }
      const result = await db.insert(conceptRelationships).values(relationship).returning();
      return result[0];
    } catch (error) {
      console.error("Error in createConceptRelationship:", error);
      return await memStorage.createConceptRelationship(relationship);
    }
  }
  
  // User progress methods
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getUserProgress(userId);
      }
      return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
    } catch (error) {
      console.error("Error in getUserProgress:", error);
      return await memStorage.getUserProgress(userId);
    }
  }
  
  async getUserProgressForConcept(userId: number, conceptId: number): Promise<UserProgress | undefined> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getUserProgressForConcept(userId, conceptId);
      }
      const result = await db.select().from(userProgress).where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.conceptId, conceptId)
        )
      );
      return result[0];
    } catch (error) {
      console.error("Error in getUserProgressForConcept:", error);
      return await memStorage.getUserProgressForConcept(userId, conceptId);
    }
  }
  
  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.createUserProgress(progress);
      }
      const result = await db.insert(userProgress).values(progress).returning();
      return result[0];
    } catch (error) {
      console.error("Error in createUserProgress:", error);
      return await memStorage.createUserProgress(progress);
    }
  }
  
  async updateUserProgress(id: number, progress: Partial<InsertUserProgress>): Promise<UserProgress> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.updateUserProgress(id, progress);
      }
      const result = await db.update(userProgress)
        .set(progress)
        .where(eq(userProgress.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`User progress with ID ${id} not found`);
      }
      
      return result[0];
    } catch (error) {
      console.error("Error in updateUserProgress:", error);
      return await memStorage.updateUserProgress(id, progress);
    }
  }
  
  // Chat methods
  async getChatMessages(userId: number, conceptId: number): Promise<ChatMessage[]> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.getChatMessages(userId, conceptId);
      }
      return await db.select().from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            eq(chatMessages.conceptId, conceptId)
          )
        )
        .orderBy(chatMessages.createdAt);
    } catch (error) {
      console.error("Error in getChatMessages:", error);
      return await memStorage.getChatMessages(userId, conceptId);
    }
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    try {
      if (!db) {
        console.warn("Database not available, falling back to in-memory storage");
        return await memStorage.createChatMessage(message);
      }
      const result = await db.insert(chatMessages).values(message).returning();
      return result[0];
    } catch (error) {
      console.error("Error in createChatMessage:", error);
      return await memStorage.createChatMessage(message);
    }
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
