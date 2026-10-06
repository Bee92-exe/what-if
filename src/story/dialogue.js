export function whenMatches(when, flags) {
  if (!when) return true;
  if (when.flag !== undefined) {
    const actual = flags[when.flag] ?? false;
    const expected = when.is !== undefined ? when.is : true;
    return actual === expected;
  }
  return true;
}

export function createSession(nodes, flags = {}) {
  return {
    nodes,
    byId: new Map(nodes.map((n) => [n.id, n])),
    orderIndex: new Map(nodes.map((n, i) => [n.id, i])),
    current: null,
    finished: false,
    flags: { ...flags },
  };
}

export function jumpTo(session, nodeId) {
  let id = nodeId ?? session.nodes[0]?.id;
  let guard = 0;
  while (id && guard++ < 100) {
    const node = session.byId.get(id);
    if (!node) {
      session.current = null;
      session.finished = true;
      return null;
    }
    if (node.set) Object.assign(session.flags, node.set);
    if (whenMatches(node.when, session.flags)) {
      session.current = node;
      return node;
    }
    const idx = session.orderIndex.get(id);
    id = node.next ?? node.choices?.[0]?.next ?? session.nodes[idx + 1]?.id ?? null;
  }
  session.current = null;
  session.finished = true;
  return null;
}

export function next(session, choiceIndex = null) {
  if (session.finished || !session.current) return null;
  const node = session.current;

  if (node.choices?.length) {
    if (choiceIndex === null || choiceIndex < 0 || choiceIndex >= node.choices.length) return node;
    const choice = node.choices[choiceIndex];
    if (choice.set) Object.assign(session.flags, choice.set);
    return jumpTo(session, choice.next);
  }

  if (!node.next) {
    session.finished = true;
    session.current = null;
    return null;
  }
  return jumpTo(session, node.next);
}

export function currentChoices(session) {
  return session.current?.choices ?? [];
}

export function start(session) {
  return jumpTo(session, null);
}
