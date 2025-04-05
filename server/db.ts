import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { 
  users, concepts, conceptRelationships, userProgress, chatMessages
} from "@shared/schema";

// Create the database connection
let db: any;
let sql: any;

try {
  // Only attempt to create the connection if DATABASE_URL is provided
  if (process.env.DATABASE_URL) {
    // Create a neon client with the direct method to avoid query errors
    const connectionString = process.env.DATABASE_URL;
    const neonClient = neon(connectionString);
    
    // Create connection using the following approach to prevent 'client.query is not a function' error
    db = drizzle(neonClient as any);
    sql = neonClient;
    
    console.log("Database connection initialized successfully");
  } else {
    console.log("No DATABASE_URL provided, database connection not initialized");
    sql = null;
    db = null;
  }
} catch (error) {
  console.error("Error initializing database connection:", error);
  sql = null;
  db = null;
}

export { db };

// Initialize the database schema
export async function initDb() {
  // If SQL connection is not available, skip initialization
  if (!sql || !db) {
    console.log("Database connection not available, skipping database initialization");
    return;
  }
  
  // Create database tables if they don't exist
  try {
    const neonClient = sql as any;
    
    // Create users table
    await neonClient`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create concepts table
    await neonClient`
      CREATE TABLE IF NOT EXISTS concepts (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        domain TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create concept_relationships table
    await neonClient`
      CREATE TABLE IF NOT EXISTS concept_relationships (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES concepts(id),
        target_id INTEGER NOT NULL REFERENCES concepts(id),
        relationship_type TEXT NOT NULL,
        strength INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create user_progress table
    await neonClient`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        concept_id INTEGER NOT NULL REFERENCES concepts(id),
        is_learned BOOLEAN NOT NULL DEFAULT FALSE,
        learned_at TIMESTAMP,
        UNIQUE(user_id, concept_id)
      )
    `;
    
    // Create chat_messages table
    await neonClient`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        concept_id INTEGER NOT NULL REFERENCES concepts(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  }
}

// Helper function to seed initial data
export async function seedInitialData() {
  // If database is not available, skip seeding
  if (!db) {
    console.log("Database not available, skipping data seeding");
    return;
  }
  
  // Helper function to properly type db return values
  const insertAndReturn = async <T>(table: any, values: any): Promise<T> => {
    return await db.insert(table).values(values).returning().then((res: any[]) => res[0] as T);
  };

  try {
    // Check if we already have concepts in the database
    let existingConcepts;
    try {
      existingConcepts = await db.select().from(concepts);
    } catch (error) {
      console.warn("Error checking existing concepts, proceeding with application startup:", error);
      return; // Skip seeding if we can't query the database
    }
    
    if (existingConcepts && existingConcepts.length > 0) {
      console.log(`Database already has ${existingConcepts.length} concepts, skipping seed`);
      return;
    }
  
    console.log("Seeding initial data to database...");
  
    // Physics concepts
    const classicalMechanics = await insertAndReturn<typeof concepts.$inferSelect>(concepts, {
      name: "Classical Mechanics",
      domain: "Physics",
      difficulty: "intermediate",
      description: "The study of the motion of bodies under the action of forces"
    });
    
    const newtonsLaws = await insertAndReturn<typeof concepts.$inferSelect>(concepts, {
      name: "Newton's Laws",
      domain: "Physics",
      difficulty: "intermediate",
      description: "Three fundamental laws that form the foundation of classical mechanics"
    });
    
    const conservationLaws = await db.insert(concepts).values({
      name: "Conservation Laws",
      domain: "Physics",
      difficulty: "intermediate",
      description: "Principles stating that certain physical properties do not change over time"
    }).returning().then(res => res[0]);
    
    const kinematics = await db.insert(concepts).values({
      name: "Kinematics",
      domain: "Physics",
      difficulty: "beginner",
      description: "The study of motion without considering its causes"
    }).returning().then(res => res[0]);
    
    const rotationalMotion = await db.insert(concepts).values({
      name: "Rotational Motion",
      domain: "Physics",
      difficulty: "intermediate",
      description: "The study of the motion of objects around an axis"
    }).returning().then(res => res[0]);
    
    // Mathematics concepts
    const vectorCalculus = await db.insert(concepts).values({
      name: "Vector Calculus",
      domain: "Mathematics",
      difficulty: "advanced",
      description: "The study of calculus in vector spaces"
    }).returning().then(res => res[0]);
    
    const differentialEquations = await db.insert(concepts).values({
      name: "Differential Equations",
      domain: "Mathematics",
      difficulty: "advanced",
      description: "Equations that relate functions with their derivatives"
    }).returning().then(res => res[0]);
    
    const basicCalculus = await db.insert(concepts).values({
      name: "Basic Calculus",
      domain: "Mathematics",
      difficulty: "intermediate",
      description: "The foundation of calculus covering limits, derivatives, and integrals"
    }).returning().then(res => res[0]);
    
    // Computer Science concepts
    const dataStructures = await db.insert(concepts).values({
      name: "Data Structures",
      domain: "Computer Science",
      difficulty: "intermediate",
      description: "Ways of organizing and storing data for efficient access and modification"
    }).returning().then(res => res[0]);
    
    const algorithmAnalysis = await db.insert(concepts).values({
      name: "Algorithm Analysis",
      domain: "Computer Science",
      difficulty: "intermediate",
      description: "The determination of the computational complexity of algorithms"
    }).returning().then(res => res[0]);
    
    // Economics concepts
    const microeconomics = await db.insert(concepts).values({
      name: "Microeconomics",
      domain: "Economics",
      difficulty: "intermediate",
      description: "The study of individual and business decisions regarding the allocation of resources and prices of goods and services"
    }).returning().then(res => res[0]);
    
    const macroeconomics = await db.insert(concepts).values({
      name: "Macroeconomics",
      domain: "Economics",
      difficulty: "intermediate",
      description: "The study of the behavior of the economy as a whole, including inflation, unemployment, and economic growth"
    }).returning().then(res => res[0]);
    
    const gameTheory = await db.insert(concepts).values({
      name: "Game Theory",
      domain: "Economics",
      difficulty: "advanced",
      description: "The study of mathematical models of strategic interaction between rational decision-makers"
    }).returning().then(res => res[0]);
    
    // Sociology concepts
    const socialStructures = await db.insert(concepts).values({
      name: "Social Structures",
      domain: "Sociology",
      difficulty: "beginner",
      description: "The study of how society is organized and how social institutions influence human behavior"
    }).returning().then(res => res[0]);
    
    const socialInequality = await db.insert(concepts).values({
      name: "Social Inequality",
      domain: "Sociology",
      difficulty: "intermediate",
      description: "The study of unequal distribution of resources and opportunities in society"
    }).returning().then(res => res[0]);
    
    const urbanSociology = await db.insert(concepts).values({
      name: "Urban Sociology",
      domain: "Sociology",
      difficulty: "intermediate",
      description: "The study of social life and interactions in urban areas"
    }).returning().then(res => res[0]);
    
    // Psychology concepts
    const cognitivePsychology = await db.insert(concepts).values({
      name: "Cognitive Psychology",
      domain: "Psychology",
      difficulty: "intermediate",
      description: "The study of mental processes such as attention, language use, memory, perception, problem solving, and thinking"
    }).returning().then(res => res[0]);
    
    const developmentalPsychology = await db.insert(concepts).values({
      name: "Developmental Psychology",
      domain: "Psychology",
      difficulty: "intermediate",
      description: "The study of how humans develop psychologically from infancy to old age"
    }).returning().then(res => res[0]);
    
    const clinicalPsychology = await db.insert(concepts).values({
      name: "Clinical Psychology",
      domain: "Psychology",
      difficulty: "advanced",
      description: "The integration of science, theory, and clinical knowledge for understanding, preventing, and relieving psychological distress"
    }).returning().then(res => res[0]);
    
    // Human Science concepts
    const anthropology = await db.insert(concepts).values({
      name: "Anthropology",
      domain: "Human Science",
      difficulty: "intermediate",
      description: "The study of human biological and cultural development throughout history"
    }).returning().then(res => res[0]);
    
    const linguistics = await db.insert(concepts).values({
      name: "Linguistics",
      domain: "Human Science",
      difficulty: "intermediate",
      description: "The scientific study of language and its structure"
    }).returning().then(res => res[0]);
    
    const humanGeography = await db.insert(concepts).values({
      name: "Human Geography",
      domain: "Human Science",
      difficulty: "intermediate",
      description: "The study of the relationship between human societies and their physical environment"
    }).returning().then(res => res[0]);
    
    // Create relationships
    await db.insert(conceptRelationships).values([
      {
        sourceId: classicalMechanics.id,
        targetId: newtonsLaws.id,
        relationshipType: "related",
        strength: 9
      },
      {
        sourceId: classicalMechanics.id,
        targetId: conservationLaws.id,
        relationshipType: "related",
        strength: 8
      },
      {
        sourceId: classicalMechanics.id,
        targetId: kinematics.id,
        relationshipType: "related",
        strength: 7
      },
      {
        sourceId: classicalMechanics.id,
        targetId: rotationalMotion.id,
        relationshipType: "related",
        strength: 7
      },
      {
        sourceId: vectorCalculus.id,
        targetId: classicalMechanics.id,
        relationshipType: "prerequisite",
        strength: 6
      },
      {
        sourceId: basicCalculus.id,
        targetId: classicalMechanics.id,
        relationshipType: "prerequisite",
        strength: 8
      },
      {
        sourceId: classicalMechanics.id,
        targetId: differentialEquations.id,
        relationshipType: "related",
        strength: 7
      },
      {
        sourceId: newtonsLaws.id,
        targetId: kinematics.id,
        relationshipType: "related",
        strength: 8
      },
      {
        sourceId: conservationLaws.id,
        targetId: differentialEquations.id,
        relationshipType: "related",
        strength: 6
      },
      {
        sourceId: vectorCalculus.id,
        targetId: conservationLaws.id,
        relationshipType: "prerequisite",
        strength: 7
      },
      // Economics relationships
      {
        sourceId: microeconomics.id,
        targetId: macroeconomics.id,
        relationshipType: "related",
        strength: 8
      },
      {
        sourceId: gameTheory.id,
        targetId: microeconomics.id,
        relationshipType: "related",
        strength: 7
      },
      {
        sourceId: basicCalculus.id,
        targetId: macroeconomics.id,
        relationshipType: "prerequisite",
        strength: 6
      },
      // Sociology relationships
      {
        sourceId: socialStructures.id,
        targetId: socialInequality.id,
        relationshipType: "related",
        strength: 8
      },
      {
        sourceId: socialStructures.id,
        targetId: urbanSociology.id,
        relationshipType: "related",
        strength: 7
      },
      // Psychology relationships
      {
        sourceId: cognitivePsychology.id,
        targetId: developmentalPsychology.id,
        relationshipType: "related",
        strength: 7
      },
      {
        sourceId: cognitivePsychology.id,
        targetId: clinicalPsychology.id,
        relationshipType: "related",
        strength: 6
      },
      // Human Science relationships
      {
        sourceId: anthropology.id,
        targetId: linguistics.id,
        relationshipType: "related",
        strength: 6
      },
      {
        sourceId: anthropology.id,
        targetId: humanGeography.id,
        relationshipType: "related",
        strength: 7
      },
      // Cross-domain relationships
      {
        sourceId: gameTheory.id,
        targetId: cognitivePsychology.id,
        relationshipType: "related",
        strength: 5
      },
      {
        sourceId: socialStructures.id,
        targetId: anthropology.id,
        relationshipType: "related",
        strength: 7
      },
      {
        sourceId: urbanSociology.id,
        targetId: humanGeography.id,
        relationshipType: "related",
        strength: 8
      }
    ]);
    
    console.log("Initial data seeded successfully");
  } catch (error) {
    console.error("Error seeding initial data:", error);
    throw error;
  }
}