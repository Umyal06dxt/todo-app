import { AVAILABLE_TOOLS } from './available_tools.js';

export function parseToolCall(text) {
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
