import { 
  users, concepts, conceptRelationships, userProgress, chatMessages,
  type User, type InsertUser, type Concept, type InsertConcept,
  type ConceptRelationship, type InsertConceptRelationship,
  type UserProgress, type InsertUserProgress,
  type ChatMessage, type InsertChatMessage
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Concept methods
  getConcept(id: number): Promise<Concept | undefined>;
  getConceptByName(name: string): Promise<Concept | undefined>;
  getConcepts(): Promise<Concept[]>;
  getConceptsByDomain(domain: string): Promise<Concept[]>;
  createConcept(concept: InsertConcept): Promise<Concept>;
  
  // Relationship methods
  getConceptRelationship(id: number): Promise<ConceptRelationship | undefined>;
  getConceptRelationships(conceptId: number): Promise<ConceptRelationship[]>;
  createConceptRelationship(relationship: InsertConceptRelationship): Promise<ConceptRelationship>;
  
  // User progress methods
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getUserProgressForConcept(userId: number, conceptId: number): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(id: number, progress: Partial<InsertUserProgress>): Promise<UserProgress>;
  
  // Chat methods
  getChatMessages(userId: number, conceptId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Domain methods
  getDomains(): Promise<string[]>;
  
  // Graph methods
  getKnowledgeGraph(): Promise<{
    nodes: Concept[];
    links: {
      source: number;
      target: number;
      type: string;
      strength: number;
    }[];
  }>;
  
  // Session store
  sessionStore: session.SessionStore;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private concepts: Map<number, Concept>;
  private conceptRelationships: Map<number, ConceptRelationship>;
  private userProgress: Map<number, UserProgress>;
  private chatMessages: Map<number, ChatMessage>;
  
  sessionStore: session.SessionStore;
  
  private userId: number = 1;
  private conceptId: number = 1;
  private relationshipId: number = 1;
  private progressId: number = 1;
  private messageId: number = 1;
  
  constructor() {
    this.users = new Map();
    this.concepts = new Map();
    this.conceptRelationships = new Map();
    this.userProgress = new Map();
    this.chatMessages = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Add some initial data for testing
    this.seedData();
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }
  
  // Concept methods
  async getConcept(id: number): Promise<Concept | undefined> {
    return this.concepts.get(id);
  }
  
  async getConceptByName(name: string): Promise<Concept | undefined> {
    return Array.from(this.concepts.values()).find(
      (concept) => concept.name === name
    );
  }
  
  async getConcepts(): Promise<Concept[]> {
    return Array.from(this.concepts.values());
  }
  
  async getConceptsByDomain(domain: string): Promise<Concept[]> {
    return Array.from(this.concepts.values()).filter(
      (concept) => concept.domain === domain
    );
  }
  
  async createConcept(insertConcept: InsertConcept): Promise<Concept> {
    const id = this.conceptId++;
    const now = new Date();
    const concept: Concept = { ...insertConcept, id, createdAt: now };
    this.concepts.set(id, concept);
    return concept;
  }
  
  // Relationship methods
  async getConceptRelationship(id: number): Promise<ConceptRelationship | undefined> {
    return this.conceptRelationships.get(id);
  }
  
  async getConceptRelationships(conceptId: number): Promise<ConceptRelationship[]> {
    return Array.from(this.conceptRelationships.values()).filter(
      (relationship) => 
        relationship.sourceId === conceptId || relationship.targetId === conceptId
    );
  }
  
  async createConceptRelationship(insertRelationship: InsertConceptRelationship): Promise<ConceptRelationship> {
    const id = this.relationshipId++;
    const now = new Date();
    const relationship: ConceptRelationship = { ...insertRelationship, id, createdAt: now };
    this.conceptRelationships.set(id, relationship);
    return relationship;
  }
  
  // User progress methods
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter(
      (progress) => progress.userId === userId
    );
  }
  
  async getUserProgressForConcept(userId: number, conceptId: number): Promise<UserProgress | undefined> {
    return Array.from(this.userProgress.values()).find(
      (progress) => progress.userId === userId && progress.conceptId === conceptId
    );
  }
  
  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const id = this.progressId++;
    const progress: UserProgress = { ...insertProgress, id };
    this.userProgress.set(id, progress);
    return progress;
  }
  
  async updateUserProgress(id: number, progressUpdate: Partial<InsertUserProgress>): Promise<UserProgress> {
    const existingProgress = this.userProgress.get(id);
    if (!existingProgress) {
      throw new Error(`User progress with ID ${id} not found`);
    }
    
    const updatedProgress = { ...existingProgress, ...progressUpdate };
    this.userProgress.set(id, updatedProgress);
    return updatedProgress;
  }
  
  // Chat methods
  async getChatMessages(userId: number, conceptId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter((message) => message.userId === userId && message.conceptId === conceptId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.messageId++;
    const now = new Date();
    const message: ChatMessage = { ...insertMessage, id, createdAt: now };
    this.chatMessages.set(id, message);
    return message;
  }
  
  // Domain methods
  async getDomains(): Promise<string[]> {
    const domains = new Set<string>();
    for (const concept of this.concepts.values()) {
      domains.add(concept.domain);
    }
    return Array.from(domains);
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
    const nodes = Array.from(this.concepts.values());
    
    const links = Array.from(this.conceptRelationships.values()).map(rel => ({
      source: rel.sourceId,
      target: rel.targetId,
      type: rel.relationshipType,
      strength: rel.strength
    }));
    
    return { nodes, links };
  }
  
  // Seed some initial data for testing purposes
  private seedData() {
    // Create sample concepts for Physics domain
    const classicalMechanics = this.seedConcept({
      name: "Classical Mechanics",
      domain: "Physics",
      difficulty: "intermediate",
      description: "The study of the motion of bodies under the action of forces"
    });
    
    const newtonsLaws = this.seedConcept({
      name: "Newton's Laws",
      domain: "Physics",
      difficulty: "intermediate",
      description: "Three fundamental laws that form the foundation of classical mechanics"
    });
    
    const conservationLaws = this.seedConcept({
      name: "Conservation Laws",
      domain: "Physics",
      difficulty: "intermediate",
      description: "Principles stating that certain physical properties do not change over time"
    });
    
    const kinematics = this.seedConcept({
      name: "Kinematics",
      domain: "Physics",
      difficulty: "beginner",
      description: "The study of motion without considering its causes"
    });
    
    const rotationalMotion = this.seedConcept({
      name: "Rotational Motion",
      domain: "Physics",
      difficulty: "intermediate",
      description: "The study of the motion of objects around an axis"
    });
    
    // Create sample concepts for Mathematics domain
    const vectorCalculus = this.seedConcept({
      name: "Vector Calculus",
      domain: "Mathematics",
      difficulty: "advanced",
      description: "The study of calculus in vector spaces"
    });
    
    const differentialEquations = this.seedConcept({
      name: "Differential Equations",
      domain: "Mathematics",
      difficulty: "advanced",
      description: "Equations that relate functions with their derivatives"
    });
    
    const basicCalculus = this.seedConcept({
      name: "Basic Calculus",
      domain: "Mathematics",
      difficulty: "intermediate",
      description: "The foundation of calculus covering limits, derivatives, and integrals"
    });
    
    // Create sample concepts for Computer Science domain
    const dataStructures = this.seedConcept({
      name: "Data Structures",
      domain: "Computer Science",
      difficulty: "intermediate",
      description: "Ways of organizing and storing data for efficient access and modification"
    });
    
    const algorithmAnalysis = this.seedConcept({
      name: "Algorithm Analysis",
      domain: "Computer Science",
      difficulty: "intermediate",
      description: "The determination of the computational complexity of algorithms"
    });
    
    // Create relationships
    this.seedRelationship({
      sourceId: classicalMechanics.id,
      targetId: newtonsLaws.id,
      relationshipType: "related",
      strength: 9
    });
    
    this.seedRelationship({
      sourceId: classicalMechanics.id,
      targetId: conservationLaws.id,
      relationshipType: "related",
      strength: 8
    });
    
    this.seedRelationship({
      sourceId: classicalMechanics.id,
      targetId: kinematics.id,
      relationshipType: "related",
      strength: 7
    });
    
    this.seedRelationship({
      sourceId: classicalMechanics.id,
      targetId: rotationalMotion.id,
      relationshipType: "related",
      strength: 7
    });
    
    this.seedRelationship({
      sourceId: vectorCalculus.id,
      targetId: classicalMechanics.id,
      relationshipType: "prerequisite",
      strength: 6
    });
    
    this.seedRelationship({
      sourceId: basicCalculus.id,
      targetId: classicalMechanics.id,
      relationshipType: "prerequisite",
      strength: 8
    });
    
    this.seedRelationship({
      sourceId: classicalMechanics.id,
      targetId: differentialEquations.id,
      relationshipType: "related",
      strength: 7
    });
    
    this.seedRelationship({
      sourceId: newtonsLaws.id,
      targetId: kinematics.id,
      relationshipType: "related",
      strength: 8
    });
    
    this.seedRelationship({
      sourceId: conservationLaws.id,
      targetId: differentialEquations.id,
      relationshipType: "related",
      strength: 6
    });
    
    this.seedRelationship({
      sourceId: vectorCalculus.id,
      targetId: conservationLaws.id,
      relationshipType: "prerequisite",
      strength: 7
    });
  }
  
  private seedConcept(concept: InsertConcept): Concept {
    const id = this.conceptId++;
    const now = new Date();
    const newConcept: Concept = { ...concept, id, createdAt: now };
    this.concepts.set(id, newConcept);
    return newConcept;
  }
  
  private seedRelationship(relationship: InsertConceptRelationship): ConceptRelationship {
    const id = this.relationshipId++;
    const now = new Date();
    const newRelationship: ConceptRelationship = { ...relationship, id, createdAt: now };
    this.conceptRelationships.set(id, newRelationship);
    return newRelationship;
  }
}

export const storage = new MemStorage();
