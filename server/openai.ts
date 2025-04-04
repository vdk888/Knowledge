import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-your-key" });

export interface ConceptInfo {
  name: string;
  domain: string;
  difficulty: string;
  description: string;
  prerequisites?: { id: number; name: string; domain: string }[];
  relatedConcepts?: { id: number; name: string; domain: string; difficulty: string }[];
}

export interface UserKnowledge {
  knownConcepts: { id: number; name: string; domain: string }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Generate concept explanations based on selected concept and user's knowledge
export async function generateConceptExplanation(
  concept: ConceptInfo,
  userKnowledge: UserKnowledge,
  contextType: "introduction" | "detailed" | "related" | "prerequisites" = "introduction"
): Promise<string> {
  let systemPrompt = `You are an educational assistant in the Knowledge Atlas system. 
You help users understand concepts in various domains of knowledge. 
You specialize in explaining complex concepts clearly and connecting them to what the user already knows.`;
  
  let knownConceptsText = userKnowledge.knownConcepts.length > 0 
    ? `The user has already learned these concepts: ${userKnowledge.knownConcepts.map(c => c.name).join(", ")}.`
    : "The user is new and hasn't learned any concepts yet.";
  
  let typeSpecificInstructions = "";
  
  switch (contextType) {
    case "introduction":
      typeSpecificInstructions = `Provide a brief, engaging introduction to "${concept.name}" (${concept.domain}). 
Keep it concise (3-4 sentences) and focus on why this concept is important and interesting.`;
      break;
    case "detailed":
      typeSpecificInstructions = `Provide a detailed but accessible explanation of "${concept.name}" (${concept.domain}).
Include key principles, historical context if relevant, and real-world applications.
Break down complex ideas into understandable parts.`;
      break;
    case "related":
      typeSpecificInstructions = `Explain how "${concept.name}" connects to these related concepts: 
${concept.relatedConcepts?.map(c => c.name).join(", ") || "none"}.
Focus on the relationships between these ideas and why understanding them together is valuable.`;
      break;
    case "prerequisites":
      typeSpecificInstructions = `Explain why these prerequisites: 
${concept.prerequisites?.map(c => c.name).join(", ") || "none"} 
are important for understanding "${concept.name}".`;
      break;
  }
  
  const prompt = `Concept: ${concept.name}
Domain: ${concept.domain}
Difficulty: ${concept.difficulty}
Description: ${concept.description}

${knownConceptsText}

${typeSpecificInstructions}

Make your explanation clear, engaging, and appropriate for a learner at the ${concept.difficulty} level.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    return response.choices[0].message.content || "I'm unable to generate an explanation at the moment.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Sorry, I encountered an error generating an explanation. Please try again later.";
  }
}

// Handle user questions about concepts
export async function answerQuestion(
  question: string,
  concept: ConceptInfo,
  userKnowledge: UserKnowledge,
  chatHistory: ChatMessage[]
): Promise<string> {
  const systemPrompt = `You are an educational assistant in the Knowledge Atlas system.
You help users understand the concept "${concept.name}" (${concept.domain}) in depth.
Provide clear, accurate, and helpful answers to questions about this concept.
If appropriate, connect explanations to concepts the user already knows.`;

  const knownConceptsText = userKnowledge.knownConcepts.length > 0 
    ? `The user has already learned these concepts: ${userKnowledge.knownConcepts.map(c => c.name).join(", ")}.`
    : "The user is new and hasn't learned any concepts yet.";

  const contextPrompt = `Concept: ${concept.name}
Domain: ${concept.domain}
Difficulty: ${concept.difficulty}
Description: ${concept.description}

${knownConceptsText}

Answer the user's question about this concept. Be clear, accurate, and helpful.
If the question is not related to this concept, gently bring the focus back to "${concept.name}".`;

  // Format chat history for the API
  const messageHistory = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextPrompt },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: "user", content: question }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messageHistory,
      temperature: 0.7,
      max_tokens: 800,
    });

    return response.choices[0].message.content || "I'm unable to answer that question at the moment.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Sorry, I encountered an error generating a response. Please try again later.";
  }
}

// Generate a quiz about a concept
export async function generateQuiz(
  concept: ConceptInfo,
  userKnowledge: UserKnowledge
): Promise<{ questions: { question: string; answer: string }[] }> {
  const systemPrompt = `You are an educational assistant in the Knowledge Atlas system.
Your task is to generate a set of 3 quiz questions about "${concept.name}" (${concept.domain}).
Create questions that test understanding rather than mere recall.
For each question, provide a detailed answer that explains the concept.`;

  const prompt = `Concept: ${concept.name}
Domain: ${concept.domain}
Difficulty: ${concept.difficulty}
Description: ${concept.description}

Generate 3 quiz questions about this concept. For each question, provide a detailed answer.
Format your response as valid JSON with the structure:
{
  "questions": [
    { "question": "question text", "answer": "detailed answer" },
    ...
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{"questions":[]}';
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI API error:", error);
    return { questions: [] };
  }
}
