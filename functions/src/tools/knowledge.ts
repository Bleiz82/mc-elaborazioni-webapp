import { getFirestore } from 'firebase-admin/firestore';
import { KnowledgeBaseDoc } from '../types';

const DB_ID = 'ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd';

/**
 * Searches the Knowledge Base using keywords and content matching.
 */
export async function searchKnowledgeBase(query: string, limit: number = 5): Promise<KnowledgeBaseDoc[]> {
  const db = getFirestore(DB_ID);
  
  // Load all active documents
  const snapshot = await db.collection('knowledge_base')
    .where('active', '==', true)
    .get();

  const queryLower = query.toLowerCase();
  
  const results = snapshot.docs.map((doc: any) => {
    const data = doc.data() as KnowledgeBaseDoc;
    let score = 0;
    
    // Check keywords (most important)
    if (data.keywords && Array.isArray(data.keywords)) {
      data.keywords.forEach(keyword => {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 2;
        }
      });
    }
    
    // Check content
    const contentLower = data.content.toLowerCase();
    if (contentLower.includes(queryLower)) {
      score += 1;
    }
    
    // Check title
    const titleLower = data.title.toLowerCase();
    if (titleLower.includes(queryLower)) {
      score += 1;
    }
    
    return { doc: { ...data, id: doc.id }, score };
  });

  // Filter and sort
  return results
    .filter((r: any) => r.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit)
    .map((r: any) => r.doc);
}
