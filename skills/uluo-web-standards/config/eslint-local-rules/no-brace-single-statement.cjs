/**
 * Enforce: single statement in if/else/for/while → NO braces, indented on next line.
 *          multiple statements → MUST have braces (Allman style).
 */

module.exports = {
  meta: {
    type: 'layout',
    docs: { description: 'Single statement bodies must not use braces' },
    fixable: 'whitespace',
    schema: [],
  },

  create(context) {
    const { sourceCode } = context

    function checkBody(node, body, label)
    {
      if (!body || body.type !== 'BlockStatement')
        return

      if (body.body.length === 1)
      {
        const innerStatement = body.body[0]
        // 如果内部语句跨多行，交给 curly: multi-line 处理，本规则不干预
        const innerStartLine = innerStatement.loc.start.line
        const innerEndLine = innerStatement.loc.end.line
        if (innerStartLine !== innerEndLine)
          return

        const blockStart = sourceCode.getFirstToken(body)
        const blockEnd = sourceCode.getLastToken(body)

        context.report({
          node: body,
          message: `Single statement after '${label}' should not use braces. Remove {} and indent the statement.`,
          fix(fixer) {
            const replacements = [
              // Remove opening brace
              fixer.remove(blockStart),
              // Remove closing brace
              fixer.remove(blockEnd),
            ]
            return replacements
          },
        })
      }
    }

    return {
      IfStatement(node) {
        checkBody(node, node.consequent, 'if')
        if (node.alternate && node.alternate.type !== 'IfStatement')
          checkBody(node, node.alternate, 'else')
      },

      ForStatement(node) {
        checkBody(node, node.body, 'for')
      },

      ForInStatement(node) {
        checkBody(node, node.body, 'for-in')
      },

      ForOfStatement(node) {
        checkBody(node, node.body, 'for-of')
      },

      WhileStatement(node) {
        checkBody(node, node.body, 'while')
      },
    }
  },
}
