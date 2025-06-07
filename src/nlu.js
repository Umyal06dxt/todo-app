

// 🧠 ADVANCED NATURAL LANGUAGE UNDERSTANDING ENGINE
export default class AdvancedNLUEngine {
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
