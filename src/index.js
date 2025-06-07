import { asc, desc, eq, ilike, or } from 'drizzle-orm';
import ollama from 'ollama';
import { stdin as input, stdout as output } from 'process';
import readline from 'readline/promises';
import { db } from './db/index.js';
import { todosTable } from './db/schema.js';

/**
 * Fetch all todos from DB with optional filters
 */
async function getAllTodos(options = {}) {
  let query = db.select().from(todosTable);

  if (options.orderBy) {
    const direction = options.direction === 'desc' ? desc : asc;
    query = query.orderBy(direction(todosTable[options.orderBy]));
  } else {
    query = query.orderBy(desc(todosTable.created_at));
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return await query;
}

/**
 * Create a new todo with given text and priority
 */
async function createTodo(todoText, priority = 'medium', category = null) {
  const [inserted] = await db.insert(todosTable).values({
    todo: todoText,
    priority: priority,
    category: category,
  }).returning({
    id: todosTable.id,
  });

  return inserted.id;
}

/**
 * Delete todo by id
 */
async function deleteTodoById(id) {
  const result = await db.delete(todosTable).where(eq(todosTable.id, id));
  return result.rowCount > 0;
}

/**
 * Delete multiple todos by ids
 */
async function deleteTodosByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;

  const result = await db.delete(todosTable)
    .where(
      or(...ids.map(id => eq(todosTable.id, id)))
    );
  return result.rowCount;
}

/**
 * Search todos by partial text (case-insensitive)
 */
async function searchTodos(searchText, field = 'all') {
  const pattern = `%${searchText}%`;
  let whereClause;

  if (field === 'category') {
    whereClause = ilike(todosTable.category, pattern);
  } else if (field === 'todo') {
    whereClause = ilike(todosTable.todo, pattern);
  } else {
    whereClause = or(
      ilike(todosTable.todo, pattern),
      ilike(todosTable.category, pattern)
    );
  }

  return await db.select()
    .from(todosTable)
    .where(whereClause)
    .orderBy(desc(todosTable.created_at));
}

/**
 * Update a todo by id
 */
async function updateTodo(id, newText = null, priority = null, category = null) {
  const updates = { updated_at: new Date() };

  if (newText) updates.todo = newText;
  if (priority) updates.priority = priority;
  if (category !== null) updates.category = category;

  const result = await db.update(todosTable)
    .set(updates)
    .where(eq(todosTable.id, id));

  return result.rowCount > 0;
}

/**
 * Mark todo as completed
 */
async function markTodoCompleted(id) {
  const result = await db.update(todosTable)
    .set({ completed: true, completed_at: new Date(), updated_at: new Date() })
    .where(eq(todosTable.id, id));

  return result.rowCount > 0;
}

/**
 * Mark todo as incomplete
 */
async function markTodoIncomplete(id) {
  const result = await db.update(todosTable)
    .set({ completed: false, completed_at: null, updated_at: new Date() })
    .where(eq(todosTable.id, id));

  return result.rowCount > 0;
}

/**
 * Get todos by priority
 */
async function getTodosByPriority(priority) {
  return await db.select()
    .from(todosTable)
    .where(eq(todosTable.priority, priority))
    .orderBy(desc(todosTable.created_at));
}

/**
 * Get todos by category
 */
async function getTodosByCategory(category) {
  return await db.select()
    .from(todosTable)
    .where(eq(todosTable.category, category))
    .orderBy(desc(todosTable.created_at));
}

/**
 * Get todo statistics
 */
async function getTodoStats() {
  const todos = await getAllTodos();
  const completed = todos.filter(t => t.completed).length;
  const pending = todos.length - completed;
  const priorities = todos.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});
  const categories = todos.reduce((acc, t) => {
    if (t.category) {
      acc[t.category] = (acc[t.category] || 0) + 1;
    }
    return acc;
  }, {});

  return { total: todos.length, completed, pending, priorities, categories };
}

/**
 * Clear completed todos
 */
async function clearCompleted() {
  const result = await db.delete(todosTable).where(eq(todosTable.completed, true));
  return result.rowCount;
}

/**
 * Get a single todo by ID
 */
async function getTodoById(id) {
  const [todo] = await db.select().from(todosTable).where(eq(todosTable.id, id));
  return todo;
}

// Enhanced tools for the AI
const AVAILABLE_TOOLS = {
  getAllTodos: {
    name: 'getAllTodos',
    description: 'Get all todos from the database with optional ordering and limits',
    parameters: {
      orderBy: { type: 'string', description: 'Field to order by: created_at, updated_at, priority', optional: true },
      direction: { type: 'string', description: 'asc or desc', optional: true },
      limit: { type: 'number', description: 'Maximum number of todos to return', optional: true }
    },
    func: getAllTodos
  },
  createTodo: {
    name: 'createTodo',
    description: 'Create a new todo item with optional priority and category',
    parameters: {
      todoText: { type: 'string', description: 'The text of the todo item' },
      priority: { type: 'string', description: 'Priority: low, medium, high', optional: true },
      category: { type: 'string', description: 'Category for the todo', optional: true }
    },
    func: createTodo
  },
  deleteTodoById: {
    name: 'deleteTodoById',
    description: 'Delete a todo by its ID',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to delete' }
    },
    func: deleteTodoById
  },
  deleteTodosByIds: {
    name: 'deleteTodosByIds',
    description: 'Delete multiple todos by their IDs',
    parameters: {
      ids: { type: 'array', description: 'Array of todo IDs to delete' }
    },
    func: deleteTodosByIds
  },
  searchTodos: {
    name: 'searchTodos',
    description: 'Search for todos by text content in todo text or category',
    parameters: {
      searchText: { type: 'string', description: 'Text to search for in todos' },
      field: { type: 'string', description: 'Field to search: todo, category, or all', optional: true }
    },
    func: searchTodos
  },
  updateTodo: {
    name: 'updateTodo',
    description: 'Update a todo item (text, priority, category)',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to update' },
      newText: { type: 'string', description: 'New text for the todo', optional: true },
      priority: { type: 'string', description: 'New priority: low, medium, high', optional: true },
      category: { type: 'string', description: 'New category', optional: true }
    },
    func: updateTodo
  },
  markTodoCompleted: {
    name: 'markTodoCompleted',
    description: 'Mark a todo as completed',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to complete' }
    },
    func: markTodoCompleted
  },
  markTodoIncomplete: {
    name: 'markTodoIncomplete',
    description: 'Mark a todo as incomplete/pending',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to mark incomplete' }
    },
    func: markTodoIncomplete
  },
  getTodosByPriority: {
    name: 'getTodosByPriority',
    description: 'Get todos filtered by priority level',
    parameters: {
      priority: { type: 'string', description: 'Priority level: low, medium, high' }
    },
    func: getTodosByPriority
  },
  getTodosByCategory: {
    name: 'getTodosByCategory',
    description: 'Get todos filtered by category',
    parameters: {
      category: { type: 'string', description: 'Category name' }
    },
    func: getTodosByCategory
  },
  getTodoStats: {
    name: 'getTodoStats',
    description: 'Get statistics about todos (total, completed, pending, by priority/category)',
    parameters: {},
    func: getTodoStats
  },
  clearCompleted: {
    name: 'clearCompleted',
    description: 'Delete all completed todos',
    parameters: {},
    func: clearCompleted
  },
  getTodoById: {
    name: 'getTodoById',
    description: 'Get a specific todo by its ID',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to retrieve' }
    },
    func: getTodoById
  }
};

const rl = readline.createInterface({ input, output });

// 🧠 ADVANCED NATURAL LANGUAGE UNDERSTANDING ENGINE
class AdvancedNLUEngine {
  constructor() {
    // Comprehensive intent patterns with variations and synonyms
    this.intentPatterns = {
      // Viewing/Listing todos
      view: {
        patterns: [
          /(?:show|list|display|get|see|view|check|what(?:'s|\s+are?)\s+(?:my|the)?)\s+(?:me\s+)?(?:my\s+)?(?:all\s+)?(?:the\s+)?(?:todos?|tasks?|items?|list|things)/i,
          /(?:what(?:'s|\s+are?)\s+(?:on\s+)?(?:my\s+)?(?:todo\s+)?list)/i,
          /(?:what\s+(?:do\s+)?(?:i\s+)?(?:have\s+)?(?:to\s+)?do)/i,
          /(?:my\s+(?:todos?|tasks?|list))/i,
          /(?:give\s+me\s+(?:my\s+)?(?:todos?|tasks?|list))/i
        ],
        priority_filters: {
          high: /(?:high|urgent|important|critical|asap|priority|top)/i,
          medium: /(?:medium|normal|regular|standard)/i,
          low: /(?:low|minor|small|least)/i
        },
        category_filters: /(?:category|type|group|about|for|related\s+to|tagged)\s+(\w+)/i
      },

      // Creating/Adding todos
      create: {
        patterns: [
          /(?:add|create|make|new|insert|put)\s+(?:a\s+)?(?:new\s+)?(?:todo|task|item|reminder)/i,
          /(?:i\s+(?:need\s+to|have\s+to|want\s+to|should|must))\s+(.+)/i,
          /(?:remind\s+me\s+to)\s+(.+)/i,
          /(?:todo|task):\s*(.+)/i,
          /(?:add\s+to\s+(?:my\s+)?list)\s*[:\-]?\s*(.+)/i
        ],
        priority_indicators: {
          high: /(?:high|urgent|important|critical|asap|priority|immediately|soon|quickly)/i,
          medium: /(?:medium|normal|regular|standard)/i,
          low: /(?:low|minor|small|least|whenever|eventually|someday)/i
        },
        category_indicators: /(?:category|type|group|tag|about|for|related\s+to|under|in)\s+(\w+)/i
      },

      // Deleting/Removing todos
      delete: {
        patterns: [
          /(?:delete|remove|del|erase|get\s+rid\s+of|eliminate)\s+(?:todo|task|item)?\s*#?(\d+)/i,
          /(?:delete|remove|del|erase)\s+(?:todos?|tasks?|items?)\s*#?(\d+(?:\s*[,&and\s]+\s*\d+)*)/i,
          /(?:cancel|forget\s+about|nevermind)\s+(?:todo|task|item)?\s*#?(\d+)/i
        ]
      },

      // Completing todos
      complete: {
        patterns: [
          /(?:complete|done|finish|finished|mark\s+(?:as\s+)?(?:complete|done|finished))\s+(?:todo|task|item|number)?\s*#?(\d+)/i,
          /(?:i\s+(?:completed|finished|did)|check\s+off)\s+(?:todo|task|item|number)?\s*#?(\d+)/i,
          /(?:todo|task|item|number)\s*#?(\d+)\s+(?:is\s+)?(?:complete|done|finished)/i,
          /(?:✓|✔|check)\s+(?:todo|task|item|number)?\s*#?(\d+)/i
        ]
      },

      // Marking as incomplete
      incomplete: {
        patterns: [
          /(?:incomplete|undone|unfinish|reopen|mark\s+(?:as\s+)?(?:incomplete|undone|pending))\s+(?:todo|task|item|number)?\s*#?(\d+)/i,
          /(?:uncheck|uncomplete)\s+(?:todo|task|item|number)?\s*#?(\d+)/i
        ]
      },

      // Updating/Editing todos
      update: {
        patterns: [
          /(?:update|edit|change|modify|alter)\s+(?:todo|task|item|number)?\s*#?(\d+)/i,
          /(?:change\s+(?:todo|task|item|number)?\s*#?(\d+)\s+to)\s+(.+)/i
        ]
      },

      // Searching todos
      search: {
        patterns: [
          /(?:search|find|look\s+for|locate)\s+(?:todos?|tasks?|items?)?\s*(?:about|for|with|containing|related\s+to)?\s*['""]?([^'"]+)['""]?/i,
          /(?:find\s+(?:me\s+)?(?:all\s+)?(?:todos?|tasks?|items?)\s+(?:about|for|with|containing|related\s+to))\s*['""]?([^'"]+)['""]?/i,
          /(?:what\s+(?:todos?|tasks?|items?)\s+(?:do\s+i\s+have\s+)?(?:about|for|with|containing|related\s+to))\s*['""]?([^'"]+)['""]?/i
        ]
      },

      // Statistics
      stats: {
        patterns: [
          /(?:stats|statistics|summary|overview|report|how\s+(?:many|much)|count)/i,
          /(?:what(?:'s|\s+is)\s+my\s+(?:progress|status))/i,
          /(?:show\s+me\s+(?:my\s+)?(?:stats|statistics|summary|progress))/i
        ]
      },

      // Clear completed
      clear: {
        patterns: [
          /(?:clear|clean|remove|delete)\s+(?:all\s+)?(?:completed|done|finished)\s*(?:todos?|tasks?|items?)?/i,
          /(?:clean\s+up|tidy\s+up)\s*(?:my\s+)?(?:list|todos?|tasks?)/i
        ]
      }
    };

    // Contextual keywords for better understanding
    this.contextKeywords = {
      priorities: {
        high: ['urgent', 'important', 'critical', 'asap', 'priority', 'immediately', 'soon', 'quickly', 'deadline'],
        medium: ['medium', 'normal', 'regular', 'standard', 'default'],
        low: ['low', 'minor', 'small', 'least', 'whenever', 'eventually', 'someday', 'later']
      },
      categories: {
        work: ['work', 'job', 'office', 'business', 'meeting', 'project', 'deadline', 'client'],
        personal: ['personal', 'self', 'me', 'myself', 'private', 'home'],
        shopping: ['shopping', 'buy', 'purchase', 'store', 'market', 'groceries'],
        health: ['health', 'doctor', 'medical', 'appointment', 'exercise', 'fitness', 'gym'],
        study: ['study', 'learn', 'school', 'education', 'homework', 'research', 'read'],
        home: ['home', 'house', 'clean', 'organize', 'fix', 'repair', 'maintenance']
      },
      timeKeywords: ['today', 'tomorrow', 'this week', 'next week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    };

    // Common phrases that indicate different intents
    this.intentPhrases = {
      questioning: ['what', 'how', 'when', 'where', 'which', 'who'],
      commanding: ['please', 'can you', 'could you', 'would you', 'help me'],
      stating: ['i need', 'i want', 'i have to', 'i should', 'i must'],
      confirming: ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'correct', 'right'],
      denying: ['no', 'nope', 'never', 'not', 'dont', "don't", 'cancel']
    };
  }

  // 🎯 Enhanced intent analysis with context awareness
  analyzeIntent(text) {
    const normalizedText = text.toLowerCase().trim();
    const analysis = {
      originalText: text,
      normalizedText,
      primaryIntent: null,
      confidence: 0,
      entities: {
        numbers: this.extractNumbers(text),
        priorities: this.extractPriority(text),
        categories: this.extractCategory(text),
        todoText: null,
        searchTerms: null
      },
      context: {
        isQuestion: this.isQuestion(text),
        isCommand: this.isCommand(text),
        isPolite: this.isPolite(text),
        hasTimeReference: this.hasTimeReference(text)
      }
    };

    // Analyze each intent type
    for (const [intentType, intentData] of Object.entries(this.intentPatterns)) {
      const matches = this.matchPatterns(normalizedText, intentData.patterns);
      if (matches.length > 0) {
        const confidence = this.calculateConfidence(matches, intentData, normalizedText);
        if (confidence > analysis.confidence) {
          analysis.primaryIntent = intentType;
          analysis.confidence = confidence;
          analysis.matches = matches;
        }
      }
    }

    // Extract specific entities based on intent
    this.extractIntentSpecificEntities(analysis);

    return analysis;
  }

  // 🔍 Pattern matching with fuzzy logic
  matchPatterns(text, patterns) {
    const matches = [];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        matches.push({
          pattern,
          match,
          captures: match.slice(1),
          index: match.index,
          length: match[0].length
        });
      }
    }
    return matches;
  }

  // 📊 Confidence calculation based on multiple factors
  calculateConfidence(matches, intentData, text) {
    let confidence = 0;

    // Base confidence from pattern match
    confidence += matches.length * 0.3;

    // Boost confidence for longer matches
    const avgMatchLength = matches.reduce((sum, m) => sum + m.length, 0) / matches.length;
    confidence += Math.min(avgMatchLength / text.length, 0.4);

    // Context-specific boosts
    if (intentData.priority_filters) {
      for (const priority of Object.values(intentData.priority_filters)) {
        if (priority.test(text)) confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  // 🏷️ Extract intent-specific entities
  extractIntentSpecificEntities(analysis) {
    const { primaryIntent, normalizedText, originalText } = analysis;

    switch (primaryIntent) {
      case 'create':
        analysis.entities.todoText = this.extractTodoText(originalText);
        break;
      case 'search':
        analysis.entities.searchTerms = this.extractSearchTerms(originalText);
        break;
      case 'update':
        const updateMatch = originalText.match(/(?:change|update|edit).*?to\s+(.+)/i);
        if (updateMatch) {
          analysis.entities.todoText = updateMatch[1].trim();
        }
        break;
    }
  }

  // 📝 Enhanced todo text extraction
  extractTodoText(text) {
    // Remove command words and extract meaningful content
    let todoText = text;

    // Remove common command patterns
    todoText = todoText.replace(/^(?:add|create|make|new|i\s+(?:need\s+to|have\s+to|want\s+to|should|must)|remind\s+me\s+to|todo:?)\s*/i, '');
    todoText = todoText.replace(/\s*(?:with\s+)?(?:high|medium|low|urgent|important)\s+priority\s*/gi, '');
    todoText = todoText.replace(/\s*(?:category|tag|type|group)\s+\w+\s*/gi, '');
    todoText = todoText.replace(/^\s*[\'\"]|[\'\"]?\s*$/g, ''); // Remove quotes

    return todoText.trim() || text.trim();
  }

  // 🔍 Extract search terms with better context
  extractSearchTerms(text) {
    const searchMatch = text.match(/(?:search|find|look\s+for).*?(?:about|for|with|containing|related\s+to)?\s*['""]?([^'"]+)['""]?/i);
    return searchMatch ? searchMatch[1].trim() : null;
  }

  // 🏆 Enhanced priority detection with context
  extractPriority(text) {
    const contextWords = text.toLowerCase();

    // Check for explicit priority mentions
    for (const [priority, keywords] of Object.entries(this.contextKeywords.priorities)) {
      for (const keyword of keywords) {
        if (contextWords.includes(keyword)) {
          return priority;
        }
      }
    }

    // Contextual priority inference
    if (/(?:deadline|urgent|asap|immediately|now|quickly|soon)/i.test(text)) return 'high';
    if (/(?:eventually|someday|later|whenever|not\s+urgent)/i.test(text)) return 'low';

    return 'medium';
  }

  // 🏷️ Enhanced category detection
  extractCategory(text) {
    const lowerText = text.toLowerCase();

    // Direct category mentions
    const directMatch = text.match(/(?:category|tag|type|group|about|for|related\s+to)\s+(\w+)/i);
    if (directMatch) return directMatch[1];

    // Hashtag categories
    const hashtagMatch = text.match(/#(\w+)/);
    if (hashtagMatch) return hashtagMatch[1];

    // Contextual category detection
    for (const [category, keywords] of Object.entries(this.contextKeywords.categories)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return category;
        }
      }
    }

    return null;
  }

  // 🔢 Extract numbers with context
  extractNumbers(text) {
    const matches = text.match(/\b\d+\b/g);
    return matches ? matches.map(Number) : [];
  }

  // ❓ Detect if text is a question
  isQuestion(text) {
    return /^\s*(?:what|how|when|where|which|who|why|can|could|would|will|is|are|do|does|did)\b/i.test(text) ||
           text.includes('?');
  }

  // 🎯 Detect if text is a command
  isCommand(text) {
    return /^\s*(?:please|can\s+you|could\s+you|would\s+you|help\s+me|add|create|delete|remove|show|list)/i.test(text);
  }

  // 😊 Detect politeness
  isPolite(text) {
    return /\b(?:please|thank\s+you|thanks|sorry|excuse\s+me)\b/i.test(text);
  }

  // ⏰ Detect time references
  hasTimeReference(text) {
    return this.contextKeywords.timeKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );
  }

  // 🚀 Generate optimized function call
  generateFunctionCall(analysis) {
    const { primaryIntent, entities, confidence } = analysis;

    if (confidence < 0.3) return null;

    switch (primaryIntent) {
      case 'view':
        if (entities.priorities !== 'medium') {
          return `getTodosByPriority("${entities.priorities}")`;
        } else if (entities.categories) {
          return `getTodosByCategory("${entities.categories}")`;
        }
        return 'getAllTodos()';

      case 'create':
        const params = [`"${entities.todoText}"`];
        if (entities.priorities !== 'medium') params.push(`"${entities.priorities}"`);
        if (entities.categories) params.push(`"${entities.categories}"`);
        return `createTodo(${params.join(', ')})`;

      case 'delete':
        if (entities.numbers.length > 1) {
          return `deleteTodosByIds([${entities.numbers.join(', ')}])`;
        } else if (entities.numbers.length === 1) {
          return `deleteTodoById(${entities.numbers[0]})`;
        }
        break;

      case 'complete':
        if (entities.numbers.length > 0) {
          return `markTodoCompleted(${entities.numbers[0]})`;
        }
        break;

      case 'incomplete':
        if (entities.numbers.length > 0) {
          return `markTodoIncomplete(${entities.numbers[0]})`;
        }
        break;

      case 'update':
        if (entities.numbers.length > 0) {
          const params = [entities.numbers[0]];
          if (entities.todoText) params.push(`"${entities.todoText}"`);
          if (entities.priorities !== 'medium') params.push(`null, "${entities.priorities}"`);
          if (entities.categories) params.push(`null, null, "${entities.categories}"`);
          return `updateTodo(${params.join(', ')})`;
        }
        break;

      case 'search':
        if (entities.searchTerms) {
          return `searchTodos("${entities.searchTerms}")`;
        }
        break;

      case 'stats':
        return 'getTodoStats()';

      case 'clear':
        return 'clearCompleted()';
    }

    return null;
  }
}

// Initialize the advanced NLU engine
const nluEngine = new AdvancedNLUEngine();

function parseToolCall(text) {
  // Enhanced parsing for more complex function calls
  const functionCallRegex = /(\w+)\s*\(([^)]*)\)/g;
  const matches = [];
  let match;

  while ((match = functionCallRegex.exec(text)) !== null) {
    const functionName = match[1];
    const paramsStr = match[2].trim();

    if (AVAILABLE_TOOLS[functionName]) {
      const params = [];
      if (paramsStr) {
        try {
          if (paramsStr.includes('[') || paramsStr.includes('{')) {
            const evaluated = eval(`[${paramsStr}]`);
            params.push(...evaluated);
          } else {
            const paramParts = paramsStr.split(',').map(p => p.trim());
            for (const part of paramParts) {
              if (part.startsWith('"') && part.endsWith('"')) {
                params.push(part.slice(1, -1));
              } else if (part.startsWith("'") && part.endsWith("'")) {
                params.push(part.slice(1, -1));
              } else if (part === 'null') {
                params.push(null);
              } else if (part === 'true' || part === 'false') {
                params.push(part === 'true');
              } else if (!isNaN(part) && part !== '') {
                params.push(Number(part));
              } else if (part) {
                params.push(part);
              }
            }
          }
        } catch (e) {
          const paramParts = paramsStr.split(',').map(p => p.trim());
          for (const part of paramParts) {
            if (part.startsWith('"') && part.endsWith('"')) {
              params.push(part.slice(1, -1));
            } else if (!isNaN(part)) {
              params.push(Number(part));
            } else {
              params.push(part);
            }
          }
        }
      }

      matches.push({
        functionName,
        params,
        tool: AVAILABLE_TOOLS[functionName]
      });
    }
  }

  return matches;
}

async function executeTool(toolCall) {
  try {
    const result = await toolCall.tool.func(...toolCall.params);
    return {
      success: true,
      result,
      functionName: toolCall.functionName,
      params: toolCall.params
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      functionName: toolCall.functionName,
      params: toolCall.params
    };
  }
}

function formatTodoList(todos) {
  if (!todos || todos.length === 0) {
    return "📋 No todos found.";
  }

  let output = `\n📋 **Todo List** (${todos.length} items)\n`;
  output += "━".repeat(50) + "\n";

  todos.forEach((todo, index) => {
    const status = todo.completed ? "✅" : "⭕";
    const priority = {
      high: "🔴",
      medium: "🟡",
      low: "🟢"
    }[todo.priority] || "⚪";

    const category = todo.category ? `[${todo.category.toUpperCase()}]` : "";
    const dateStr = new Date(todo.created_at).toLocaleDateString();

    output += `${status} ${priority} #${todo.id} ${todo.todo} ${category}\n`;
    output += `   Created: ${dateStr}`;

    if (todo.completed && todo.completed_at) {
      output += ` | Completed: ${new Date(todo.completed_at).toLocaleDateString()}`;
    }
    output += "\n\n";
  });

  return output;
}

function formatStats(stats) {
  let output = "\n📊 **Todo Statistics**\n";
  output += "━".repeat(30) + "\n";
  output += `📝 Total: ${stats.total}\n`;
  output += `✅ Completed: ${stats.completed}\n`;
  output += `⏳ Pending: ${stats.pending}\n\n`;

  if (Object.keys(stats.priorities).length > 0) {
    output += "🎯 **By Priority:**\n";
    Object.entries(stats.priorities).forEach(([priority, count]) => {
      const icon = { high: "🔴", medium: "🟡", low: "🟢" }[priority] || "⚪";
      output += `${icon} ${priority.charAt(0).toUpperCase() + priority.slice(1)}: ${count}\n`;
    });
    output += "\n";
  }

  if (Object.keys(stats.categories).length > 0) {
    output += "📂 **By Category:**\n";
    Object.entries(stats.categories).forEach(([category, count]) => {
      output += `📁 ${category}: ${count}\n`;
    });
  }

  return output;
}

async function getAIResponse(userInput, context = {}) {
  try {
    const systemPrompt = `You are an intelligent todo management assistant. You have access to these tools for managing todos:

${Object.entries(AVAILABLE_TOOLS).map(([name, tool]) =>
  `- ${name}: ${tool.description}`
).join('\n')}

When users ask about todos, analyze their intent and call the appropriate functions. Always be helpful and provide clear feedback about what actions were taken.

Available function format examples:
- getAllTodos() - get all todos
- createTodo("text", "priority", "category") - create new todo
- deleteTodoById(id) - delete specific todo
- markTodoCompleted(id) - mark todo as done
- searchTodos("search term") - search todos
- getTodoStats() - get statistics

Context: ${JSON.stringify(context)}

Respond naturally and helpfully. If you need to call functions, include them in your response.`;

    const response = await ollama.chat({
      model: 'dolphin3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      stream: false
    });

    return response.message.content;
  } catch (error) {
    console.error('AI Error:', error.message);
    return "I'm having trouble connecting to the AI service. Let me try to help you directly.";
  }
}

async function processUserInput(input) {
  console.log("\n🤖 Processing your request...\n");

  // First, try advanced NLU
  const analysis = nluEngine.analyzeIntent(input);
  console.log(`🧠 Intent Analysis: ${analysis.primaryIntent} (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);

  // For debugging, let's also show a simple pattern test
  const testPatterns = [
    { name: 'show/list', pattern: /(?:show|list|display|get|see|view)/i },
    { name: 'add/create', pattern: /(?:add|create|make|new)/i },
    { name: 'delete/remove', pattern: /(?:delete|remove|del)/i },
    { name: 'complete/done', pattern: /(?:complete|done|finish)/i }
  ];

  console.log("🔍 Quick pattern test:");
  for (const test of testPatterns) {
    if (test.pattern.test(input)) {
      console.log(`✅ Matched: ${test.name}`);
    }
  }

  // Try direct function call from NLU
  const directCall = nluEngine.generateFunctionCall(analysis);
  if (directCall && analysis.confidence > 0.3) { // Lowered threshold for testing
    console.log(`🎯 Direct execution: ${directCall}`);
    const toolCalls = parseToolCall(directCall);

    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const result = await executeTool(toolCall);
        if (result.success) {
          displayResult(result);
        } else {
          console.log(`❌ Error: ${result.error}`);
        }
      }
      return;
    }
  }

  // Simple pattern matching fallback for common commands
  const simpleMatch = handleSimpleCommands(input);
  if (simpleMatch) {
    const toolCalls = parseToolCall(simpleMatch);
    if (toolCalls.length > 0) {
      console.log(`🔧 Simple match executed: ${simpleMatch}`);
      for (const toolCall of toolCalls) {
        const result = await executeTool(toolCall);
        if (result.success) {
          displayResult(result);
        } else {
          console.log(`❌ Error: ${result.error}`);
        }
      }
      return;
    }
  }

  // Fallback to AI if NLU confidence is low or no direct match
  const aiResponse = await getAIResponse(input, { analysis });
  console.log("🤖 AI Response:", aiResponse);

  // Parse and execute any function calls in AI response
  const toolCalls = parseToolCall(aiResponse);

  if (toolCalls.length > 0) {
    console.log(`\n🔧 Executing ${toolCalls.length} function(s)...\n`);

    for (const toolCall of toolCalls) {
      const result = await executeTool(toolCall);
      if (result.success) {
        displayResult(result);
      } else {
        console.log(`❌ Error executing ${toolCall.functionName}: ${result.error}`);
      }
    }
  } else if (!toolCalls.length && aiResponse.includes('(')) {
    // AI might have suggested functions but parsing failed
    console.log("💭 AI suggested actions but I couldn't parse them automatically.");
    console.log("🔧 You can try more specific commands like:");
    console.log("   - 'show my todos'");
    console.log("   - 'add todo: buy groceries'");
    console.log("   - 'complete todo 1'");
  }
}

// Simple command handler for common patterns
function handleSimpleCommands(input) {
  const lower = input.toLowerCase().trim();

  // Show/List commands
  if (/(?:show|list|display|get|see|view)\s*(?:my\s*)?(?:todos?|tasks?|list)/i.test(lower)) {
    return 'getAllTodos()';
  }

  // Add/Create commands - extract text after common prefixes
  const addMatch = lower.match(/(?:add|create|make|new)\s*(?:todo|task|item)?\s*[:\-]?\s*(.+)/i);
  if (addMatch && addMatch[1]) {
    const todoText = addMatch[1].replace(/['"]/g, '').trim();
    return `createTodo("${todoText}")`;
  }

  // Delete commands with numbers
  const deleteMatch = lower.match(/(?:delete|remove|del)\s*(?:todo|task|item)?\s*#?(\d+)/i);
  if (deleteMatch && deleteMatch[1]) {
    return `deleteTodoById(${deleteMatch[1]})`;
  }

  // Complete commands with numbers
  const completeMatch = lower.match(/(?:complete|done|finish)\s*(?:todo|task|item)?\s*#?(\d+)/i);
  if (completeMatch && completeMatch[1]) {
    return `markTodoCompleted(${completeMatch[1]})`;
  }

  // Stats/Summary
  if (/(?:stats|statistics|summary|overview|report)/i.test(lower)) {
    return 'getTodoStats()';
  }

  return null;
}

function displayResult(result) {
  const { functionName, result: data, params } = result;

  switch (functionName) {
    case 'getAllTodos':
    case 'getTodosByPriority':
    case 'getTodosByCategory':
    case 'searchTodos':
      console.log(formatTodoList(data));
      break;

    case 'createTodo':
      console.log(`✅ Created todo #${data} successfully!`);
      break;

    case 'deleteTodoById':
      console.log(data ? "🗑️ Todo deleted successfully!" : "❌ Todo not found.");
      break;

    case 'deleteTodosByIds':
      console.log(`🗑️ Deleted ${data} todo(s) successfully!`);
      break;

    case 'markTodoCompleted':
      console.log(data ? "✅ Todo marked as completed!" : "❌ Todo not found.");
      break;

    case 'markTodoIncomplete':
      console.log(data ? "⭕ Todo marked as incomplete!" : "❌ Todo not found.");
      break;

    case 'updateTodo':
      console.log(data ? "📝 Todo updated successfully!" : "❌ Todo not found.");
      break;

    case 'getTodoStats':
      console.log(formatStats(data));
      break;

    case 'clearCompleted':
      console.log(`🧹 Cleared ${data} completed todo(s)!`);
      break;

    case 'getTodoById':
      if (data) {
        console.log(formatTodoList([data]));
      } else {
        console.log("❌ Todo not found.");
      }
      break;

    default:
      console.log("✅ Operation completed:", JSON.stringify(data, null, 2));
  }
}

function showHelp() {
  console.log(`
🚀 **Advanced Todo Manager with AI**

**Natural Language Commands:**
  • "Show my todos" / "What's on my list?"
  • "Add todo: buy groceries with high priority"
  • "Create a work task about meeting preparation"
  • "Delete todo 1" / "Remove todos 1, 2, 3"
  • "Complete todo 5" / "Mark task 3 as done"
  • "Search for shopping tasks"
  • "Show my statistics" / "Give me a summary"
  • "Clear completed todos"
  • "Update todo 2 to fix the car"

**Direct Function Calls:**
  • getAllTodos() - Show all todos
  • createTodo("text", "priority", "category")
  • deleteTodoById(id) or deleteTodosByIds([1,2,3])
  • markTodoCompleted(id) / markTodoIncomplete(id)
  • searchTodos("search term")
  • getTodoStats() - Show statistics
  • clearCompleted() - Remove completed todos

**Priority Levels:** high, medium (default), low
**Categories:** Detected automatically or specify explicitly

Type 'quit' or 'exit' to leave.
`);
}

async function main() {
  console.log("🎯 **Advanced Todo Manager with AI & NLU**");
  console.log("Type 'help' for commands or just tell me what you want to do!\n");

  while (true) {
    try {
      const input = await rl.question("📝 What would you like to do? ");

      if (!input.trim()) continue;

      const command = input.trim().toLowerCase();

      if (['quit', 'exit', 'bye', 'goodbye'].includes(command)) {
        console.log("👋 Goodbye! Stay productive!");
        break;
      }

      if (['help', 'h', '?'].includes(command)) {
        showHelp();
        continue;
      }

      await processUserInput(input);

    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }

  rl.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n👋 Goodbye! Stay productive!");
  rl.close();
  process.exit(0);
});

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  AdvancedNLUEngine, AVAILABLE_TOOLS, clearCompleted, createTodo,
  deleteTodoById,
  deleteTodosByIds, getAllTodos, getTodoById, getTodosByCategory, getTodosByPriority, getTodoStats, markTodoCompleted,
  markTodoIncomplete, searchTodos,
  updateTodo
};
