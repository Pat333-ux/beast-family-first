'use strict';

const { randomUUID } = require('node:crypto');

function createStore() {
  const records = new Map();

  return {
    list() {
      return [...records.values()].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      );
    },
    get(id) {
      return records.get(id);
    },
    create(record) {
      const stored = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        status: 'pending_review',
        ...record
      };
      records.set(stored.id, stored);
      return stored;
    },
    update(record) {
      if (!records.has(record.id)) return false;
      records.set(record.id, record);
      return true;
    },
    count() {
      return records.size;
    }
  };
}

module.exports = { createStore };
