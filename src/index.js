import ollama from 'ollama';
import { stdin as input, stdout as output } from 'process';
import readline from 'readline/promises';

import { AVAILABLE_TOOLS } from './available_tools.js';

import AdvancedNLUEngine from "./nlu.js";
import { parseToolCall } from './parse_tool.js';

const rl = readline.createInterface({ input, output });



// Initialize the advanced NLU engine
const nluEngine = new AdvancedNLUEngine();


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
      model: 'phi4',
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
