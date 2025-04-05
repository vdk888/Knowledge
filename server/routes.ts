import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateConceptExplanation, answerQuestion, generateQuiz } from "./openai";
import { z } from "zod";
import { insertChatMessageSchema, insertUserProgressSchema } from "@shared/schema";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Knowledge graph routes
  app.get("/api/concepts", async (req, res) => {
    try {
      const concepts = await storage.getConcepts();
      res.json(concepts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch concepts" });
    }
  });
  
  // New route for searching concepts (Moved BEFORE /:id)
  app.get("/api/concepts/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]); // Return empty array if no query
      }
      const concepts = await storage.searchConcepts(query);
      res.json(concepts);
    } catch (error) {
      res.status(500).json({ error: "Failed to search concepts" });
    }
  });
  
  app.get("/api/concepts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const concept = await storage.getConcept(id);
      
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      res.json(concept);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch concept" });
    }
  });
  
  app.get("/api/domains", async (req, res) => {
    try {
      const domains = await storage.getDomains();
      res.json(domains);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });
  
  app.get("/api/concepts/domain/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      const concepts = await storage.getConceptsByDomain(domain);
      res.json(concepts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch concepts by domain" });
    } // Added missing closing brace
  }); // Added missing closing brace for the route handler

  app.get("/api/knowledge-graph", async (req, res) => { // Moved this route outside the previous one
    try {
      const graph = await storage.getKnowledgeGraph();
      res.json(graph);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge graph" });
    }
  });
  
  app.get("/api/concepts/:id/connections", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const relationships = await storage.getConceptRelationships(id);
      
      // Get all the related concept IDs
      const relatedIds = new Set<number>();
      
      relationships.forEach(rel => {
        if (rel.sourceId === id) {
          relatedIds.add(rel.targetId);
        } else {
          relatedIds.add(rel.sourceId);
        }
      });
      
      // Fetch all related concepts
      const relatedConcepts = [];
      // Convert Set to Array for iteration compatibility
      // Removed duplicated loop below
      for (const relatedId of Array.from(relatedIds)) { 
        const concept = await storage.getConcept(relatedId);
        if (concept) {
          relatedConcepts.push(concept);
        }
      }
      
      // Categorize relationships
      const prerequisites = relatedConcepts.filter(concept => {
        return relationships.some(rel => 
          rel.targetId === id && 
          rel.sourceId === concept.id && 
          rel.relationshipType === "prerequisite"
        );
      });
      
      const related = relatedConcepts.filter(concept => {
        return relationships.some(rel => 
          (rel.relationshipType === "related") &&
          ((rel.sourceId === id && rel.targetId === concept.id) || 
           (rel.targetId === id && rel.sourceId === concept.id))
        );
      });
      
      res.json({
        prerequisites,
        related
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch concept connections" });
    }
  });
  
  // User progress routes
  app.get("/api/user/progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user progress" });
    }
  });
  
  app.post("/api/user/progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const validatedData = insertUserProgressSchema.parse({
        ...req.body,
        userId
      });
      
      // Check if progress record already exists
      const existingProgress = await storage.getUserProgressForConcept(
        userId,
        validatedData.conceptId
      );
      
      if (existingProgress) {
        // Update existing progress
        const updatedProgress = await storage.updateUserProgress(
          existingProgress.id,
          validatedData
        );
        return res.json(updatedProgress);
      }
      
      // Create new progress record
      const progress = await storage.createUserProgress(validatedData);
      res.status(201).json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update user progress" });
    }
  });
  
  app.get("/api/user/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const progress = await storage.getUserProgress(userId);
      
      // Get all concepts the user has learned
      const learnedConceptIds = progress
        .filter(p => p.isLearned)
        .map(p => p.conceptId);
      
      // Get all concepts
      const allConcepts = await storage.getConcepts();
      
      // Get all relationships
      const graph = await storage.getKnowledgeGraph();
      
      // Find concepts that the user has not learned but has all prerequisites for
      const recommendations = [];
      
      for (const concept of allConcepts) {
        // Skip if already learned
        if (learnedConceptIds.includes(concept.id)) {
          continue;
        }
        
        // Find prerequisites for this concept
        const prerequisites = graph.links
          .filter(link => 
            link.target === concept.id && 
            link.type === "prerequisite"
          )
          .map(link => link.source);
        
        // Check if all prerequisites are learned
        const allPrereqsLearned = prerequisites.every(prereqId => 
          learnedConceptIds.includes(prereqId)
        );
        
        if (allPrereqsLearned || prerequisites.length === 0) {
          // Find a related concept that the user has learned (if any)
          const relatedLearnedConcepts = graph.links
            .filter(link => 
              (link.source === concept.id || link.target === concept.id) &&
              link.type === "related"
            )
            .map(link => link.source === concept.id ? link.target : link.source)
            .filter(id => learnedConceptIds.includes(id));
          
          if (relatedLearnedConcepts.length > 0) {
            // Get the related concept
            const relatedConcept = allConcepts.find(c => c.id === relatedLearnedConcepts[0]);
            
            if (relatedConcept) {
              recommendations.push({
                concept,
                reason: `Connected to your ${relatedConcept.name} knowledge`
              });
              continue;
            }
          }
          
          recommendations.push({
            concept,
            reason: "Ready to learn"
          });
        }
      }
      
      // Sort by domain priority (to group by domain)
      recommendations.sort((a, b) => {
        if (a.concept.domain === b.concept.domain) {
          return 0;
        }
        
        // Prioritize domains the user has already started learning
        const userDomains = new Set(
          progress
            .filter(p => p.isLearned)
            .map(p => allConcepts.find(c => c.id === p.conceptId)?.domain)
            .filter(Boolean)
        );
        
        if (userDomains.has(a.concept.domain) && !userDomains.has(b.concept.domain)) {
          return -1;
        }
        
        if (!userDomains.has(a.concept.domain) && userDomains.has(b.concept.domain)) {
          return 1;
        }
        
        return 0;
      });
      
      res.json(recommendations.slice(0, 5)); // Return top 5 recommendations
    } catch (error) {
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });
  
  // LLM integration routes
  app.get("/api/learn/:conceptId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const conceptId = parseInt(req.params.conceptId);
      const contextType = (req.query.context as string) || "introduction";
      
      if (!["introduction", "detailed", "related", "prerequisites"].includes(contextType)) {
        return res.status(400).json({ error: "Invalid context type" });
      }
      
      // Get the concept
      const concept = await storage.getConcept(conceptId);
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Get connections
      const connections = await storage.getConceptRelationships(conceptId);
      
      // Get related concepts
      const relatedIds = connections
        .filter(rel => rel.relationshipType === "related")
        .map(rel => rel.sourceId === conceptId ? rel.targetId : rel.sourceId);
      
      const relatedConcepts = [];
      for (const id of relatedIds) {
        const related = await storage.getConcept(id);
        if (related) {
          relatedConcepts.push(related);
        }
      }
      
      // Get prerequisites
      const prerequisiteIds = connections
        .filter(rel => 
          rel.relationshipType === "prerequisite" && 
          rel.targetId === conceptId
        )
        .map(rel => rel.sourceId);
      
      const prerequisites = [];
      for (const id of prerequisiteIds) {
        const prereq = await storage.getConcept(id);
        if (prereq) {
          prerequisites.push(prereq);
        }
      }
      
      // Get user's knowledge
      const userId = req.user!.id;
      const progress = await storage.getUserProgress(userId);
      const learnedConceptIds = progress
        .filter(p => p.isLearned)
        .map(p => p.conceptId);
      
      const knownConcepts = [];
      for (const id of learnedConceptIds) {
        const concept = await storage.getConcept(id);
        if (concept) {
          knownConcepts.push({
            id: concept.id,
            name: concept.name,
            domain: concept.domain
          });
        }
      }
      
      // Generate explanation
      const explanation = await generateConceptExplanation(
        {
          ...concept,
          prerequisites: prerequisites.map(p => ({
            id: p.id,
            name: p.name,
            domain: p.domain
          })),
          relatedConcepts: relatedConcepts.map(r => ({
            id: r.id,
            name: r.name,
            domain: r.domain,
            difficulty: r.difficulty
          }))
        },
        { knownConcepts },
        contextType as any
      );
      
      res.json({ explanation });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });
  
  // Chat routes
  app.get("/api/chat/:conceptId/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const conceptId = parseInt(req.params.conceptId);
      
      const messages = await storage.getChatMessages(userId, conceptId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });
  
  app.post("/api/chat/:conceptId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const conceptId = parseInt(req.params.conceptId);
      const { message } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Save user message
      const userMessage = await storage.createChatMessage(
        insertChatMessageSchema.parse({
          userId,
          conceptId,
          message,
          isUser: true
        })
      );
      
      // Get the concept
      const concept = await storage.getConcept(conceptId);
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Get connections
      const connections = await storage.getConceptRelationships(conceptId);
      
      // Get related concepts
      const relatedIds = connections
        .filter(rel => rel.relationshipType === "related")
        .map(rel => rel.sourceId === conceptId ? rel.targetId : rel.sourceId);
      
      const relatedConcepts = [];
      for (const id of relatedIds) {
        const related = await storage.getConcept(id);
        if (related) {
          relatedConcepts.push(related);
        }
      }
      
      // Get prerequisites
      const prerequisiteIds = connections
        .filter(rel => 
          rel.relationshipType === "prerequisite" && 
          rel.targetId === conceptId
        )
        .map(rel => rel.sourceId);
      
      const prerequisites = [];
      for (const id of prerequisiteIds) {
        const prereq = await storage.getConcept(id);
        if (prereq) {
          prerequisites.push(prereq);
        }
      }
      
      // Get user's knowledge
      const progress = await storage.getUserProgress(userId);
      const learnedConceptIds = progress
        .filter(p => p.isLearned)
        .map(p => p.conceptId);
      
      const knownConcepts = [];
      for (const id of learnedConceptIds) {
        const concept = await storage.getConcept(id);
        if (concept) {
          knownConcepts.push({
            id: concept.id,
            name: concept.name,
            domain: concept.domain
          });
        }
      }
      
      // Get chat history
      const chatHistory = await storage.getChatMessages(userId, conceptId);
      
      // Define the expected type for chat history messages for the LLM
      type ChatCompletionMessageParam = {
        role: "user" | "assistant"; // Only user and assistant roles expected
        content: string;
      };
      
      // Format history ensuring correct type
      const formattedHistory: ChatCompletionMessageParam[] = chatHistory.map(msg => ({
        role: msg.isUser ? "user" : "assistant", // No need for 'as const' here due to explicit type
        content: msg.message
      }));
      
      // Generate AI response
      const response = await answerQuestion(
        message,
        {
          ...concept,
          prerequisites: prerequisites.map(p => ({
            id: p.id,
            name: p.name,
            domain: p.domain
          })),
          relatedConcepts: relatedConcepts.map(r => ({
            id: r.id,
            name: r.name,
            domain: r.domain,
            difficulty: r.difficulty
          }))
        },
        { knownConcepts },
        formattedHistory
      );
      
      // Save AI response
      const aiMessage = await storage.createChatMessage(
        insertChatMessageSchema.parse({
          userId,
          conceptId,
          message: response,
          isUser: false
        })
      );
      
      res.json(aiMessage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });
  
  // Quiz generation route
  app.get("/api/quiz/:conceptId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const conceptId = parseInt(req.params.conceptId);
      
      // Get the concept
      const concept = await storage.getConcept(conceptId);
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      // Get user's knowledge
      const progress = await storage.getUserProgress(userId);
      const learnedConceptIds = progress
        .filter(p => p.isLearned)
        .map(p => p.conceptId);
      
      const knownConcepts = [];
      for (const id of learnedConceptIds) {
        const concept = await storage.getConcept(id);
        if (concept) {
          knownConcepts.push({
            id: concept.id,
            name: concept.name,
            domain: concept.domain
          });
        }
      }
      
      // Generate quiz
      const quiz = await generateQuiz(concept, { knownConcepts });
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate quiz" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
