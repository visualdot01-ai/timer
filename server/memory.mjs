// Explicit local demo/test adapter. Never imported by production API handlers.
export function memoryStore(){const rows=new Map();return {async get(id){return rows.get(id)||null;},async create(id,value){if(rows.has(id))return false;rows.set(id,value);return true;},async cas(id,oldValue,value){if(rows.get(id)!==oldValue)return false;rows.set(id,value);return true;}};}
