import neo4j, { Driver, Session, Record } from 'neo4j-driver';
import {
  Concept,
  ConceptRelationship,
  InsertConcept,
  InsertConceptRelationship
} from '@shared/schema';

// Neo4j connection configuration
let driver: Driver | null = null;

export async function initNeo4j(): Promise<void> {
  try {
    // Check if NEO4J_URI environment variable is set, otherwise use a default for development
    const uri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    
    // Verify connection
    const session = driver.session();
    try {
      await session.run('RETURN 1');
      console.log('Neo4j connection established successfully');
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error connecting to Neo4j:', error);
    // For development purposes, we'll continue without Neo4j
    console.warn('Continuing without Neo4j connection - will use in-memory storage instead');
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

function getSession(): Session {
  if (!driver) {
    throw new Error('Neo4j driver not initialized');
  }
  return driver.session();
}

// Convert Neo4j record to concept
function recordToConcept(record: Record): Concept {
  const node = record.get('c');
  return {
    id: node.identity.toNumber(),
    name: node.properties.name,
    domain: node.properties.domain,
    difficulty: node.properties.difficulty,
    description: node.properties.description,
    createdAt: new Date(node.properties.createdAt)
  };
}

// Convert Neo4j record to relationship
function recordToRelationship(record: Record): ConceptRelationship {
  const rel = record.get('r');
  return {
    id: rel.identity.toNumber(),
    sourceId: parseInt(rel.properties.sourceId),
    targetId: parseInt(rel.properties.targetId),
    relationshipType: rel.properties.relationshipType,
    strength: parseInt(rel.properties.strength),
    createdAt: new Date(rel.properties.createdAt)
  };
}

// Create a concept
export async function createConcept(concept: InsertConcept): Promise<Concept> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      CREATE (c:Concept {
        name: $name,
        domain: $domain,
        difficulty: $difficulty,
        description: $description,
        createdAt: datetime()
      })
      RETURN c
      `,
      concept
    );
    
    if (result.records.length === 0) {
      throw new Error('Failed to create concept');
    }
    
    return recordToConcept(result.records[0]);
  } finally {
    await session.close();
  }
}

// Get concept by ID
export async function getConceptById(id: number): Promise<Concept | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:Concept)
      WHERE ID(c) = $id
      RETURN c
      `,
      { id }
    );
    
    if (result.records.length === 0) {
      return null;
    }
    
    return recordToConcept(result.records[0]);
  } finally {
    await session.close();
  }
}

// Get all concepts
export async function getAllConcepts(): Promise<Concept[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:Concept)
      RETURN c
      `
    );
    
    return result.records.map(recordToConcept);
  } finally {
    await session.close();
  }
}

// Get concepts by domain
export async function getConceptsByDomain(domain: string): Promise<Concept[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:Concept)
      WHERE c.domain = $domain
      RETURN c
      `,
      { domain }
    );
    
    return result.records.map(recordToConcept);
  } finally {
    await session.close();
  }
}

// Create a relationship between concepts
export async function createRelationship(
  relationship: InsertConceptRelationship
): Promise<ConceptRelationship> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (source:Concept), (target:Concept)
      WHERE ID(source) = $sourceId AND ID(target) = $targetId
      CREATE (source)-[r:${relationship.relationshipType} {
        sourceId: toString($sourceId),
        targetId: toString($targetId),
        relationshipType: $relationshipType,
        strength: $strength,
        createdAt: datetime()
      }]->(target)
      RETURN r
      `,
      relationship
    );
    
    if (result.records.length === 0) {
      throw new Error('Failed to create relationship');
    }
    
    return recordToRelationship(result.records[0]);
  } finally {
    await session.close();
  }
}

// Get prerequisites for a concept
export async function getConceptPrerequisites(conceptId: number): Promise<Concept[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:Concept)<-[r:PREREQUISITE]-(prereq:Concept)
      WHERE ID(c) = $conceptId
      RETURN prereq as c
      `,
      { conceptId }
    );
    
    return result.records.map(recordToConcept);
  } finally {
    await session.close();
  }
}

// Get related concepts
export async function getRelatedConcepts(conceptId: number): Promise<Concept[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (c:Concept)-[r:RELATED]-(related:Concept)
      WHERE ID(c) = $conceptId
      RETURN related as c
      `,
      { conceptId }
    );
    
    return result.records.map(recordToConcept);
  } finally {
    await session.close();
  }
}

// Get complete knowledge graph
export async function getKnowledgeGraph(): Promise<{
  nodes: Concept[],
  links: { source: number, target: number, type: string, strength: number }[]
}> {
  const session = getSession();
  try {
    const nodesResult = await session.run(
      `
      MATCH (c:Concept)
      RETURN c
      `
    );
    
    const linksResult = await session.run(
      `
      MATCH (source:Concept)-[r]->(target:Concept)
      RETURN ID(source) as sourceId, ID(target) as targetId, type(r) as type, r.strength as strength
      `
    );
    
    const nodes = nodesResult.records.map(recordToConcept);
    
    const links = linksResult.records.map(record => ({
      source: record.get('sourceId').toNumber(),
      target: record.get('targetId').toNumber(),
      type: record.get('type'),
      strength: parseInt(record.get('strength'))
    }));
    
    return { nodes, links };
  } finally {
    await session.close();
  }
}
